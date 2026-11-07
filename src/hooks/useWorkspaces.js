import { useCallback, useEffect, useSyncExternalStore } from 'react'
import { deleteDoc, doc, getDoc, setDoc } from '../utils/firestore'
import { db } from '../firebase'
import { ACTIVE_WORKSPACE_ID, DEFAULT_WORKSPACE_ID, WORKSPACE_DOC_NAMES, switchWorkspace, workspaceKey } from '../utils/workspace'
import { WORK_FEATURE_OPTIONS, allFeatures } from '../utils/workFeatures'
import { fetchImageSrcs, storeImage } from '../utils/imageStorage'

// The workspace list is shared across workspaces; each record carries its own name, character name and features
const WORKSPACES_DOC = doc(db, 'meta', 'workspaces')
const DEFAULT_CHARACTER_NAME = '米莉亞'
// Before features moved to the cloud they lived in this browser key
const LEGACY_FEATURE_KEY = 'brave-todo:work-feature-visibility'

function legacyFeatures(workspaceId) {
  try {
    const stored = JSON.parse(localStorage.getItem(workspaceKey(workspaceId, LEGACY_FEATURE_KEY)) || 'null')
    // Legacy values only stored overrides on top of "all on"
    if (stored && typeof stored === 'object') return { ...allFeatures(true), ...stored }
  } catch {
    // Ignore malformed legacy values.
  }
  return null
}

function normalizeFeatures(features, workspaceId) {
  const source = features && typeof features === 'object'
    ? features
    : legacyFeatures(workspaceId) ?? allFeatures(workspaceId === DEFAULT_WORKSPACE_ID)
  return Object.fromEntries(WORK_FEATURE_OPTIONS.map(({ key }) => [key, source[key] === true]))
}

function normalizeWorkspace(item) {
  return {
    id: item.id,
    name: String(item.name ?? '').trim() || (item.id === DEFAULT_WORKSPACE_ID ? 'LIFE' : '未命名工作區'),
    characterName: String(item.characterName ?? '').trim() || DEFAULT_CHARACTER_NAME,
    features: normalizeFeatures(item.features, item.id),
  }
}

function normalizeWorkspaces(items) {
  const list = (Array.isArray(items) ? items : []).filter((item) => typeof item?.id === 'string' && item.id)
  const withDefault = list.some((item) => item.id === DEFAULT_WORKSPACE_ID) ? list : [{ id: DEFAULT_WORKSPACE_ID }, ...list]
  return withDefault.map(normalizeWorkspace)
}

// ── Shared store ──────────────────────────────────────────
let state = { workspaces: normalizeWorkspaces([]), loaded: false }
let loadStarted = false
const listeners = new Set()

const emit = () => listeners.forEach((listener) => listener())
const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
const getSnapshot = () => state

function commit(workspaces) {
  state = { ...state, workspaces }
  emit()
  return setDoc(WORKSPACES_DOC, { items: workspaces }).catch(console.error)
}

function load() {
  if (loadStarted) return
  loadStarted = true
  getDoc(WORKSPACES_DOC).then((snap) => {
    const rawItems = snap.exists() ? snap.data().items : []
    const workspaces = normalizeWorkspaces(rawItems)
    state = { workspaces, loaded: true }
    emit()
    // Persist once when records predate cloud-stored features or names
    const needsSave = !snap.exists() || workspaces.length !== rawItems.length
      || rawItems.some((item) => !item.features || !item.characterName)
    if (needsSave) setDoc(WORKSPACES_DOC, { items: workspaces }).catch(console.error)
  }).catch(() => {
    state = { ...state, loaded: true }
    emit()
  })
}

const newWorkspaceId = () => `w${Date.now().toString(36)}`

// Every stored-image id ("img_…") referenced anywhere in the data
function collectImageIds(value, ids = new Set()) {
  if (typeof value === 'string') {
    if (value.startsWith('img_')) ids.add(value)
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectImageIds(item, ids))
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectImageIds(item, ids))
  }
  return ids
}

function replaceImageIds(value, idMap) {
  if (typeof value === 'string') return idMap[value] ?? value
  if (Array.isArray(value)) return value.map((item) => replaceImageIds(item, idMap))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceImageIds(item, idMap)]))
  }
  return value
}

const updateWorkspace = (id, changes) =>
  commit(state.workspaces.map((item) => (item.id === id ? normalizeWorkspace({ ...item, ...changes }) : item)))

export default function useWorkspaces() {
  const { workspaces, loaded } = useSyncExternalStore(subscribe, getSnapshot)

  useEffect(load, [])

  // A new workspace starts blank: tasks only, other features off until enabled in its settings
  const addWorkspace = useCallback(async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return
    const id = newWorkspaceId()
    await commit([...state.workspaces, normalizeWorkspace({ id, name: trimmed, features: allFeatures(false) })])
    switchWorkspace(id)
  }, [])

  // Copies all data, settings and images; images get new ids so the two workspaces never share one
  const duplicateWorkspace = useCallback(async (sourceId, name) => {
    const source = state.workspaces.find((item) => item.id === sourceId)
    const trimmed = name.trim()
    if (!source || !trimmed) return
    const id = newWorkspaceId()

    const snaps = await Promise.all(
      WORKSPACE_DOC_NAMES.map(async (docName) => [docName, await getDoc(doc(db, 'meta', workspaceKey(sourceId, docName)))]),
    )
    const docs = snaps.filter(([, snap]) => snap.exists()).map(([docName, snap]) => [docName, snap.data()])

    const imageIds = [...collectImageIds(docs.map(([, data]) => data))]
    const srcs = await fetchImageSrcs(imageIds)
    const idMap = {}
    await Promise.all(imageIds.map(async (imageId) => {
      if (srcs[imageId]) idMap[imageId] = await storeImage(srcs[imageId])
    }))

    await Promise.all(docs.map(([docName, data]) => setDoc(doc(db, 'meta', workspaceKey(id, docName)), replaceImageIds(data, idMap))))
    await commit([...state.workspaces, normalizeWorkspace({ ...source, id, name: trimmed })])
    switchWorkspace(id)
  }, [])

  const renameWorkspace = useCallback((id, name) => {
    if (name.trim()) updateWorkspace(id, { name })
  }, [])

  const setCharacterName = useCallback((id, characterName) => updateWorkspace(id, { characterName }), [])

  const setWorkspaceFeature = useCallback((id, key, enabled) => {
    const target = state.workspaces.find((item) => item.id === id)
    if (target) updateWorkspace(id, { features: { ...target.features, [key]: Boolean(enabled) } })
  }, [])

  const setAllWorkspaceFeatures = useCallback((id, enabled) => updateWorkspace(id, { features: allFeatures(enabled) }), [])

  // Removes the workspace and its data docs; images stay in the shared image store
  const deleteWorkspace = useCallback(async (id) => {
    if (id === DEFAULT_WORKSPACE_ID) return
    await commit(state.workspaces.filter((item) => item.id !== id))
    await Promise.all(WORKSPACE_DOC_NAMES.map((name) => deleteDoc(doc(db, 'meta', workspaceKey(id, name))).catch(() => {})))
    if (id === ACTIVE_WORKSPACE_ID) switchWorkspace(DEFAULT_WORKSPACE_ID)
  }, [])

  const activeWorkspace = workspaces.find((item) => item.id === ACTIVE_WORKSPACE_ID)
    ?? normalizeWorkspace({ id: ACTIVE_WORKSPACE_ID })

  return {
    workspaces,
    loaded,
    activeWorkspace,
    addWorkspace,
    duplicateWorkspace,
    renameWorkspace,
    setCharacterName,
    setWorkspaceFeature,
    setAllWorkspaceFeatures,
    deleteWorkspace,
    switchWorkspace,
  }
}

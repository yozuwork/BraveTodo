import { useEffect, useMemo, useSyncExternalStore } from 'react'
import { doc, getDoc, setDoc } from '../utils/firestore'
import { db } from '../firebase'
import { storeImage, fetchImageSrcs, removeStoredImage } from '../utils/imageStorage'

const GALLERY_DOC = doc(db, 'meta', 'gallery')
const DEFAULT_CATEGORIES = [
  { id: 'character', name: '角色' },
  { id: 'monster', name: '怪物' },
]
const DEFAULTS = { version: 2, categories: DEFAULT_CATEGORIES, items: [] }

// 圖庫是全站共用的單一 store：圖庫頁、選圖視窗、其他地方上傳圖片自動加入圖庫都改同一份資料
// data: { version: 2, categories: [{ id, name }], items: [{ id, imageId, tags: [categoryId], pinnedAt?, hash? }] }
let state = { data: DEFAULTS, imageSrcs: {}, loaded: false }
let loadPromise = null
const listeners = new Set()

function setState(patch) {
  state = { ...state, ...patch }
  listeners.forEach((listener) => listener())
}

function updateData(fn) {
  const next = fn(state.data)
  if (next === state.data) return
  setState({ data: next })
  if (state.loaded) setDoc(GALLERY_DOC, next).catch(console.error)
}

function updateItem(id, fn) {
  updateData((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === id ? fn(item) : item)) }))
}

function newCategoryId() {
  return `cat_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

// Pinned first (latest pin on top), then upload order.
function sortItems(items) {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (b.item.pinnedAt ?? 0) - (a.item.pinnedAt ?? 0) || a.index - b.index)
    .map(({ item }) => item)
}

async function loadGallery() {
  try {
    const snap = await getDoc(GALLERY_DOC)
    let nextData = DEFAULTS
    const newSrcs = {}

    if (snap.exists()) {
      const raw = snap.data()

      // v2 stores items with tags; v1 stored separate character / monster arrays
      const rawItems = Array.isArray(raw.items)
        ? raw.items
        : [
            ...(raw.character ?? []).map((item) => ({ ...item, tags: ['character'] })),
            ...(raw.monster ?? []).map((item) => ({ ...item, tags: ['monster'] })),
          ]

      // New format items have imageId; old format have src (base64)
      const imageIdRefs = rawItems.filter((r) => r.imageId).map((r) => r.imageId)
      const legacyItems = rawItems.filter((r) => r.src && !r.imageId)

      Object.assign(newSrcs, await fetchImageSrcs(imageIdRefs))

      // Migrate legacy base64 items → upload to images collection
      const legacyIdMap = {}
      if (legacyItems.length > 0) {
        const ids = await Promise.all(legacyItems.map((item) => storeImage(item.src)))
        legacyItems.forEach((item, i) => {
          legacyIdMap[item.id] = ids[i]
          newSrcs[ids[i]] = item.src
        })
      }

      const convertItem = (item) => {
        const imageId = item.imageId ?? legacyIdMap[item.id]
        if (!imageId) return null
        return {
          id: item.id,
          imageId,
          tags: item.tags ?? [],
          ...(item.pinnedAt ? { pinnedAt: item.pinnedAt } : {}),
          ...(typeof item.hash === 'string' ? { hash: item.hash } : {}),
        }
      }

      nextData = {
        version: 2,
        categories: Array.isArray(raw.categories) ? raw.categories : DEFAULT_CATEGORIES,
        items: rawItems.map(convertItem).filter(Boolean),
      }
    }
    setState({ data: nextData, imageSrcs: newSrcs, loaded: true })
  } catch (error) {
    console.error(error)
    setState({ loaded: true })
  }
}

export function ensureGalleryLoaded() {
  if (!loadPromise) loadPromise = loadGallery()
  return loadPromise
}

// ── 圖片內容比對（SHA-256），用來偵測重複上傳 ──
const hashCache = {}

export async function hashImageSrc(src) {
  if (!src) return null
  if (hashCache[src]) return hashCache[src]
  const bytes = new TextEncoder().encode(src)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  const hash = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
  hashCache[src] = hash
  return hash
}

// Gallery image with the same content, or null
export async function findGalleryDuplicate(hash) {
  await ensureGalleryLoaded()
  for (const item of state.data.items) {
    const src = state.imageSrcs[item.imageId]
    const itemHash = item.hash ?? (src ? await hashImageSrc(src) : null)
    if (itemHash === hash) return { ...item, src }
  }
  return null
}

// ── actions ──
// items: [{ id, src, hash? }]; categoryId may be null for untagged uploads
export async function addGalleryImages(categoryId, items) {
  await ensureGalleryLoaded()
  const results = await Promise.all(
    items.map(async ({ id, src, hash }) => ({ id, src, imageId: await storeImage(src), hash: hash ?? await hashImageSrc(src) }))
  )
  setState({ imageSrcs: { ...state.imageSrcs, ...Object.fromEntries(results.map(({ imageId, src }) => [imageId, src])) } })
  updateData((prev) => ({
    ...prev,
    items: [
      ...prev.items,
      ...results.map(({ id, imageId, hash }) => ({ id, imageId, tags: categoryId ? [categoryId] : [], ...(hash ? { hash } : {}) })),
    ],
  }))
}

function deleteImage(id) {
  const item = state.data.items.find((r) => r.id === id)
  if (item?.imageId) removeStoredImage(item.imageId)
  updateData((prev) => ({ ...prev, items: prev.items.filter((r) => r.id !== id) }))
}

async function replaceImage(id, src) {
  const imageId = await storeImage(src)
  const hash = await hashImageSrc(src)
  setState({ imageSrcs: { ...state.imageSrcs, [imageId]: src } })
  const item = state.data.items.find((r) => r.id === id)
  if (item?.imageId) removeStoredImage(item.imageId)
  updateItem(id, (r) => ({ ...r, imageId, hash }))
}

function togglePin(id) {
  updateItem(id, (item) => {
    if (!item.pinnedAt) return { ...item, pinnedAt: Date.now() }
    const rest = { ...item }
    delete rest.pinnedAt
    return rest
  })
}

function toggleImageTag(id, categoryId) {
  updateItem(id, (item) => ({
    ...item,
    tags: item.tags.includes(categoryId)
      ? item.tags.filter((t) => t !== categoryId)
      : [...item.tags, categoryId],
  }))
}

// Copy when fromId is null, otherwise move from one category to another
function assignImageToCategory(id, toId, fromId = null) {
  updateItem(id, (item) => {
    const tags = item.tags.filter((t) => t !== fromId && t !== toId)
    return { ...item, tags: [...tags, toId] }
  })
}

function addCategory(name) {
  const id = newCategoryId()
  updateData((prev) => ({ ...prev, categories: [...prev.categories, { id, name }] }))
  return id
}

function renameCategory(id, name) {
  updateData((prev) => ({
    ...prev,
    categories: prev.categories.map((c) => (c.id === id ? { ...c, name } : c)),
  }))
}

// Place category `id` right before (or after) `targetId`
function moveCategory(id, targetId, after = false) {
  if (id === targetId) return
  updateData((prev) => {
    const moving = prev.categories.find((c) => c.id === id)
    if (!moving) return prev
    const rest = prev.categories.filter((c) => c.id !== id)
    const targetIndex = rest.findIndex((c) => c.id === targetId)
    if (targetIndex < 0) return prev
    const insertAt = after ? targetIndex + 1 : targetIndex
    return { ...prev, categories: [...rest.slice(0, insertAt), moving, ...rest.slice(insertAt)] }
  })
}

// Images stay in the gallery; they only lose this tag
function deleteCategory(id) {
  updateData((prev) => ({
    ...prev,
    categories: prev.categories.filter((c) => c.id !== id),
    items: prev.items.map((item) => (
      item.tags.includes(id) ? { ...item, tags: item.tags.filter((t) => t !== id) } : item
    )),
  }))
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export default function useGallery() {
  const { data, imageSrcs, loaded } = useSyncExternalStore(subscribe, () => state)

  useEffect(() => {
    ensureGalleryLoaded()
  }, [])

  // Resolved images with src populated from imageSrcs, pinned first
  const images = useMemo(() => (
    sortItems(data.items)
      .map((r) => ({ ...r, pinned: Boolean(r.pinnedAt), src: imageSrcs[r.imageId] ?? null }))
      .filter((r) => r.src)
  ), [data.items, imageSrcs])

  return {
    images,
    categories: data.categories,
    addImages: addGalleryImages,
    deleteImage,
    replaceImage,
    togglePin,
    toggleImageTag,
    assignImageToCategory,
    addCategory,
    renameCategory,
    moveCategory,
    deleteCategory,
    loaded,
  }
}

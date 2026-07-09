import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { compressImage } from '../utils/compressImage'
import { reorderItems } from '../utils/reorderItems'

const HERO_NPCS_DOC = doc(db, 'meta', 'heroNpcs')
let cachedHeroNpcs = null

const createNpc = () => {
  const now = Date.now()
  return {
    id: now,
    name: '新的 NPC',
    excerpt: '',
    content: '',
    cover: null,
    coverPosition: { x: 50, y: 50 },
    visibility: 'visible',
    createdAt: now,
    updatedAt: now,
  }
}

export default function useHeroNpcs() {
  const [npcs, setNpcs] = useState(() => cachedHeroNpcs ?? [])
  const [loaded, setLoaded] = useState(() => cachedHeroNpcs !== null)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedHeroNpcs !== null) return
    getDoc(HERO_NPCS_DOC).then((snap) => {
      let nextNpcs = []
      if (snap.exists()) {
        nextNpcs = (snap.data().items ?? []).map((npc) => ({
          name: '未命名 NPC',
          excerpt: '',
          content: '',
          cover: null,
          coverPosition: { x: 50, y: 50 },
          visibility: 'visible',
          createdAt: npc.id ?? Date.now(),
          updatedAt: npc.id ?? Date.now(),
          ...npc,
        }))
      }
      cachedHeroNpcs = nextNpcs
      setNpcs(nextNpcs)
      setLoaded(true)
    }).catch(() => {
      cachedHeroNpcs = cachedHeroNpcs ?? []
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    cachedHeroNpcs = npcs
    setDoc(HERO_NPCS_DOC, { items: npcs }).catch(console.error)
  }, [npcs, loaded])

  const addNpc = useCallback(() => {
    const npc = createNpc()
    setNpcs((prev) => [npc, ...prev])
    return npc.id
  }, [])

  const updateNpc = useCallback((id, changes) => {
    setNpcs((prev) => prev.map((npc) => (
      npc.id === id ? { ...npc, ...changes, updatedAt: Date.now() } : npc
    )))
  }, [])

  const removeNpc = useCallback((id) => {
    setNpcs((prev) => prev.filter((npc) => npc.id !== id))
  }, [])

  const updateNpcCover = useCallback((id, file) => {
    if (!file) return
    if (typeof file === 'string') {
      updateNpc(id, { cover: file })
      return
    }
    compressImage(file).then((dataUrl) => updateNpc(id, { cover: dataUrl }))
  }, [updateNpc])

  const reorderNpcs = useCallback((fromId, toId, insertBefore) => {
    setNpcs((prev) => reorderItems(prev, fromId, toId, insertBefore))
  }, [])

  return {
    npcs,
    addNpc,
    updateNpc,
    removeNpc,
    updateNpcCover,
    reorderNpcs,
    loaded,
  }
}

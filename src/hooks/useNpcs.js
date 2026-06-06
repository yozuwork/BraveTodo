import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { compressImage } from '../utils/compressImage'

const NPCS_DOC = doc(db, 'meta', 'npcs')
let cachedNpcs = null

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

export default function useNpcs() {
  const [npcs, setNpcs] = useState(() => cachedNpcs ?? [])
  const [loaded, setLoaded] = useState(() => cachedNpcs !== null)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedNpcs !== null) return
    getDoc(NPCS_DOC).then((snap) => {
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
      cachedNpcs = nextNpcs
      setNpcs(nextNpcs)
      setLoaded(true)
    }).catch(() => {
      cachedNpcs = cachedNpcs ?? []
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    cachedNpcs = npcs
    setDoc(NPCS_DOC, { items: npcs }).catch(console.error)
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

  return {
    npcs,
    addNpc,
    updateNpc,
    removeNpc,
    updateNpcCover,
    loaded,
  }
}

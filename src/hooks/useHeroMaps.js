import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { compressImage } from '../utils/compressImage'
import { reorderItems } from '../utils/reorderItems'

const HERO_MAPS_DOC = doc(db, 'meta', 'heroMaps')
let cachedHeroMaps = null

const createMap = () => {
  const now = Date.now()
  return {
    id: now,
    name: '新的地圖',
    description: '',
    cover: null,
    coverPosition: { x: 50, y: 50 },
    cardW: 560,
    cardH: 390,
    createdAt: now,
    updatedAt: now,
  }
}

export default function useHeroMaps() {
  const [maps, setMaps] = useState(() => cachedHeroMaps ?? [])
  const [loaded, setLoaded] = useState(() => cachedHeroMaps !== null)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedHeroMaps !== null) return
    getDoc(HERO_MAPS_DOC).then((snap) => {
      let nextMaps = []
      if (snap.exists()) {
        nextMaps = (snap.data().items ?? []).map((map) => ({
          name: '未命名地圖',
          description: '',
          cover: null,
          coverPosition: { x: 50, y: 50 },
          cardW: 560,
          cardH: 390,
          createdAt: map.id ?? Date.now(),
          updatedAt: map.id ?? Date.now(),
          ...map,
        }))
      }
      cachedHeroMaps = nextMaps
      setMaps(nextMaps)
      setLoaded(true)
    }).catch(() => {
      cachedHeroMaps = cachedHeroMaps ?? []
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    cachedHeroMaps = maps
    setDoc(HERO_MAPS_DOC, { items: maps }).catch(console.error)
  }, [maps, loaded])

  const addMap = useCallback(() => {
    const map = createMap()
    setMaps((prev) => [map, ...prev])
    return map.id
  }, [])

  const updateMap = useCallback((id, changes) => {
    setMaps((prev) => prev.map((map) => (
      map.id === id ? { ...map, ...changes, updatedAt: Date.now() } : map
    )))
  }, [])

  const removeMap = useCallback((id) => {
    setMaps((prev) => prev.filter((map) => map.id !== id))
  }, [])

  const updateMapCover = useCallback((id, file) => {
    if (!file) return
    if (typeof file === 'string') {
      updateMap(id, { cover: file })
      return
    }
    compressImage(file).then((dataUrl) => updateMap(id, { cover: dataUrl }))
  }, [updateMap])

  const reorderMaps = useCallback((fromId, toId, insertBefore) => {
    setMaps((prev) => reorderItems(prev, fromId, toId, insertBefore))
  }, [])

  return {
    maps,
    addMap,
    updateMap,
    removeMap,
    updateMapCover,
    reorderMaps,
    loaded,
  }
}

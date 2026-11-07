import { useState, useCallback, useEffect, useRef } from 'react'
import { getDoc, setDoc } from '../utils/firestore'
import { wsDoc } from '../utils/workspace'
import { compressImage } from '../utils/compressImage'
import { reorderItems } from '../utils/reorderItems'

const MAPS_DOC = wsDoc('maps')
let cachedMaps = null

const createMap = () => {
  const now = Date.now()
  return {
    id: now,
    name: '新的地圖',
    description: '',
    cover: null,
    coverPosition: { x: 50, y: 50 },
    cardW: 220,
    cardH: 390,
    createdAt: now,
    updatedAt: now,
  }
}

export default function useMaps() {
  const [maps, setMaps] = useState(() => cachedMaps ?? [])
  const [loaded, setLoaded] = useState(() => cachedMaps !== null)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedMaps !== null) return
    getDoc(MAPS_DOC).then((snap) => {
      let nextMaps = []
      if (snap.exists()) {
        nextMaps = (snap.data().items ?? []).map((map) => {
          const usedOldDefaultSize = Number(map.cardW) === 560 && Number(map.cardH) === 390
          return {
            name: '未命名地圖',
            description: '',
            cover: null,
            coverPosition: { x: 50, y: 50 },
            cardW: usedOldDefaultSize ? 220 : (Number(map.cardW) || 220),
            cardH: Number(map.cardH) || 390,
            createdAt: map.id ?? Date.now(),
            updatedAt: map.id ?? Date.now(),
            ...map,
            ...(usedOldDefaultSize ? { cardW: 220 } : {}),
          }
        })
      }
      cachedMaps = nextMaps
      setMaps(nextMaps)
      setLoaded(true)
    }).catch(() => {
      cachedMaps = cachedMaps ?? []
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    cachedMaps = maps
    setDoc(MAPS_DOC, { items: maps }).catch(console.error)
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

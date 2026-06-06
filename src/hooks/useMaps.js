import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { compressImage } from '../utils/compressImage'

const MAPS_DOC = doc(db, 'meta', 'maps')

const createMap = () => {
  const now = Date.now()
  return {
    id: now,
    name: '新的地圖',
    description: '',
    cover: null,
    cardW: 560,
    cardH: 390,
    createdAt: now,
    updatedAt: now,
  }
}

export default function useMaps() {
  const [maps, setMaps] = useState([])
  const [loaded, setLoaded] = useState(false)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    getDoc(MAPS_DOC).then((snap) => {
      if (snap.exists()) {
        setMaps((snap.data().items ?? []).map((map) => ({
          name: '未命名地圖',
          description: '',
          cover: null,
          cardW: 560,
          cardH: 390,
          createdAt: map.id ?? Date.now(),
          updatedAt: map.id ?? Date.now(),
          ...map,
        })))
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
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

  return {
    maps,
    addMap,
    updateMap,
    removeMap,
    updateMapCover,
    loaded,
  }
}

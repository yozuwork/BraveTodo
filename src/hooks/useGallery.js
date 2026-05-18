import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const GALLERY_DOC = doc(db, 'meta', 'gallery')

const DEFAULTS = { character: [], monster: [] }

export default function useGallery() {
  const [images, setImages] = useState(DEFAULTS)
  const [loaded, setLoaded] = useState(false)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    getDoc(GALLERY_DOC).then((snap) => {
      if (snap.exists()) {
        const data = snap.data()
        setImages({
          character: data.character ?? [],
          monster: data.monster ?? [],
        })
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
    setDoc(GALLERY_DOC, images).catch(console.error)
  }, [images, loaded])

  const addImages = useCallback((tab, newImgs) => {
    setImages((prev) => ({
      ...prev,
      [tab]: [...prev[tab], ...newImgs],
    }))
  }, [])

  const deleteImage = useCallback((tab, id) => {
    setImages((prev) => ({
      ...prev,
      [tab]: prev[tab].filter((img) => img.id !== id),
    }))
  }, [])

  const updateImage = useCallback((tab, id, changes) => {
    setImages((prev) => ({
      ...prev,
      [tab]: prev[tab].map((img) => (img.id === id ? { ...img, ...changes } : img)),
    }))
  }, [])

  return { images, addImages, deleteImage, updateImage, loaded }
}

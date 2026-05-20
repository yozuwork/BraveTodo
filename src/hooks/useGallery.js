import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { storeImage, fetchImageSrcs, removeStoredImage } from '../utils/imageStorage'

const GALLERY_DOC = doc(db, 'meta', 'gallery')
const DEFAULTS = { character: [], monster: [] }

export default function useGallery() {
  // imageRefs: { character: [{ id, imageId }], monster: [...] }
  const [imageRefs, setImageRefs] = useState(DEFAULTS)
  const [imageSrcs, setImageSrcs] = useState({})
  const [loaded, setLoaded] = useState(false)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    getDoc(GALLERY_DOC).then(async (snap) => {
      let nextRefs = DEFAULTS
      const newSrcs = {}

      if (snap.exists()) {
        const data = snap.data()
        const rawChar = data.character ?? []
        const rawMon  = data.monster  ?? []
        const allItems = [...rawChar, ...rawMon]

        // New format items have imageId; old format have src (base64)
        const imageIdRefs = allItems.filter((r) => r.imageId).map((r) => r.imageId)
        const legacyItems = allItems.filter((r) => r.src && !r.imageId)

        const fetched = await fetchImageSrcs(imageIdRefs)
        Object.assign(newSrcs, fetched)

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
          if (item.imageId) return { id: item.id, imageId: item.imageId }
          const imageId = legacyIdMap[item.id]
          return imageId ? { id: item.id, imageId } : null
        }

        nextRefs = {
          character: rawChar.map(convertItem).filter(Boolean),
          monster:   rawMon.map(convertItem).filter(Boolean),
        }
      }

      setImageRefs(nextRefs)
      setImageSrcs(newSrcs)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) { skipWriteRef.current = false; return }
    setDoc(GALLERY_DOC, imageRefs).catch(console.error)
  }, [imageRefs, loaded])

  // Resolved images with src populated from imageSrcs
  const images = useMemo(() => ({
    character: (imageRefs.character ?? []).map((r) => ({ ...r, src: imageSrcs[r.imageId] ?? null })).filter((r) => r.src),
    monster:   (imageRefs.monster   ?? []).map((r) => ({ ...r, src: imageSrcs[r.imageId] ?? null })).filter((r) => r.src),
  }), [imageRefs, imageSrcs])

  // items: [{ id, src }] — same shape as old WorldGallery handleFiles output
  const addImages = useCallback(async (tab, items) => {
    const results = await Promise.all(
      items.map(async ({ id, src }) => {
        const imageId = await storeImage(src)
        return { id, imageId, src }
      })
    )
    setImageSrcs((prev) => {
      const next = { ...prev }
      results.forEach(({ imageId, src }) => { next[imageId] = src })
      return next
    })
    setImageRefs((prev) => ({
      ...prev,
      [tab]: [...prev[tab], ...results.map(({ id, imageId }) => ({ id, imageId }))],
    }))
  }, [])

  const deleteImage = useCallback((tab, id) => {
    setImageRefs((prev) => {
      const item = (prev[tab] ?? []).find((r) => r.id === id)
      if (item?.imageId) removeStoredImage(item.imageId)
      return { ...prev, [tab]: prev[tab].filter((r) => r.id !== id) }
    })
  }, [])

  const updateImage = useCallback((tab, id, changes) => {
    setImageRefs((prev) => ({
      ...prev,
      [tab]: prev[tab].map((r) => r.id === id ? { ...r, ...changes } : r),
    }))
  }, [])

  return { images, addImages, deleteImage, updateImage, loaded }
}

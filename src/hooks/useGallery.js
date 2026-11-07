import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { storeImage, fetchImageSrcs, removeStoredImage } from '../utils/imageStorage'

const GALLERY_DOC = doc(db, 'meta', 'gallery')
const DEFAULT_CATEGORIES = [
  { id: 'character', name: '角色' },
  { id: 'monster', name: '怪物' },
]
const DEFAULTS = { version: 2, categories: DEFAULT_CATEGORIES, items: [] }
let cachedData = null
let cachedImageSrcs = null

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

export default function useGallery() {
  // data: { version: 2, categories: [{ id, name }], items: [{ id, imageId, tags: [categoryId], pinnedAt? }] }
  const [data, setData] = useState(() => cachedData ?? DEFAULTS)
  const [imageSrcs, setImageSrcs] = useState(() => cachedImageSrcs ?? {})
  const [loaded, setLoaded] = useState(() => cachedData !== null && cachedImageSrcs !== null)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedData !== null && cachedImageSrcs !== null) return
    getDoc(GALLERY_DOC).then(async (snap) => {
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
          const imageId = item.imageId ?? legacyIdMap[item.id]
          if (!imageId) return null
          return {
            id: item.id,
            imageId,
            tags: item.tags ?? [],
            ...(item.pinnedAt ? { pinnedAt: item.pinnedAt } : {}),
          }
        }

        nextData = {
          version: 2,
          categories: Array.isArray(raw.categories) ? raw.categories : DEFAULT_CATEGORIES,
          items: rawItems.map(convertItem).filter(Boolean),
        }
      }

      setData(nextData)
      setImageSrcs(newSrcs)
      cachedData = nextData
      cachedImageSrcs = newSrcs
      setLoaded(true)
    }).catch(() => {
      cachedData = cachedData ?? DEFAULTS
      cachedImageSrcs = cachedImageSrcs ?? {}
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) { skipWriteRef.current = false; return }
    cachedData = data
    setDoc(GALLERY_DOC, data).catch(console.error)
  }, [data, loaded])

  const update = useCallback((fn) => {
    setData((prev) => {
      const next = fn(prev)
      cachedData = next
      return next
    })
  }, [])

  const updateItem = useCallback((id, fn) => {
    update((prev) => ({ ...prev, items: prev.items.map((item) => (item.id === id ? fn(item) : item)) }))
  }, [update])

  // Resolved images with src populated from imageSrcs, pinned first
  const images = useMemo(() => (
    sortItems(data.items)
      .map((r) => ({ ...r, pinned: Boolean(r.pinnedAt), src: imageSrcs[r.imageId] ?? null }))
      .filter((r) => r.src)
  ), [data.items, imageSrcs])

  // items: [{ id, src }]; categoryId may be null for untagged uploads
  const addImages = useCallback(async (categoryId, items) => {
    const results = await Promise.all(
      items.map(async ({ id, src }) => {
        const imageId = await storeImage(src)
        return { id, imageId, src }
      })
    )
    setImageSrcs((prev) => {
      const next = { ...prev }
      results.forEach(({ imageId, src }) => { next[imageId] = src })
      cachedImageSrcs = next
      return next
    })
    update((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        ...results.map(({ id, imageId }) => ({ id, imageId, tags: categoryId ? [categoryId] : [] })),
      ],
    }))
  }, [update])

  const deleteImage = useCallback((id) => {
    update((prev) => {
      const item = prev.items.find((r) => r.id === id)
      if (item?.imageId) removeStoredImage(item.imageId)
      return { ...prev, items: prev.items.filter((r) => r.id !== id) }
    })
  }, [update])

  const replaceImage = useCallback(async (id, src) => {
    const imageId = await storeImage(src)
    setImageSrcs((prev) => {
      const next = { ...prev, [imageId]: src }
      cachedImageSrcs = next
      return next
    })
    update((prev) => {
      const item = prev.items.find((r) => r.id === id)
      if (item?.imageId) removeStoredImage(item.imageId)
      return { ...prev, items: prev.items.map((r) => (r.id === id ? { ...r, imageId } : r)) }
    })
  }, [update])

  const togglePin = useCallback((id) => {
    updateItem(id, (item) => {
      if (!item.pinnedAt) return { ...item, pinnedAt: Date.now() }
      const rest = { ...item }
      delete rest.pinnedAt
      return rest
    })
  }, [updateItem])

  const toggleImageTag = useCallback((id, categoryId) => {
    updateItem(id, (item) => ({
      ...item,
      tags: item.tags.includes(categoryId)
        ? item.tags.filter((t) => t !== categoryId)
        : [...item.tags, categoryId],
    }))
  }, [updateItem])

  // Copy when fromId is null, otherwise move from one category to another
  const assignImageToCategory = useCallback((id, toId, fromId = null) => {
    updateItem(id, (item) => {
      const tags = item.tags.filter((t) => t !== fromId && t !== toId)
      return { ...item, tags: [...tags, toId] }
    })
  }, [updateItem])

  const addCategory = useCallback((name) => {
    const id = newCategoryId()
    update((prev) => ({ ...prev, categories: [...prev.categories, { id, name }] }))
    return id
  }, [update])

  const renameCategory = useCallback((id, name) => {
    update((prev) => ({
      ...prev,
      categories: prev.categories.map((c) => (c.id === id ? { ...c, name } : c)),
    }))
  }, [update])

  // Place category `id` right before (or after) `targetId`
  const moveCategory = useCallback((id, targetId, after = false) => {
    if (id === targetId) return
    update((prev) => {
      const moving = prev.categories.find((c) => c.id === id)
      if (!moving) return prev
      const rest = prev.categories.filter((c) => c.id !== id)
      const targetIndex = rest.findIndex((c) => c.id === targetId)
      if (targetIndex < 0) return prev
      const insertAt = after ? targetIndex + 1 : targetIndex
      return { ...prev, categories: [...rest.slice(0, insertAt), moving, ...rest.slice(insertAt)] }
    })
  }, [update])

  // Images stay in the gallery; they only lose this tag
  const deleteCategory = useCallback((id) => {
    update((prev) => ({
      ...prev,
      categories: prev.categories.filter((c) => c.id !== id),
      items: prev.items.map((item) => (
        item.tags.includes(id) ? { ...item, tags: item.tags.filter((t) => t !== id) } : item
      )),
    }))
  }, [update])

  return {
    images,
    categories: data.categories,
    addImages,
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

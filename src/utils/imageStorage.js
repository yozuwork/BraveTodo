import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

const imageSrcCache = {}

export function newImageId() {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export async function storeImage(src) {
  const id = newImageId()
  await setDoc(doc(db, 'images', id), { src })
  imageSrcCache[id] = src
  return id
}

export async function fetchImageSrcs(ids) {
  const valid = [...new Set((ids ?? []).filter((id) => typeof id === 'string' && id.startsWith('img_')))]
  if (!valid.length) return {}
  const cached = Object.fromEntries(valid.filter((id) => imageSrcCache[id]).map((id) => [id, imageSrcCache[id]]))
  const missing = valid.filter((id) => !imageSrcCache[id])
  if (!missing.length) return cached

  const snaps = await Promise.all(missing.map((id) => getDoc(doc(db, 'images', id))))
  const fetched = Object.fromEntries(snaps.filter((s) => s.exists()).map((s) => {
    const src = s.data().src
    imageSrcCache[s.id] = src
    return [s.id, src]
  }))
  return { ...cached, ...fetched }
}

export async function removeStoredImage(id) {
  if (!id || typeof id !== 'string' || !id.startsWith('img_')) return
  delete imageSrcCache[id]
  try { await deleteDoc(doc(db, 'images', id)) } catch { /* ignore */ }
}

export async function getStorageStats() {
  const [imageSnap, metaSnaps] = await Promise.all([
    getDocs(collection(db, 'images')),
    Promise.all(
      ['stages', 'gallery', 'character', 'quests', 'inbox', 'monsters', 'stories', 'skills', 'npcs', 'maps', 'levelingRules'].map(
        (name) => getDoc(doc(db, 'meta', name))
      )
    ),
  ])

  let imageBytes = 0
  let imageCount = 0
  imageSnap.forEach((d) => {
    const src = d.data().src ?? ''
    imageBytes += src.length
    imageCount++
  })

  let metaBytes = 0
  metaSnaps.forEach((snap) => {
    if (snap.exists()) metaBytes += JSON.stringify(snap.data()).length
  })

  return { imageBytes, imageCount, metaBytes, totalBytes: imageBytes + metaBytes }
}

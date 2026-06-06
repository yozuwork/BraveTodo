import { doc, getDoc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore'
import { db } from '../firebase'

export function newImageId() {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

export async function storeImage(src) {
  const id = newImageId()
  await setDoc(doc(db, 'images', id), { src })
  return id
}

export async function fetchImageSrcs(ids) {
  const valid = [...new Set((ids ?? []).filter((id) => typeof id === 'string' && id.startsWith('img_')))]
  if (!valid.length) return {}
  const snaps = await Promise.all(valid.map((id) => getDoc(doc(db, 'images', id))))
  return Object.fromEntries(snaps.filter((s) => s.exists()).map((s) => [s.id, s.data().src]))
}

export async function removeStoredImage(id) {
  if (!id || typeof id !== 'string' || !id.startsWith('img_')) return
  try { await deleteDoc(doc(db, 'images', id)) } catch { /* ignore */ }
}

export async function getStorageStats() {
  const [imageSnap, metaSnaps] = await Promise.all([
    getDocs(collection(db, 'images')),
    Promise.all(
      ['stages', 'gallery', 'character', 'quests', 'inbox', 'monsters', 'stories', 'npcs', 'maps', 'levelingRules'].map(
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

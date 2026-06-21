import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const FAVICON_KEY = 'brave-todo:favicon'
const SITE_SETTINGS_DOC = doc(db, 'meta', 'siteSettings')

export function applyFaviconUrl(faviconUrl) {
  let el = document.querySelector("link[rel~='icon']")
  if (!el) {
    el = document.createElement('link')
    el.rel = 'icon'
    document.head.appendChild(el)
  }
  el.href = faviconUrl || '/favicon.png'
}

export function getCachedFaviconUrl() {
  return localStorage.getItem(FAVICON_KEY) || null
}

export function cacheFaviconUrl(faviconUrl) {
  if (faviconUrl) {
    localStorage.setItem(FAVICON_KEY, faviconUrl)
  } else {
    localStorage.removeItem(FAVICON_KEY)
  }
}

export async function loadFaviconUrl() {
  const snap = await getDoc(SITE_SETTINGS_DOC)
  const faviconUrl = snap.exists() ? snap.data()?.faviconUrl || null : null
  cacheFaviconUrl(faviconUrl)
  applyFaviconUrl(faviconUrl)
  return faviconUrl
}

export async function saveFaviconUrl(faviconUrl) {
  await setDoc(SITE_SETTINGS_DOC, { faviconUrl: faviconUrl || null }, { merge: true })
  cacheFaviconUrl(faviconUrl)
  applyFaviconUrl(faviconUrl)
}

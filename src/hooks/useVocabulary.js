import { useCallback, useEffect, useRef, useState } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const VOCABULARY_DOC = doc(db, 'meta', 'vocabulary')
const MAX_ITEMS = 300

let cachedVocabulary = null

function normalizeText(text) {
  return String(text ?? '').replace(/\s+/g, ' ').trim()
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return []
  return items
    .map((item) => {
      const text = normalizeText(typeof item === 'string' ? item : item?.text)
      if (!text) return null
      return {
        text,
        kind: typeof item === 'object' && item?.kind ? item.kind : 'task',
        count: Math.max(1, Number(item?.count) || 1),
        lastUsed: Number(item?.lastUsed) || 0,
      }
    })
    .filter(Boolean)
}

function mergeVocabulary(prev, phrases, kind, bump) {
  const now = Date.now()
  const byKey = new Map()

  for (const item of normalizeItems(prev)) {
    byKey.set(item.text.toLocaleLowerCase(), item)
  }

  for (const phrase of phrases) {
    const text = normalizeText(phrase)
    if (!text) continue
    const key = text.toLocaleLowerCase()
    const current = byKey.get(key)

    byKey.set(key, {
      text,
      kind: current?.kind ?? kind,
      count: bump ? (current?.count ?? 0) + 1 : (current?.count ?? 1),
      lastUsed: bump ? now : (current?.lastUsed ?? 0),
    })
  }

  return [...byKey.values()]
    .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0) || (b.count || 0) - (a.count || 0))
    .slice(0, MAX_ITEMS)
}

export default function useVocabulary() {
  const [items, setItems] = useState(() => cachedVocabulary ?? [])
  const [loaded, setLoaded] = useState(() => cachedVocabulary !== null)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedVocabulary !== null) return
    getDoc(VOCABULARY_DOC).then((snap) => {
      cachedVocabulary = snap.exists() ? normalizeItems(snap.data().items) : []
      setItems(cachedVocabulary)
      setLoaded(true)
    }).catch(() => {
      cachedVocabulary = cachedVocabulary ?? []
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    cachedVocabulary = items
    setDoc(VOCABULARY_DOC, { items }).catch(console.error)
  }, [items, loaded])

  const rememberPhrase = useCallback((text, kind = 'task') => {
    setItems((prev) => mergeVocabulary(prev, [text], kind, true))
  }, [])

  const rememberPhrases = useCallback((phrases, kind = 'task') => {
    setItems((prev) => mergeVocabulary(prev, phrases, kind, false))
  }, [])

  return {
    items,
    loaded,
    rememberPhrase,
    rememberPhrases,
  }
}

import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const RULES_DOC = doc(db, 'meta', 'levelingRules')
let cachedRules = null

export const DEFAULT_RULES = [
  { id: 1, minLevel: 1,   maxLevel: 10,  expPerLevel: 3 },
  { id: 2, minLevel: 10,  maxLevel: 30,  expPerLevel: 3 },
  { id: 3, minLevel: 30,  maxLevel: 70,  expPerLevel: 3 },
  { id: 4, minLevel: 70,  maxLevel: 120, expPerLevel: 3 },
  { id: 5, minLevel: 120, maxLevel: 180, expPerLevel: 3 },
  { id: 6, minLevel: 180, maxLevel: 250, expPerLevel: 3 },
]

export default function useLevelingRules() {
  const [rules, setRules] = useState(() => cachedRules ?? DEFAULT_RULES)
  const [loaded, setLoaded] = useState(() => cachedRules !== null)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedRules !== null) return
    getDoc(RULES_DOC).then((snap) => {
      let nextRules = DEFAULT_RULES
      if (snap.exists()) {
        const saved = snap.data().items ?? []
        nextRules = DEFAULT_RULES.map((def) => {
          const s = saved.find((x) => x.id === def.id)
          return s ? { ...def, expPerLevel: Math.max(1, s.expPerLevel) } : def
        })
      }
      cachedRules = nextRules
      setRules(nextRules)
      setLoaded(true)
    }).catch(() => {
      cachedRules = cachedRules ?? DEFAULT_RULES
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    cachedRules = rules
    const toSave = rules.map(({ id, expPerLevel }) => ({ id, expPerLevel }))
    setDoc(RULES_DOC, { items: toSave }).catch(console.error)
  }, [rules, loaded])

  const updateExpPerLevel = useCallback((id, value) => {
    const parsed = parseInt(value, 10)
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, expPerLevel: isNaN(parsed) ? 1 : Math.max(1, parsed) } : r))
    )
  }, [])

  return { rules, updateExpPerLevel }
}

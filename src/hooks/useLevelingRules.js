import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { normalizeLevelingRules } from '../utils/levelingRules'

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

const normalizeSavedRules = (saved) => {
  if (!Array.isArray(saved)) return DEFAULT_RULES

  return normalizeLevelingRules(
    saved.map((item) => {
      const defaultRule = DEFAULT_RULES.find((rule) => rule.id === item?.id)
      return defaultRule ? { ...defaultRule, ...item } : item
    })
  )
}

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
        nextRules = normalizeSavedRules(saved)
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
    const toSave = rules.map(({ id, minLevel, maxLevel, expPerLevel }) => ({
      id,
      minLevel,
      maxLevel,
      expPerLevel,
    }))
    setDoc(RULES_DOC, { items: toSave }).catch(console.error)
  }, [rules, loaded])

  const updateExpPerLevel = useCallback((id, value) => {
    const parsed = parseInt(value, 10)
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, expPerLevel: isNaN(parsed) ? 1 : Math.max(1, parsed) } : r))
    )
  }, [])

  const updateLevelRange = useCallback((id, field, value) => {
    if (field !== 'minLevel' && field !== 'maxLevel') return

    const parsed = parseInt(value, 10)
    const nextValue = isNaN(parsed) ? 1 : Math.max(1, parsed)
    setRules((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r

        if (field === 'minLevel') {
          return {
            ...r,
            minLevel: nextValue,
            maxLevel: Math.max(nextValue, r.maxLevel),
          }
        }

        return {
          ...r,
          minLevel: Math.min(r.minLevel, nextValue),
          maxLevel: nextValue,
        }
      })
    )
  }, [])

  const addLevelingRule = useCallback(() => {
    setRules((prev) => {
      const normalized = normalizeLevelingRules(prev)
      const last = normalized.at(-1)
      const minLevel = last?.maxLevel ?? 1
      const nextId = Math.max(0, ...prev.map((rule) => Number(rule.id) || 0)) + 1

      return [
        ...prev,
        {
          id: nextId,
          minLevel,
          maxLevel: minLevel + 10,
          expPerLevel: 1,
        },
      ]
    })
  }, [])

  const removeLevelingRule = useCallback((id) => {
    setRules((prev) => prev.filter((rule) => rule.id !== id))
  }, [])

  return { rules, updateExpPerLevel, updateLevelRange, addLevelingRule, removeLevelingRule }
}

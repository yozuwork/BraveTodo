import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'brave-todo:leveling-rules'

export const DEFAULT_RULES = [
  { id: 1, minLevel: 1,   maxLevel: 10,  expPerLevel: 3 },
  { id: 2, minLevel: 10,  maxLevel: 30,  expPerLevel: 3 },
  { id: 3, minLevel: 30,  maxLevel: 70,  expPerLevel: 3 },
  { id: 4, minLevel: 70,  maxLevel: 120, expPerLevel: 3 },
  { id: 5, minLevel: 120, maxLevel: 180, expPerLevel: 3 },
  { id: 6, minLevel: 180, maxLevel: 250, expPerLevel: 3 },
]

function loadRules() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_RULES
    const saved = JSON.parse(raw)
    return DEFAULT_RULES.map((def) => {
      const s = saved.find((x) => x.id === def.id)
      return s ? { ...def, expPerLevel: Math.max(1, s.expPerLevel) } : def
    })
  } catch {
    return DEFAULT_RULES
  }
}

export default function useLevelingRules() {
  const [rules, setRules] = useState(loadRules)

  useEffect(() => {
    const toSave = rules.map(({ id, expPerLevel }) => ({ id, expPerLevel }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  }, [rules])

  const updateExpPerLevel = useCallback((id, value) => {
    const parsed = parseInt(value, 10)
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, expPerLevel: isNaN(parsed) ? 1 : Math.max(1, parsed) } : r))
    )
  }, [])

  return { rules, updateExpPerLevel }
}

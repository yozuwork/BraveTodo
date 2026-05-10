import { useState, useCallback, useEffect } from 'react'
import { compressImage } from '../utils/compressImage'
import { resolveImg, saveImageToDisk } from '../utils/imageSrc'

const STORAGE_KEY = 'brave-todo:monsters'

export const MONSTER_TYPES = ['minion', 'elite', 'boss', 'final_boss']

export const TYPE_CONFIG = {
  minion:    { label: '小怪',    accent: '#9ca3af', bg: '#f9fafb', text: '#4b5563' },
  elite:     { label: '精英怪',  accent: '#3b82f6', bg: '#eff6ff', text: '#1d4ed8' },
  boss:      { label: 'Boss',    accent: '#f97316', bg: '#fff7ed', text: '#c2410c' },
  final_boss:{ label: '最終Boss',accent: '#a855f7', bg: '#faf5ff', text: '#7c3aed' },
}

const DEFAULT_MONSTERS = [
  { id: 1, name: '大地守護者', recommendedLevel: 10,  type: 'boss',       avatar: null, cardW: 160, cardH: 260, huntStatus: null, huntTasks: [] },
  { id: 2, name: '炎狼暗將',   recommendedLevel: 30,  type: 'boss',       avatar: null, cardW: 160, cardH: 260, huntStatus: null, huntTasks: [] },
  { id: 3, name: '深淵支配者', recommendedLevel: 70,  type: 'boss',       avatar: null, cardW: 160, cardH: 260, huntStatus: null, huntTasks: [] },
  { id: 4, name: '天龍王',     recommendedLevel: 120, type: 'boss',       avatar: null, cardW: 160, cardH: 260, huntStatus: null, huntTasks: [] },
  { id: 5, name: '魔王',       recommendedLevel: 250, type: 'final_boss', avatar: null, cardW: 180, cardH: 280, huntStatus: null, huntTasks: [] },
]

function loadMonsters() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_MONSTERS
    const saved = JSON.parse(raw)
    // merge saved data onto defaults shape (in case new fields added)
    return saved.map((m) => ({
      ...DEFAULT_MONSTERS[0],
      huntStatus: null,
      huntTasks: [],
      ...m,
    }))
  } catch {
    return DEFAULT_MONSTERS
  }
}

export default function useMonsters() {
  const [monsters, setMonsters] = useState(loadMonsters)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(monsters))
  }, [monsters])

  const addMonster = useCallback(() => {
    setMonsters((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: '新討伐目標',
        recommendedLevel: 1,
        type: 'minion',
        avatar: null,
        cardW: 160,
        cardH: 260,
        huntStatus: null,
        huntTasks: [],
      },
    ])
  }, [])

  const updateMonster = useCallback((id, changes) => {
    setMonsters((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes } : m)))
  }, [])

  const removeMonster = useCallback((id) => {
    setMonsters((prev) => prev.filter((m) => m.id !== id))
  }, [])

  const updateMonsterAvatar = useCallback((id, file) => {
    if (!file) return
    compressImage(file).then(async (dataUrl) => {
      const relPath = await saveImageToDisk(dataUrl, `uploads/monsters/${id}.jpg`)
      const stored = relPath ?? dataUrl
      setMonsters((prev) => prev.map((m) => (m.id === id ? { ...m, avatar: stored } : m)))
    })
  }, [])

  // ── Hunt management ──────────────────────────────────────────────

  const startHunt = useCallback((id) => {
    setMonsters((prev) => prev.map((m) => (m.id === id ? { ...m, huntStatus: 'hunting' } : m)))
  }, [])

  const stopHunt = useCallback((id) => {
    setMonsters((prev) => prev.map((m) => (m.id === id ? { ...m, huntStatus: null } : m)))
  }, [])

  const addHuntTask = useCallback((monsterId, text, taskId = Date.now()) => {
    setMonsters((prev) =>
      prev.map((m) => {
        if (m.id !== monsterId) return m
        if (m.huntTasks.length >= 10) return m
        return {
          ...m,
          huntTasks: [
            ...m.huntTasks,
            { id: taskId, text, completed: false },
          ],
        }
      })
    )
  }, [])

  const toggleHuntTask = useCallback((monsterId, taskId) => {
    setMonsters((prev) =>
      prev.map((m) => {
        if (m.id !== monsterId) return m
        return {
          ...m,
          huntTasks: m.huntTasks.map((t) =>
            t.id === taskId ? { ...t, completed: !t.completed } : t
          ),
        }
      })
    )
  }, [])

  const removeHuntTask = useCallback((monsterId, taskId) => {
    setMonsters((prev) =>
      prev.map((m) => {
        if (m.id !== monsterId) return m
        return {
          ...m,
          huntTasks: m.huntTasks.filter((t) => t.id !== taskId),
        }
      })
    )
  }, [])

  const updateHuntTask = useCallback((monsterId, taskId, text) => {
    setMonsters((prev) =>
      prev.map((m) => {
        if (m.id !== monsterId) return m
        return {
          ...m,
          huntTasks: m.huntTasks.map((t) =>
            t.id === taskId ? { ...t, text } : t
          ),
        }
      })
    )
  }, [])

  return {
    monsters,
    addMonster,
    updateMonster,
    removeMonster,
    updateMonsterAvatar,
    startHunt,
    stopHunt,
    addHuntTask,
    toggleHuntTask,
    removeHuntTask,
    updateHuntTask,
  }
}

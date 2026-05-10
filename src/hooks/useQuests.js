import { useState, useCallback, useEffect } from 'react'
import coinSfxUrl from '../assets/music/Heavy object Hit and body thud sound effect.mp3'
import { isSoundEnabled } from '../utils/soundSettings'

const STORAGE_KEY_QUESTS = 'brave-todo:quests'
const STORAGE_KEY_COMPLETIONS = 'brave-todo:lifetimeCompletions'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

const _questCompleteAudio = new Audio(coinSfxUrl)
_questCompleteAudio.volume = 0.65

function normalizeQuestExpValue(expValue) {
  // legacy support: old "中等" used 2
  if (expValue === 2) return 3
  if (expValue === 1 || expValue === 3 || expValue === 5 || expValue === 10) return expValue
  return 1
}

export function playQuestCompleteSound() {
  if (!isSoundEnabled()) return
  _questCompleteAudio.currentTime = 0
  void _questCompleteAudio.play().catch(() => {})
}

export default function useQuests() {
  const [quests, setQuests] = useState(() => loadJSON(STORAGE_KEY_QUESTS, []))
  const [lifetimeCompletions, setLifetimeCompletions] = useState(
    () => loadJSON(STORAGE_KEY_COMPLETIONS, 0)
  )

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_QUESTS, JSON.stringify(quests))
  }, [quests])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_COMPLETIONS, JSON.stringify(lifetimeCompletions))
  }, [lifetimeCompletions])

  const addQuest = useCallback((text) => {
    setQuests((prev) => [
      {
        id: Date.now(),
        text,
        completed: false,
        isCore: false,
        pinned: false,
        priority: 'normal',
        huntBinding: null, // { targetType: 'monster'|'stageBoss', targetId: number, taskId: number } | null
        subTasks: [],
      },
      ...prev,
    ])
  }, [])

  const setQuestPriority = useCallback((id, priority) => {
    setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, priority } : q)))
  }, [])

  const togglePin = useCallback((id) => {
    setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, pinned: !q.pinned } : q)))
  }, [])

  const setQuestCompleted = useCallback((id, completed) => {
    let completionDelta = 0
    setQuests((prev) => {
      const target = prev.find((q) => q.id === id)
      if (!target) return prev
      if (target.completed === completed) return prev
      const exp = normalizeQuestExpValue(target.expValue)
      completionDelta = completed ? exp : -exp
      return prev.map((q) => (q.id === id ? { ...q, completed } : q))
    })
    if (completionDelta !== 0) {
      setLifetimeCompletions((c) => Math.max(0, c + completionDelta))
    }
  }, [])

  const toggleQuest = useCallback((id) => {
    let nextCompleted = null
    setQuests((prev) => {
      const target = prev.find((q) => q.id === id)
      if (!target) return prev
      nextCompleted = !target.completed
      return prev
    })
    if (nextCompleted !== null) setQuestCompleted(id, nextCompleted)
  }, [setQuestCompleted])

  const bindQuestToHuntTask = useCallback((questId, binding) => {
    setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, huntBinding: binding } : q)))
  }, [])

  const unbindQuestFromHuntTask = useCallback((questId) => {
    setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, huntBinding: null } : q)))
  }, [])

  const updateQuestExp = useCallback((id, expValue) => {
    setQuests((prev) => prev.map((q) => q.id === id ? { ...q, expValue } : q))
  }, [])

  const removeQuest = useCallback((id) => {
    setQuests((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const updateQuest = useCallback((id, text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, text: trimmed } : q)))
  }, [])

  const toggleCoreTask = useCallback((id) => {
    setQuests((prev) =>
      prev.map((q) => ({
        ...q,
        isCore: q.id === id ? !q.isCore : false,
      }))
    )
  }, [])

  const addSubTask = useCallback((questId, text) => {
    setQuests((prev) =>
      prev.map((q) =>
        q.id === questId
          ? { ...q, subTasks: [...(q.subTasks ?? []), { id: Date.now(), text, completed: false }] }
          : q
      )
    )
  }, [])

  const toggleSubTask = useCallback((questId, subTaskId) => {
    let shouldPlay = false
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== questId) return q
        const updated = (q.subTasks ?? []).map((s) => {
          if (s.id !== subTaskId) return s
          if (!s.completed) shouldPlay = true
          return { ...s, completed: !s.completed }
        })
        return { ...q, subTasks: updated }
      })
    )
    if (shouldPlay) playQuestCompleteSound()
    // 子任務不計入 EXP，只有完成主任務才根據 expValue 給予 EXP
  }, [])

  const removeSubTask = useCallback((questId, subTaskId) => {
    setQuests((prev) =>
      prev.map((q) =>
        q.id === questId
          ? { ...q, subTasks: (q.subTasks ?? []).filter((s) => s.id !== subTaskId) }
          : q
      )
    )
  }, [])

  const updateSubTask = useCallback((questId, subTaskId, text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setQuests((prev) =>
      prev.map((q) =>
        q.id === questId
          ? { ...q, subTasks: (q.subTasks ?? []).map((s) => s.id === subTaskId ? { ...s, text: trimmed } : s) }
          : q
      )
    )
  }, [])

  const reorderQuests = useCallback((fromId, toId, insertBefore) => {
    setQuests((prev) => {
      const fromIdx = prev.findIndex((q) => q.id === fromId)
      const toIdx = prev.findIndex((q) => q.id === toId)
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev
      const result = [...prev]
      const [removed] = result.splice(fromIdx, 1)
      const newToIdx = result.findIndex((q) => q.id === toId)
      result.splice(insertBefore ? newToIdx : newToIdx + 1, 0, removed)
      return result
    })
  }, [])

  const clearCompleted = useCallback(() => {
    setQuests((prev) => prev.filter((q) => !q.completed))
  }, [])

  const resetLifetimeCompletions = useCallback((value) => {
    setLifetimeCompletions(Math.max(0, value))
  }, [])

  const coreQuest = quests.find((q) => q.isCore) ?? null
  const coreTaskCompleted = coreQuest?.completed ?? false

  return {
    quests,
    addQuest,
    toggleQuest,
    setQuestCompleted,
    updateQuest,
    removeQuest,
    togglePin,
    toggleCoreTask,
    setQuestPriority,
    updateQuestExp,
    reorderQuests,
    clearCompleted,
    bindQuestToHuntTask,
    unbindQuestFromHuntTask,
    addSubTask,
    toggleSubTask,
    removeSubTask,
    updateSubTask,
    lifetimeCompletions,
    resetLifetimeCompletions,
    coreTaskCompleted,
  }
}

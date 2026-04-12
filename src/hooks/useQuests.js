import { useState, useCallback, useEffect } from 'react'
import coinSfxUrl from '../assets/music/Heavy object Hit and body thud sound effect.mp3'

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

export function playQuestCompleteSound() {
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
        subTasks: [],
      },
      ...prev,
    ])
  }, [])

  const toggleQuest = useCallback((id) => {
    let completionDelta = 0
    setQuests((prev) => {
      const target = prev.find((q) => q.id === id)
      if (!target) return prev
      completionDelta = target.completed ? -1 : 1
      return prev.map((q) => (q.id === id ? { ...q, completed: !q.completed } : q))
    })
    if (completionDelta !== 0) {
      setLifetimeCompletions((c) => Math.max(0, c + completionDelta))
    }
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
    let completionDelta = 0
    let shouldPlay = false
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== questId) return q
        const updated = (q.subTasks ?? []).map((s) => {
          if (s.id !== subTaskId) return s
          if (!s.completed) { completionDelta = 1; shouldPlay = true }
          else { completionDelta = -1 }
          return { ...s, completed: !s.completed }
        })
        return { ...q, subTasks: updated }
      })
    )
    if (shouldPlay) playQuestCompleteSound()
    if (completionDelta !== 0) {
      setLifetimeCompletions((c) => Math.max(0, c + completionDelta))
    }
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
    updateQuest,
    removeQuest,
    toggleCoreTask,
    clearCompleted,
    addSubTask,
    toggleSubTask,
    removeSubTask,
    updateSubTask,
    lifetimeCompletions,
    resetLifetimeCompletions,
    coreTaskCompleted,
  }
}

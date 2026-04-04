import { useState, useCallback } from 'react'
import coinSfxUrl from '../assets/music/coin03.mp3'

function playQuestCompleteSound() {
  const audio = new Audio(coinSfxUrl)
  audio.volume = 0.65
  void audio.play().catch(() => {})
}

export default function useQuests() {
  const [quests, setQuests] = useState([])
  const [lifetimeCompletions, setLifetimeCompletions] = useState(0)

  const addQuest = useCallback((text) => {
    setQuests((prev) => [
      ...prev,
      {
        id: Date.now(),
        text,
        completed: false,
        isCore: false,
      },
    ])
  }, [])

  const toggleQuest = useCallback((id) => {
    let shouldPlay = false
    let completionDelta = 0
    setQuests((prev) => {
      const target = prev.find((q) => q.id === id)
      if (!target) return prev
      if (!target.completed) {
        shouldPlay = true
        completionDelta = 1
      } else {
        completionDelta = -1
      }
      return prev.map((q) => (q.id === id ? { ...q, completed: !q.completed } : q))
    })
    if (shouldPlay) playQuestCompleteSound()
    if (completionDelta !== 0) {
      setLifetimeCompletions((c) => Math.max(0, c + completionDelta))
    }
  }, [])

  const removeQuest = useCallback((id) => {
    setQuests((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const toggleCoreTask = useCallback((id) => {
    setQuests((prev) =>
      prev.map((q) => ({
        ...q,
        isCore: q.id === id ? !q.isCore : false,
      }))
    )
  }, [])

  const clearCompleted = useCallback(() => {
    setQuests((prev) => prev.filter((q) => !q.completed))
  }, [])

  const coreQuest = quests.find((q) => q.isCore) ?? null
  const coreTaskCompleted = coreQuest?.completed ?? false

  return { quests, addQuest, toggleQuest, removeQuest, toggleCoreTask, clearCompleted, lifetimeCompletions, coreTaskCompleted }
}

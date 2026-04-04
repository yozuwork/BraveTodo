import { useState, useCallback } from 'react'

export default function useQuests() {
  const [quests, setQuests] = useState([])

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
    setQuests((prev) =>
      prev.map((q) => (q.id === id ? { ...q, completed: !q.completed } : q))
    )
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

  const completedCount = quests.filter((q) => q.completed).length
  const coreQuest = quests.find((q) => q.isCore) ?? null
  const coreTaskCompleted = coreQuest?.completed ?? false

  return { quests, addQuest, toggleQuest, removeQuest, toggleCoreTask, clearCompleted, completedCount, coreTaskCompleted }
}

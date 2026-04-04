import { useState, useCallback } from 'react'

const EXP_MAP = { common: 100, rare: 200, legendary: 500 }

function getRandomRarity() {
  const rand = Math.random()
  if (rand < 0.15) return 'legendary'
  if (rand < 0.45) return 'rare'
  return 'common'
}

export default function useQuests() {
  const [quests, setQuests] = useState([])

  const addQuest = useCallback((text) => {
    const rarity = getRandomRarity()
    setQuests((prev) => [
      ...prev,
      {
        id: Date.now(),
        text,
        rarity,
        exp: EXP_MAP[rarity],
        completed: false,
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

  const completedCount = quests.filter((q) => q.completed).length
  const totalExp = quests.filter((q) => q.completed).reduce((sum, q) => sum + q.exp, 0)

  return { quests, addQuest, toggleQuest, removeQuest, completedCount, totalExp }
}

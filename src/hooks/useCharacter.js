import { useState, useCallback, useMemo } from 'react'
import defaultAvatar from '../assets/hero.jpg'

const BASE_STATS = { atk: 5, def: 5, spd: 5 }

// LV1-5: 每3個完成任務升一級（升到LV6共需15個）
// LV6-10: 每5個完成任務升一級
function calcLevelInfo(completedCount) {
  if (completedCount < 15) {
    const level = Math.floor(completedCount / 3) + 1
    const progress = ((completedCount % 3) / 3) * 100
    return { level, expProgress: progress }
  }
  const tasksAfterLv5 = completedCount - 15
  const level = Math.min(10, 6 + Math.floor(tasksAfterLv5 / 5))
  if (level >= 10) return { level: 10, expProgress: 100 }
  const progress = ((tasksAfterLv5 % 5) / 5) * 100
  return { level, expProgress: progress }
}

export default function useCharacter(completedCount, coreTaskCompleted) {
  const [avatar, setAvatar] = useState(defaultAvatar)
  const [isEditMode, setIsEditMode] = useState(false)
  const [imagePosition, setImagePosition] = useState({ x: 50, y: 50 })

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev)
  }, [])

  const updateAvatar = useCallback((file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => setAvatar(e.target.result)
    reader.readAsDataURL(file)
  }, [])

  const updateImagePosition = useCallback((pos) => {
    setImagePosition(pos)
  }, [])

  const { level, expProgress } = useMemo(
    () => calcLevelInfo(completedCount),
    [completedCount]
  )

  const coreTaskProgress = coreTaskCompleted ? 100 : 0

  const stats = useMemo(
    () => ({
      atk: { value: BASE_STATS.atk + level * 5, bonus: level * 5 },
      def: { value: BASE_STATS.def + level * 2, bonus: level * 2 },
      spd: { value: BASE_STATS.spd + level * 3, bonus: level * 3 },
    }),
    [level]
  )

  return {
    avatar,
    isEditMode,
    toggleEditMode,
    updateAvatar,
    imagePosition,
    updateImagePosition,
    level,
    expProgress,
    coreTaskProgress,
    stats,
  }
}

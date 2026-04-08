import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import defaultAvatar from '../assets/hero.jpg'
import levelUpSfxUrl from '../assets/music/Key Item Get (The Legend of Zelda Breath of the Wild OST).mp3'

const STORAGE_KEY_AVATAR = 'brave-todo:avatar'
const STORAGE_KEY_IMG_POS = 'brave-todo:imagePosition'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function playLevelUpSound() {
  const audio = new Audio(levelUpSfxUrl)
  audio.volume = 0.75
  void audio.play().catch(() => {})
}

const BASE_STATS = { atk: 5, def: 5, spd: 5 }

// LV1-5:  每3個完成任務升一級（升到LV6共需15個）
// LV6-10: 每5個完成任務升一級（LV10需再25個，累計40個）
// LV11+:  每10個完成任務升一級（最高LV120）
const TASKS_TO_LV6 = 15  // 5 levels × 3 tasks
const TASKS_TO_LV10 = 40 // 15 + 5 levels × 5 tasks

function calcLevelInfo(lifetimeCompletions) {
  if (lifetimeCompletions < TASKS_TO_LV6) {
    const level = Math.floor(lifetimeCompletions / 3) + 1
    const progress = ((lifetimeCompletions % 3) / 3) * 100
    return { level, expProgress: progress }
  }

  if (lifetimeCompletions < TASKS_TO_LV10) {
    const tasksAfterLv5 = lifetimeCompletions - TASKS_TO_LV6
    const level = 6 + Math.floor(tasksAfterLv5 / 5)
    const progress = ((tasksAfterLv5 % 5) / 5) * 100
    return { level, expProgress: progress }
  }

  const tasksAfterLv10 = lifetimeCompletions - TASKS_TO_LV10
  const level = Math.min(120, 11 + Math.floor(tasksAfterLv10 / 10))
  if (level >= 120) return { level: 120, expProgress: 100 }
  const progress = ((tasksAfterLv10 % 10) / 10) * 100
  return { level, expProgress: progress }
}

export default function useCharacter(lifetimeCompletions, coreTaskCompleted) {
  const [avatar, setAvatar] = useState(
    () => localStorage.getItem(STORAGE_KEY_AVATAR) || defaultAvatar
  )
  const [isEditMode, setIsEditMode] = useState(false)
  const [imagePosition, setImagePosition] = useState(
    () => loadJSON(STORAGE_KEY_IMG_POS, { x: 50, y: 50 })
  )
  const prevLevelRef = useRef(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_AVATAR, avatar)
  }, [avatar])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_IMG_POS, JSON.stringify(imagePosition))
  }, [imagePosition])

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
    () => calcLevelInfo(lifetimeCompletions),
    [lifetimeCompletions]
  )

  useEffect(() => {
    if (prevLevelRef.current !== null && level > prevLevelRef.current) {
      playLevelUpSound()
    }
    prevLevelRef.current = level
  }, [level])

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

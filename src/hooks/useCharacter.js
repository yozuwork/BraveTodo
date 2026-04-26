import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import defaultAvatar from '../assets/hero.jpg'
import { compressImage } from '../utils/compressImage'
import { resolveImg, saveImageToDisk } from '../utils/imageSrc'
import levelUpSfxUrl from '../assets/music/Key Item Get (The Legend of Zelda Breath of the Wild OST).mp3'
import { isSoundEnabled } from '../utils/soundSettings'

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
  if (!isSoundEnabled()) return
  const audio = new Audio(levelUpSfxUrl)
  audio.volume = 0.75
  void audio.play().catch(() => {})
}

const BASE_STATS = { atk: 5, def: 5, spd: 5 }

function calcLevelInfo(lifetimeCompletions, rules) {
  let remaining = lifetimeCompletions

  for (const rule of rules) {
    const levelsInRange = rule.maxLevel - rule.minLevel
    const tasksForRange = levelsInRange * rule.expPerLevel

    if (remaining < tasksForRange) {
      const levelsGained = Math.floor(remaining / rule.expPerLevel)
      const level = rule.minLevel + levelsGained
      const progress = ((remaining % rule.expPerLevel) / rule.expPerLevel) * 100
      return { level, expProgress: progress }
    }

    remaining -= tasksForRange
  }

  return { level: rules[rules.length - 1].maxLevel, expProgress: 100 }
}

export default function useCharacter(lifetimeCompletions, coreTaskCompleted, levelingRules) {
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
    compressImage(file).then(async (dataUrl) => {
      const relPath = await saveImageToDisk(dataUrl, 'uploads/character/avatar.jpg')
      const stored = relPath ? `${relPath}?t=${Date.now()}` : dataUrl
      setAvatar(stored)
    })
  }, [])

  const updateImagePosition = useCallback((pos) => {
    setImagePosition(pos)
  }, [])

  const { level, expProgress } = useMemo(
    () => calcLevelInfo(lifetimeCompletions, levelingRules),
    [lifetimeCompletions, levelingRules]
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

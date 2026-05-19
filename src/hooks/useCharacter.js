import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import defaultAvatar from '../assets/hero.jpg'
import { compressImage } from '../utils/compressImage'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import levelUpSfxUrl from '../assets/music/Key Item Get (The Legend of Zelda Breath of the Wild OST).mp3'
import { isSoundEnabled } from '../utils/soundSettings'

const CHARACTER_DOC = doc(db, 'meta', 'character')
let cachedAvatar = null
let cachedImagePosition = null

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
  const [avatar, setAvatar] = useState(() => cachedAvatar ?? defaultAvatar)
  const [isEditMode, setIsEditMode] = useState(false)
  const [imagePosition, setImagePosition] = useState(() => cachedImagePosition ?? { x: 50, y: 50 })
  const [loaded, setLoaded] = useState(false)
  const skipWriteRef = useRef(true)
  const prevLevelRef = useRef(null)

  useEffect(() => {
    getDoc(CHARACTER_DOC).then((snap) => {
      let nextAvatar = cachedAvatar ?? defaultAvatar
      let nextImagePosition = cachedImagePosition ?? { x: 50, y: 50 }

      if (snap.exists()) {
        const data = snap.data()
        if (data.avatar) nextAvatar = data.avatar
        if (data.imagePosition) nextImagePosition = data.imagePosition
      }

      cachedAvatar = nextAvatar
      cachedImagePosition = nextImagePosition
      setAvatar(nextAvatar)
      setImagePosition(nextImagePosition)
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    cachedAvatar = avatar
    cachedImagePosition = imagePosition
    setDoc(CHARACTER_DOC, { avatar, imagePosition }).catch(console.error)
  }, [avatar, imagePosition, loaded])

  const toggleEditMode = useCallback(() => {
    setIsEditMode((prev) => !prev)
  }, [])

  const updateAvatar = useCallback((file) => {
    if (!file) return
    if (typeof file === 'string') {
      cachedAvatar = file
      setAvatar(file)
      return
    }
    compressImage(file).then((dataUrl) => {
      cachedAvatar = dataUrl
      setAvatar(dataUrl)
    })
  }, [])

  const updateImagePosition = useCallback((pos) => {
    cachedImagePosition = pos
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

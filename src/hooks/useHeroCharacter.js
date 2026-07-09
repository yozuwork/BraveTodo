import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import defaultAvatar from '../assets/hero.jpg'
import { compressImage } from '../utils/compressImage'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { calcLevelInfo } from '../utils/levelingRules'

const HERO_CHARACTER_DOC = doc(db, 'meta', 'heroCharacter')
let cachedHeroAvatar = null
let cachedHeroImagePosition = null
let cachedHeroGold = 0
let cachedHeroCharacterLoaded = false

export default function useHeroCharacter(lifetimeCompletions, levelingRules) {
  const [avatar, setAvatar] = useState(() => cachedHeroAvatar ?? defaultAvatar)
  const [imagePosition, setImagePosition] = useState(() => cachedHeroImagePosition ?? { x: 50, y: 50 })
  const [gold, setGold] = useState(() => cachedHeroGold ?? 0)
  const [loaded, setLoaded] = useState(() => cachedHeroCharacterLoaded)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedHeroCharacterLoaded) return
    getDoc(HERO_CHARACTER_DOC).then((snap) => {
      let nextAvatar = cachedHeroAvatar ?? defaultAvatar
      let nextImagePosition = cachedHeroImagePosition ?? { x: 50, y: 50 }
      let nextGold = cachedHeroGold ?? 0

      if (snap.exists()) {
        const data = snap.data()
        if (data.avatar) nextAvatar = data.avatar
        if (data.imagePosition) nextImagePosition = data.imagePosition
        if (typeof data.gold === 'number') nextGold = data.gold
      }

      cachedHeroAvatar = nextAvatar
      cachedHeroImagePosition = nextImagePosition
      cachedHeroGold = nextGold
      cachedHeroCharacterLoaded = true
      setAvatar(nextAvatar)
      setImagePosition(nextImagePosition)
      setGold(nextGold)
      setLoaded(true)
    }).catch(() => {
      cachedHeroCharacterLoaded = true
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    cachedHeroAvatar = avatar
    cachedHeroImagePosition = imagePosition
    cachedHeroGold = gold
    cachedHeroCharacterLoaded = true
    setDoc(HERO_CHARACTER_DOC, { avatar, imagePosition, gold }).catch(console.error)
  }, [avatar, imagePosition, gold, loaded])

  const updateAvatar = useCallback((file) => {
    if (!file) return
    if (typeof file === 'string') {
      cachedHeroAvatar = file
      setAvatar(file)
      return
    }
    compressImage(file).then((dataUrl) => {
      cachedHeroAvatar = dataUrl
      setAvatar(dataUrl)
    })
  }, [])

  const updateImagePosition = useCallback((pos) => {
    cachedHeroImagePosition = pos
    setImagePosition(pos)
  }, [])

  const adjustGold = useCallback((delta) => {
    const parsed = Number(delta)
    if (!Number.isFinite(parsed) || parsed === 0) return
    setGold((prev) => {
      const next = Math.max(0, prev + parsed)
      cachedHeroGold = next
      return next
    })
  }, [])

  const resetGold = useCallback(() => {
    cachedHeroGold = 0
    setGold(0)
  }, [])

  const { level, expProgress } = useMemo(
    () => calcLevelInfo(lifetimeCompletions, levelingRules),
    [lifetimeCompletions, levelingRules]
  )

  return {
    avatar,
    updateAvatar,
    imagePosition,
    updateImagePosition,
    gold,
    adjustGold,
    resetGold,
    level,
    expProgress,
  }
}

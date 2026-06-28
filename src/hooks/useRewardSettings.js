import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const REWARD_SETTINGS_DOC = doc(db, 'meta', 'rewardSettings')

export const DEFAULT_REWARD_SETTINGS = [
  { key: '1', label: '一般', expValue: 1, gold: 1, tone: 'stone' },
  { key: '3', label: '中等', expValue: 3, gold: 5, tone: 'sky' },
  { key: '5', label: '上等', expValue: 5, gold: 10, tone: 'amber' },
  { key: '10', label: '特級', expValue: 10, gold: 50, tone: 'orange' },
  { key: '20', label: '特殊任務', expValue: 20, gold: 100, tone: 'orange' },
]

let cachedRewardSettings = null

const normalizeSettings = (saved) => {
  if (!Array.isArray(saved)) return DEFAULT_REWARD_SETTINGS

  return DEFAULT_REWARD_SETTINGS.map((item) => {
    const matched = saved.find((entry) => String(entry?.expValue) === String(item.expValue))
    const gold = Number(matched?.gold)
    return {
      ...item,
      gold: Number.isFinite(gold) && gold >= 0 ? gold : item.gold,
    }
  })
}

export default function useRewardSettings() {
  const [rewardSettings, setRewardSettings] = useState(() => cachedRewardSettings ?? DEFAULT_REWARD_SETTINGS)
  const [loaded, setLoaded] = useState(() => cachedRewardSettings !== null)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedRewardSettings !== null) return
    getDoc(REWARD_SETTINGS_DOC).then((snap) => {
      let nextSettings = DEFAULT_REWARD_SETTINGS
      if (snap.exists()) {
        nextSettings = normalizeSettings(snap.data().items ?? [])
      }
      cachedRewardSettings = nextSettings
      setRewardSettings(nextSettings)
      setLoaded(true)
    }).catch(() => {
      cachedRewardSettings = cachedRewardSettings ?? DEFAULT_REWARD_SETTINGS
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    cachedRewardSettings = rewardSettings
    const toSave = rewardSettings.map(({ key, label, expValue, gold }) => ({
      key,
      label,
      expValue,
      gold,
    }))
    setDoc(REWARD_SETTINGS_DOC, { items: toSave }).catch(console.error)
  }, [rewardSettings, loaded])

  const updateRewardGold = useCallback((expValue, value) => {
    const parsed = parseInt(value, 10)
    const nextGold = Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
    setRewardSettings((prev) => prev.map((item) => (
      item.expValue === expValue ? { ...item, gold: nextGold } : item
    )))
  }, [])

  return {
    rewardSettings,
    updateRewardGold,
    loaded,
  }
}

import { useState, useCallback, useEffect, useRef } from 'react'
import { getDoc, setDoc } from 'firebase/firestore'
import { wsDoc } from '../utils/workspace'
import { DEFAULT_AUTO_EXP_SETTINGS, normalizeAutoExpSettings } from '../utils/questAutoExp'

const REWARD_SETTINGS_DOC = wsDoc('rewardSettings')

export const DEFAULT_REWARD_SETTINGS = [
  { key: '1', label: '一般', expValue: 1, gold: 1, color: '#9ca3af', tone: 'stone' },
  { key: '3', label: '中等', expValue: 3, gold: 5, color: '#60a5fa', tone: 'sky' },
  { key: '5', label: '上等', expValue: 5, gold: 10, color: '#eab308', tone: 'amber' },
  { key: '10', label: '特級', expValue: 10, gold: 50, color: '#f97316', tone: 'orange' },
  { key: '20', label: '特殊任務', expValue: 20, gold: 100, color: '#f43f5e', tone: 'orange' },
]

let cachedRewardSettings = null
let cachedAutoExpSettings = null

const normalizeSettings = (saved) => {
  if (!Array.isArray(saved)) return DEFAULT_REWARD_SETTINGS

  return DEFAULT_REWARD_SETTINGS.map((item) => {
    const matched = saved.find((entry) => String(entry?.expValue) === String(item.expValue))
    const gold = Number(matched?.gold)
    const color = typeof matched?.color === 'string' && /^#[0-9a-f]{6}$/i.test(matched.color)
      ? matched.color
      : item.color
    return {
      ...item,
      gold: Number.isFinite(gold) && gold >= 0 ? gold : item.gold,
      color,
    }
  })
}

export default function useRewardSettings() {
  const [rewardSettings, setRewardSettings] = useState(() => cachedRewardSettings ?? DEFAULT_REWARD_SETTINGS)
  const [autoExpSettings, setAutoExpSettings] = useState(() => cachedAutoExpSettings ?? DEFAULT_AUTO_EXP_SETTINGS)
  const [loaded, setLoaded] = useState(() => cachedRewardSettings !== null)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedRewardSettings !== null) return
    getDoc(REWARD_SETTINGS_DOC).then((snap) => {
      let nextSettings = DEFAULT_REWARD_SETTINGS
      if (snap.exists()) {
        nextSettings = normalizeSettings(snap.data().items ?? [])
        cachedAutoExpSettings = normalizeAutoExpSettings(snap.data().autoExp)
      }
      cachedRewardSettings = nextSettings
      cachedAutoExpSettings = cachedAutoExpSettings ?? DEFAULT_AUTO_EXP_SETTINGS
      setRewardSettings(nextSettings)
      setAutoExpSettings(cachedAutoExpSettings)
      setLoaded(true)
    }).catch(() => {
      cachedRewardSettings = cachedRewardSettings ?? DEFAULT_REWARD_SETTINGS
      cachedAutoExpSettings = cachedAutoExpSettings ?? DEFAULT_AUTO_EXP_SETTINGS
      setAutoExpSettings(cachedAutoExpSettings)
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
    cachedAutoExpSettings = autoExpSettings
    const toSave = rewardSettings.map(({ key, label, expValue, gold, color }) => ({
      key,
      label,
      expValue,
      gold,
      color,
    }))
    setDoc(REWARD_SETTINGS_DOC, { items: toSave, autoExp: autoExpSettings }).catch(console.error)
  }, [autoExpSettings, rewardSettings, loaded])

  const updateRewardGold = useCallback((expValue, value) => {
    const parsed = parseInt(value, 10)
    const nextGold = Number.isNaN(parsed) ? 0 : Math.max(0, parsed)
    setRewardSettings((prev) => prev.map((item) => (
      item.expValue === expValue ? { ...item, gold: nextGold } : item
    )))
  }, [])

  const updateRewardColor = useCallback((expValue, color) => {
    if (!/^#[0-9a-f]{6}$/i.test(color)) return
    setRewardSettings((prev) => prev.map((item) => (
      item.expValue === expValue ? { ...item, color } : item
    )))
  }, [])

  const setAutoExpEnabled = useCallback((enabled) => {
    setAutoExpSettings((prev) => ({ ...prev, enabled: Boolean(enabled) }))
  }, [])

  const updateAutoExpThreshold = useCallback((expValue, value) => {
    const parsed = parseInt(value, 10)
    const nextThreshold = Number.isNaN(parsed) ? 1 : Math.max(1, parsed)
    setAutoExpSettings((prev) => ({
      ...prev,
      thresholds: { ...prev.thresholds, [String(expValue)]: nextThreshold },
    }))
  }, [])

  return {
    rewardSettings,
    updateRewardGold,
    updateRewardColor,
    autoExpSettings,
    setAutoExpEnabled,
    updateAutoExpThreshold,
    loaded,
  }
}

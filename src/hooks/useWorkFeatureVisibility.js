import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'brave-todo:work-feature-visibility'
const CHANGE_EVENT = 'brave-todo:work-feature-visibility-change'

export const WORK_FEATURE_OPTIONS = [
  { key: 'Hunt', label: '討伐', description: '討伐目標與戰鬥任務' },
  { key: 'RewardShop', label: '獎勵商店', description: '金幣獎勵與兑換內容' },
  { key: 'Story', label: '故事', description: '故事卡與冒險紀錄' },
  { key: 'Npc', label: 'NPC', description: '角色與關係設定' },
  { key: 'Map', label: '地圖', description: '世界地圖與探索備註' },
  { key: 'Skills', label: 'SKILL', description: '技能與能力卡片' },
  { key: 'Inbox', label: '收集箱', description: '尚未整理的任務想法' },
]

const DEFAULT_VISIBILITY = Object.fromEntries(
  WORK_FEATURE_OPTIONS.map((feature) => [feature.key, true]),
)

function readVisibility() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return { ...DEFAULT_VISIBILITY, ...stored }
  } catch {
    return { ...DEFAULT_VISIBILITY }
  }
}

export default function useWorkFeatureVisibility() {
  const [visibility, setVisibility] = useState(readVisibility)

  useEffect(() => {
    const sync = () => setVisibility(readVisibility())
    window.addEventListener(CHANGE_EVENT, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync)
      window.removeEventListener('storage', sync)
    }
  }, [])

  const save = useCallback((next) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setVisibility(next)
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: next }))
  }, [])

  const setFeatureVisible = useCallback((key, visible) => {
    save({ ...readVisibility(), [key]: Boolean(visible) })
  }, [save])

  const resetVisibility = useCallback(() => save({ ...DEFAULT_VISIBILITY }), [save])

  return {
    visibility,
    isVisible: useCallback((key) => key === 'Tasks' || visibility[key] !== false, [visibility]),
    setFeatureVisible,
    resetVisibility,
  }
}

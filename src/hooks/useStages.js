import { useState, useCallback, useEffect } from 'react'
import defaultAvatar from '../assets/hero.jpg'

const STORAGE_KEY = 'brave-todo:stages'

const DEFAULT_STAGES = [
  { id: 1, minLevel: 1, maxLevel: 10, className: '初心者', avatar: null },
  { id: 2, minLevel: 10, maxLevel: 30, className: '見習戰士', avatar: null },
  { id: 3, minLevel: 30, maxLevel: 70, className: '冒險者', avatar: null },
  { id: 4, minLevel: 70, maxLevel: 120, className: '英雄', avatar: null },
]

function loadStages() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_STAGES
    const saved = JSON.parse(raw)
    return DEFAULT_STAGES.map((def) => {
      const s = saved.find((x) => x.id === def.id)
      return s ? { ...def, className: s.className, avatar: s.avatar } : def
    })
  } catch {
    return DEFAULT_STAGES
  }
}

export default function useStages() {
  const [stages, setStages] = useState(loadStages)

  useEffect(() => {
    const toSave = stages.map(({ id, className, avatar }) => ({ id, className, avatar }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  }, [stages])

  const getStageAvatar = useCallback(
    (stage) => stage.avatar || defaultAvatar,
    []
  )

  const updateStageName = useCallback((id, newName) => {
    setStages((prev) =>
      prev.map((s) => (s.id === id ? { ...s, className: newName } : s))
    )
  }, [])

  const updateStageAvatar = useCallback((id, file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      setStages((prev) =>
        prev.map((s) => (s.id === id ? { ...s, avatar: e.target.result } : s))
      )
    }
    reader.readAsDataURL(file)
  }, [])

  const stagesWithDefaults = stages.map((s) => ({
    ...s,
    avatarSrc: getStageAvatar(s),  // always has a value (falls back to defaultAvatar)
    avatar: s.avatar,              // raw: null if not custom-set
  }))

  return { stages: stagesWithDefaults, updateStageName, updateStageAvatar }
}

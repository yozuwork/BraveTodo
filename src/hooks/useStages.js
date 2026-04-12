import { useState, useCallback, useEffect } from 'react'
import defaultAvatar from '../assets/hero.jpg'
import { compressImage } from '../utils/compressImage'
import { resolveImg, saveImageToDisk } from '../utils/imageSrc'

const STORAGE_KEY      = 'brave-todo:stages'
const STORAGE_KEY_BOSS = 'brave-todo:stageBossHunts'

const DEFAULT_STAGES = [
  { id: 1, minLevel: 1,  maxLevel: 10,  className: '初心者' },
  { id: 2, minLevel: 10, maxLevel: 30,  className: '見習戰士' },
  { id: 3, minLevel: 30, maxLevel: 70,  className: '冒險者' },
  { id: 4, minLevel: 70, maxLevel: 120, className: '英雄' },
]

const DEFAULT_BOSS_NAMES = {
  1: '第一階段守護者',
  2: '第二階段霸主',
  3: '深淵支配者',
  4: '終焉魔王',
}

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

function loadBossHunts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BOSS)
    if (!raw) return {}
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

// ── Stage progression helper ──────────────────────────────────
// Returns the highest stage the player can currently display,
// respecting the boss-defeat lock: you can only enter a stage
// if the previous stage's boss has been defeated (or it's the first stage).
export function resolveCurrentStage(stages, level) {
  let displayStage = stages[0]
  for (let i = 0; i < stages.length; i++) {
    const s = stages[i]
    if (level < s.minLevel) break
    if (i === 0) {
      displayStage = s
    } else {
      const prev = stages[i - 1]
      if (prev.bossHuntStatus === 'defeated') {
        displayStage = s
      } else {
        break  // locked — previous boss not defeated
      }
    }
  }
  return displayStage
}

export default function useStages() {
  const [stages, setStages]       = useState(loadStages)
  const [bossHunts, setBossHunts] = useState(loadBossHunts)

  useEffect(() => {
    const toSave = stages.map(({ id, className, avatar }) => ({ id, className, avatar }))
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave))
  }, [stages])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_BOSS, JSON.stringify(bossHunts))
  }, [bossHunts])

  // ── Stage settings ─────────────────────────────────────────

  const getStageAvatar = useCallback(
    (stage) => resolveImg(stage.avatar) || defaultAvatar,
    []
  )

  const updateStageName = useCallback((id, newName) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, className: newName } : s)))
  }, [])

  const updateStageAvatar = useCallback((id, file) => {
    if (!file) return
    compressImage(file).then(async (dataUrl) => {
      const relPath = await saveImageToDisk(dataUrl, `uploads/stages/${id}.jpg`)
      const stored = relPath ?? dataUrl
      setStages((prev) => prev.map((s) => (s.id === id ? { ...s, avatar: stored } : s)))
    })
  }, [])

  // ── Boss metadata (name / avatar) ──────────────────────────

  const updateStageBossName = useCallback((stageId, name) => {
    setBossHunts((prev) => ({
      ...prev,
      [stageId]: { ...(prev[stageId] ?? { huntStatus: null, huntTasks: [] }), bossName: name },
    }))
  }, [])

  const updateStageBossAvatar = useCallback((stageId, file) => {
    if (!file) return
    compressImage(file).then(async (dataUrl) => {
      const relPath = await saveImageToDisk(dataUrl, `uploads/bosses/${stageId}.jpg`)
      const stored = relPath ?? dataUrl
      setBossHunts((prev) => ({
        ...prev,
        [stageId]: { ...(prev[stageId] ?? { huntStatus: null, huntTasks: [] }), bossAvatar: stored },
      }))
    })
  }, [])

  // ── Boss hunt lifecycle ────────────────────────────────────

  const startStageBossHunt = useCallback((stageId) => {
    setBossHunts((prev) => ({
      ...prev,
      [stageId]: { ...(prev[stageId] ?? { huntTasks: [] }), huntStatus: 'hunting' },
    }))
  }, [])

  const stopStageBossHunt = useCallback((stageId) => {
    setBossHunts((prev) => ({
      ...prev,
      [stageId]: { ...(prev[stageId] ?? { huntTasks: [] }), huntStatus: null },
    }))
  }, [])

  // Called when all tasks are complete — locks in the defeated state
  const completeStageBossHunt = useCallback((stageId) => {
    setBossHunts((prev) => ({
      ...prev,
      [stageId]: { ...(prev[stageId] ?? { huntTasks: [] }), huntStatus: 'defeated' },
    }))
  }, [])

  // ── Boss hunt tasks ────────────────────────────────────────

  const addStageBossHuntTask = useCallback((stageId, text) => {
    setBossHunts((prev) => {
      const cur = prev[stageId] ?? { huntStatus: null, huntTasks: [] }
      if (cur.huntTasks.length >= 10) return prev
      return {
        ...prev,
        [stageId]: { ...cur, huntTasks: [...cur.huntTasks, { id: Date.now(), text, completed: false }] },
      }
    })
  }, [])

  const toggleStageBossHuntTask = useCallback((stageId, taskId) => {
    setBossHunts((prev) => {
      const cur = prev[stageId] ?? { huntStatus: null, huntTasks: [] }
      return {
        ...prev,
        [stageId]: {
          ...cur,
          huntTasks: cur.huntTasks.map((t) => t.id === taskId ? { ...t, completed: !t.completed } : t),
        },
      }
    })
  }, [])

  const removeStageBossHuntTask = useCallback((stageId, taskId) => {
    setBossHunts((prev) => {
      const cur = prev[stageId] ?? { huntStatus: null, huntTasks: [] }
      return {
        ...prev,
        [stageId]: { ...cur, huntTasks: cur.huntTasks.filter((t) => t.id !== taskId) },
      }
    })
  }, [])

  const updateStageBossHuntTask = useCallback((stageId, taskId, text) => {
    setBossHunts((prev) => {
      const cur = prev[stageId] ?? { huntStatus: null, huntTasks: [] }
      return {
        ...prev,
        [stageId]: {
          ...cur,
          huntTasks: cur.huntTasks.map((t) => t.id === taskId ? { ...t, text } : t),
        },
      }
    })
  }, [])

  // ── Merge everything ───────────────────────────────────────

  const stagesWithDefaults = stages.map((s) => {
    const boss = bossHunts[s.id] ?? {}
    return {
      ...s,
      avatarSrc:       getStageAvatar(s),
      avatar:          s.avatar,
      bossName:        boss.bossName   ?? DEFAULT_BOSS_NAMES[s.id] ?? `第${s.id}階段Boss`,
      bossAvatar:      boss.bossAvatar ?? null,
      bossHuntStatus:  boss.huntStatus  ?? null,
      bossHuntTasks:   boss.huntTasks   ?? [],
    }
  })

  return {
    stages: stagesWithDefaults,
    updateStageName,
    updateStageAvatar,
    updateStageBossName,
    updateStageBossAvatar,
    startStageBossHunt,
    stopStageBossHunt,
    completeStageBossHunt,
    addStageBossHuntTask,
    toggleStageBossHuntTask,
    removeStageBossHuntTask,
    updateStageBossHuntTask,
  }
}

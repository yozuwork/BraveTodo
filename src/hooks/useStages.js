import { useState, useCallback, useEffect, useRef } from 'react'
import defaultAvatar from '../assets/hero.jpg'
import { compressImage } from '../utils/compressImage'
import { resolveImg } from '../utils/imageSrc'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const STAGES_DOC = doc(db, 'meta', 'stages')

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

function normalizeStageImages(stage) {
  const avatars = Array.isArray(stage.avatars)
    ? stage.avatars.filter(Boolean)
    : (stage.avatar ? [stage.avatar] : [])
  return { ...stage, avatar: avatars[0] ?? null, avatars }
}

export function resolveCurrentStage(stages, level) {
  const sorted = [...stages].sort((a, b) => a.minLevel - b.minLevel)
  let displayStage = sorted[0]
  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i]
    if (level < s.minLevel) break
    if (i === 0) {
      displayStage = s
    } else {
      const prev = sorted[i - 1]
      if (prev.bossHuntStatus === 'defeated') {
        displayStage = s
      } else {
        break
      }
    }
  }
  return displayStage
}

export default function useStages() {
  const [stages, setStages] = useState(DEFAULT_STAGES)
  const [bossHunts, setBossHunts] = useState({})
  const [loaded, setLoaded] = useState(false)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    getDoc(STAGES_DOC).then((snap) => {
      if (snap.exists()) {
        const data = snap.data()
        const saved = (data.items ?? []).filter((s) => s.id <= 9999).map(normalizeStageImages)
        setStages(saved.length > 0 ? saved : DEFAULT_STAGES)
        setBossHunts(data.bossHunts ?? {})
      } else {
        setStages(DEFAULT_STAGES)
      }
      setLoaded(true)
    }).catch(() => {
      setStages(DEFAULT_STAGES)
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    const toSave = stages.map(({ id, minLevel, maxLevel, className, avatar, avatars }) => ({
      id, minLevel, maxLevel, className, avatar,
      avatars: Array.isArray(avatars) ? avatars : (avatar ? [avatar] : []),
    }))
    setDoc(STAGES_DOC, { items: toSave, bossHunts }).catch(console.error)
  }, [stages, bossHunts, loaded])

  const getStageAvatar = useCallback((stage) => {
    const avatars = Array.isArray(stage.avatars) ? stage.avatars : (stage.avatar ? [stage.avatar] : [])
    return resolveImg(avatars[0]) || defaultAvatar
  }, [])

  const getStageAvatars = useCallback((stage) => {
    const avatars = Array.isArray(stage.avatars) ? stage.avatars : (stage.avatar ? [stage.avatar] : [])
    const resolved = avatars.map(resolveImg).filter(Boolean)
    return resolved.length > 0 ? resolved : [defaultAvatar]
  }, [])

  const updateStageName = useCallback((id, newName) => {
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, className: newName } : s)))
  }, [])

  const updateStageLevel = useCallback((id, field, value) => {
    const num = parseInt(value, 10)
    if (isNaN(num) || num < 0) return
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: num } : s)))
  }, [])

  const addStage = useCallback(() => {
    setStages((prev) => {
      const sorted = [...prev].sort((a, b) => a.minLevel - b.minLevel)
      const last = sorted[sorted.length - 1]
      const newMin = last ? last.maxLevel : 1
      const newMax = newMin + 10
      const newId = Math.max(0, ...prev.map((s) => s.id)) + 1
      return [...prev, { id: newId, minLevel: newMin, maxLevel: newMax, className: '新階段' }]
    })
  }, [])

  const removeStage = useCallback((id) => {
    setStages((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((s) => s.id !== id)
    })
    setBossHunts((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const updateStageAvatar = useCallback((id, filesLike) => {
    const files = Array.from(filesLike?.length !== undefined ? filesLike : [filesLike]).filter(Boolean)
    if (files.length === 0) return
    Promise.all(files.map((file) => compressImage(file))).then((dataUrls) => {
      setStages((prev) => prev.map((s) => {
        if (s.id !== id) return s
        const current = Array.isArray(s.avatars) ? s.avatars : (s.avatar ? [s.avatar] : [])
        const avatars = [...current, ...dataUrls]
        return { ...s, avatar: avatars[0] ?? null, avatars }
      }))
    })
  }, [])

  const replaceStageAvatar = useCallback((id, avatarIndex, file) => {
    if (!file || avatarIndex < 0) return
    compressImage(file).then((dataUrl) => {
      setStages((prev) => prev.map((s) => {
        if (s.id !== id) return s
        const current = Array.isArray(s.avatars) ? s.avatars : (s.avatar ? [s.avatar] : [])
        if (!current[avatarIndex]) return s
        const avatars = current.map((a, i) => i === avatarIndex ? dataUrl : a)
        return { ...s, avatar: avatars[0] ?? null, avatars }
      }))
    })
  }, [])

  const removeStageAvatar = useCallback((id, avatarIndex) => {
    setStages((prev) => prev.map((s) => {
      if (s.id !== id) return s
      const current = Array.isArray(s.avatars) ? s.avatars : (s.avatar ? [s.avatar] : [])
      const avatars = current.filter((_, i) => i !== avatarIndex)
      return { ...s, avatar: avatars[0] ?? null, avatars }
    }))
  }, [])

  const updateStageBossName = useCallback((stageId, name) => {
    setBossHunts((prev) => ({
      ...prev,
      [stageId]: { ...(prev[stageId] ?? { huntStatus: null, huntTasks: [] }), bossName: name },
    }))
  }, [])

  const updateStageBossAvatar = useCallback((stageId, file) => {
    if (!file) return
    compressImage(file).then((dataUrl) => {
      setBossHunts((prev) => ({
        ...prev,
        [stageId]: { ...(prev[stageId] ?? { huntStatus: null, huntTasks: [] }), bossAvatar: dataUrl },
      }))
    })
  }, [])

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

  const resetStageBossHunts = useCallback(() => {
    setBossHunts((prev) => {
      const next = {}
      Object.entries(prev).forEach(([stageId, hunt]) => {
        next[stageId] = {
          ...hunt,
          huntStatus: null,
          huntTasks: (hunt.huntTasks ?? []).map((task) => ({ ...task, completed: false })),
        }
      })
      return next
    })
  }, [])

  const completeStageBossHunt = useCallback((stageId) => {
    setBossHunts((prev) => ({
      ...prev,
      [stageId]: { ...(prev[stageId] ?? { huntTasks: [] }), huntStatus: 'defeated' },
    }))
  }, [])

  const addStageBossHuntTask = useCallback((stageId, text, taskId = Date.now()) => {
    setBossHunts((prev) => {
      const cur = prev[stageId] ?? { huntStatus: null, huntTasks: [] }
      if (cur.huntTasks.length >= 10) return prev
      return {
        ...prev,
        [stageId]: { ...cur, huntTasks: [...cur.huntTasks, { id: taskId, text, completed: false }] },
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

  const reorderStages = useCallback((dragId, dropId, insertBefore) => {
    setStages((prev) => {
      const items = [...prev]
      const fromIdx = items.findIndex((s) => s.id === dragId)
      if (fromIdx === -1) return prev
      const [item] = items.splice(fromIdx, 1)
      const toIdx = items.findIndex((s) => s.id === dropId)
      if (toIdx === -1) return prev
      items.splice(insertBefore ? toIdx : toIdx + 1, 0, item)
      return items
    })
  }, [])

  const stagesWithDefaults = stages.map((s) => {
    const boss = bossHunts[s.id] ?? {}
    const avatars = Array.isArray(s.avatars) ? s.avatars : (s.avatar ? [s.avatar] : [])
    return {
      ...s,
      avatarSrc:      getStageAvatar(s),
      avatarSrcs:     getStageAvatars(s),
      avatar:         avatars[0] ?? null,
      avatars,
      bossName:       boss.bossName   ?? DEFAULT_BOSS_NAMES[s.id] ?? `${s.className} Boss`,
      bossAvatar:     boss.bossAvatar ?? null,
      bossHuntStatus: boss.huntStatus  ?? null,
      bossHuntTasks:  boss.huntTasks   ?? [],
    }
  })

  return {
    stages: stagesWithDefaults,
    updateStageName,
    updateStageLevel,
    addStage,
    removeStage,
    reorderStages,
    updateStageAvatar,
    replaceStageAvatar,
    removeStageAvatar,
    updateStageBossName,
    updateStageBossAvatar,
    startStageBossHunt,
    stopStageBossHunt,
    resetStageBossHunts,
    completeStageBossHunt,
    addStageBossHuntTask,
    toggleStageBossHuntTask,
    removeStageBossHuntTask,
    updateStageBossHuntTask,
    loaded,
  }
}

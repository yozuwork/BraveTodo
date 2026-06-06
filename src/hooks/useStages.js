import { useState, useCallback, useEffect, useRef } from 'react'
import defaultAvatar from '../assets/hero.jpg'
import { compressImage } from '../utils/compressImage'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { storeImage, fetchImageSrcs, removeStoredImage } from '../utils/imageStorage'

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

let cachedStages = null
let cachedBossHunts = null
let cachedImageSrcs = {}

function sanitize(val) {
  if (val === undefined) return null
  if (Array.isArray(val)) return val.map((v) => sanitize(v === undefined ? null : v))
  if (val !== null && typeof val === 'object') {
    return Object.fromEntries(Object.entries(val).map(([k, v]) => [k, sanitize(v)]))
  }
  return val
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
      if (sorted[i - 1].bossHuntStatus === 'defeated') {
        displayStage = s
      } else {
        break
      }
    }
  }
  return displayStage
}

export default function useStages() {
  const [stages, setStages] = useState(() => cachedStages ?? DEFAULT_STAGES)
  const [bossHunts, setBossHunts] = useState(() => cachedBossHunts ?? {})
  const [imageSrcs, setImageSrcs] = useState(() => cachedImageSrcs)
  const [loaded, setLoaded] = useState(false)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    if (cachedStages !== null) {
      setLoaded(true)
      return
    }
    getDoc(STAGES_DOC).then(async (snap) => {
      let nextStages = DEFAULT_STAGES
      let nextBossHunts = {}
      const newImageSrcs = {}

      if (snap.exists()) {
        const data = snap.data()
        const rawItems = (data.items ?? []).filter((s) => s.id <= 9999)
        nextBossHunts = data.bossHunts ?? {}

        // Collect all refs — can be imageIds (img_*) or legacy base64 (data:*)
        const allRefs = [
          ...rawItems.flatMap((s) => [
            ...(s.avatarIds ?? []),
            ...(s.avatars ?? []),
            s.avatar,
          ]),
          ...Object.values(nextBossHunts).flatMap((h) => [h.bossAvatarId, h.bossAvatar]),
        ].filter((r) => typeof r === 'string' && r.length > 0)

        // Fetch existing imageIds
        const fetched = await fetchImageSrcs(allRefs.filter((r) => r.startsWith('img_')))
        Object.assign(newImageSrcs, fetched)

        // Migrate legacy base64 → upload to images collection once
        const uniqueBase64 = [...new Set(allRefs.filter((r) => r.startsWith('data:')))]
        const base64ToId = {}
        if (uniqueBase64.length > 0) {
          const ids = await Promise.all(uniqueBase64.map(storeImage))
          uniqueBase64.forEach((src, i) => {
            base64ToId[src] = ids[i]
            newImageSrcs[ids[i]] = src
          })
        }

        const migrateRef = (ref) => {
          if (!ref) return null
          if (ref.startsWith('data:')) return base64ToId[ref] ?? null
          return ref
        }

        // Build normalized stages with avatarIds only
        nextStages = rawItems.map((s) => {
          const rawAvatars = Array.isArray(s.avatarIds) ? s.avatarIds
            : Array.isArray(s.avatars) ? s.avatars
            : s.avatar ? [s.avatar] : []
          return {
            id: s.id,
            minLevel: s.minLevel,
            maxLevel: s.maxLevel,
            className: s.className,
            avatarIds: rawAvatars.filter(Boolean).map(migrateRef).filter(Boolean),
            avatarPositions: Array.isArray(s.avatarPositions) ? s.avatarPositions : [],
          }
        })

        // Build normalized bossHunts with bossAvatarId only
        const migratedBoss = {}
        for (const [stageId, hunt] of Object.entries(nextBossHunts)) {
          const rawRef = hunt.bossAvatarId ?? hunt.bossAvatar ?? null
          migratedBoss[stageId] = {
            bossName: hunt.bossName,
            bossAvatarId: migrateRef(rawRef),
            huntStatus: hunt.huntStatus ?? null,
            huntTasks: hunt.huntTasks ?? [],
          }
        }
        nextBossHunts = migratedBoss

        if (nextStages.length === 0) nextStages = DEFAULT_STAGES
      }

      cachedStages = nextStages
      cachedBossHunts = nextBossHunts
      cachedImageSrcs = newImageSrcs
      setStages(nextStages)
      setBossHunts(nextBossHunts)
      setImageSrcs(newImageSrcs)
      setLoaded(true)
    }).catch(() => {
      setStages(cachedStages ?? DEFAULT_STAGES)
      setBossHunts(cachedBossHunts ?? {})
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) { skipWriteRef.current = false; return }
    cachedStages = stages
    cachedBossHunts = bossHunts
    const toSave = stages.map(({ id, minLevel, maxLevel, className, avatarIds, avatarPositions }) => ({
      id, minLevel, maxLevel, className,
      avatarIds: (Array.isArray(avatarIds) ? avatarIds : []).filter(Boolean),
      avatarPositions: sanitize(Array.isArray(avatarPositions) ? avatarPositions : []),
    }))
    setDoc(STAGES_DOC, { items: toSave, bossHunts: sanitize(bossHunts) }).catch(console.error)
  }, [stages, bossHunts, loaded])

  // Resolve imageId → src (supports legacy base64 passthrough)
  const resolveId = useCallback((id) => {
    if (!id) return null
    if (id.startsWith('data:')) return id
    return imageSrcs[id] ?? null
  }, [imageSrcs])

  const getStageAvatar = useCallback((stage) => {
    const ids = Array.isArray(stage.avatarIds) ? stage.avatarIds : []
    for (const id of ids) {
      const src = resolveId(id)
      if (src) return src
    }
    return defaultAvatar
  }, [resolveId])

  const getStageAvatars = useCallback((stage) => {
    const ids = Array.isArray(stage.avatarIds) ? stage.avatarIds : []
    const resolved = ids.map(resolveId).filter(Boolean)
    return resolved.length > 0 ? resolved : [defaultAvatar]
  }, [resolveId])

  // ── Mutations ────────────────────────────────────────────────

  const updateStageName = useCallback((id, newName) => {
    setStages((prev) => prev.map((s) => s.id === id ? { ...s, className: newName } : s))
  }, [])

  const updateStageLevel = useCallback((id, field, value) => {
    const num = parseInt(value, 10)
    if (isNaN(num) || num < 0) return
    setStages((prev) => prev.map((s) => s.id === id ? { ...s, [field]: num } : s))
  }, [])

  const addStage = useCallback(() => {
    setStages((prev) => {
      const sorted = [...prev].sort((a, b) => a.minLevel - b.minLevel)
      const last = sorted[sorted.length - 1]
      const newMin = last ? last.maxLevel : 1
      const newId = Math.max(0, ...prev.map((s) => s.id)) + 1
      return [...prev, { id: newId, minLevel: newMin, maxLevel: newMin + 10, className: '新階段', avatarIds: [], avatarPositions: [] }]
    })
  }, [])

  const removeStage = useCallback((id) => {
    setStages((prev) => {
      if (prev.length <= 1) return prev
      const stage = prev.find((s) => s.id === id)
      if (stage) (stage.avatarIds ?? []).forEach(removeStoredImage)
      return prev.filter((s) => s.id !== id)
    })
    setBossHunts((prev) => {
      const boss = prev[id]
      if (boss?.bossAvatarId) removeStoredImage(boss.bossAvatarId)
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [])

  const updateStageAvatar = useCallback((id, filesLike) => {
    const items = Array.from(
      filesLike?.length !== undefined && typeof filesLike !== 'string' ? filesLike : [filesLike]
    ).filter(Boolean)
    if (!items.length) return

    const uploads = items.map(async (item) => {
      const src = typeof item === 'string' ? item : await compressImage(item, 1000, 0.85, true)
      const imageId = await storeImage(src)
      return { imageId, src }
    })

    Promise.all(uploads).then((results) => {
      setImageSrcs((prev) => {
        const next = { ...prev }
        results.forEach(({ imageId, src }) => { next[imageId] = src })
        cachedImageSrcs = next
        return next
      })
      setStages((prev) => prev.map((s) => {
        if (s.id !== id) return s
        const current = Array.isArray(s.avatarIds) ? s.avatarIds : []
        return { ...s, avatarIds: [...current, ...results.map((r) => r.imageId)] }
      }))
    })
  }, [])

  const replaceStageAvatar = useCallback((id, avatarIndex, file) => {
    if (!file || avatarIndex < 0) return
    const getDataUrl = typeof file === 'string' ? Promise.resolve(file) : compressImage(file, 1000, 0.85)
    getDataUrl.then(async (src) => {
      const newId = await storeImage(src)
      setImageSrcs((prev) => { const next = { ...prev, [newId]: src }; cachedImageSrcs = next; return next })
      setStages((prev) => prev.map((s) => {
        if (s.id !== id) return s
        const current = Array.isArray(s.avatarIds) ? s.avatarIds : []
        if (avatarIndex >= current.length) return s
        removeStoredImage(current[avatarIndex])
        return { ...s, avatarIds: current.map((a, i) => i === avatarIndex ? newId : a) }
      }))
    })
  }, [])

  const removeStageAvatar = useCallback((id, avatarIndex) => {
    setStages((prev) => prev.map((s) => {
      if (s.id !== id) return s
      const current = Array.isArray(s.avatarIds) ? s.avatarIds : []
      removeStoredImage(current[avatarIndex])
      return { ...s, avatarIds: current.filter((_, i) => i !== avatarIndex) }
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
    const getDataUrl = typeof file === 'string' ? Promise.resolve(file) : compressImage(file, 1000, 0.85)
    getDataUrl.then(async (src) => {
      const newId = await storeImage(src)
      setImageSrcs((prev) => { const next = { ...prev, [newId]: src }; cachedImageSrcs = next; return next })
      setBossHunts((prev) => {
        const cur = prev[stageId] ?? { huntStatus: null, huntTasks: [] }
        if (cur.bossAvatarId) removeStoredImage(cur.bossAvatarId)
        return { ...prev, [stageId]: { ...cur, bossAvatarId: newId } }
      })
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
          huntTasks: (hunt.huntTasks ?? []).map((t) => ({ ...t, completed: false })),
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
      return { ...prev, [stageId]: { ...cur, huntTasks: [...cur.huntTasks, { id: taskId, text, completed: false }] } }
    })
  }, [])

  const toggleStageBossHuntTask = useCallback((stageId, taskId) => {
    setBossHunts((prev) => {
      const cur = prev[stageId] ?? { huntStatus: null, huntTasks: [] }
      return { ...prev, [stageId]: { ...cur, huntTasks: cur.huntTasks.map((t) => t.id === taskId ? { ...t, completed: !t.completed } : t) } }
    })
  }, [])

  const removeStageBossHuntTask = useCallback((stageId, taskId) => {
    setBossHunts((prev) => {
      const cur = prev[stageId] ?? { huntStatus: null, huntTasks: [] }
      return { ...prev, [stageId]: { ...cur, huntTasks: cur.huntTasks.filter((t) => t.id !== taskId) } }
    })
  }, [])

  const updateStageBossHuntTask = useCallback((stageId, taskId, text) => {
    setBossHunts((prev) => {
      const cur = prev[stageId] ?? { huntStatus: null, huntTasks: [] }
      return { ...prev, [stageId]: { ...cur, huntTasks: cur.huntTasks.map((t) => t.id === taskId ? { ...t, text } : t) } }
    })
  }, [])

  const updateStageAvatarPosition = useCallback((id, avatarIndex, x, y) => {
    setStages((prev) => prev.map((s) => {
      if (s.id !== id) return s
      const positions = Array.isArray(s.avatarPositions) ? [...s.avatarPositions] : []
      positions[avatarIndex] = { x, y }
      return { ...s, avatarPositions: positions }
    }))
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

  // ── Derived state ────────────────────────────────────────────

  const stagesWithDefaults = stages.map((s) => {
    const boss = bossHunts[s.id] ?? {}
    const avatarIds = Array.isArray(s.avatarIds) ? s.avatarIds : []
    const resolvedSrcs = avatarIds.map(resolveId).filter(Boolean)
    const avatarSrc = resolvedSrcs[0] ?? defaultAvatar
    return {
      ...s,
      avatarSrc,
      avatarSrcs: resolvedSrcs.length > 0 ? resolvedSrcs : [defaultAvatar],
      // Keep avatar/avatars as resolved srcs for backward compat (SaveManagement etc.)
      avatar: resolvedSrcs[0] ?? null,
      avatars: resolvedSrcs,
      avatarIds,
      avatarPositions: Array.isArray(s.avatarPositions) ? s.avatarPositions : [],
      bossName:       boss.bossName   ?? DEFAULT_BOSS_NAMES[s.id] ?? `${s.className} Boss`,
      bossAvatar:     boss.bossAvatarId ? (imageSrcs[boss.bossAvatarId] ?? null) : null,
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
    updateStageAvatarPosition,
    loaded,
  }
}

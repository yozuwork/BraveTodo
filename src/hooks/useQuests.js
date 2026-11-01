import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import coinSfxUrl from '../assets/music/Heavy object Hit and body thud sound effect.mp3'
import { isSoundEnabled } from '../utils/soundSettings'
import { compressImage } from '../utils/compressImage'
import { storeImage, removeStoredImage } from '../utils/imageStorage'

const QUESTS_DOC = doc(db, 'meta', 'quests')

let cachedQuests = null
let cachedQuestTemplates = null
let cachedLifetimeCompletions = null

const _questCompleteAudio = new Audio(coinSfxUrl)
_questCompleteAudio.volume = 0.65

function normalizeQuestExpValue(expValue) {
  if (expValue === 2) return 3
  if (expValue === 1 || expValue === 3 || expValue === 5 || expValue === 10 || expValue === 20) return expValue
  return 1
}

function normalizeQuestRewardMode(mode) {
  return mode === 'custom' ? 'custom' : 'tier'
}

function normalizeNonNegativeInt(value, fallback = 0) {
  const parsed = Number(value)
  if (Number.isFinite(parsed) && parsed >= 0) return Math.floor(parsed)
  return fallback
}

function getEffectiveQuestExp(quest = {}) {
  if (normalizeQuestRewardMode(quest.rewardMode) === 'custom') {
    return Math.max(1, normalizeNonNegativeInt(quest.customExp, normalizeQuestExpValue(quest.expValue)))
  }
  return normalizeQuestExpValue(quest.expValue)
}

function normalizeSubTask(subTask = {}) {
  return {
    id: subTask.id ?? Date.now(),
    text: subTask.text ?? '',
    completed: Boolean(subTask.completed),
    ...(typeof subTask.imageId === 'string' && subTask.imageId ? { imageId: subTask.imageId } : {}),
  }
}

function removeQuestImages(quest) {
  ;(quest.subTasks ?? []).forEach((sub) => {
    if (sub.imageId) removeStoredImage(sub.imageId)
  })
}

function normalizeCanvasPosition(position) {
  const x = Number(position?.x)
  const y = Number(position?.y)
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x: Math.max(0, Math.round(x)), y: Math.max(0, Math.round(y)) }
}

function normalizeCoverPosition(position) {
  const x = Number(position?.x)
  const y = Number(position?.y)
  return {
    x: Number.isFinite(x) ? Math.min(100, Math.max(0, x)) : 50,
    y: Number.isFinite(y) ? Math.min(100, Math.max(0, y)) : 50,
  }
}

function normalizeCoverRatio(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? Math.min(180, Math.max(60, Math.round(parsed))) : 100
}

function normalizeQuest(quest = {}) {
  const status = quest.completed
    ? 'completed'
    : quest.status === 'progress'
      ? 'progress'
      : 'pending'
  return {
    id: quest.id ?? Date.now(),
    text: quest.text ?? '',
    completed: Boolean(quest.completed),
    status,
    isCore: Boolean(quest.isCore),
    pinned: Boolean(quest.pinned),
    priority: quest.priority ?? 'normal',
    expValue: normalizeQuestExpValue(quest.expValue),
    rewardMode: normalizeQuestRewardMode(quest.rewardMode),
    customExp: normalizeNonNegativeInt(quest.customExp, normalizeQuestExpValue(quest.expValue)),
    customGold: normalizeNonNegativeInt(quest.customGold, 0),
    cover: typeof quest.cover === 'string' && quest.cover ? quest.cover : null,
    coverPosition: normalizeCoverPosition(quest.coverPosition),
    coverFit: quest.coverFit === 'contain' ? 'contain' : 'cover',
    coverRatio: normalizeCoverRatio(quest.coverRatio),
    coverRatioMode: quest.coverRatioMode === 'individual' ? 'individual' : 'global',
    huntBinding: quest.huntBinding ?? null,
    canvasPosition: normalizeCanvasPosition(quest.canvasPosition),
    subTasks: Array.isArray(quest.subTasks) ? quest.subTasks.map(normalizeSubTask) : [],
  }
}

function normalizeQuestTemplate(template = {}) {
  return {
    id: template.id ?? Date.now(),
    name: template.name ?? template.text ?? '未命名模板',
    text: template.text ?? '新的任務',
    priority: template.priority ?? 'normal',
    expValue: normalizeQuestExpValue(template.expValue),
    rewardMode: normalizeQuestRewardMode(template.rewardMode),
    customExp: normalizeNonNegativeInt(template.customExp, normalizeQuestExpValue(template.expValue)),
    customGold: normalizeNonNegativeInt(template.customGold, 0),
    cover: typeof template.cover === 'string' && template.cover ? template.cover : null,
    coverPosition: normalizeCoverPosition(template.coverPosition),
    coverFit: template.coverFit === 'contain' ? 'contain' : 'cover',
    coverRatio: normalizeCoverRatio(template.coverRatio),
    coverRatioMode: template.coverRatioMode === 'individual' ? 'individual' : 'global',
    subTasks: Array.isArray(template.subTasks) ? template.subTasks.map((subTask) => ({
      id: subTask.id ?? Date.now(),
      text: subTask.text ?? '',
      completed: false,
    })) : [],
    createdAt: template.createdAt ?? Date.now(),
    updatedAt: template.updatedAt ?? Date.now(),
  }
}

export function playQuestCompleteSound() {
  if (!isSoundEnabled()) return
  _questCompleteAudio.currentTime = 0
  void _questCompleteAudio.play().catch(() => {})
}

export default function useQuests() {
  const [quests, setQuests] = useState(() => cachedQuests ?? [])
  const [questTemplates, setQuestTemplates] = useState(() => cachedQuestTemplates ?? [])
  const [lifetimeCompletions, setLifetimeCompletions] = useState(() => cachedLifetimeCompletions ?? 0)
  const [loaded, setLoaded] = useState(() => cachedQuests !== null)

  useEffect(() => {
    if (cachedQuests !== null) return
    getDoc(QUESTS_DOC).then((snap) => {
      if (snap.exists()) {
        const data = snap.data()
        cachedQuests = (data.items ?? []).map(normalizeQuest)
        cachedQuestTemplates = (data.templates ?? []).map(normalizeQuestTemplate)
        cachedLifetimeCompletions = data.lifetimeCompletions ?? 0
        setQuests(cachedQuests)
        setQuestTemplates(cachedQuestTemplates)
        setLifetimeCompletions(cachedLifetimeCompletions)
      } else {
        cachedQuests = []
        cachedQuestTemplates = []
        cachedLifetimeCompletions = 0
      }
      setLoaded(true)
    }).catch(() => {
      cachedQuests = cachedQuests ?? []
      cachedQuestTemplates = cachedQuestTemplates ?? []
      cachedLifetimeCompletions = cachedLifetimeCompletions ?? 0
      setLoaded(true)
    })
  }, [])

  const skipItemsWriteRef = useRef(true)
  const skipExpWriteRef = useRef(true)
  const skipTemplatesWriteRef = useRef(true)

  useEffect(() => {
    if (!loaded) return
    if (skipItemsWriteRef.current) {
      skipItemsWriteRef.current = false
      return
    }
    cachedQuests = quests
    updateDoc(QUESTS_DOC, { items: quests.map(normalizeQuest) }).catch((err) => {
      if (err.code === 'not-found') {
        setDoc(QUESTS_DOC, {
          items: quests.map(normalizeQuest),
          templates: questTemplates.map(normalizeQuestTemplate),
          lifetimeCompletions,
        }).catch(console.error)
      } else {
        console.error(err)
      }
    })
  }, [loaded, lifetimeCompletions, questTemplates, quests])

  useEffect(() => {
    if (!loaded) return
    if (skipExpWriteRef.current) {
      skipExpWriteRef.current = false
      return
    }
    cachedLifetimeCompletions = lifetimeCompletions
    updateDoc(QUESTS_DOC, { lifetimeCompletions }).catch((err) => {
      if (err.code === 'not-found') {
        setDoc(QUESTS_DOC, {
          items: quests.map(normalizeQuest),
          templates: questTemplates.map(normalizeQuestTemplate),
          lifetimeCompletions,
        }).catch(console.error)
      } else {
        console.error(err)
      }
    })
  }, [loaded, lifetimeCompletions, questTemplates, quests])

  useEffect(() => {
    if (!loaded) return
    if (skipTemplatesWriteRef.current) {
      skipTemplatesWriteRef.current = false
      return
    }
    cachedQuestTemplates = questTemplates
    updateDoc(QUESTS_DOC, { templates: questTemplates.map(normalizeQuestTemplate) }).catch((err) => {
      if (err.code === 'not-found') {
        setDoc(QUESTS_DOC, {
          items: quests.map(normalizeQuest),
          templates: questTemplates.map(normalizeQuestTemplate),
          lifetimeCompletions,
        }).catch(console.error)
      } else {
        console.error(err)
      }
    })
  }, [loaded, lifetimeCompletions, questTemplates, quests])

  const addQuest = useCallback((text, extra = {}) => {
    setQuests((prev) => [
      normalizeQuest({
        ...extra,
        id: extra.id ?? Date.now(),
        text,
        completed: false,
        status: 'pending',
        isCore: false,
        pinned: false,
        priority: 'normal',
        expValue: 1,
        rewardMode: 'tier',
        customExp: 1,
        customGold: 0,
        huntBinding: null,
        subTasks: extra.subTasks ?? [],
      }),
      ...prev,
    ])
  }, [])

  // 白板新增卡片：指定位置，可選擇直接帶一張圖片待辦
  const addCanvasQuest = useCallback(async (text, position, imageFile = null) => {
    let subTasks = []
    if (imageFile) {
      const src = await compressImage(imageFile, 1000, 0.82, true)
      const imageId = await storeImage(src)
      subTasks = [{ id: Date.now(), text: '', completed: false, imageId }]
    }
    addQuest(text, { canvasPosition: position, subTasks })
  }, [addQuest])

  const addQuestFromTemplate = useCallback((templateId) => {
    const source = (cachedQuestTemplates ?? questTemplates).find((template) => template.id === templateId)
    if (!source) return null
    const now = Date.now()
    const newQuest = normalizeQuest({
      id: now,
      text: source.text,
      completed: false,
      status: 'pending',
      isCore: false,
      pinned: false,
      priority: source.priority,
      expValue: source.expValue,
      rewardMode: source.rewardMode ?? 'tier',
      customExp: source.customExp ?? source.expValue,
      customGold: source.customGold ?? 0,
      cover: source.cover ?? null,
      coverPosition: source.coverPosition,
      coverFit: source.coverFit,
      coverRatio: source.coverRatio,
      coverRatioMode: source.coverRatioMode,
      huntBinding: null,
      subTasks: (source.subTasks ?? []).map((subTask, index) => ({
        id: now + index + 1,
        text: subTask.text,
        completed: false,
      })),
    })
    setQuests((prev) => [newQuest, ...prev])
    return newQuest.id
  }, [questTemplates])

  const saveQuestTemplate = useCallback((questLike) => {
    const now = Date.now()
    const template = normalizeQuestTemplate({
      id: now,
      name: questLike.text?.trim() || '未命名模板',
      text: questLike.text?.trim() || '新的任務',
      priority: questLike.priority ?? 'normal',
      expValue: normalizeQuestExpValue(questLike.expValue),
      rewardMode: normalizeQuestRewardMode(questLike.rewardMode),
      customExp: normalizeNonNegativeInt(questLike.customExp, normalizeQuestExpValue(questLike.expValue)),
      customGold: normalizeNonNegativeInt(questLike.customGold, 0),
      cover: questLike.cover ?? null,
      coverPosition: questLike.coverPosition,
      coverFit: questLike.coverFit,
      coverRatio: questLike.coverRatio,
      coverRatioMode: questLike.coverRatioMode,
      subTasks: Array.isArray(questLike.subTasks)
        ? questLike.subTasks.filter((subTask) => !subTask.imageId).map((subTask) => ({ text: subTask.text ?? '', completed: false }))
        : [],
      createdAt: now,
      updatedAt: now,
    })
    setQuestTemplates((prev) => [template, ...prev])
    return template.id
  }, [])

  const removeQuestTemplate = useCallback((templateId) => {
    setQuestTemplates((prev) => prev.filter((template) => template.id !== templateId))
  }, [])

  const setQuestPriority = useCallback((id, priority) => {
    setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, priority } : q)))
  }, [])

  const setQuestStatus = useCallback((id, status) => {
    const nextStatus = status === 'progress' ? 'progress' : 'pending'
    setQuests((prev) => prev.map((q) => (
      q.id === id && !q.completed ? { ...q, status: nextStatus } : q
    )))
  }, [])

  const togglePin = useCallback((id) => {
    setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, pinned: !q.pinned } : q)))
  }, [])

  const setQuestCompleted = useCallback((id, completed) => {
    let completionDelta = 0
    setQuests((prev) => {
      const target = prev.find((q) => q.id === id)
      if (!target) return prev
      if (target.completed === completed) return prev
      const exp = getEffectiveQuestExp(target)
      completionDelta = completed ? exp : -exp
      return prev.map((q) => (
        q.id === id
          ? { ...q, completed, status: completed ? 'completed' : 'pending' }
          : q
      ))
    })
    if (completionDelta !== 0) {
      setLifetimeCompletions((c) => {
        const next = Math.max(0, c + completionDelta)
        cachedLifetimeCompletions = next
        return next
      })
    }
  }, [])

  const toggleQuest = useCallback((id) => {
    let nextCompleted = null
    setQuests((prev) => {
      const target = prev.find((q) => q.id === id)
      if (!target) return prev
      nextCompleted = !target.completed
      return prev
    })
    if (nextCompleted !== null) setQuestCompleted(id, nextCompleted)
  }, [setQuestCompleted])

  const bindQuestToHuntTask = useCallback((questId, binding) => {
    setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, huntBinding: binding } : q)))
  }, [])

  const unbindQuestFromHuntTask = useCallback((questId) => {
    setQuests((prev) => prev.map((q) => (q.id === questId ? { ...q, huntBinding: null } : q)))
  }, [])

  const updateQuestExp = useCallback((id, expValue) => {
    const nextExpValue = normalizeQuestExpValue(expValue)
    let completionDelta = 0
    setQuests((prev) => prev.map((q) => {
      if (q.id !== id) return q
      const next = { ...q, expValue: nextExpValue }
      if (q.completed) {
        completionDelta = getEffectiveQuestExp(next) - getEffectiveQuestExp(q)
      }
      return next
    }))
    if (completionDelta !== 0) {
      setLifetimeCompletions((c) => {
        const next = Math.max(0, c + completionDelta)
        cachedLifetimeCompletions = next
        return next
      })
    }
  }, [])

  const updateQuestRewardConfig = useCallback((id, changes) => {
    let completionDelta = 0
    setQuests((prev) => prev.map((q) => {
      if (q.id !== id) return q
      const next = normalizeQuest({
        ...q,
        ...changes,
        expValue: Object.prototype.hasOwnProperty.call(changes, 'expValue') ? changes.expValue : q.expValue,
        rewardMode: Object.prototype.hasOwnProperty.call(changes, 'rewardMode') ? changes.rewardMode : q.rewardMode,
        customExp: Object.prototype.hasOwnProperty.call(changes, 'customExp') ? changes.customExp : q.customExp,
        customGold: Object.prototype.hasOwnProperty.call(changes, 'customGold') ? changes.customGold : q.customGold,
      })
      if (q.completed) {
        completionDelta = getEffectiveQuestExp(next) - getEffectiveQuestExp(q)
      }
      return next
    }))
    if (completionDelta !== 0) {
      setLifetimeCompletions((c) => {
        const next = Math.max(0, c + completionDelta)
        cachedLifetimeCompletions = next
        return next
      })
    }
  }, [])

  const removeQuest = useCallback((id) => {
    setQuests((prev) => {
      const target = prev.find((q) => q.id === id)
      if (target) removeQuestImages(target)
      return prev.filter((q) => q.id !== id)
    })
  }, [])

  const updateQuest = useCallback((id, text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, text: trimmed } : q)))
  }, [])

  const updateQuestCover = useCallback((id, file) => {
    if (!file) {
      setQuests((prev) => prev.map((quest) => (quest.id === id ? { ...quest, cover: null } : quest)))
      return
    }
    if (typeof file === 'string') {
      setQuests((prev) => prev.map((quest) => (quest.id === id ? { ...quest, cover: file } : quest)))
      return
    }
    compressImage(file, 900, 0.78, true)
      .then((cover) => {
        setQuests((prev) => prev.map((quest) => (quest.id === id ? { ...quest, cover } : quest)))
      })
      .catch(console.error)
  }, [])

  const updateQuestCardMedia = useCallback((id, changes) => {
    setQuests((prev) => prev.map((quest) => {
      if (quest.id !== id) return quest
      return {
        ...quest,
        coverPosition: Object.prototype.hasOwnProperty.call(changes, 'coverPosition')
          ? normalizeCoverPosition(changes.coverPosition)
          : quest.coverPosition,
        coverFit: Object.prototype.hasOwnProperty.call(changes, 'coverFit')
          ? (changes.coverFit === 'contain' ? 'contain' : 'cover')
          : quest.coverFit,
        coverRatio: Object.prototype.hasOwnProperty.call(changes, 'coverRatio')
          ? normalizeCoverRatio(changes.coverRatio)
          : quest.coverRatio,
        coverRatioMode: Object.prototype.hasOwnProperty.call(changes, 'coverRatioMode')
          ? (changes.coverRatioMode === 'individual' ? 'individual' : 'global')
          : Object.prototype.hasOwnProperty.call(changes, 'coverRatio')
            ? 'individual'
            : quest.coverRatioMode,
      }
    }))
  }, [])

  const resetAllQuestCoverRatioOverrides = useCallback(() => {
    setQuests((prev) => prev.map((quest) => ({ ...quest, coverRatioMode: 'global' })))
  }, [])

  const toggleCoreTask = useCallback((id) => {
    setQuests((prev) =>
      prev.map((q) => ({
        ...q,
        isCore: q.id === id ? !q.isCore : false,
      }))
    )
  }, [])

  const addSubTask = useCallback((questId, text) => {
    setQuests((prev) =>
      prev.map((q) =>
        q.id === questId
          ? { ...q, subTasks: [...(q.subTasks ?? []), { id: Date.now(), text, completed: false }] }
          : q
      )
    )
  }, [])

  const toggleSubTask = useCallback((questId, subTaskId) => {
    let shouldPlay = false
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== questId) return q
        const updated = (q.subTasks ?? []).map((s) => {
          if (s.id !== subTaskId) return s
          if (!s.completed) shouldPlay = true
          return { ...s, completed: !s.completed }
        })
        return { ...q, subTasks: updated }
      })
    )
    if (shouldPlay) playQuestCompleteSound()
  }, [])

  const addSubTaskImage = useCallback(async (questId, file) => {
    if (!file) return
    const src = await compressImage(file, 1000, 0.82, true)
    const imageId = await storeImage(src)
    setQuests((prev) =>
      prev.map((q) =>
        q.id === questId
          ? { ...q, subTasks: [...(q.subTasks ?? []), { id: Date.now(), text: '', completed: false, imageId }] }
          : q
      )
    )
  }, [])

  const removeSubTask = useCallback((questId, subTaskId) => {
    setQuests((prev) =>
      prev.map((q) => {
        if (q.id !== questId) return q
        const target = (q.subTasks ?? []).find((s) => s.id === subTaskId)
        if (target?.imageId) removeStoredImage(target.imageId)
        return { ...q, subTasks: (q.subTasks ?? []).filter((s) => s.id !== subTaskId) }
      })
    )
  }, [])

  const updateQuestCanvasPosition = useCallback((id, position) => {
    const next = normalizeCanvasPosition(position)
    if (!next) return
    setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, canvasPosition: next } : q)))
  }, [])

  const updateSubTask = useCallback((questId, subTaskId, text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setQuests((prev) =>
      prev.map((q) =>
        q.id === questId
          ? { ...q, subTasks: (q.subTasks ?? []).map((s) => s.id === subTaskId ? { ...s, text: trimmed } : s) }
          : q
      )
    )
  }, [])

  const reorderQuests = useCallback((fromId, toId, insertBefore) => {
    setQuests((prev) => {
      const fromIdx = prev.findIndex((q) => q.id === fromId)
      const toIdx = prev.findIndex((q) => q.id === toId)
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev
      const result = [...prev]
      const [removed] = result.splice(fromIdx, 1)
      const newToIdx = result.findIndex((q) => q.id === toId)
      result.splice(insertBefore ? newToIdx : newToIdx + 1, 0, removed)
      return result
    })
  }, [])

  const clearCompleted = useCallback(() => {
    setQuests((prev) => {
      prev.filter((q) => q.completed).forEach(removeQuestImages)
      return prev.filter((q) => !q.completed)
    })
  }, [])

  const resetLifetimeCompletions = useCallback((value) => {
    const next = Math.max(0, value)
    cachedLifetimeCompletions = next
    setLifetimeCompletions(next)
  }, [])

  const coreQuest = quests.find((q) => q.isCore) ?? null
  const coreTaskCompleted = coreQuest?.completed ?? false

  return {
    quests,
    questTemplates,
    addQuest,
    addQuestFromTemplate,
    saveQuestTemplate,
    removeQuestTemplate,
    toggleQuest,
    setQuestCompleted,
    updateQuest,
    updateQuestCover,
    updateQuestCardMedia,
    resetAllQuestCoverRatioOverrides,
    removeQuest,
    togglePin,
    toggleCoreTask,
    setQuestPriority,
    setQuestStatus,
    updateQuestExp,
    updateQuestRewardConfig,
    reorderQuests,
    clearCompleted,
    bindQuestToHuntTask,
    unbindQuestFromHuntTask,
    addSubTask,
    toggleSubTask,
    removeSubTask,
    updateSubTask,
    addSubTaskImage,
    updateQuestCanvasPosition,
    addCanvasQuest,
    lifetimeCompletions,
    resetLifetimeCompletions,
    coreTaskCompleted,
    loaded,
  }
}

import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'
import coinSfxUrl from '../assets/music/Heavy object Hit and body thud sound effect.mp3'
import { isSoundEnabled } from '../utils/soundSettings'

const QUESTS_DOC = doc(db, 'meta', 'quests')

let cachedQuests = null
let cachedQuestTemplates = null
let cachedLifetimeCompletions = null

const _questCompleteAudio = new Audio(coinSfxUrl)
_questCompleteAudio.volume = 0.65

function normalizeQuestExpValue(expValue) {
  if (expValue === 2) return 3
  if (expValue === 1 || expValue === 3 || expValue === 5 || expValue === 10) return expValue
  return 1
}

function normalizeSubTask(subTask = {}) {
  return {
    id: subTask.id ?? Date.now(),
    text: subTask.text ?? '',
    completed: Boolean(subTask.completed),
  }
}

function normalizeQuest(quest = {}) {
  return {
    id: quest.id ?? Date.now(),
    text: quest.text ?? '',
    completed: Boolean(quest.completed),
    isCore: Boolean(quest.isCore),
    pinned: Boolean(quest.pinned),
    priority: quest.priority ?? 'normal',
    expValue: normalizeQuestExpValue(quest.expValue),
    huntBinding: quest.huntBinding ?? null,
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

  const addQuest = useCallback((text) => {
    setQuests((prev) => [
      normalizeQuest({
        id: Date.now(),
        text,
        completed: false,
        isCore: false,
        pinned: false,
        priority: 'normal',
        expValue: 1,
        huntBinding: null,
        subTasks: [],
      }),
      ...prev,
    ])
  }, [])

  const addQuestFromTemplate = useCallback((templateId) => {
    const source = (cachedQuestTemplates ?? questTemplates).find((template) => template.id === templateId)
    if (!source) return null
    const now = Date.now()
    const newQuest = normalizeQuest({
      id: now,
      text: source.text,
      completed: false,
      isCore: false,
      pinned: false,
      priority: source.priority,
      expValue: source.expValue,
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
      subTasks: Array.isArray(questLike.subTasks)
        ? questLike.subTasks.map((subTask) => ({ text: subTask.text ?? '', completed: false }))
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

  const togglePin = useCallback((id) => {
    setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, pinned: !q.pinned } : q)))
  }, [])

  const setQuestCompleted = useCallback((id, completed) => {
    let completionDelta = 0
    setQuests((prev) => {
      const target = prev.find((q) => q.id === id)
      if (!target) return prev
      if (target.completed === completed) return prev
      const exp = normalizeQuestExpValue(target.expValue)
      completionDelta = completed ? exp : -exp
      return prev.map((q) => (q.id === id ? { ...q, completed } : q))
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
    setQuests((prev) => prev.map((q) => q.id === id ? { ...q, expValue } : q))
  }, [])

  const removeQuest = useCallback((id) => {
    setQuests((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const updateQuest = useCallback((id, text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setQuests((prev) => prev.map((q) => (q.id === id ? { ...q, text: trimmed } : q)))
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

  const removeSubTask = useCallback((questId, subTaskId) => {
    setQuests((prev) =>
      prev.map((q) =>
        q.id === questId
          ? { ...q, subTasks: (q.subTasks ?? []).filter((s) => s.id !== subTaskId) }
          : q
      )
    )
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
    setQuests((prev) => prev.filter((q) => !q.completed))
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
    removeQuest,
    togglePin,
    toggleCoreTask,
    setQuestPriority,
    updateQuestExp,
    reorderQuests,
    clearCompleted,
    bindQuestToHuntTask,
    unbindQuestFromHuntTask,
    addSubTask,
    toggleSubTask,
    removeSubTask,
    updateSubTask,
    lifetimeCompletions,
    resetLifetimeCompletions,
    coreTaskCompleted,
    loaded,
  }
}

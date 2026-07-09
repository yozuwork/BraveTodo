import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
import { db } from '../firebase'

const HERO_QUESTS_DOC = doc(db, 'meta', 'heroQuests')

let cachedHeroQuestItems = null
let cachedHeroLifetimeCompletions = null

function normalizeHeroQuestExpValue(expValue) {
  if (expValue === 2) return 3
  if (expValue === 1 || expValue === 3 || expValue === 5 || expValue === 10 || expValue === 20) return expValue
  return 1
}

function normalizeHeroSubTask(subTask = {}) {
  return {
    id: subTask.id ?? Date.now(),
    text: subTask.text ?? '',
    completed: Boolean(subTask.completed),
  }
}

function normalizeHeroQuest(quest = {}) {
  return {
    id: quest.id ?? Date.now(),
    text: quest.text ?? '',
    completed: Boolean(quest.completed),
    pinned: Boolean(quest.pinned),
    priority: quest.priority ?? 'normal',
    expValue: normalizeHeroQuestExpValue(quest.expValue),
    huntBinding: quest.huntBinding ?? null,
    subTasks: Array.isArray(quest.subTasks) ? quest.subTasks.map(normalizeHeroSubTask) : [],
  }
}

export default function useHeroQuests() {
  const [items, setItems] = useState(() => cachedHeroQuestItems ?? [])
  const [lifetimeCompletions, setLifetimeCompletions] = useState(() => cachedHeroLifetimeCompletions ?? 0)
  const [loaded, setLoaded] = useState(() => cachedHeroQuestItems !== null)

  useEffect(() => {
    if (cachedHeroQuestItems !== null) return
    getDoc(HERO_QUESTS_DOC).then((snap) => {
      if (snap.exists()) {
        const data = snap.data()
        cachedHeroQuestItems = (data.items ?? []).map(normalizeHeroQuest)
        cachedHeroLifetimeCompletions = data.lifetimeCompletions ?? 0
        setItems(cachedHeroQuestItems)
        setLifetimeCompletions(cachedHeroLifetimeCompletions)
      } else {
        cachedHeroQuestItems = []
        cachedHeroLifetimeCompletions = 0
      }
      setLoaded(true)
    }).catch(() => {
      cachedHeroQuestItems = cachedHeroQuestItems ?? []
      cachedHeroLifetimeCompletions = cachedHeroLifetimeCompletions ?? 0
      setLoaded(true)
    })
  }, [])

  const skipItemsWriteRef = useRef(true)
  const skipExpWriteRef = useRef(true)

  useEffect(() => {
    if (!loaded) return
    if (skipItemsWriteRef.current) {
      skipItemsWriteRef.current = false
      return
    }
    cachedHeroQuestItems = items
    updateDoc(HERO_QUESTS_DOC, { items: items.map(normalizeHeroQuest) }).catch((err) => {
      if (err.code === 'not-found') {
        setDoc(HERO_QUESTS_DOC, { items: items.map(normalizeHeroQuest), lifetimeCompletions }).catch(console.error)
      } else {
        console.error(err)
      }
    })
  }, [loaded, items, lifetimeCompletions])

  useEffect(() => {
    if (!loaded) return
    if (skipExpWriteRef.current) {
      skipExpWriteRef.current = false
      return
    }
    cachedHeroLifetimeCompletions = lifetimeCompletions
    updateDoc(HERO_QUESTS_DOC, { lifetimeCompletions }).catch((err) => {
      if (err.code === 'not-found') {
        setDoc(HERO_QUESTS_DOC, { items: items.map(normalizeHeroQuest), lifetimeCompletions }).catch(console.error)
      } else {
        console.error(err)
      }
    })
  }, [loaded, items, lifetimeCompletions])

  const addQuest = useCallback((text) => {
    setItems((prev) => [
      normalizeHeroQuest({
        id: Date.now(),
        text,
        completed: false,
        pinned: false,
        priority: 'normal',
        expValue: 1,
        huntBinding: null,
        subTasks: [],
      }),
      ...prev,
    ])
  }, [])

  const setQuestPriority = useCallback((id, priority) => {
    setItems((prev) => prev.map((q) => (q.id === id ? { ...q, priority } : q)))
  }, [])

  const togglePin = useCallback((id) => {
    setItems((prev) => prev.map((q) => (q.id === id ? { ...q, pinned: !q.pinned } : q)))
  }, [])

  const updateQuestExp = useCallback((id, expValue) => {
    const nextExpValue = normalizeHeroQuestExpValue(expValue)
    let completionDelta = 0
    setItems((prev) => prev.map((q) => {
      if (q.id !== id) return q
      const next = { ...q, expValue: nextExpValue }
      if (q.completed) {
        completionDelta = next.expValue - q.expValue
      }
      return next
    }))
    if (completionDelta !== 0) {
      setLifetimeCompletions((c) => {
        const next = Math.max(0, c + completionDelta)
        cachedHeroLifetimeCompletions = next
        return next
      })
    }
  }, [])

  const setQuestCompleted = useCallback((id, completed) => {
    let completionDelta = 0
    setItems((prev) => {
      const target = prev.find((q) => q.id === id)
      if (!target) return prev
      if (target.completed === completed) return prev
      const exp = normalizeHeroQuestExpValue(target.expValue)
      completionDelta = completed ? exp : -exp
      return prev.map((q) => (q.id === id ? { ...q, completed } : q))
    })
    if (completionDelta !== 0) {
      setLifetimeCompletions((c) => {
        const next = Math.max(0, c + completionDelta)
        cachedHeroLifetimeCompletions = next
        return next
      })
    }
  }, [])

  const toggleQuest = useCallback((id) => {
    let nextCompleted = null
    setItems((prev) => {
      const target = prev.find((q) => q.id === id)
      if (!target) return prev
      nextCompleted = !target.completed
      return prev
    })
    if (nextCompleted !== null) setQuestCompleted(id, nextCompleted)
  }, [setQuestCompleted])

  const bindQuestToHuntTask = useCallback((questId, binding) => {
    setItems((prev) => prev.map((q) => (q.id === questId ? { ...q, huntBinding: binding } : q)))
  }, [])

  const unbindQuestFromHuntTask = useCallback((questId) => {
    setItems((prev) => prev.map((q) => (q.id === questId ? { ...q, huntBinding: null } : q)))
  }, [])

  const updateQuest = useCallback((id, text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setItems((prev) => prev.map((q) => (q.id === id ? { ...q, text: trimmed } : q)))
  }, [])

  const removeQuest = useCallback((id) => {
    setItems((prev) => prev.filter((q) => q.id !== id))
  }, [])

  const addSubTask = useCallback((questId, text) => {
    setItems((prev) =>
      prev.map((q) =>
        q.id === questId
          ? { ...q, subTasks: [...(q.subTasks ?? []), { id: Date.now(), text, completed: false }] }
          : q
      )
    )
  }, [])

  const toggleSubTask = useCallback((questId, subTaskId) => {
    setItems((prev) =>
      prev.map((q) => {
        if (q.id !== questId) return q
        return {
          ...q,
          subTasks: (q.subTasks ?? []).map((s) => (s.id === subTaskId ? { ...s, completed: !s.completed } : s)),
        }
      })
    )
  }, [])

  const removeSubTask = useCallback((questId, subTaskId) => {
    setItems((prev) =>
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
    setItems((prev) =>
      prev.map((q) =>
        q.id === questId
          ? { ...q, subTasks: (q.subTasks ?? []).map((s) => (s.id === subTaskId ? { ...s, text: trimmed } : s)) }
          : q
      )
    )
  }, [])

  const reorderQuests = useCallback((fromId, toId, insertBefore) => {
    setItems((prev) => {
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
    setItems((prev) => prev.filter((q) => !q.completed))
  }, [])

  const resetLifetimeCompletions = useCallback((value) => {
    const next = Math.max(0, value)
    cachedHeroLifetimeCompletions = next
    setLifetimeCompletions(next)
  }, [])

  return {
    items,
    addQuest,
    updateQuest,
    removeQuest,
    toggleQuest,
    setQuestCompleted,
    setQuestPriority,
    togglePin,
    updateQuestExp,
    bindQuestToHuntTask,
    unbindQuestFromHuntTask,
    addSubTask,
    toggleSubTask,
    removeSubTask,
    updateSubTask,
    reorderQuests,
    clearCompleted,
    lifetimeCompletions,
    resetLifetimeCompletions,
    loaded,
  }
}

import { useState, useCallback, useEffect, useRef } from 'react'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

const INBOX_DOC = doc(db, 'meta', 'inbox')

export default function useInbox() {
  const [inboxItems, setInboxItems] = useState([])
  const [loaded, setLoaded] = useState(false)
  const skipWriteRef = useRef(true)

  useEffect(() => {
    getDoc(INBOX_DOC).then((snap) => {
      if (snap.exists()) {
        setInboxItems(snap.data().items ?? [])
      }
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  useEffect(() => {
    if (!loaded) return
    if (skipWriteRef.current) {
      skipWriteRef.current = false
      return
    }
    setDoc(INBOX_DOC, { items: inboxItems }).catch(console.error)
  }, [inboxItems, loaded])

  const addInboxItem = useCallback((text, subTasks = []) => {
    setInboxItems((prev) => [
      { id: Date.now(), text, subTasks },
      ...prev,
    ])
  }, [])

  const addInboxSubTask = useCallback((itemId, text) => {
    setInboxItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, subTasks: [...(i.subTasks ?? []), { id: Date.now(), text, completed: false }] }
          : i
      )
    )
  }, [])

  const toggleInboxSubTask = useCallback((itemId, subId) => {
    setInboxItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, subTasks: (i.subTasks ?? []).map((s) => s.id === subId ? { ...s, completed: !s.completed } : s) }
          : i
      )
    )
  }, [])

  const removeInboxSubTask = useCallback((itemId, subId) => {
    setInboxItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, subTasks: (i.subTasks ?? []).filter((s) => s.id !== subId) }
          : i
      )
    )
  }, [])

  const updateInboxSubTask = useCallback((itemId, subId, text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setInboxItems((prev) =>
      prev.map((i) =>
        i.id === itemId
          ? { ...i, subTasks: (i.subTasks ?? []).map((s) => s.id === subId ? { ...s, text: trimmed } : s) }
          : i
      )
    )
  }, [])

  const removeInboxItem = useCallback((id) => {
    setInboxItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const updateInboxItem = useCallback((id, text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setInboxItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, text: trimmed } : item))
    )
  }, [])

  const reorderInboxItems = useCallback((fromId, toId, insertBefore) => {
    setInboxItems((prev) => {
      const fromIdx = prev.findIndex((i) => i.id === fromId)
      const toIdx = prev.findIndex((i) => i.id === toId)
      if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return prev
      const result = [...prev]
      const [removed] = result.splice(fromIdx, 1)
      const newToIdx = result.findIndex((i) => i.id === toId)
      result.splice(insertBefore ? newToIdx : newToIdx + 1, 0, removed)
      return result
    })
  }, [])

  return {
    inboxItems,
    addInboxItem,
    removeInboxItem,
    updateInboxItem,
    reorderInboxItems,
    addInboxSubTask,
    toggleInboxSubTask,
    removeInboxSubTask,
    updateInboxSubTask,
    loaded,
  }
}

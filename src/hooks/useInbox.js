import { useState, useCallback, useEffect } from 'react'

const STORAGE_KEY = 'brave-todo:inbox'

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw !== null ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

export default function useInbox() {
  const [inboxItems, setInboxItems] = useState(() => loadJSON(STORAGE_KEY, []))

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inboxItems))
  }, [inboxItems])

  const addInboxItem = useCallback((text) => {
    setInboxItems((prev) => [
      { id: Date.now(), text },
      ...prev,
    ])
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

  return {
    inboxItems,
    addInboxItem,
    removeInboxItem,
    updateInboxItem,
  }
}

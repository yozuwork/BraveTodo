import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'brave-todo:task-display-settings'
const SETTINGS_EVENT = 'brave-todo:task-display-settings-change'

const DEFAULT_SETTINGS = {
  showCompletedInAll: false,
  cardCoverRatio: 100,
}

function readSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
    return {
      ...DEFAULT_SETTINGS,
      ...(saved && typeof saved === 'object' ? saved : {}),
      showCompletedInAll: saved?.showCompletedInAll === true,
      cardCoverRatio: Number.isFinite(Number(saved?.cardCoverRatio))
        ? Math.min(180, Math.max(60, Math.round(Number(saved.cardCoverRatio))))
        : 100,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export default function useTaskDisplaySettings() {
  const [settings, setSettings] = useState(readSettings)

  useEffect(() => {
    const syncSettings = (event) => {
      setSettings(event.detail ?? readSettings())
    }
    window.addEventListener(SETTINGS_EVENT, syncSettings)
    window.addEventListener('storage', syncSettings)
    return () => {
      window.removeEventListener(SETTINGS_EVENT, syncSettings)
      window.removeEventListener('storage', syncSettings)
    }
  }, [])

  const setShowCompletedInAll = useCallback((showCompletedInAll) => {
    const next = { ...readSettings(), showCompletedInAll: Boolean(showCompletedInAll) }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setSettings(next)
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: next }))
  }, [])

  const setCardCoverRatio = useCallback((cardCoverRatio) => {
    const next = {
      ...readSettings(),
      cardCoverRatio: Math.min(180, Math.max(60, Math.round(Number(cardCoverRatio) || 100))),
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    setSettings(next)
    window.dispatchEvent(new CustomEvent(SETTINGS_EVENT, { detail: next }))
  }, [])

  return {
    showCompletedInAll: settings.showCompletedInAll,
    setShowCompletedInAll,
    cardCoverRatio: settings.cardCoverRatio,
    setCardCoverRatio,
  }
}

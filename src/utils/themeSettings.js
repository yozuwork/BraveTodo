const THEME_KEY = 'brave-todo:theme'
const THEME_EVENT = 'brave-todo:theme-change'
const THEMES = ['light', 'retro', 'dark']

function normalizeTheme(theme) {
  return THEMES.includes(theme) ? theme : 'light'
}

export function getAppTheme() {
  return normalizeTheme(localStorage.getItem(THEME_KEY))
}

export function setAppTheme(theme) {
  const next = normalizeTheme(theme)
  localStorage.setItem(THEME_KEY, next)
  document.documentElement.dataset.appTheme = next
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }))
}

export function applyStoredTheme() {
  document.documentElement.dataset.appTheme = getAppTheme()
}

export { THEME_EVENT }

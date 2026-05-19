const THEME_KEY = 'brave-todo:theme'
const THEME_EVENT = 'brave-todo:theme-change'

export function getAppTheme() {
  return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'
}

export function setAppTheme(theme) {
  const next = theme === 'dark' ? 'dark' : 'light'
  localStorage.setItem(THEME_KEY, next)
  document.documentElement.dataset.appTheme = next
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: next }))
}

export function applyStoredTheme() {
  document.documentElement.dataset.appTheme = getAppTheme()
}

export { THEME_EVENT }

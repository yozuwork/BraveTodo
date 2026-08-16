const THEME_KEY = 'brave-todo:theme'
const THEME_EVENT = 'brave-todo:theme-change'
const MANGA_IMAGE_KEY = 'brave-todo:manga-image-mode'
const MANGA_IMAGE_EVENT = 'brave-todo:manga-image-mode-change'
const MANGA_INTERACTION_KEY = 'brave-todo:manga-interaction-mode'
const MANGA_INTERACTION_EVENT = 'brave-todo:manga-interaction-mode-change'
const THEMES = ['light', 'manga']

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
  document.documentElement.dataset.mangaImages = getMangaImageMode()
  document.documentElement.dataset.mangaInteraction = getMangaInteractionMode()
}

export function getMangaImageMode() {
  return localStorage.getItem(MANGA_IMAGE_KEY) === 'color' ? 'color' : 'mono'
}

export function setMangaImageMode(mode) {
  const next = mode === 'color' ? 'color' : 'mono'
  localStorage.setItem(MANGA_IMAGE_KEY, next)
  document.documentElement.dataset.mangaImages = next
  window.dispatchEvent(new CustomEvent(MANGA_IMAGE_EVENT, { detail: next }))
}

export function getMangaInteractionMode() {
  return localStorage.getItem(MANGA_INTERACTION_KEY) === 'soft' ? 'soft' : 'ink'
}

export function setMangaInteractionMode(mode) {
  const next = mode === 'soft' ? 'soft' : 'ink'
  localStorage.setItem(MANGA_INTERACTION_KEY, next)
  document.documentElement.dataset.mangaInteraction = next
  window.dispatchEvent(new CustomEvent(MANGA_INTERACTION_EVENT, { detail: next }))
}

export { THEME_EVENT, MANGA_IMAGE_EVENT, MANGA_INTERACTION_EVENT }

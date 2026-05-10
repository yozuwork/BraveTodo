const KEY = 'brave-todo:soundEnabled'

export function isSoundEnabled() {
  const val = localStorage.getItem(KEY)
  return val === null ? false : val === 'true'  // default off
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(KEY, String(enabled))
}

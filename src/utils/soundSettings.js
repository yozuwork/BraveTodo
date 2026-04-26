const KEY = 'brave-todo:soundEnabled'

export function isSoundEnabled() {
  const val = localStorage.getItem(KEY)
  return val === null ? true : val === 'true'  // default on
}

export function setSoundEnabled(enabled) {
  localStorage.setItem(KEY, String(enabled))
}

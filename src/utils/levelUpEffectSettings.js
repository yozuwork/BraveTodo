const KEY = 'brave-todo:levelUpEffectEnabled'

export function isLevelUpEffectEnabled() {
  return localStorage.getItem(KEY) !== 'false' // default on
}

export function setLevelUpEffectEnabled(enabled) {
  localStorage.setItem(KEY, String(enabled))
}

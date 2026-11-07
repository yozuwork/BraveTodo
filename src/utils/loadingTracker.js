import { useSyncExternalStore } from 'react'

// 全站載入計數：任何讀取進行中時顯示轉圈圈
let pendingCount = 0
const listeners = new Set()

const emit = () => listeners.forEach((listener) => listener())

export function trackLoading(promise) {
  pendingCount += 1
  emit()
  return Promise.resolve(promise).finally(() => {
    pendingCount = Math.max(0, pendingCount - 1)
    emit()
  })
}

const subscribe = (listener) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useGlobalLoading() {
  return useSyncExternalStore(subscribe, () => pendingCount > 0)
}

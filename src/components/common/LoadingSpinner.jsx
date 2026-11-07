import CircularProgress from '@mui/material/CircularProgress'
import { useEffect, useState } from 'react'
import { useGlobalLoading } from '../../utils/loadingTracker'

// 置中的轉圈圈，用在整頁或區塊第一次載入
export function LoadingSpinner({ label = '載入中…', className = '' }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-slate-400 ${className}`} role="status" aria-live="polite">
      <CircularProgress size={34} thickness={4} sx={{ color: '#a855f7' }} />
      <span className="text-xs font-semibold">{label}</span>
    </div>
  )
}

// 右上角的小轉圈圈：有任何資料讀取中就出現（延遲一下避免一閃而過）
export default function GlobalLoadingIndicator() {
  const loading = useGlobalLoading()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!loading) {
      setVisible(false)
      return undefined
    }
    const timer = window.setTimeout(() => setVisible(true), 200)
    return () => window.clearTimeout(timer)
  }, [loading])

  if (!visible) return null
  return (
    <div
      className="pointer-events-none fixed left-1/2 top-3 z-[2000] flex -translate-x-1/2 items-center gap-2 rounded-full border border-slate-200 bg-white/95 px-3.5 py-1.5 text-xs font-semibold text-slate-500 shadow-lg backdrop-blur"
      role="status"
      aria-live="polite"
    >
      <CircularProgress size={14} thickness={5} sx={{ color: '#a855f7' }} />
      載入中…
    </div>
  )
}

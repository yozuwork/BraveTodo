import { useState } from 'react'
import Button from '@mui/material/Button'
import RefreshIcon from '@mui/icons-material/Refresh'
import StorageIcon from '@mui/icons-material/Storage'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import { getStorageStats } from '../../utils/imageStorage'

function fmtBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const FIRESTORE_FREE_BYTES = 1 * 1024 * 1024 * 1024 // 1 GiB free tier

export default function StorageUsage() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = async () => {
    setLoading(true)
    setError(null)
    try {
      const s = await getStorageStats()
      setStats(s)
    } catch (e) {
      setError('無法讀取，請確認網路連線')
    } finally {
      setLoading(false)
    }
  }

  const usedPct = stats ? Math.min((stats.totalBytes / FIRESTORE_FREE_BYTES) * 100, 100) : 0

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <StorageIcon sx={{ fontSize: 18, color: '#a855f7' }} />
          <span className="text-sm font-bold text-black">雲端空間用量</span>
        </div>
        <Button
          size="small"
          variant="outlined"
          startIcon={<RefreshIcon sx={{ fontSize: 14 }} />}
          onClick={refresh}
          disabled={loading}
          sx={{
            borderColor: '#e5e7eb',
            color: '#6b7280',
            borderRadius: 99,
            fontSize: '0.7rem',
            textTransform: 'none',
            py: 0.5,
            px: 1.5,
            minWidth: 0,
            '&:hover': { borderColor: '#a855f7', color: '#a855f7' },
          }}
        >
          {loading ? '計算中…' : '計算用量'}
        </Button>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {!stats && !loading && (
        <p className="text-xs text-gray-400 text-center py-4">點擊「計算用量」查看當前使用空間</p>
      )}

      {stats && (
        <div className="flex flex-col gap-3">
          {/* Progress bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between text-xs text-gray-500">
              <span>已使用 {fmtBytes(stats.totalBytes)}</span>
              <span className="text-gray-400">免費額度 1 GB</span>
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${usedPct}%`,
                  backgroundColor: usedPct > 80 ? '#ef4444' : usedPct > 50 ? '#f59e0b' : '#a855f7',
                }}
              />
            </div>
            <p className="text-xs text-gray-400">
              剩餘 {fmtBytes(FIRESTORE_FREE_BYTES - stats.totalBytes)}（{(100 - usedPct).toFixed(2)}%）
            </p>
          </div>

          {/* Breakdown */}
          <div className="flex flex-col gap-2 pt-1 border-t border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <ImageOutlinedIcon sx={{ fontSize: 14, color: '#a855f7' }} />
                圖片（{stats.imageCount} 張）
              </div>
              <span className="text-xs font-medium text-gray-700">{fmtBytes(stats.imageBytes)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <ArticleOutlinedIcon sx={{ fontSize: 14, color: '#6b7280' }} />
                其他資料
              </div>
              <span className="text-xs font-medium text-gray-700">{fmtBytes(stats.metaBytes)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

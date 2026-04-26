import { useState, useRef, useEffect } from 'react'
import Button from '@mui/material/Button'
import Switch from '@mui/material/Switch'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import ImageIcon from '@mui/icons-material/Image'
import RestoreIcon from '@mui/icons-material/Restore'
import TitleIcon from '@mui/icons-material/Title'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import VolumeUpIcon from '@mui/icons-material/VolumeUp'
import VolumeOffIcon from '@mui/icons-material/VolumeOff'
import { isSoundEnabled, setSoundEnabled } from '../../utils/soundSettings'

const FAVICON_KEY  = 'brave-todo:favicon'
const TITLE_KEY    = 'brave-todo:pageTitle'
const DEFAULT_TITLE = 'Vanguard Hub'
const IS_DEV = import.meta.env.DEV

// ── Page title hook ───────────────────────────────────────────
function usePageTitle() {
  const [title, setTitle] = useState(() => localStorage.getItem(TITLE_KEY) || document.title || DEFAULT_TITLE)
  const [savedToDisk, setSavedToDisk] = useState(false)

  useEffect(() => {
    document.title = title
    localStorage.setItem(TITLE_KEY, title)
  }, [title])

  const saveTitle = async (newTitle) => {
    const t = newTitle.trim() || DEFAULT_TITLE
    setTitle(t)
    setSavedToDisk(false)
    if (IS_DEV) {
      try {
        const res = await fetch('/api/save-title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: t }),
        })
        if (res.ok) setSavedToDisk(true)
      } catch { /* ignore */ }
    }
  }

  const resetTitle = async () => {
    await saveTitle(DEFAULT_TITLE)
  }

  return { title, saveTitle, resetTitle, savedToDisk }
}

// Convert any image file → PNG data URL (64px, suitable for favicon)
function fileToFaviconPng(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        const size = Math.min(img.width, img.height, 256)
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        // Centre-crop if not square
        const sx = (img.width  - size) / 2
        const sy = (img.height - size) / 2
        ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size)
        resolve(canvas.toDataURL('image/png'))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function useFavicon() {
  const [faviconUrl, setFaviconUrl] = useState(() => localStorage.getItem(FAVICON_KEY) || null)
  const [savedToDisk, setSavedToDisk] = useState(false)

  // Apply to <link rel="icon"> tag
  useEffect(() => {
    let el = document.querySelector("link[rel~='icon']")
    if (!el) {
      el = document.createElement('link')
      el.rel = 'icon'
      document.head.appendChild(el)
    }
    if (faviconUrl) {
      el.href = faviconUrl
      localStorage.setItem(FAVICON_KEY, faviconUrl)
    } else {
      el.href = '/favicon.png'
      localStorage.removeItem(FAVICON_KEY)
    }
  }, [faviconUrl])

  const uploadFavicon = async (file) => {
    if (!file) return
    const dataUrl = await fileToFaviconPng(file)
    setFaviconUrl(dataUrl)
    setSavedToDisk(false)

    // In dev mode: also write to public/favicon.png so it's committed with the project
    if (IS_DEV) {
      try {
        const res = await fetch('/api/save-favicon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl }),
        })
        if (res.ok) setSavedToDisk(true)
      } catch {
        // dev server not available — silently ignore
      }
    }
  }

  const resetFavicon = async () => {
    setFaviconUrl(null)
    setSavedToDisk(false)
    if (IS_DEV) {
      // Restore original cat.png as favicon.png
      try {
        const res = await fetch('/src/assets/cat.png')
        const blob = await res.blob()
        const file = new File([blob], 'cat.png', { type: blob.type })
        const dataUrl = await fileToFaviconPng(file)
        await fetch('/api/save-favicon', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dataUrl }),
        })
      } catch { /* ignore */ }
    }
  }

  return { faviconUrl, uploadFavicon, resetFavicon, savedToDisk }
}

// 根據升級規則計算到達指定等級起點所需的累計經驗數
function calcCompletionsForLevel(targetLevel, rules) {
  let total = 0
  for (const rule of rules) {
    if (targetLevel <= rule.minLevel) break
    const reachableLevel = Math.min(targetLevel, rule.maxLevel)
    const levelsGained = reachableLevel - rule.minLevel
    total += levelsGained * rule.expPerLevel
    if (targetLevel <= rule.maxLevel) break
  }
  return total
}

// ── Save keys to include in export ───────────────────────────
const SAVE_KEYS = [
  'brave-todo:quests',
  'brave-todo:lifetimeCompletions',
  'brave-todo:stages',
  'brave-todo:stageBossHunts',
  'brave-todo:avatar',
  'brave-todo:imagePosition',
  'brave-todo:inbox',
  'brave-todo:favicon',
  'brave-todo:pageTitle',
  'brave-todo:monsters',
  'brave-todo:levelingRules',
  'characterCardSize',
]

function exportSave() {
  const save = { _version: 1, _exportedAt: new Date().toISOString() }
  for (const key of SAVE_KEYS) {
    const val = localStorage.getItem(key)
    if (val !== null) save[key] = val
  }
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `braveTodo-save-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function SoundToggleCard() {
  const [enabled, setEnabled] = useState(isSoundEnabled)

  const toggle = () => {
    const next = !enabled
    setEnabled(next)
    setSoundEnabled(next)
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 px-5 py-5 flex flex-col gap-3">
      <p className="text-sm font-semibold text-black m-0">音效設定</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enabled
            ? <VolumeUpIcon sx={{ fontSize: 20, color: '#a855f7' }} />
            : <VolumeOffIcon sx={{ fontSize: 20, color: '#d1d5db' }} />
          }
          <span className="text-sm text-gray-600">
            {enabled ? '音效已開啟' : '音效已關閉'}
          </span>
        </div>
        <Switch
          checked={enabled}
          onChange={toggle}
          sx={{
            '& .MuiSwitch-switchBase.Mui-checked': { color: '#a855f7' },
            '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#a855f7' },
          }}
        />
      </div>
      <p className="text-xs text-gray-400 m-0">控制任務完成音效與升級音效</p>
    </div>
  )
}

export default function OtherSettings({ currentLevel, levelingRules, onResetLevel }) {
  const maxLevel = levelingRules[levelingRules.length - 1]?.maxLevel ?? 250
  const [targetLevel, setTargetLevel] = useState(1)
  const [confirmed, setConfirmed] = useState(false)
  const { faviconUrl, uploadFavicon, resetFavicon, savedToDisk: faviconSaved } = useFavicon()
  const faviconInputRef = useRef(null)
  const { title: pageTitle, saveTitle, resetTitle, savedToDisk: titleSaved } = usePageTitle()
  const [titleDraft, setTitleDraft] = useState(pageTitle)
  const importInputRef = useRef(null)
  const [importStatus, setImportStatus] = useState(null) // null | 'success' | 'error'
  const [importError, setImportError] = useState('')

  const handleImport = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const save = JSON.parse(e.target.result)
        if (typeof save !== 'object' || Array.isArray(save)) throw new Error('格式錯誤')
        for (const [key, val] of Object.entries(save)) {
          if (key.startsWith('_')) continue  // skip metadata fields
          if (typeof val === 'string') localStorage.setItem(key, val)
        }
        setImportStatus('success')
        setTimeout(() => window.location.reload(), 800)
      } catch (err) {
        setImportStatus('error')
        setImportError(err.message)
      }
    }
    reader.readAsText(file)
  }

  const handleInput = (e) => {
    const val = parseInt(e.target.value, 10)
    if (isNaN(val)) { setTargetLevel(''); return }
    setTargetLevel(Math.min(maxLevel, Math.max(1, val)))
    setConfirmed(false)
  }

  const handleReset = () => {
    if (!confirmed) {
      setConfirmed(true)
      return
    }
    const completions = calcCompletionsForLevel(Number(targetLevel) || 1, levelingRules)
    onResetLevel(completions)
    setConfirmed(false)
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-bold text-black m-0">其他設定</h2>
      </div>

      {/* Favicon card */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-black m-0">網頁圖示（Favicon）</p>
          <p className="text-xs text-gray-400 mt-0.5 m-0">
            自訂瀏覽器分頁上顯示的小圖示，建議使用正方形圖片
          </p>
          {IS_DEV ? (
            <p className="text-xs mt-1 m-0 font-medium" style={{ color: '#10b981' }}>
              ✓ 開發模式：上傳後會儲存到 public/favicon.png，commit 後即永久生效
            </p>
          ) : (
            <p className="text-xs mt-1 m-0 font-medium text-amber-500">
              ⚠ 已部署模式：僅暫時更改（本裝置）。若要永久修改，請在本機開發環境上傳後 push。
            </p>
          )}
        </div>

        <div className="flex items-center gap-4">
          {/* Preview */}
          <div
            className="w-12 h-12 rounded-xl border-2 border-dashed border-gray-200 flex items-center justify-center overflow-hidden shrink-0"
            style={faviconUrl ? { borderStyle: 'solid', borderColor: '#a855f7' } : {}}
          >
            {faviconUrl
              ? <img src={faviconUrl} alt="favicon" className="w-full h-full object-contain" />
              : <ImageIcon sx={{ fontSize: 22, color: '#d1d5db' }} />
            }
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outlined"
                size="small"
                startIcon={<ImageIcon />}
                onClick={() => faviconInputRef.current?.click()}
                sx={{
                  borderColor: '#a855f7',
                  color: '#a855f7',
                  borderRadius: 99,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  '&:hover': { borderColor: '#9333ea', bgcolor: '#faf5ff' },
                }}
              >
                上傳圖示
              </Button>
              {faviconUrl && (
                <Button
                  variant="text"
                  size="small"
                  startIcon={<RestoreIcon />}
                  onClick={resetFavicon}
                  sx={{
                    color: '#9ca3af',
                    borderRadius: 99,
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    '&:hover': { bgcolor: '#f3f4f6' },
                  }}
                >
                  恢復預設
                </Button>
              )}
            </div>
            {faviconSaved && (
              <p className="text-xs m-0 font-medium" style={{ color: '#10b981' }}>
                ✓ 已儲存到 public/favicon.png — commit 並 push 後即永久生效
              </p>
            )}
          </div>
        </div>

        <input
          ref={faviconInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => { uploadFavicon(e.target.files[0]); e.target.value = '' }}
        />
      </div>

      {/* Page title card */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-black m-0">網頁標題</p>
          <p className="text-xs text-gray-400 mt-0.5 m-0">瀏覽器分頁上顯示的標題文字</p>
          {IS_DEV ? (
            <p className="text-xs mt-1 m-0 font-medium" style={{ color: '#10b981' }}>
              ✓ 開發模式：儲存後會寫入 index.html，commit 後即永久生效
            </p>
          ) : (
            <p className="text-xs mt-1 m-0 font-medium text-amber-500">
              ⚠ 已部署模式：僅暫時更改（本裝置）。若要永久修改，請在本機操作後 push。
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <TitleIcon sx={{ color: '#d1d5db', fontSize: 20, shrink: 0 }} />
          <input
            type="text"
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); saveTitle(titleDraft) }
              if (e.key === 'Escape') setTitleDraft(pageTitle)
            }}
            className="flex-1 text-sm text-black bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors"
            placeholder={DEFAULT_TITLE}
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outlined"
            size="small"
            onClick={() => saveTitle(titleDraft)}
            sx={{
              borderColor: '#a855f7',
              color: '#a855f7',
              borderRadius: 99,
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'none',
              '&:hover': { borderColor: '#9333ea', bgcolor: '#faf5ff' },
            }}
          >
            儲存標題
          </Button>
          {pageTitle !== DEFAULT_TITLE && (
            <Button
              variant="text"
              size="small"
              startIcon={<RestoreIcon />}
              onClick={() => { resetTitle(); setTitleDraft(DEFAULT_TITLE) }}
              sx={{
                color: '#9ca3af',
                borderRadius: 99,
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'none',
                '&:hover': { bgcolor: '#f3f4f6' },
              }}
            >
              恢復預設
            </Button>
          )}
          {titleSaved && (
            <span className="text-xs font-medium" style={{ color: '#10b981' }}>
              ✓ 已寫入 index.html
            </span>
          )}
        </div>
      </div>

      {/* Level reset card */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-black m-0">等級重置</p>
          <p className="text-xs text-gray-400 mt-0.5 m-0">
            將目前等級重置到指定等級（目前 LV{currentLevel}）
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 shrink-0">重置到</span>
          <div className="flex items-center gap-1">
            <span className="text-sm font-mono text-gray-500">LV</span>
            <input
              type="number"
              min={1}
              max={maxLevel}
              value={targetLevel}
              onChange={handleInput}
              onFocus={() => setConfirmed(false)}
              className="w-20 text-sm font-bold text-black bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors text-center"
            />
          </div>
          <span className="text-xs text-gray-400">（1 ~ {maxLevel}）</span>
        </div>

        {confirmed && (
          <p className="text-xs text-red-500 m-0">
            確定要重置到 LV{targetLevel} 嗎？再按一次確認。
          </p>
        )}

        <Button
          variant="contained"
          startIcon={<RestartAltIcon />}
          onClick={handleReset}
          sx={{
            alignSelf: 'flex-start',
            bgcolor: confirmed ? '#ef4444' : '#6b7280',
            borderRadius: 99,
            fontWeight: 600,
            fontSize: '0.8rem',
            textTransform: 'none',
            px: 2.5,
            '&:hover': { bgcolor: confirmed ? '#dc2626' : '#4b5563' },
          }}
        >
          {confirmed ? '確認重置' : '重置等級'}
        </Button>
      </div>

      {/* Sound toggle card */}
      <SoundToggleCard />

      {/* Save data management card */}
      <div className="bg-white rounded-xl border border-gray-100 px-5 py-5 flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-black m-0">存檔管理</p>
          <p className="text-xs text-gray-400 mt-0.5 m-0">
            匯出本機所有設定為 JSON 檔案，可匯入到其他裝置或線上版本來覆蓋設定
          </p>
        </div>

        <div className="flex flex-col gap-3">
          {/* Export */}
          <div className="flex items-center gap-3">
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={exportSave}
              sx={{
                borderColor: '#a855f7',
                color: '#a855f7',
                borderRadius: 99,
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'none',
                '&:hover': { borderColor: '#9333ea', bgcolor: '#faf5ff' },
              }}
            >
              匯出存檔
            </Button>
            <span className="text-xs text-gray-400">下載 JSON 檔案</span>
          </div>

          {/* Import */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              variant="outlined"
              startIcon={<FileUploadIcon />}
              onClick={() => { setImportStatus(null); importInputRef.current?.click() }}
              sx={{
                borderColor: '#6b7280',
                color: '#6b7280',
                borderRadius: 99,
                fontWeight: 600,
                fontSize: '0.75rem',
                textTransform: 'none',
                '&:hover': { borderColor: '#4b5563', bgcolor: '#f9fafb' },
              }}
            >
              匯入存檔
            </Button>
            <span className="text-xs text-gray-400">選取 JSON 檔案，匯入後自動重新載入</span>
          </div>

          {importStatus === 'success' && (
            <p className="text-xs font-medium m-0" style={{ color: '#10b981' }}>
              ✓ 匯入成功，正在重新載入...
            </p>
          )}
          {importStatus === 'error' && (
            <p className="text-xs font-medium text-red-500 m-0">
              ✗ 匯入失敗：{importError}
            </p>
          )}
        </div>

        <input
          ref={importInputRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => { handleImport(e.target.files[0]); e.target.value = '' }}
        />
      </div>
    </div>
  )
}

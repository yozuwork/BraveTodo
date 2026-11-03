import { useRef, useState, useCallback, useEffect } from 'react'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CollectionsIcon from '@mui/icons-material/Collections'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import defaultAvatar from '../../assets/hero.jpg'
import GalleryImagePicker from '../common/GalleryImagePicker'

function getStageImageSrcs(stage) {
  if (!stage) return []
  const customAvatarCount = stage.avatars?.length ?? (stage.avatar ? 1 : 0)
  if (customAvatarCount > 0) {
    return (stage.avatarSrcs ?? (stage.avatarSrc ? [stage.avatarSrc] : []))
      .slice(0, customAvatarCount)
      .filter(Boolean)
  }
  return stage.avatarSrc ? [stage.avatarSrc] : []
}

function getImageExtension(src) {
  const mimeMatch = src?.match(/^data:image\/([a-zA-Z0-9.+-]+);/)
  if (mimeMatch) return mimeMatch[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg')
  const pathMatch = src?.split(/[?#]/)[0].match(/\.([a-zA-Z0-9]+)$/)
  return pathMatch?.[1] ?? 'png'
}

async function downloadImage(src, stageName, index = 0) {
  if (!src) return
  const safeName = (stageName || 'stage-image').replace(/[\\/:*?"<>|]/g, '-').trim() || 'stage-image'
  const fileName = `${safeName}${index > 0 ? `-${index + 1}` : ''}.${getImageExtension(src)}`
  let href = src
  let objectUrl = null

  try {
    if (!src.startsWith('data:')) {
      const response = await fetch(src)
      if (!response.ok) throw new Error('Image download failed')
      objectUrl = URL.createObjectURL(await response.blob())
      href = objectUrl
    }

    const link = document.createElement('a')
    link.href = href
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  } catch {
    const link = document.createElement('a')
    link.href = src
    link.download = fileName
    link.target = '_blank'
    link.rel = 'noopener noreferrer'
    document.body.appendChild(link)
    link.click()
    link.remove()
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}

function ExpPerLevelInput({ stage, onChange, className }) {
  const [draft, setDraft] = useState(String(stage.expPerLevel ?? 1))

  useEffect(() => {
    setDraft(String(stage.expPerLevel ?? 1))
  }, [stage.expPerLevel])

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={draft}
      onChange={(e) => {
        const value = e.target.value
        if (!/^\d*$/.test(value)) return
        setDraft(value)
        if (Number(value) >= 1) onChange(stage.id, value)
      }}
      onBlur={() => {
        if (Number(draft) >= 1) return
        setDraft('1')
        onChange(stage.id, '1')
      }}
      className={className}
    />
  )
}

function StageImagePreview({ stage, open, onClose }) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const imageSrcs = getStageImageSrcs(stage)

  useEffect(() => {
    setSelectedIndex(0)
  }, [stage?.id, open])

  const safeIndex = Math.min(selectedIndex, Math.max(0, imageSrcs.length - 1))
  const selectedSrc = imageSrcs[safeIndex]

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 3, mx: 2, overflow: 'hidden' } }}
    >
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700, pb: 1 }}>
        {stage?.className || '查看圖片'}
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {selectedSrc && (
          <div className="flex flex-col gap-3">
            <div className="flex min-h-[280px] max-h-[70vh] items-center justify-center overflow-hidden rounded-xl bg-stone-950 p-2">
              <img
                src={selectedSrc}
                alt={`${stage?.className || '階段'} 圖片 ${safeIndex + 1}`}
                className="max-h-[68vh] max-w-full object-contain"
              />
            </div>
            {imageSrcs.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {imageSrcs.map((src, index) => (
                  <button
                    key={`${src}-${index}`}
                    type="button"
                    onClick={() => setSelectedIndex(index)}
                    className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 bg-white p-0 ${
                      safeIndex === index ? 'border-purple-500' : 'border-gray-200'
                    }`}
                    aria-label={`查看第 ${index + 1} 張圖片`}
                  >
                    <img src={src} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} sx={{ color: '#6b7280', textTransform: 'none' }}>
          關閉
        </Button>
        <Button
          variant="contained"
          startIcon={<DownloadOutlinedIcon />}
          onClick={() => downloadImage(selectedSrc, stage?.className, safeIndex)}
          disabled={!selectedSrc}
          sx={{ bgcolor: '#a855f7', borderRadius: 99, textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#9333ea' } }}
        >
          下載圖片
        </Button>
      </DialogActions>
    </Dialog>
  )
}


// ── Mobile edit modal ────────────────────────────────────────
function StageEditModal({
  stage, open, onClose,
  onNameChange, onInfoChange, onAvatarChange, onReplaceAvatar, onRemoveAvatar, onLevelChange,
  onExpPerLevelChange, onPositionChange,
}) {
  const fileInputRef = useRef(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [localPositions, setLocalPositions] = useState(stage?.avatarPositions ?? [])
  const [galleryOpen, setGalleryOpen] = useState(false)
  const modalDragRef = useRef(null)
  const replaceInputRef = useRef(null)
  const replaceIndexRef = useRef(null)
  // Selected paste target: 'main' (shown image), a thumbnail index, or 'add'. Click once to select, again to upload
  const [pasteTarget, setPasteTarget] = useState(null)
  const pasteIndexRef = useRef(null)

  useEffect(() => {
    setLocalPositions(stage?.avatarPositions ?? [])
  }, [stage?.id])

  useEffect(() => {
    setPasteTarget(null)
  }, [stage?.id, open])

  // Ctrl+V replaces the selected image; with no image selected it adds a new one
  useEffect(() => {
    if (!open || !stage || galleryOpen) return

    const handlePaste = (event) => {
      const items = Array.from(event.clipboardData?.items ?? [])
      const file = items.find((item) => item.kind === 'file' && item.type.startsWith('image/'))?.getAsFile()
      if (!file) return
      const target = event.target
      const isEditable = target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target.tagName))
      if (isEditable && items.some((item) => item.type === 'text/plain')) return
      event.preventDefault()
      event.stopImmediatePropagation()
      if (pasteIndexRef.current !== null) onReplaceAvatar(stage.id, pasteIndexRef.current, file)
      else onAvatarChange(stage.id, [file])
      setPasteTarget(null)
    }

    window.addEventListener('paste', handlePaste, true)
    return () => window.removeEventListener('paste', handlePaste, true)
  }, [open, stage?.id, galleryOpen, onAvatarChange, onReplaceAvatar])

  if (!stage) return null

  const avatarSrcs = (stage.avatarSrcs ?? (stage.avatarSrc ? [stage.avatarSrc] : [])).slice(
    0,
    stage.avatars?.length ?? (stage.avatar ? 1 : 0),
  )

  const clampedIdx = Math.min(selectedIdx, Math.max(0, avatarSrcs.length - 1))
  const mainSrc = avatarSrcs.length > 0 ? avatarSrcs[clampedIdx] : stage.avatarSrc
  const currentPos = localPositions[clampedIdx] ?? { x: 50, y: 50 }
  pasteIndexRef.current = pasteTarget === 'main'
    ? (avatarSrcs.length > 0 ? clampedIdx : null)
    : typeof pasteTarget === 'number' ? pasteTarget : null

  const openReplacePicker = (index) => {
    replaceIndexRef.current = index
    replaceInputRef.current?.click()
  }

  const handleMainClick = () => {
    if (pasteTarget !== 'main') {
      setPasteTarget('main')
      return
    }
    setPasteTarget(null)
    if (avatarSrcs.length > 0) openReplacePicker(clampedIdx)
    else fileInputRef.current?.click()
  }

  const handleThumbClick = (index) => {
    if (pasteTarget !== index) {
      setSelectedIdx(index)
      setPasteTarget(index)
      return
    }
    setPasteTarget(null)
    openReplacePicker(index)
  }

  const handleAddClick = () => {
    if (pasteTarget !== 'add') {
      setPasteTarget('add')
      return
    }
    setPasteTarget(null)
    fileInputRef.current?.click()
  }

  const handleMainImagePointerDown = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const posAtStart = localPositions[clampedIdx] ?? { x: 50, y: 50 }
    let moved = false

    const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

    const onMove = (me) => {
      const dx = me.clientX - startX
      const dy = me.clientY - startY
      if (!moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      moved = true
      const newX = clamp(posAtStart.x - dx * 0.3, 0, 100)
      const newY = clamp(posAtStart.y - dy * 0.3, 0, 100)
      setLocalPositions((prev) => {
        const next = [...prev]
        next[clampedIdx] = { x: newX, y: newY }
        return next
      })
      modalDragRef.current = { x: newX, y: newY }
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (!moved) {
        handleMainClick()
        return
      }
      if (modalDragRef.current) {
        onPositionChange?.(stage.id, clampedIdx, modalDragRef.current.x, modalDragRef.current.y)
        modalDragRef.current = null
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const handleRemove = (index) => {
    if (clampedIdx > 0 && index <= clampedIdx) setSelectedIdx(clampedIdx - 1)
    onRemoveAvatar(stage.id, index)
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      PaperProps={{ sx: { borderRadius: 3, mx: 2 } }}
    >
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 700, pb: 1 }}>
        編輯階段
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <div
          className="flex flex-col gap-5"
          onPointerDownCapture={(e) => {
            if (!e.target.closest('[data-paste-target]')) setPasteTarget(null)
          }}
        >

          {/* Slideshow */}
          <div>
            {/* Main image */}
            <div
              data-paste-target
              className={`relative w-full rounded-xl overflow-hidden bg-stone-900 border-2 cursor-grab transition-shadow ${
                pasteTarget === 'main' ? 'border-amber-400 ring-4 ring-amber-200' : 'border-gray-200 hover:border-amber-300'
              }`}
              style={{ aspectRatio: '4/3' }}
              title={pasteTarget === 'main' ? 'Ctrl+V 貼上替換，或再點一下上傳' : '點一下選取（可貼上圖片），拖移調整顯示位置'}
            >
              <img
                src={mainSrc}
                alt={stage.className}
                draggable={false}
                onPointerDown={handleMainImagePointerDown}
                onError={(e) => {
                  if (!e.currentTarget.dataset.fallbackApplied) {
                    e.currentTarget.dataset.fallbackApplied = 'true'
                    e.currentTarget.src = defaultAvatar
                  }
                }}
                className="w-full h-full object-contain select-none"
                style={{ objectPosition: `${currentPos.x}% ${currentPos.y}%` }}
              />
              {pasteTarget === 'main' && (
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 bg-amber-300/45 text-sm font-bold text-amber-950">
                  <span>Ctrl+V 貼上替換</span>
                  <span className="text-xs">再點一下開啟上傳</span>
                </div>
              )}
            </div>
            <p className="text-center text-xs text-gray-400 mt-1 m-0">點一下圖片選取後可 Ctrl+V 貼上・拖移調整顯示位置</p>

            {/* Thumbnail row */}
            <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1">
              {avatarSrcs.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  data-paste-target
                  onClick={() => handleThumbClick(index)}
                  title={pasteTarget === index ? 'Ctrl+V 貼上替換，或再點一下上傳' : '點一下選取（可貼上圖片）'}
                  className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors cursor-pointer bg-transparent p-0 ${
                    pasteTarget === index
                      ? 'border-amber-400 ring-2 ring-amber-200'
                      : clampedIdx === index ? 'border-purple-400 hover:border-amber-300' : 'border-gray-200 hover:border-amber-300'
                  }`}
                >
                  <img
                    src={src}
                    alt={`${stage.className} ${index + 1}`}
                    onError={(e) => {
                      if (!e.currentTarget.dataset.fallbackApplied) {
                        e.currentTarget.dataset.fallbackApplied = 'true'
                        e.currentTarget.src = defaultAvatar
                      }
                    }}
                    className="w-full h-full object-cover"
                  />
                  {pasteTarget === index && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-amber-300/50 text-[9px] font-bold text-amber-950">
                      Ctrl+V
                    </span>
                  )}
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => { e.stopPropagation(); handleRemove(index) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleRemove(index) } }}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 text-white flex items-center justify-center cursor-pointer"
                  >
                    <DeleteOutlineIcon sx={{ fontSize: 11 }} />
                  </span>
                </button>
              ))}

              {/* Add button as last thumbnail */}
              <button
                type="button"
                data-paste-target
                onClick={handleAddClick}
                className={`shrink-0 w-14 h-14 rounded-lg border-2 border-dashed flex items-center justify-center transition-colors cursor-pointer ${
                  pasteTarget === 'add'
                    ? 'border-amber-400 bg-amber-100 text-amber-600'
                    : 'border-purple-200 bg-transparent text-purple-400 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-500'
                }`}
                title={pasteTarget === 'add' ? 'Ctrl+V 貼上新增，或再點一下上傳' : '點一下選取（可貼上新增），再點一下本地上傳'}
              >
                <AddIcon sx={{ fontSize: 22 }} />
              </button>
              <button
                type="button"
                onClick={() => setGalleryOpen(true)}
                className="shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-purple-200 flex items-center justify-center text-purple-400 hover:border-purple-400 hover:bg-purple-50 transition-colors cursor-pointer bg-transparent"
                title="從圖庫選擇"
              >
                <CollectionsIcon sx={{ fontSize: 21 }} />
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                onAvatarChange(stage.id, e.target.files)
                e.target.value = ''
              }}
            />
            <input
              ref={replaceInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file && replaceIndexRef.current !== null) onReplaceAvatar(stage.id, replaceIndexRef.current, file)
                e.target.value = ''
              }}
            />
            <GalleryImagePicker
              open={galleryOpen}
              onClose={() => setGalleryOpen(false)}
              initialTab="character"
              multiple
              onSelect={(srcs) => onAvatarChange(stage.id, srcs)}
            />
          </div>

          {/* Stage name */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">階段名稱</label>
            <input
              type="text"
              value={stage.className}
              onChange={(e) => onNameChange(stage.id, e.target.value)}
              className="w-full text-sm font-semibold text-black bg-stone-50 border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">角色資訊</label>
            <textarea
              value={stage.characterInfo ?? ''}
              onChange={(e) => onInfoChange(stage.id, e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="輸入這個階段的角色背景、能力、稱號或備註…"
              className="w-full resize-y text-sm leading-6 text-gray-700 bg-stone-50 border border-gray-200 rounded-lg px-3 py-2.5 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors"
            />
            <p className="m-0 mt-1 text-right text-[0.68rem] text-gray-400">{(stage.characterInfo ?? '').length} / 500</p>
          </div>

          {/* Level range */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">等級範圍</label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 font-mono shrink-0">LV</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={stage.minLevel}
                onChange={(e) => onLevelChange(stage.id, 'minLevel', e.target.value)}
                className="w-full text-center text-sm font-mono text-gray-600 bg-stone-50 border border-gray-200 rounded-lg px-2 py-2.5 outline-none focus:border-purple-400 transition-colors"
              />
              <span className="text-gray-400 shrink-0">—</span>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={stage.maxLevel}
                onChange={(e) => onLevelChange(stage.id, 'maxLevel', e.target.value)}
                className="w-full text-center text-sm font-mono text-gray-600 bg-stone-50 border border-gray-200 rounded-lg px-2 py-2.5 outline-none focus:border-purple-400 transition-colors"
              />
            </div>
          </div>

          {/* Exp per level */}
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1.5 block">升級經驗</label>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 shrink-0">每升一級需要</span>
              <ExpPerLevelInput
                stage={stage}
                onChange={onExpPerLevelChange}
                className="w-24 text-center text-sm font-mono text-gray-600 bg-stone-50 border border-gray-200 rounded-lg px-2 py-2.5 outline-none focus:border-purple-400 transition-colors"
              />
              <span className="text-sm text-gray-500 shrink-0">經驗</span>
            </div>
          </div>

        </div>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          variant="contained"
          onClick={onClose}
          sx={{
            bgcolor: '#a855f7',
            borderRadius: 99,
            textTransform: 'none',
            fontWeight: 700,
            px: 3,
            '&:hover': { bgcolor: '#9333ea' },
          }}
        >
          完成
        </Button>
      </DialogActions>
    </Dialog>
  )
}

// ── Stage row ────────────────────────────────────────────────
function StageRow({
  stage, canDelete, onRemove, onEdit,
  onPreview,
  isDragOver, insertBefore,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onAvatarChange, onReplaceAvatar,
  onPositionChange, onExpPerLevelChange,
}) {
  const fileInputRef = useRef(null)
  const customAvatarCount = stage.avatars?.length ?? (stage.avatar ? 1 : 0)
  const avatarSrcs = customAvatarCount > 0
    ? (stage.avatarSrcs ?? (stage.avatarSrc ? [stage.avatarSrc] : [])).slice(0, customAvatarCount)
    : []

  const [thumbPos, setThumbPos] = useState(stage.avatarPositions?.[0] ?? { x: 50, y: 50 })
  const thumbDragRef = useRef(null)
  const thumbRef = useRef(null)
  // First click selects the thumbnail (paste target); a second click opens the file picker
  const [thumbSelected, setThumbSelected] = useState(false)
  const [galleryOpen, setGalleryOpen] = useState(false)

  const applyImage = useCallback((fileOrSrc) => {
    if (avatarSrcs.length > 0) onReplaceAvatar(stage.id, 0, fileOrSrc)
    else onAvatarChange(stage.id, [fileOrSrc])
  }, [avatarSrcs.length, stage.id, onReplaceAvatar, onAvatarChange])

  useEffect(() => {
    if (!thumbSelected) return

    const handlePaste = (event) => {
      const file = Array.from(event.clipboardData?.items ?? [])
        .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
        ?.getAsFile()
      if (!file) return
      event.preventDefault()
      event.stopImmediatePropagation()
      applyImage(file)
      setThumbSelected(false)
    }
    const handlePointerDown = (event) => {
      if (!thumbRef.current?.contains(event.target)) setThumbSelected(false)
    }
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setThumbSelected(false)
    }

    window.addEventListener('paste', handlePaste, true)
    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('paste', handlePaste, true)
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [thumbSelected, applyImage])

  const handleThumbPointerDown = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const posAtStart = { ...thumbPos }
    let moved = false

    const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

    const onMove = (me) => {
      const dx = me.clientX - startX
      const dy = me.clientY - startY
      if (!moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
      moved = true
      const newX = clamp(posAtStart.x - dx * 0.5, 0, 100)
      const newY = clamp(posAtStart.y - dy * 0.5, 0, 100)
      setThumbPos({ x: newX, y: newY })
      thumbDragRef.current = { x: newX, y: newY }
    }

    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      if (!moved) {
        if (thumbSelected) {
          setThumbSelected(false)
          fileInputRef.current?.click()
        } else {
          setThumbSelected(true)
        }
        return
      }
      if (thumbDragRef.current) {
        onPositionChange?.(stage.id, 0, thumbDragRef.current.x, thumbDragRef.current.y)
        thumbDragRef.current = null
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [thumbPos, thumbSelected, stage.id, onPositionChange])

  return (
    <div
      onDragOver={(e) => onDragOver(e, stage.id)}
      onDrop={(e) => onDrop(e, stage.id)}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-xl px-4 py-5 flex items-center gap-3 border transition-colors relative
        flex-wrap md:flex-nowrap
        ${isDragOver && insertBefore ? 'border-t-2 border-t-purple-400 border-x-gray-100 border-b-gray-100' : ''}
        ${isDragOver && !insertBefore ? 'border-b-2 border-b-purple-400 border-x-gray-100 border-t-gray-100' : ''}
        ${!isDragOver ? 'border-gray-100 hover:border-gray-200' : ''}
      `}
    >
      {/* Drag handle */}
      <div
        draggable
        onDragStart={(e) => onDragStart(e, stage.id)}
        className="shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 transition-colors"
      >
        <DragIndicatorIcon fontSize="small" />
      </div>

      {/* Avatar */}
      <div
        ref={thumbRef}
        className={`relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 cursor-grab transition-shadow ${
          thumbSelected ? 'border-amber-400 ring-4 ring-amber-200' : 'border-purple-200 hover:border-amber-300'
        }`}
        title={thumbSelected ? 'Ctrl+V 貼上圖片，或再點一下開啟上傳' : '點一下選取（可貼上圖片），拖移調整顯示位置'}
      >
        <img
          src={stage.avatarSrc}
          alt={stage.className}
          draggable={false}
          onPointerDown={handleThumbPointerDown}
          onError={(e) => {
            if (!e.currentTarget.dataset.fallbackApplied) {
              e.currentTarget.dataset.fallbackApplied = 'true'
              e.currentTarget.src = defaultAvatar
            }
          }}
          className="w-full h-full object-cover select-none"
          style={{ objectPosition: `${thumbPos.x}% ${thumbPos.y}%` }}
        />
        {thumbSelected && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 bg-amber-300/55 text-center text-[10px] font-bold leading-tight text-amber-950">
            <span>Ctrl+V 貼上</span>
            <span>再點一下上傳</span>
          </div>
        )}
      </div>
      <GalleryImagePicker
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialTab="character"
        onSelect={(src) => applyImage(src)}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) {
            if (avatarSrcs.length > 0) onReplaceAvatar(stage.id, 0, file)
            else onAvatarChange(stage.id, [file])
          }
          e.target.value = ''
        }}
      />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-black truncate m-0">{stage.className}</p>
        <p className="text-xs text-gray-400 font-mono m-0 mt-0.5">
          LV {stage.minLevel} — {stage.maxLevel}
          {avatarSrcs.length > 0 && <span className="ml-2">{avatarSrcs.length} 張</span>}
        </p>
        <label className="mt-2 inline-flex items-center gap-1.5 text-xs text-gray-500">
          每升一級需要
          <ExpPerLevelInput
            stage={stage}
            onChange={onExpPerLevelChange}
            className="w-14 text-center text-xs font-semibold text-black bg-stone-50 border border-gray-200 rounded-md px-1.5 py-1 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors"
          />
          經驗
        </label>
      </div>

      {/* Edit */}
      <div className="grid shrink-0 grid-cols-3 gap-1 sm:flex sm:items-center">
        <IconButton
          size="small"
          onClick={() => onPreview(stage)}
          disabled={!stage.avatarSrc}
          aria-label="查看圖片"
          title="查看圖片"
          sx={{ minWidth: 40, minHeight: 40, color: '#64748b', '&:hover': { bgcolor: '#f1f5f9', color: '#334155' } }}
        >
          <VisibilityOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => downloadImage(stage.avatarSrc, stage.className)}
          disabled={!stage.avatarSrc}
          aria-label="下載圖片"
          title="下載圖片"
          sx={{ minWidth: 40, minHeight: 40, color: '#64748b', '&:hover': { bgcolor: '#f1f5f9', color: '#334155' } }}
        >
          <DownloadOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => setGalleryOpen(true)}
          aria-label="從圖庫選擇"
          title="從圖庫選擇"
          sx={{ minWidth: 40, minHeight: 40, color: '#64748b', '&:hover': { bgcolor: '#f1f5f9', color: '#334155' } }}
        >
          <CollectionsIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={onEdit}
          aria-label="編輯階段"
          title="編輯階段"
          sx={{
            minWidth: 40,
            minHeight: 40,
            color: '#a855f7',
            bgcolor: '#faf5ff',
            borderRadius: 2,
            '&:hover': { bgcolor: '#f3e8ff' },
          }}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => onRemove(stage.id)}
          disabled={!canDelete}
          aria-label="刪除階段"
          title="刪除階段"
          sx={{
            minWidth: 40,
            minHeight: 40,
            color: canDelete ? '#d1d5db' : 'transparent',
            '&:hover': { color: '#ef4444' },
            transition: 'color 0.15s',
          }}
        >
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </div>

      <div className="order-last w-full rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5 md:order-none md:w-auto md:max-w-[440px] md:flex-[1.5]">
        <p className="m-0 text-[0.68rem] font-bold uppercase tracking-wider text-slate-400">角色資訊</p>
        <p className={`m-0 mt-1 whitespace-pre-wrap break-words text-xs leading-5 ${stage.characterInfo?.trim() ? 'text-slate-600' : 'text-slate-400'}`}>
          {stage.characterInfo?.trim() || '尚未填寫，點擊鉛筆編輯這個階段的角色資訊。'}
        </p>
      </div>
    </div>
  )
}

export default function StageSettings({ stages, onNameChange, onInfoChange, onAvatarChange, onReplaceAvatar, onRemoveAvatar, onLevelChange, onExpPerLevelChange, onAddStage, onRemoveStage, onReorderStages, onPositionChange }) {
  const dragId = useRef(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [insertBefore, setInsertBefore] = useState(true)
  const [editingStageId, setEditingStageId] = useState(null)
  const [previewStage, setPreviewStage] = useState(null)

  const editingStage = stages.find((s) => s.id === editingStageId) ?? null

  const handleDragStart = useCallback((e, id) => {
    dragId.current = id
    e.dataTransfer.effectAllowed = 'move'
  }, [])

  const handleDragOver = useCallback((e, id) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOverId(id)
    setInsertBefore(e.clientY < rect.top + rect.height / 2)
  }, [])

  const handleDrop = useCallback((e, id) => {
    e.preventDefault()
    if (dragId.current && dragId.current !== id) {
      onReorderStages(dragId.current, id, insertBefore)
    }
    dragId.current = null
    setDragOverId(null)
  }, [onReorderStages, insertBefore])

  const handleDragEnd = useCallback(() => {
    dragId.current = null
    setDragOverId(null)
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-bold text-black m-0">階段設置</h2>
        <span className="text-xs text-gray-400">設定每個階段的大頭貼、名稱、等級範圍與升級經驗（未涵蓋的等級每級 1 經驗）</span>
      </div>
      <div className="flex flex-col gap-3">
        {stages.map((stage) => (
          <StageRow
            key={stage.id}
            stage={stage}
            canDelete={stages.length > 1}
            onRemove={onRemoveStage}
            onEdit={() => setEditingStageId(stage.id)}
            onPreview={setPreviewStage}
            isDragOver={dragOverId === stage.id}
            insertBefore={insertBefore}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onAvatarChange={onAvatarChange}
            onReplaceAvatar={onReplaceAvatar}
            onPositionChange={onPositionChange}
            onExpPerLevelChange={onExpPerLevelChange}
          />
        ))}
      </div>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={onAddStage}
        sx={{
          alignSelf: 'flex-start',
          borderColor: '#a855f7',
          color: '#a855f7',
          borderRadius: 99,
          fontSize: '0.75rem',
          fontWeight: 600,
          textTransform: 'none',
          px: 2,
          '&:hover': { borderColor: '#9333ea', bgcolor: '#faf5ff' },
        }}
      >
        新增階段
      </Button>

      <StageEditModal
        stage={editingStage}
        open={editingStageId !== null}
        onClose={() => setEditingStageId(null)}
        onNameChange={onNameChange}
        onInfoChange={onInfoChange}
        onAvatarChange={onAvatarChange}
        onReplaceAvatar={onReplaceAvatar}
        onRemoveAvatar={onRemoveAvatar}
        onLevelChange={onLevelChange}
        onExpPerLevelChange={onExpPerLevelChange}
        onPositionChange={onPositionChange}
      />
      <StageImagePreview
        stage={previewStage}
        open={previewStage !== null}
        onClose={() => setPreviewStage(null)}
      />
    </div>
  )
}

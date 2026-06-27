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
import defaultAvatar from '../../assets/hero.jpg'
import GalleryImagePicker from '../common/GalleryImagePicker'


// ── Mobile edit modal ────────────────────────────────────────
function StageEditModal({
  stage, open, onClose,
  onNameChange, onAvatarChange, onReplaceAvatar, onRemoveAvatar, onLevelChange,
  onPositionChange,
}) {
  const fileInputRef = useRef(null)
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [localPositions, setLocalPositions] = useState(stage?.avatarPositions ?? [])
  const [galleryOpen, setGalleryOpen] = useState(false)
  const modalDragRef = useRef(null)

  useEffect(() => {
    setLocalPositions(stage?.avatarPositions ?? [])
  }, [stage?.id])

  if (!stage) return null

  const avatarSrcs = (stage.avatarSrcs ?? (stage.avatarSrc ? [stage.avatarSrc] : [])).slice(
    0,
    stage.avatars?.length ?? (stage.avatar ? 1 : 0),
  )

  const clampedIdx = Math.min(selectedIdx, Math.max(0, avatarSrcs.length - 1))
  const mainSrc = avatarSrcs.length > 0 ? avatarSrcs[clampedIdx] : stage.avatarSrc
  const currentPos = localPositions[clampedIdx] ?? { x: 50, y: 50 }

  const handleMainImagePointerDown = (e) => {
    e.preventDefault()
    const startX = e.clientX
    const startY = e.clientY
    const posAtStart = localPositions[clampedIdx] ?? { x: 50, y: 50 }

    const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

    const onMove = (me) => {
      const dx = me.clientX - startX
      const dy = me.clientY - startY
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
        <div className="flex flex-col gap-5">

          {/* Slideshow */}
          <div>
            {/* Main image */}
            <div
              className="w-full rounded-xl overflow-hidden bg-stone-900 border border-gray-200 cursor-grab"
              style={{ aspectRatio: '4/3' }}
              title="拖移調整顯示位置"
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
            </div>
            <p className="text-center text-xs text-gray-400 mt-1 m-0">拖移圖片調整顯示位置</p>

            {/* Thumbnail row */}
            <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1">
              {avatarSrcs.map((src, index) => (
                <button
                  key={`${src}-${index}`}
                  type="button"
                  onClick={() => setSelectedIdx(index)}
                  className={`relative shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors cursor-pointer bg-transparent p-0 ${
                    clampedIdx === index ? 'border-purple-400' : 'border-gray-200'
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
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-purple-200 flex items-center justify-center text-purple-400 hover:border-purple-400 hover:bg-purple-50 transition-colors cursor-pointer bg-transparent"
                title="本地上傳"
              >
                <AddIcon sx={{ fontSize: 22 }} />
              </button>
              <button
                type="button"
                onClick={() => setGalleryOpen(true)}
                className="shrink-0 w-14 h-14 rounded-lg border-2 border-dashed border-purple-200 flex items-center justify-center text-purple-400 hover:border-purple-400 hover:bg-purple-50 transition-colors cursor-pointer bg-transparent"
                title="從世界圖庫選擇"
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
  isDragOver, insertBefore,
  onDragStart, onDragOver, onDrop, onDragEnd,
  onAvatarChange,
  onPositionChange,
}) {
  const fileInputRef = useRef(null)
  const customAvatarCount = stage.avatars?.length ?? (stage.avatar ? 1 : 0)
  const avatarSrcs = customAvatarCount > 0
    ? (stage.avatarSrcs ?? (stage.avatarSrc ? [stage.avatarSrc] : [])).slice(0, customAvatarCount)
    : []

  const [thumbPos, setThumbPos] = useState(stage.avatarPositions?.[0] ?? { x: 50, y: 50 })
  const thumbDragRef = useRef(null)

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
        fileInputRef.current?.click()
        return
      }
      if (thumbDragRef.current) {
        onPositionChange?.(stage.id, 0, thumbDragRef.current.x, thumbDragRef.current.y)
        thumbDragRef.current = null
      }
    }

    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }, [thumbPos, stage.id, onPositionChange])

  return (
    <div
      onDragOver={(e) => onDragOver(e, stage.id)}
      onDrop={(e) => onDrop(e, stage.id)}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-xl px-4 py-5 flex items-center gap-3 border transition-colors relative
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
        className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 border-purple-200 cursor-grab"
        title="點擊上傳圖片，拖移調整顯示位置"
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

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-black truncate m-0">{stage.className}</p>
        <p className="text-xs text-gray-400 font-mono m-0 mt-0.5">
          LV {stage.minLevel} — {stage.maxLevel}
          {avatarSrcs.length > 0 && <span className="ml-2">{avatarSrcs.length} 張</span>}
        </p>
      </div>

      {/* Edit */}
      <IconButton
        size="small"
        onClick={onEdit}
        aria-label="編輯階段"
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

      {/* Delete */}
      <IconButton
        size="small"
        onClick={() => onRemove(stage.id)}
        disabled={!canDelete}
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
  )
}

export default function StageSettings({ stages, onNameChange, onAvatarChange, onReplaceAvatar, onRemoveAvatar, onLevelChange, onAddStage, onRemoveStage, onReorderStages, onPositionChange }) {
  const dragId = useRef(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [insertBefore, setInsertBefore] = useState(true)
  const [editingStageId, setEditingStageId] = useState(null)

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
        <span className="text-xs text-gray-400">設定每個階段的大頭貼、名稱與等級範圍</span>
      </div>
      <div className="flex flex-col gap-3">
        {stages.map((stage) => (
          <StageRow
            key={stage.id}
            stage={stage}
            canDelete={stages.length > 1}
            onRemove={onRemoveStage}
            onEdit={() => setEditingStageId(stage.id)}
            isDragOver={dragOverId === stage.id}
            insertBefore={insertBefore}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
            onAvatarChange={onAvatarChange}
            onPositionChange={onPositionChange}
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
        onAvatarChange={onAvatarChange}
        onReplaceAvatar={onReplaceAvatar}
        onRemoveAvatar={onRemoveAvatar}
        onLevelChange={onLevelChange}
        onPositionChange={onPositionChange}
      />
    </div>
  )
}

import { useRef, useState } from 'react'
import Chip from '@mui/material/Chip'
import EditIcon from '@mui/icons-material/Edit'
import OpenWithIcon from '@mui/icons-material/OpenWith'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'

export default function CharacterCard({ level, avatar, isEditMode, onAvatarChange, imagePosition, onImagePositionChange }) {
  const fileInputRef = useRef(null)
  const containerRef = useRef(null)
  const dragState = useRef(null)
  const resizeState = useRef(null)
  const [cardSize, setCardSize] = useState({ width: 380, height: 600 })

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      onAvatarChange(e.target.files[0])
    }
  }

  // --- 圖片拖曳位置 ---
  const handlePointerDown = (e) => {
    if (!isEditMode || !avatar) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: imagePosition.x,
      startPosY: imagePosition.y,
      moved: false,
    }
  }

  const handlePointerMove = (e) => {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    if (!dragState.current.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
    dragState.current.moved = true
    const rect = containerRef.current.getBoundingClientRect()
    const newX = Math.min(100, Math.max(0, dragState.current.startPosX - (dx / rect.width) * 100))
    const newY = Math.min(100, Math.max(0, dragState.current.startPosY - (dy / rect.height) * 100))
    onImagePositionChange({ x: newX, y: newY })
  }

  const handlePointerUp = () => {
    if (!dragState.current) return
    if (!dragState.current.moved) fileInputRef.current?.click()
    dragState.current = null
  }

  // --- 調整卡片大小 ---
  const handleResizeDown = (e) => {
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    resizeState.current = {
      startX: e.clientX,
      startY: e.clientY,
      startW: cardSize.width,
      startH: cardSize.height,
    }
  }

  const handleResizeMove = (e) => {
    if (!resizeState.current) return
    const dx = e.clientX - resizeState.current.startX
    const dy = e.clientY - resizeState.current.startY
    setCardSize({
      width: Math.max(200, resizeState.current.startW + dx),
      height: Math.max(100, resizeState.current.startH + dy),
    })
  }

  const handleResizeUp = () => {
    resizeState.current = null
  }

  return (
    <div
      ref={containerRef}
      className="bg-black rounded-2xl border border-green-border shadow-[0_0_15px_rgba(0,255,0,0.3)] relative overflow-hidden"
      style={{ width: cardSize.width, height: cardSize.height, maxWidth: '100%' }}
      onPointerMove={handleResizeMove}
      onPointerUp={handleResizeUp}
    >
      <div
        className={`w-full h-full relative ${isEditMode && avatar ? 'cursor-grab active:cursor-grabbing' : isEditMode ? 'cursor-pointer' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {avatar ? (
          <img
            src={avatar}
            alt="Avatar"
            className="w-full h-full object-cover select-none"
            style={{ objectPosition: `${imagePosition.x}% ${imagePosition.y}%` }}
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center cursor-pointer"
            onClick={() => isEditMode && fileInputRef.current?.click()}
          >
            <span className="text-4xl font-extrabold text-white/80">V</span>
          </div>
        )}

        {isEditMode && avatar && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 text-white text-xs px-3 py-1 rounded-full pointer-events-none select-none">
            <OpenWithIcon sx={{ fontSize: 14 }} />
            <span>拖曳調整位置・點擊換圖</span>
          </div>
        )}

        {isEditMode && !avatar && (
          <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center pointer-events-none">
            <EditIcon sx={{ color: 'white', fontSize: 28 }} />
            <span className="text-white text-xs mt-1 uppercase font-semibold">點擊上傳圖片</span>
          </div>
        )}
      </div>

      <Chip
        label={`Level ${level}`}
        sx={{
          position: 'absolute',
          top: 16,
          right: 16,
          bgcolor: '#a855f7',
          color: 'white',
          fontWeight: 700,
          fontSize: '0.75rem',
          textTransform: 'uppercase',
        }}
      />

      {isEditMode && (
        <div
          className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center cursor-se-resize z-10"
          onPointerDown={handleResizeDown}
        >
          <OpenInFullIcon sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, transform: 'rotate(90deg)' }} />
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

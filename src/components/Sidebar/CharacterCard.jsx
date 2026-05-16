import { useEffect, useRef, useState } from 'react'
import Chip from '@mui/material/Chip'
import EditIcon from '@mui/icons-material/Edit'
import OpenWithIcon from '@mui/icons-material/OpenWith'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import VisibilityIcon from '@mui/icons-material/Visibility'
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff'

export default function CharacterCard({ level, avatar, avatars, onAvatarChange, imagePosition, onImagePositionChange }) {
  const fileInputRef = useRef(null)
  const containerRef = useRef(null)
  const dragState = useRef(null)
  const resizeState = useRef(null)
  const cardSizeRef = useRef(null)
  const [cardSize, setCardSize] = useState(() => {
    try {
      const saved = localStorage.getItem('characterCardSize')
      if (saved) return JSON.parse(saved)
    } catch {
      // Ignore malformed saved sizing and fall back to the default card size.
    }
    return { width: 380, height: 600 }
  })
  const [avatarVisible, setAvatarVisible] = useState(true)
  const [selectedAvatarIndex, setSelectedAvatarIndex] = useState(0)
  const effectiveAvatars = avatars?.length ? avatars : (avatar ? [avatar] : [])
  const avatarKey = effectiveAvatars.join('|')
  const displayAvatar = effectiveAvatars[selectedAvatarIndex] ?? effectiveAvatars[0] ?? null

  useEffect(() => {
    setSelectedAvatarIndex(0)
  }, [avatarKey])

  const handleFileChange = (e) => {
    if (e.target.files?.length) {
      onAvatarChange(e.target.files)
      e.target.value = ''
    }
  }

  // --- 圖片拖曳位置 ---
  const handlePointerDown = (e) => {
    if (!displayAvatar) return
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
    const newSize = {
      width: Math.max(200, resizeState.current.startW + dx),
      height: Math.max(100, resizeState.current.startH + dy),
    }
    cardSizeRef.current = newSize
    setCardSize(newSize)
  }

  const handleResizeUp = () => {
    if (resizeState.current && cardSizeRef.current) {
      localStorage.setItem('characterCardSize', JSON.stringify(cardSizeRef.current))
    }
    resizeState.current = null
  }

  return (
    <div
      className="flex flex-col gap-2"
      style={{ width: `min(${cardSize.width}px, 100%)` }}
    >
      <div
        ref={containerRef}
        className="bg-black rounded-2xl border border-green-border shadow-[0_0_15px_rgba(0,255,0,0.3)] relative overflow-hidden"
        style={{ height: cardSize.height }}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeUp}
      >
        <div
          className={`w-full h-full relative ${displayAvatar ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {displayAvatar ? (
            <img
              src={displayAvatar}
              alt="Avatar"
              className={`w-full h-full object-cover select-none transition-opacity duration-300 ${avatarVisible ? 'opacity-100' : 'opacity-0'}`}
              style={{ objectPosition: `${imagePosition.x}% ${imagePosition.y}%` }}
              draggable={false}
            />
          ) : (
            <div
              className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <span className="text-4xl font-extrabold text-white/80">V</span>
            </div>
          )}

          {displayAvatar && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 text-white text-xs px-3 py-1 rounded-full pointer-events-none select-none">
              <OpenWithIcon sx={{ fontSize: 14 }} />
              <span>拖曳調整位置・點擊換圖</span>
            </div>
          )}

          {!displayAvatar && (
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

        <button
          className="absolute bottom-2 left-2 w-7 h-7 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/75 transition-colors z-10"
          onClick={(e) => { e.stopPropagation(); setAvatarVisible((v) => !v) }}
          title={avatarVisible ? '隱藏圖片' : '顯示圖片'}
        >
          {avatarVisible
            ? <VisibilityIcon sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 16 }} />
            : <VisibilityOffIcon sx={{ color: 'rgba(255,255,255,0.75)', fontSize: 16 }} />
          }
        </button>

        <div
          className="absolute bottom-0 right-0 w-6 h-6 flex items-center justify-center cursor-se-resize z-10"
          onPointerDown={handleResizeDown}
        >
          <OpenInFullIcon sx={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, transform: 'rotate(90deg)' }} />
        </div>
      </div>

      {effectiveAvatars.length > 1 && (
        <div className="flex items-center justify-center gap-2 px-1 py-1 overflow-x-auto">
          {effectiveAvatars.map((src, index) => (
            <button
              key={`${src}-${index}`}
              type="button"
              onClick={() => setSelectedAvatarIndex(index)}
              className={`w-10 h-10 shrink-0 overflow-hidden rounded-lg border-2 bg-white p-0 cursor-pointer transition-all ${
                selectedAvatarIndex === index
                  ? 'border-purple-500 shadow-[0_0_0_2px_rgba(168,85,247,0.18)]'
                  : 'border-gray-200 opacity-70 hover:opacity-100 hover:border-purple-200'
              }`}
              title={`切換圖片 ${index + 1}`}
            >
              <img
                src={src}
                alt={`圖片 ${index + 1}`}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </button>
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  )
}

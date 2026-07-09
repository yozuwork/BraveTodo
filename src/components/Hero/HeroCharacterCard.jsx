import { useRef } from 'react'
import Chip from '@mui/material/Chip'
import EditIcon from '@mui/icons-material/Edit'
import defaultAvatar from '../../assets/hero.jpg'

function useFallbackImage() {
  return (e) => {
    if (!e.currentTarget.dataset.fallbackApplied) {
      e.currentTarget.dataset.fallbackApplied = 'true'
      e.currentTarget.src = defaultAvatar
    }
  }
}

export default function HeroCharacterCard({ level, avatar, onAvatarChange, imagePosition }) {
  const fileInputRef = useRef(null)
  const handleImageError = useFallbackImage()
  const pos = imagePosition ?? { x: 50, y: 50 }

  const handleFileChange = (e) => {
    if (e.target.files?.length) {
      onAvatarChange(e.target.files[0])
      e.target.value = ''
    }
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div
        className="bg-black rounded-2xl border border-purple-200 shadow-[0_0_15px_rgba(168,85,247,0.25)] relative overflow-hidden w-full"
        style={{ height: 420 }}
      >
        <div
          className="w-full h-full relative cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          {avatar ? (
            <img
              src={avatar}
              alt="英雄頭像"
              onError={handleImageError}
              className="w-full h-full object-cover select-none"
              style={{ objectPosition: `${pos.x}% ${pos.y}%` }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center">
              <span className="text-4xl font-extrabold text-white/80">英</span>
            </div>
          )}

          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/60 text-white text-xs px-3 py-1 rounded-full pointer-events-none select-none">
            <EditIcon sx={{ fontSize: 14 }} />
            <span>點擊更換圖片</span>
          </div>
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
      </div>

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

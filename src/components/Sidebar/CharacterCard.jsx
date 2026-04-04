import { useRef } from 'react'
import Chip from '@mui/material/Chip'
import EditIcon from '@mui/icons-material/Edit'

export default function CharacterCard({ level, avatar, isEditMode, onAvatarChange }) {
  const fileInputRef = useRef(null)

  const handleAvatarClick = () => {
    if (isEditMode) fileInputRef.current?.click()
  }

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      onAvatarChange(e.target.files[0])
    }
  }

  return (
    <div className="bg-black rounded-2xl p-8 border border-green-border shadow-[0_0_15px_rgba(0,255,0,0.3)] flex flex-col items-center gap-5 relative">
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

      <div
        className="w-[120px] h-[120px] bg-zinc-900 rounded-full flex justify-center items-center overflow-hidden relative cursor-pointer group"
        onClick={handleAvatarClick}
      >
        {avatar ? (
          <img src={avatar} alt="Avatar" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-900 flex items-center justify-center">
            <span className="text-4xl font-extrabold text-white/80">V</span>
          </div>
        )}

        {isEditMode && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <EditIcon sx={{ color: 'white', fontSize: 24 }} />
            <span className="text-white text-xs mt-1 uppercase font-semibold">Change Avatar</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <div className="text-center">
        <h2 className="text-white text-2xl font-extrabold tracking-wide">VANGUARD ONE</h2>
        <p className="text-green-text text-sm font-bold uppercase mt-1">
          Shadow Stalker • Rank S
        </p>
      </div>
    </div>
  )
}

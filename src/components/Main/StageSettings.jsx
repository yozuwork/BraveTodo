import { useRef } from 'react'
import IconButton from '@mui/material/IconButton'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'

function StageRow({ stage, onNameChange, onAvatarChange }) {
  const fileInputRef = useRef(null)

  return (
    <div className="bg-white rounded-xl px-5 py-4 flex items-center gap-5 border border-gray-100 hover:border-gray-200 transition-colors">
      {/* Avatar */}
      <div className="relative shrink-0">
        <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-purple-200">
          <img
            src={stage.avatarSrc}
            alt={stage.className}
            className="w-full h-full object-cover"
          />
        </div>
        <IconButton
          size="small"
          onClick={() => fileInputRef.current?.click()}
          sx={{
            position: 'absolute',
            bottom: -4,
            right: -4,
            bgcolor: '#a855f7',
            color: 'white',
            width: 24,
            height: 24,
            '&:hover': { bgcolor: '#9333ea' },
          }}
        >
          <PhotoCameraIcon sx={{ fontSize: 14 }} />
        </IconButton>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onAvatarChange(stage.id, e.target.files[0])
            e.target.value = ''
          }}
        />
      </div>

      {/* Level range */}
      <div className="shrink-0 text-xs font-mono text-gray-400 w-24 text-center">
        LV{stage.minLevel} — LV{stage.maxLevel}
      </div>

      {/* Editable class name */}
      <input
        type="text"
        value={stage.className}
        onChange={(e) => onNameChange(stage.id, e.target.value)}
        className="flex-1 text-sm font-semibold text-black bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors"
      />
    </div>
  )
}

export default function StageSettings({ stages, onNameChange, onAvatarChange }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-bold text-black m-0">階段設置</h2>
        <span className="text-xs text-gray-400">設定每個階段的大頭貼與職業名稱</span>
      </div>
      <div className="flex flex-col gap-3">
        {stages.map((stage) => (
          <StageRow
            key={stage.id}
            stage={stage}
            onNameChange={onNameChange}
            onAvatarChange={onAvatarChange}
          />
        ))}
      </div>
    </div>
  )
}

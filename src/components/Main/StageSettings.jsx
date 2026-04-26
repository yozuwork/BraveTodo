import { useRef, useState, useCallback } from 'react'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddIcon from '@mui/icons-material/Add'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'

function StageRow({
  stage, canDelete,
  onNameChange, onAvatarChange, onLevelChange, onRemove,
  isDragOver, insertBefore,
  onDragStart, onDragOver, onDrop, onDragEnd,
}) {
  const fileInputRef = useRef(null)

  return (
    <div
      onDragOver={(e) => onDragOver(e, stage.id)}
      onDrop={(e) => onDrop(e, stage.id)}
      onDragEnd={onDragEnd}
      className={`bg-white rounded-xl px-4 py-4 flex items-center gap-3 border transition-colors relative
        ${isDragOver && insertBefore ? 'border-t-2 border-t-purple-400 border-x-gray-100 border-b-gray-100' : ''}
        ${isDragOver && !insertBefore ? 'border-b-2 border-b-purple-400 border-x-gray-100 border-t-gray-100' : ''}
        ${!isDragOver ? 'border-gray-100 hover:border-gray-200' : ''}
      `}
    >
      {/* Drag handle — only this element is draggable */}
      <div
        draggable
        onDragStart={(e) => onDragStart(e, stage.id)}
        className="shrink-0 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-400 transition-colors"
      >
        <DragIndicatorIcon fontSize="small" />
      </div>

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
      <div className="shrink-0 flex items-center gap-1 text-xs font-mono text-gray-400">
        <span>LV</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={stage.minLevel}
          onChange={(e) => onLevelChange(stage.id, 'minLevel', e.target.value)}
          className="w-12 text-center text-xs font-mono text-gray-600 bg-stone-50 border border-gray-200 rounded px-1 py-1 outline-none focus:border-purple-400 transition-colors"
        />
        <span>—</span>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={stage.maxLevel}
          onChange={(e) => onLevelChange(stage.id, 'maxLevel', e.target.value)}
          className="w-12 text-center text-xs font-mono text-gray-600 bg-stone-50 border border-gray-200 rounded px-1 py-1 outline-none focus:border-purple-400 transition-colors"
        />
      </div>

      {/* Editable class name */}
      <input
        type="text"
        value={stage.className}
        onChange={(e) => onNameChange(stage.id, e.target.value)}
        className="flex-1 text-sm font-semibold text-black bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200 transition-colors min-w-0"
      />

      {/* Delete */}
      <IconButton
        size="small"
        onClick={() => onRemove(stage.id)}
        disabled={!canDelete}
        sx={{
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

export default function StageSettings({ stages, onNameChange, onAvatarChange, onLevelChange, onAddStage, onRemoveStage, onReorderStages }) {
  const dragId = useRef(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [insertBefore, setInsertBefore] = useState(true)

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
            onNameChange={onNameChange}
            onAvatarChange={onAvatarChange}
            onLevelChange={onLevelChange}
            onRemove={onRemoveStage}
            isDragOver={dragOverId === stage.id}
            insertBefore={insertBefore}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onDragEnd={handleDragEnd}
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
    </div>
  )
}

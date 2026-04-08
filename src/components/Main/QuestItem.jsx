import { useState, useRef, useEffect, useCallback } from 'react'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import SlashEffect from './SlashEffect'

export default function QuestItem({ quest, onToggle, onUpdate, onRemove, onToggleCore }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(quest.text)
  const [slashing, setSlashing] = useState(false)
  const [shaking, setShaking] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(quest.text)
  }, [quest.text, editing])

  const handleToggle = useCallback(() => {
    if (!quest.completed) {
      setSlashing(true)
      // shake is triggered by SlashEffect after hit stop (50ms delay)
    }
    onToggle(quest.id)
  }, [quest.completed, quest.id, onToggle])

  const handleShakeReady = useCallback(() => {
    setShaking(true)
    setTimeout(() => setShaking(false), 450)
  }, [])

  const cancelEdit = () => {
    setDraft(quest.text)
    setEditing(false)
  }

  const commitEdit = () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      cancelEdit()
      return
    }
    onUpdate(quest.id, trimmed)
    setEditing(false)
  }

  return (
    <div
      className={`bg-white rounded-xl px-5 py-4 flex items-center gap-4 border border-transparent hover:border-gray-200 transition-colors group relative ${
        quest.completed ? 'opacity-50' : ''
      } ${shaking ? 'quest-shake' : ''}`}
    >
      <SlashEffect visible={slashing} onComplete={() => setSlashing(false)} onShakeReady={handleShakeReady} />

      <Checkbox
        checked={quest.completed}
        onChange={handleToggle}
        sx={{
          color: '#d1d5db',
          '&.Mui-checked': { color: '#a855f7' },
        }}
      />

      <div className="flex-1 flex flex-col gap-1 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            className="w-full text-sm font-medium text-black bg-stone-50 border border-purple-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitEdit()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                cancelEdit()
              }
            }}
          />
        ) : (
          <p
            role="button"
            tabIndex={0}
            className={`text-sm font-medium text-black m-0 text-left cursor-text rounded px-1 -mx-1 hover:bg-stone-100 ${
              quest.completed ? 'line-through text-gray-400' : ''
            }`}
            onDoubleClick={() => setEditing(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setEditing(true)
              }
            }}
          >
            {quest.text}
          </p>
        )}
      </div>

      {!editing && (
        <IconButton
          size="small"
          onClick={() => setEditing(true)}
          aria-label="編輯任務"
          sx={{ color: '#d1d5db', '&:hover': { color: '#a855f7' } }}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      )}

      <IconButton
        size="small"
        onClick={() => onToggleCore(quest.id)}
        sx={{
          color: quest.isCore ? '#f59e0b' : '#d1d5db',
          '&:hover': { color: '#f59e0b' },
        }}
      >
        {quest.isCore ? <StarIcon fontSize="small" /> : <StarBorderIcon fontSize="small" />}
      </IconButton>

      <IconButton
        size="small"
        onClick={() => onRemove(quest.id)}
        sx={{ color: '#d1d5db', '&:hover': { color: '#ef4444' } }}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </div>
  )
}

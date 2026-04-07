import { useState, useRef, useEffect } from 'react'
import IconButton from '@mui/material/IconButton'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'

export default function InboxItem({ item, onUpdate, onRemove, onPromoteToQuest }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)
  const [tagOpen, setTagOpen] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(item.text)
  }, [item.text, editing])

  const cancelEdit = () => {
    setDraft(item.text)
    setEditing(false)
  }

  const commitEdit = () => {
    const trimmed = draft.trim()
    if (!trimmed) {
      cancelEdit()
      return
    }
    onUpdate(item.id, trimmed)
    setEditing(false)
  }

  const handleTagChange = (e) => {
    if (e.target.value === 'task') {
      onPromoteToQuest(item.id, item.text)
    }
  }

  return (
    <div className="bg-white rounded-xl px-5 py-4 flex items-center gap-4 border border-transparent hover:border-gray-200 transition-colors group">
      {/* Tag dropdown */}
      <Select
        value="inbox"
        onChange={handleTagChange}
        open={tagOpen}
        onOpen={() => setTagOpen(true)}
        onClose={() => setTagOpen(false)}
        size="small"
        variant="outlined"
        renderValue={() => (
          <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
            <LocalOfferOutlinedIcon style={{ fontSize: 14 }} />
            收集箱
          </span>
        )}
        sx={{
          minWidth: 90,
          fontSize: '0.75rem',
          color: '#9ca3af',
          '.MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#a855f7' },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#a855f7' },
          '.MuiSelect-icon': { color: '#9ca3af' },
          '.MuiSelect-select': { py: '4px', px: '8px' },
        }}
      >
        <MenuItem value="inbox" disabled sx={{ fontSize: '0.8rem' }}>
          <LocalOfferOutlinedIcon style={{ fontSize: 14, marginRight: 6, color: '#9ca3af' }} />
          收集箱
        </MenuItem>
        <MenuItem value="task" sx={{ fontSize: '0.8rem', color: '#a855f7' }}>
          <LocalOfferOutlinedIcon style={{ fontSize: 14, marginRight: 6, color: '#a855f7' }} />
          移到任務
        </MenuItem>
      </Select>

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
            className="text-sm font-medium text-black m-0 text-left cursor-text rounded px-1 -mx-1 hover:bg-stone-100"
            onDoubleClick={() => setEditing(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setEditing(true)
              }
            }}
          >
            {item.text}
          </p>
        )}
      </div>

      {!editing && (
        <IconButton
          size="small"
          onClick={() => setEditing(true)}
          aria-label="編輯"
          sx={{ color: '#d1d5db', '&:hover': { color: '#a855f7' } }}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      )}

      <IconButton
        size="small"
        onClick={() => onRemove(item.id)}
        sx={{ color: '#d1d5db', '&:hover': { color: '#ef4444' } }}
      >
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </div>
  )
}

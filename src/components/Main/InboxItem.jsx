import { useState, useRef, useEffect } from 'react'
import IconButton from '@mui/material/IconButton'
import Checkbox from '@mui/material/Checkbox'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import LocalOfferOutlinedIcon from '@mui/icons-material/LocalOfferOutlined'
import AddIcon from '@mui/icons-material/Add'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'

// ── Sub-task row ──────────────────────────────────────────────
function SubTaskItem({ sub, onToggle, onRemove, onUpdate }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(sub.text)
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    if (!editing) setDraft(sub.text)
  }, [sub.text, editing])

  const commit = () => {
    const trimmed = draft.trim()
    if (trimmed) onUpdate(trimmed)
    else setDraft(sub.text)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 group/sub">
      <Checkbox
        checked={sub.completed}
        onChange={onToggle}
        size="small"
        sx={{
          p: 0.3,
          color: '#d1d5db',
          '&.Mui-checked': { color: '#a855f7' },
        }}
      />
      {editing ? (
        <input
          ref={inputRef}
          className="flex-1 text-xs text-black bg-stone-50 border border-purple-200 rounded px-2 py-1 outline-none focus:border-purple-400"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commit() }
            if (e.key === 'Escape') { setDraft(sub.text); setEditing(false) }
          }}
        />
      ) : (
        <span
          role="button"
          tabIndex={0}
          className={`flex-1 text-xs cursor-text rounded px-1 -mx-1 hover:bg-stone-100 ${
            sub.completed ? 'line-through text-gray-400' : 'text-gray-600'
          }`}
          onDoubleClick={() => setEditing(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(true) }
          }}
        >
          {sub.text}
        </span>
      )}
      <IconButton
        size="small"
        onClick={onRemove}
        sx={{
          p: 0.3,
          color: '#d1d5db',
          opacity: 0,
          '.group\\/sub:hover &': { opacity: 1 },
          '&:hover': { color: '#ef4444' },
          transition: 'opacity 0.15s, color 0.15s',
        }}
      >
        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </div>
  )
}

// ── Inbox item row ────────────────────────────────────────────
export default function InboxItem({
  item, onUpdate, onRemove, onPromoteToQuest,
  onAddSubTask, onToggleSubTask, onRemoveSubTask, onUpdateSubTask,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.text)
  const [tagOpen, setTagOpen] = useState(false)
  const [addingSubTask, setAddingSubTask] = useState(false)
  const [subDraft, setSubDraft] = useState('')
  const inputRef = useRef(null)
  const subInputRef = useRef(null)
  const subComposingRef = useRef(false)

  const subTasks = item.subTasks ?? []

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    if (addingSubTask && subInputRef.current) {
      subInputRef.current.focus()
    }
  }, [addingSubTask])

  useEffect(() => {
    if (!editing) setDraft(item.text)
  }, [item.text, editing])

  const cancelEdit = () => { setDraft(item.text); setEditing(false) }
  const commitEdit = () => {
    const trimmed = draft.trim()
    if (!trimmed) { cancelEdit(); return }
    onUpdate(item.id, trimmed)
    setEditing(false)
  }

  const commitSubTask = () => {
    const trimmed = subDraft.trim()
    if (trimmed) onAddSubTask(item.id, trimmed)
    setSubDraft('')
    setAddingSubTask(false)
  }

  const cancelSubTask = () => { setSubDraft(''); setAddingSubTask(false) }

  const handleTagChange = (e) => {
    if (e.target.value === 'task') onPromoteToQuest(item.id, item.text)
  }

  const completedSubs = subTasks.filter((s) => s.completed).length

  return (
    <div className="bg-white rounded-xl px-5 py-4 flex gap-4 border border-transparent hover:border-gray-200 transition-colors group">
      {/* Tag dropdown */}
      <div className="shrink-0 mt-0.5">
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
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">

        {/* Title row */}
        <div className="flex items-center gap-2">
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              className="flex-1 text-sm font-medium text-black bg-stone-50 border border-purple-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-200"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                else if (e.key === 'Escape') { e.preventDefault(); cancelEdit() }
              }}
            />
          ) : (
            <p
              role="button"
              tabIndex={0}
              className="flex-1 text-sm font-medium text-black m-0 text-left cursor-text rounded px-1 -mx-1 hover:bg-stone-100"
              onDoubleClick={() => setEditing(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(true) }
              }}
            >
              {item.text}
              {subTasks.length > 0 && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  {completedSubs}/{subTasks.length}
                </span>
              )}
            </p>
          )}

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

        {/* Sub-task list */}
        {subTasks.length > 0 && (
          <div className="flex flex-col gap-0.5 pl-1 border-l-2 border-gray-100 ml-1">
            {subTasks.map((sub) => (
              <SubTaskItem
                key={sub.id}
                sub={sub}
                onToggle={() => onToggleSubTask(item.id, sub.id)}
                onRemove={() => onRemoveSubTask(item.id, sub.id)}
                onUpdate={(text) => onUpdateSubTask(item.id, sub.id, text)}
              />
            ))}
          </div>
        )}

        {/* Add sub-task */}
        {addingSubTask ? (
          <div className="flex items-center gap-2 pl-2 ml-1">
            <input
              ref={subInputRef}
              className="flex-1 text-xs text-black bg-stone-50 border border-purple-200 rounded px-2 py-1 outline-none focus:border-purple-400"
              placeholder="輸入子任務..."
              value={subDraft}
              onChange={(e) => setSubDraft(e.target.value)}
              onCompositionStart={() => { subComposingRef.current = true }}
              onCompositionEnd={() => { subComposingRef.current = false }}
              onBlur={commitSubTask}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !subComposingRef.current) { e.preventDefault(); commitSubTask() }
                if (e.key === 'Escape') { e.preventDefault(); cancelSubTask() }
              }}
            />
          </div>
        ) : (
          <button
            onClick={() => setAddingSubTask(true)}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-500 transition-colors cursor-pointer bg-transparent border-none p-0 w-fit pl-2 ml-1"
          >
            <AddIcon sx={{ fontSize: 13 }} />
            新增子任務
          </button>
        )}
      </div>
    </div>
  )
}

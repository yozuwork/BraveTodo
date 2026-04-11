import { useState, useRef, useEffect, useCallback } from 'react'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import AddIcon from '@mui/icons-material/Add'
import SlashEffect from './SlashEffect'
import DamageNumber from './DamageNumber'

// ── Sub-task row ──────────────────────────────────────────────
function SubTaskItem({ sub, questCompleted, onToggle, onRemove, onUpdate }) {
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
        disabled={questCompleted}
        size="small"
        sx={{
          p: 0.3,
          color: '#d1d5db',
          '&.Mui-checked': { color: '#a855f7' },
          '&.Mui-disabled': { opacity: 0.4 },
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
          onDoubleClick={() => !questCompleted && setEditing(true)}
          onKeyDown={(e) => {
            if ((e.key === 'Enter' || e.key === ' ') && !questCompleted) {
              e.preventDefault(); setEditing(true)
            }
          }}
        >
          {sub.text}
        </span>
      )}
      <IconButton
        size="small"
        onClick={onRemove}
        className="opacity-0 group-hover/sub:opacity-100"
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

// ── Main quest row ────────────────────────────────────────────
export default function QuestItem({
  quest, onToggle, onUpdate, onRemove, onToggleCore, atk,
  onAddSubTask, onToggleSubTask, onRemoveSubTask, onUpdateSubTask,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(quest.text)
  const [slashing, setSlashing] = useState(false)
  const [shaking, setShaking] = useState(false)
  const [animatingComplete, setAnimatingComplete] = useState(false)
  const [damageInfo, setDamageInfo] = useState(null)
  const [addingSubTask, setAddingSubTask] = useState(false)
  const [subDraft, setSubDraft] = useState('')
  const inputRef = useRef(null)
  const subInputRef = useRef(null)
  const pendingToggleRef = useRef(false)
  const subComposingRef = useRef(false)

  const subTasks = quest.subTasks ?? []

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
    if (!editing) setDraft(quest.text)
  }, [quest.text, editing])

  const handleToggle = useCallback(() => {
    if (!quest.completed) {
      setSlashing(true)
      setAnimatingComplete(true)
      pendingToggleRef.current = true
    } else {
      onToggle(quest.id)
    }
  }, [quest.completed, quest.id, onToggle])

  const handleShakeReady = useCallback(() => {
    setShaking(true)
    setTimeout(() => setShaking(false), 450)
    const multiplier = 0.70 + Math.random() * 0.50
    const damage = Math.round((atk ?? 10) * multiplier)
    setDamageInfo({ damage, multiplier })
  }, [atk])

  const cancelEdit = () => { setDraft(quest.text); setEditing(false) }
  const commitEdit = () => {
    const trimmed = draft.trim()
    if (!trimmed) { cancelEdit(); return }
    onUpdate(quest.id, trimmed)
    setEditing(false)
  }

  const commitSubTask = () => {
    const trimmed = subDraft.trim()
    if (trimmed) onAddSubTask(quest.id, trimmed)
    setSubDraft('')
    setAddingSubTask(false)
  }

  const cancelSubTask = () => { setSubDraft(''); setAddingSubTask(false) }

  const completedSubs = subTasks.filter((s) => s.completed).length

  return (
    <div
      className={`bg-white rounded-xl px-5 py-4 flex gap-4 border border-transparent hover:border-gray-200 transition-colors group relative ${
        quest.completed || animatingComplete ? 'opacity-50' : ''
      } ${shaking ? 'quest-shake' : ''}`}
    >
      <SlashEffect
        visible={slashing}
        onComplete={() => {
          setSlashing(false)
          setAnimatingComplete(false)
          if (pendingToggleRef.current) {
            pendingToggleRef.current = false
            onToggle(quest.id)
          }
        }}
        onShakeReady={handleShakeReady}
      />
      <DamageNumber
        damage={damageInfo?.damage}
        multiplier={damageInfo?.multiplier}
        visible={damageInfo !== null}
        onComplete={() => setDamageInfo(null)}
      />

      {/* Checkbox — align to top */}
      <div className="shrink-0 mt-0.5">
        <Checkbox
          checked={quest.completed || animatingComplete}
          onChange={handleToggle}
          sx={{ p: 0, color: '#d1d5db', '&.Mui-checked': { color: '#a855f7' } }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col gap-2 min-w-0">

        {/* Main quest title row */}
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
              className={`flex-1 text-sm font-medium text-black m-0 text-left cursor-text rounded px-1 -mx-1 hover:bg-stone-100 ${
                quest.completed || animatingComplete ? 'line-through text-gray-400' : ''
              }`}
              onDoubleClick={() => setEditing(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setEditing(true) }
              }}
            >
              {quest.text}
              {subTasks.length > 0 && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  {completedSubs}/{subTasks.length}
                </span>
              )}
            </p>
          )}

          {/* Action buttons */}
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
            sx={{ color: quest.isCore ? '#f59e0b' : '#d1d5db', '&:hover': { color: '#f59e0b' } }}
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

        {/* Sub-task list */}
        {subTasks.length > 0 && (
          <div className="flex flex-col gap-0.5 pl-1 border-l-2 border-gray-100 ml-1">
            {subTasks.map((sub) => (
              <SubTaskItem
                key={sub.id}
                sub={sub}
                questCompleted={quest.completed}
                onToggle={() => onToggleSubTask(quest.id, sub.id)}
                onRemove={() => onRemoveSubTask(quest.id, sub.id)}
                onUpdate={(text) => onUpdateSubTask(quest.id, sub.id, text)}
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
          !quest.completed && (
            <button
              onClick={() => setAddingSubTask(true)}
              className="flex items-center gap-1 text-xs text-gray-400 hover:text-purple-500 transition-colors cursor-pointer bg-transparent border-none p-0 w-fit pl-2 ml-1"
            >
              <AddIcon sx={{ fontSize: 13 }} />
              新增子任務
            </button>
          )
        )}
      </div>
    </div>
  )
}

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import Checkbox from '@mui/material/Checkbox'
import IconButton from '@mui/material/IconButton'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import SportsMmaIcon from '@mui/icons-material/SportsMma'
import AddIcon from '@mui/icons-material/Add'

const PRIORITY_CYCLE = { normal: 'high', high: 'low', low: 'normal' }
const PRIORITY_LABEL = { high: '優先', normal: '次要', low: '最後' }
const PRIORITY_STYLE = {
  high: 'bg-red-100 text-red-600 hover:bg-red-200',
  normal: 'bg-gray-100 text-gray-400 hover:bg-gray-200',
  low: 'bg-blue-50 text-blue-400 hover:bg-blue-100',
}

const EXP_CYCLE  = { 1: 3, 3: 5, 5: 10, 10: 20, 20: 1 }
const EXP_LABEL  = { 1: '一般', 3: '中等', 5: '上等', 10: '特級', 20: '特殊' }
const EXP_POINTS = { 1: '+1', 3: '+3', 5: '+5', 10: '+10', 20: '+20' }
const EXP_STYLE  = {
  1:  'bg-gray-100 text-gray-400 hover:bg-gray-200',
  3:  'bg-blue-50 text-blue-400 hover:bg-blue-100',
  5:  'bg-yellow-50 text-yellow-500 hover:bg-yellow-100',
  10: 'bg-orange-50 text-orange-500 hover:bg-orange-100',
  20: 'bg-rose-50 text-rose-500 hover:bg-rose-100',
}

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
        sx={{ p: 0.3, color: '#d1d5db', '&.Mui-checked': { color: '#a855f7' } }}
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
        >
          {sub.text}
        </span>
      )}
      <IconButton
        size="small"
        onClick={onRemove}
        sx={{ p: 0.3, color: '#d1d5db', opacity: 0, '.group\\/sub:hover &': { opacity: 1 }, '&:hover': { color: '#ef4444' } }}
      >
        <DeleteOutlineIcon sx={{ fontSize: 14 }} />
      </IconButton>
    </div>
  )
}

export default function HeroQuestItem({
  quest, onToggle, onUpdate, onRemove, onSetPriority, onSetExp, onTogglePin,
  onAddSubTask, onToggleSubTask, onRemoveSubTask, onUpdateSubTask,
  activeHuntTarget, monsters, stages,
  onBindQuestToActiveHuntTask, onUnbindQuestFromHuntTask, onCreateAndBindQuestToActiveHunt,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(quest.text)
  const [addingSubTask, setAddingSubTask] = useState(false)
  const [subDraft, setSubDraft] = useState('')
  const [huntBindOpen, setHuntBindOpen] = useState(false)
  const inputRef = useRef(null)
  const subInputRef = useRef(null)

  const subTasks = quest.subTasks ?? []

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editing])

  useEffect(() => {
    if (addingSubTask && subInputRef.current) subInputRef.current.focus()
  }, [addingSubTask])

  useEffect(() => {
    if (!editing) setDraft(quest.text)
  }, [quest.text, editing])

  const cancelEdit = () => { setDraft(quest.text); setEditing(false) }
  const commitEdit = useCallback(() => {
    const trimmed = draft.trim()
    if (!trimmed) { cancelEdit(); return }
    onUpdate(quest.id, trimmed)
    setEditing(false)
  }, [draft, onUpdate, quest.id, quest.text])

  const commitSubTask = () => {
    const trimmed = subDraft.trim()
    if (trimmed) onAddSubTask?.(quest.id, trimmed)
    setSubDraft('')
    setAddingSubTask(false)
  }

  const completedSubs = subTasks.filter((s) => s.completed).length

  const boundTarget = useMemo(() => {
    const b = quest.huntBinding
    if (!b) return null
    if (b.targetType === 'monster') {
      const m = (monsters ?? []).find((x) => x.id === b.targetId)
      if (!m) return { name: '（目標已不存在）', hpPercent: null, isMissing: true }
      const tasks = m.huntTasks ?? []
      const completed = tasks.filter((t) => t.completed).length
      const total = tasks.length
      const hpPercent = total > 0 ? ((total - completed) / total) * 100 : 100
      return { name: m.name, hpPercent, isMissing: false }
    }
    if (b.targetType === 'stageBoss') {
      const s = (stages ?? []).find((x) => x.id === b.targetId)
      if (!s) return { name: '（目標已不存在）', hpPercent: null, isMissing: true }
      const tasks = s.bossHuntTasks ?? []
      const completed = tasks.filter((t) => t.completed).length
      const total = tasks.length
      const hpPercent = total > 0 ? ((total - completed) / total) * 100 : 100
      return { name: s.bossName ?? `第${s.id}階段Boss`, hpPercent, isMissing: false }
    }
    return { name: '（未知目標）', hpPercent: null, isMissing: true }
  }, [quest.huntBinding, monsters, stages])

  const isActiveTargetBound =
    !!quest.huntBinding &&
    !!activeHuntTarget &&
    quest.huntBinding.targetType === activeHuntTarget._type &&
    quest.huntBinding.targetId === activeHuntTarget.id

  return (
    <div
      className={`bg-white rounded-xl px-4 py-4 sm:px-5 flex flex-wrap sm:flex-nowrap items-start gap-3 sm:gap-4 border transition-colors group ${
        quest.completed ? 'opacity-50' : ''
      } ${quest.pinned ? 'border-purple-200' : 'border-transparent hover:border-gray-200'}`}
    >
      <Checkbox
        checked={quest.completed}
        onChange={() => onToggle(quest.id)}
        sx={{ p: 0, mt: 0.5, color: '#d1d5db', '&.Mui-checked': { color: '#a855f7' } }}
      />

      <div className="flex-1 flex flex-col gap-2 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          {!editing && (
            <button
              onClick={() => onSetPriority(quest.id, PRIORITY_CYCLE[quest.priority ?? 'normal'])}
              title="點擊切換優先級"
              className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors cursor-pointer border-none ${PRIORITY_STYLE[quest.priority ?? 'normal']}`}
            >
              {PRIORITY_LABEL[quest.priority ?? 'normal']}
            </button>
          )}
          {!editing && (
            <button
              onClick={() => onSetExp(quest.id, EXP_CYCLE[quest.expValue])}
              title="經驗值（點擊切換）"
              className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full transition-colors cursor-pointer border-none ${EXP_STYLE[quest.expValue]}`}
            >
              {EXP_LABEL[quest.expValue]} {EXP_POINTS[quest.expValue]}
            </button>
          )}
          {editing ? (
            <input
              ref={inputRef}
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitEdit() }
                if (e.key === 'Escape') cancelEdit()
              }}
              className="flex-1 text-sm font-medium text-black bg-stone-50 border border-purple-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400"
            />
          ) : (
            <p
              role="button"
              tabIndex={0}
              onDoubleClick={() => setEditing(true)}
              className={`flex-1 text-sm text-black font-medium m-0 cursor-text rounded px-1 -mx-1 hover:bg-stone-100 break-words ${
                quest.completed ? 'line-through text-gray-400' : ''
              }`}
            >
              {quest.text}
              {subTasks.length > 0 && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  {completedSubs}/{subTasks.length}
                </span>
              )}
            </p>
          )}

          {!editing && (
            <Select
              value={isActiveTargetBound ? String(quest.huntBinding.taskId) : ''}
              onChange={(e) => {
                const val = e.target.value
                if (val === '__none__') onUnbindQuestFromHuntTask?.(quest.id)
                else if (val === '__create__') onCreateAndBindQuestToActiveHunt?.(quest.id)
                else if (val) onBindQuestToActiveHuntTask?.(quest.id, Number(val))
              }}
              open={huntBindOpen}
              onOpen={() => setHuntBindOpen(true)}
              onClose={() => setHuntBindOpen(false)}
              displayEmpty
              size="small"
              variant="outlined"
              disabled={!activeHuntTarget}
              renderValue={() => {
                if (quest.huntBinding && boundTarget) {
                  const hpText = boundTarget.hpPercent === null ? '' : ` HP ${Math.round(boundTarget.hpPercent)}%`
                  const nameText = boundTarget.name.length > 8 ? `${boundTarget.name.slice(0, 8)}…` : boundTarget.name
                  return (
                    <span className={`flex items-center gap-1 text-xs font-medium ${boundTarget.isMissing ? 'text-gray-400' : 'text-red-500'}`}>
                      <SportsMmaIcon style={{ fontSize: 14 }} />
                      {nameText}{hpText}
                    </span>
                  )
                }
                return (
                  <span className="flex items-center gap-1 text-xs text-gray-300 font-medium">
                    <SportsMmaIcon style={{ fontSize: 14 }} />
                    {activeHuntTarget ? '綁定討伐' : '未討伐'}
                  </span>
                )
              }}
              sx={{
                minWidth: 96,
                fontSize: '0.75rem',
                '.MuiOutlinedInput-notchedOutline': { borderColor: '#f3f4f6' },
                '.MuiSelect-select': { py: '4px', px: '8px' },
              }}
            >
              <MenuItem value="__none__" sx={{ fontSize: '0.8rem' }}>取消綁定</MenuItem>
              <MenuItem value="__create__" sx={{ fontSize: '0.8rem' }} disabled={!activeHuntTarget}>
                以此任務新增討伐任務並綁定
              </MenuItem>
              {(activeHuntTarget?.huntTasks ?? []).map((t) => (
                <MenuItem key={t.id} value={String(t.id)} sx={{ fontSize: '0.8rem' }}>
                  {t.completed ? '✅ ' : '⬜ '} {t.text}
                </MenuItem>
              ))}
            </Select>
          )}
        </div>

        {subTasks.length > 0 && (
          <div className="flex flex-col gap-0.5 pl-1 border-l-2 border-gray-100 ml-1">
            {subTasks.map((sub) => (
              <SubTaskItem
                key={sub.id}
                sub={sub}
                onToggle={() => onToggleSubTask?.(quest.id, sub.id)}
                onRemove={() => onRemoveSubTask?.(quest.id, sub.id)}
                onUpdate={(text) => onUpdateSubTask?.(quest.id, sub.id, text)}
              />
            ))}
          </div>
        )}

        {addingSubTask ? (
          <div className="flex items-center gap-2 pl-2 ml-1">
            <input
              ref={subInputRef}
              className="flex-1 text-xs text-black bg-stone-50 border border-purple-200 rounded px-2 py-1 outline-none focus:border-purple-400"
              placeholder="輸入子任務..."
              value={subDraft}
              onChange={(e) => setSubDraft(e.target.value)}
              onBlur={commitSubTask}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitSubTask() }
                if (e.key === 'Escape') { setSubDraft(''); setAddingSubTask(false) }
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

      {!editing && (
        <IconButton size="small" onClick={() => setEditing(true)} sx={{ color: '#d1d5db', '&:hover': { color: '#a855f7' } }}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      )}
      <IconButton
        size="small"
        onClick={() => onTogglePin?.(quest.id)}
        sx={{ color: quest.pinned ? '#a855f7' : '#d1d5db', '&:hover': { color: '#a855f7' } }}
      >
        {quest.pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
      </IconButton>
      <IconButton size="small" onClick={() => onRemove(quest.id)} sx={{ color: '#d1d5db', '&:hover': { color: '#ef4444' } }}>
        <DeleteOutlineIcon fontSize="small" />
      </IconButton>
    </div>
  )
}

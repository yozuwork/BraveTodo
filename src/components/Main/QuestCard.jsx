import { useState } from 'react'
import Checkbox from '@mui/material/Checkbox'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import AddIcon from '@mui/icons-material/Add'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { playQuestCompleteSound } from '../../hooks/useQuests'

const PRIORITY_CYCLE = { normal: 'high', high: 'low', low: 'normal' }
const PRIORITY_LABEL = { high: '優先', normal: '次要', low: '最後' }
const EXP_CYCLE = { 1: 3, 3: 5, 5: 10, 10: 20, 20: 1 }
const EXP_LABEL = { 1: '一般', 3: '中等', 5: '上等', 10: '特級', 20: '特殊' }

function normalizeExp(expValue) {
  if (expValue === 2) return 3
  return [1, 3, 5, 10, 20].includes(expValue) ? expValue : 1
}

export default function QuestCard({
  quest,
  size,
  coverImage,
  hasCustomCover,
  coverPosition,
  coverFit,
  coverRatio,
  expColor,
  onOpenDetails,
  onToggle,
  onToggleCore,
  onSetPriority,
  onSetStatus,
  onSetExp,
  onAddSubTask,
  onToggleSubTask,
}) {
  const [addingSubTask, setAddingSubTask] = useState(false)
  const [subTaskDraft, setSubTaskDraft] = useState('')
  const [expanded, setExpanded] = useState(false)
  const subTasks = quest.subTasks ?? []
  const completedSubTasks = subTasks.filter((subTask) => subTask.completed).length
  const effectiveExp = normalizeExp(quest.expValue)
  const collapsedSubTaskLimit = size === 'large' ? subTasks.length : size === 'medium' ? 3 : 0
  const visibleSubTasks = expanded ? subTasks : subTasks.slice(0, collapsedSubTaskLimit)
  const hasHiddenSubTasks = subTasks.length > collapsedSubTaskLimit
  const hp = quest.completed
    ? 0
    : subTasks.length > 0
      ? Math.round(((subTasks.length - completedSubTasks) / subTasks.length) * 100)
      : 100

  const submitSubTask = (event) => {
    event.preventDefault()
    const value = subTaskDraft.trim()
    if (value) onAddSubTask(quest.id, value)
    setSubTaskDraft('')
    setAddingSubTask(false)
  }

  const toggleCompleted = () => {
    if (!quest.completed) playQuestCompleteSound()
    onToggle(quest.id)
  }

  return (
    <article className={`quest-card quest-card--${size} ${quest.completed ? 'quest-card--completed' : ''}`}>
      <div className="quest-card__cover" style={{ '--quest-cover-ratio': (coverRatio ?? 100) / 100 }}>
        {coverImage && (
          <img
            src={coverImage}
            alt=""
            className={`quest-card__cover-image ${hasCustomCover ? 'is-custom' : ''}`}
            style={{
              objectFit: hasCustomCover ? coverFit : undefined,
              objectPosition: `${coverPosition?.x ?? 50}% ${coverPosition?.y ?? 50}%`,
            }}
            draggable={false}
          />
        )}
        <span className="quest-card__cover-letter" aria-hidden="true">{quest.text.trim().charAt(0) || '任'}</span>
        <div className="absolute left-3 top-3 z-[2] rounded-md bg-white/95 shadow-sm" onClick={(event) => event.stopPropagation()}>
          <Checkbox
            checked={quest.completed}
            onChange={toggleCompleted}
            size="small"
            sx={{ p: 0.55, color: '#111827', '&.Mui-checked': { color: '#a855f7' } }}
          />
        </div>
        <button
          type="button"
          draggable={false}
          onClick={(event) => {
            event.stopPropagation()
            onOpenDetails()
          }}
          className="absolute right-2 top-2 z-[3] flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/95 text-black shadow-sm"
          title="查看／編輯任務"
          aria-label="查看／編輯任務"
        >
          <MoreVertIcon sx={{ fontSize: 21 }} />
        </button>
      </div>

      <div
        className={`quest-card__body ${hasHiddenSubTasks ? 'quest-card__body--expandable' : ''}`}
      >
        {hasHiddenSubTasks && (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={`quest-card__expand-button ${expanded ? 'is-expanded' : ''}`}
            aria-expanded={expanded}
            aria-label={expanded ? '收合子任務' : '顯示全部子任務'}
            title={expanded ? '收合子任務' : '顯示全部子任務'}
          >
            <ExpandMoreIcon sx={{ fontSize: 25 }} />
          </button>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => onSetPriority(quest.id, PRIORITY_CYCLE[quest.priority ?? 'normal'])} className="quest-card__tag">
            {PRIORITY_LABEL[quest.priority ?? 'normal']}
          </button>
          <button
            type="button"
            onClick={() => onSetExp(quest.id, EXP_CYCLE[effectiveExp])}
            className="quest-card__tag quest-card__tag--exp quest-exp-badge"
            style={{ '--quest-exp-color': expColor }}
          >
            {EXP_LABEL[effectiveExp]} +{effectiveExp}
          </button>
          {subTasks.length > 0 && <span className="ml-auto text-[11px] font-bold text-slate-400">{completedSubTasks}/{subTasks.length}</span>}
        </div>

        <h3
          className={`m-0 cursor-pointer text-base font-extrabold leading-6 text-slate-900 hover:text-purple-600 ${quest.completed ? 'line-through text-slate-400' : ''}`}
          onClick={onOpenDetails}
          title="查看／編輯任務"
        >
          {quest.text}
        </h3>

        {(size !== 'small' || expanded) && (
          <div className="quest-card__subtasks">
            {visibleSubTasks.map((subTask) => (
              <label key={subTask.id} className="flex cursor-pointer items-center gap-2 text-xs text-slate-600">
                <Checkbox
                  checked={subTask.completed}
                  onChange={() => onToggleSubTask(quest.id, subTask.id)}
                  size="small"
                  sx={{ p: 0.25, color: '#9ca3af', '&.Mui-checked': { color: '#a855f7' } }}
                />
                <span className={subTask.completed ? 'line-through text-slate-400' : ''}>{subTask.text}</span>
              </label>
            ))}
            {!expanded && subTasks.length > visibleSubTasks.length && (
              <span className="text-[11px] text-slate-400">還有 {subTasks.length - visibleSubTasks.length} 個子任務</span>
            )}
            {expanded && hasHiddenSubTasks && (
              <span className="text-[11px] text-slate-400">已顯示全部子任務</span>
            )}
            {addingSubTask ? (
              <form onSubmit={submitSubTask} className="mt-1 flex gap-2">
                <input autoFocus value={subTaskDraft} onChange={(event) => setSubTaskDraft(event.target.value)} onBlur={() => { if (!subTaskDraft.trim()) setAddingSubTask(false) }} placeholder="輸入子任務..." className="min-w-0 flex-1 rounded-md border border-slate-200 px-2 py-1 text-xs outline-none focus:border-purple-400" />
              </form>
            ) : (
              <button type="button" onClick={() => setAddingSubTask(true)} className="mt-1 flex items-center gap-1 bg-transparent p-0 text-xs text-slate-400 hover:text-purple-500">
                <AddIcon sx={{ fontSize: 14 }} />新增子任務
              </button>
            )}
          </div>
        )}
      </div>

      <div className="quest-card__hp" aria-label={`任務 HP ${hp} / 100`}>
        <span>HP</span>
        <div className="quest-card__hp-track">
          <div className="quest-card__hp-fill" style={{ width: `${hp}%` }} />
        </div>
        <b>{hp} / 100</b>
      </div>

      <footer className="quest-card__footer">
        <button
          type="button"
          disabled={quest.completed}
          onClick={() => onSetStatus(quest.id, quest.status === 'progress' ? 'pending' : 'progress')}
          className={`bg-transparent text-xs font-extrabold ${quest.completed ? 'text-slate-500' : quest.status === 'progress' ? 'text-blue-600' : 'text-slate-700'}`}
        >
          {quest.completed ? '已完成' : quest.status === 'progress' ? '進行中' : '待處理'}
        </button>
        <button type="button" onClick={() => onToggleCore(quest.id)} className="ml-auto bg-transparent text-slate-700" aria-label={quest.isCore ? '取消核心任務' : '設為核心任務'}>
          {quest.isCore ? <StarIcon sx={{ fontSize: 22 }} /> : <StarBorderIcon sx={{ fontSize: 22 }} />}
        </button>
      </footer>
    </article>
  )
}

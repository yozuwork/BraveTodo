import { useRef, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import { TYPE_CONFIG } from '../../hooks/useMonsters'

const STAGE_COLORS = ['#a855f7', '#3b82f6', '#f97316', '#ef4444', '#10b981', '#f59e0b']

export default function HuntMission({
  target,
  heroAvatar,
  heroImagePosition,
  heroName = '米莉亞',
  heroClassName,
  heroLevel,
  activeQuestCount = 0,
  onAddHuntTask,
  onToggleHuntTask,
  onRemoveHuntTask,
  onUpdateHuntTask,
  onStopHunt,
  onCompleteHunt,
}) {
  const [inputValue, setInputValue] = useState('')
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const isComposingRef = useRef(false)

  if (!target) {
    return (
      <div className="py-20 text-center text-gray-300">
        <p className="text-lg font-semibold">尚無討伐目標</p>
        <p className="mt-1 text-sm">在討伐頁按下「可討伐」開始討伐任務！</p>
      </div>
    )
  }

  const { id, name, type, avatarSrc, avatar, huntTasks = [], stageRange, recommendedLevel, _type } = target
  const isStageBoss = _type === 'stageBoss'
  const typeConfig = TYPE_CONFIG[type] ?? TYPE_CONFIG.minion
  const accent = isStageBoss ? STAGE_COLORS[(id - 1) % STAGE_COLORS.length] : typeConfig.accent
  const typeLabel = isStageBoss ? `第${id}階段Boss` : typeConfig.label
  const displayAvatar = avatarSrc ?? avatar
  const completedCount = huntTasks.filter((task) => task.completed).length
  const totalCount = huntTasks.length
  const hpPercent = totalCount > 0 ? ((totalCount - completedCount) / totalCount) * 100 : 100
  const hpColor = hpPercent > 60 ? '#22c55e' : hpPercent > 30 ? '#f59e0b' : '#ef4444'

  const addTask = () => {
    const text = inputValue.trim()
    if (!text || isComposingRef.current || huntTasks.length >= 10) return
    onAddHuntTask(id, text)
    setInputValue('')
  }

  const commitEdit = (taskId) => {
    const text = editDraft.trim()
    if (text) onUpdateHuntTask(id, taskId, text)
    setEditingTaskId(null)
    setEditDraft('')
  }

  return (
    <div className="hunt-mission-page flex flex-col gap-7">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="hunt-duel-card relative flex min-h-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <span className="absolute left-4 top-4 z-10 rounded-lg bg-black px-3 py-1.5 text-xs font-black text-white">主角</span>
          <div className="w-1/2 min-w-[220px] overflow-hidden border-r border-slate-200 bg-slate-100">
            {heroAvatar ? (
              <img
                src={heroAvatar}
                alt={heroName}
                className="h-full w-full object-cover"
                style={{ objectPosition: `${heroImagePosition?.x ?? 50}% ${heroImagePosition?.y ?? 50}%` }}
                draggable={false}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-5xl font-black">{heroName[0]}</div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center p-7">
            <h1 className="m-0 text-3xl font-black text-slate-950">{heroName}</h1>
            <p className="m-0 mt-2 text-base font-medium text-slate-500">{heroClassName || '初心者'}</p>
            <span className="mt-7 w-fit rounded-lg border border-slate-900 px-3 py-1 text-xs font-black">LEVEL {heroLevel}</span>
            <div className="mt-8 border-t border-slate-300 pt-5">
              <p className="m-0 flex items-center gap-3 text-sm font-semibold text-slate-700">
                <TaskAltOutlinedIcon sx={{ fontSize: 21 }} />
                {activeQuestCount} 個進行中任務
              </p>
            </div>
          </div>
        </section>

        <section className="hunt-duel-card relative flex min-h-[300px] overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <span className="absolute left-4 top-4 z-10 rounded-lg bg-black px-3 py-1.5 text-xs font-black text-white">對手</span>
          <div className="w-1/2 min-w-[220px] overflow-hidden border-r border-slate-200 bg-slate-950">
            {displayAvatar ? (
              <img src={displayAvatar} alt={name} className="h-full w-full object-cover" draggable={false} />
            ) : (
              <div className="flex h-full items-center justify-center text-5xl font-black text-white">{name[0]}</div>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col justify-center p-7">
            <h2 className="m-0 text-3xl font-black text-slate-950">{name}</h2>
            <span className="mt-3 w-fit rounded-lg border-2 px-3 py-1 text-xs font-black" style={{ color: accent, borderColor: accent }}>
              {typeLabel}
            </span>
            <p className="m-0 mt-4 text-sm font-mono text-slate-500">
              {isStageBoss && stageRange
                ? `LV${stageRange.min} – LV${stageRange.max}`
                : `推薦等級 LV${recommendedLevel ?? '?'}`}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
              <span className="rounded-lg bg-red-50 px-2.5 py-1 text-xs font-black text-red-500">討伐中</span>
              <button type="button" onClick={() => onStopHunt(id)} className="ml-auto text-xs font-bold text-slate-400 hover:text-red-500">撤退</button>
            </div>
            <div className="mt-6 border-t border-slate-300 pt-5">
              <div className="mb-2 flex items-center justify-between text-xs font-black">
                <span>HP</span>
                <span className="font-mono text-slate-500">{Math.round(hpPercent)}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${hpPercent}%`, background: hpColor }} />
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="hunt-task-panel rounded-2xl border border-slate-200 bg-white p-6">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="m-0 flex items-center gap-3 text-lg font-black text-slate-950">
            <TaskAltOutlinedIcon sx={{ fontSize: 24 }} />
            討伐任務
          </h2>
          <span className="text-xs font-mono text-slate-500">{huntTasks.length}/10</span>
        </div>

        {huntTasks.length < 10 && (
          <div className="relative mb-4">
            <AddIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-800" fontSize="small" />
            <input
              type="text"
              className="w-full rounded-lg border border-slate-400 bg-white py-4 pl-12 pr-24 text-sm text-black outline-none transition-colors focus:border-black"
              placeholder="新增討伐任務..."
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onCompositionStart={() => { isComposingRef.current = true }}
              onCompositionEnd={() => { isComposingRef.current = false }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isComposingRef.current) addTask()
              }}
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">ENTER ↵</span>
          </div>
        )}

        {huntTasks.length === 0 ? (
          <div className="py-10 text-center text-slate-300">
            <p className="m-0 text-sm font-semibold">尚無討伐任務</p>
            <p className="m-0 mt-1 text-xs">新增最多 10 個任務，完成任務削減目標 HP！</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {huntTasks.map((task) => (
              <div key={task.id} className={`hunt-task-row group flex items-center gap-4 rounded-lg border border-slate-300 bg-white px-4 py-3 ${task.completed ? 'opacity-60' : ''}`}>
                <button
                  type="button"
                  onClick={() => onToggleHuntTask(id, task.id)}
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${task.completed ? 'border-black bg-black' : 'border-slate-400 bg-white'}`}
                  aria-label={task.completed ? '取消完成' : '完成任務'}
                >
                  {task.completed && <span className="h-2 w-2 rounded-full bg-white" />}
                </button>
                {editingTaskId === task.id ? (
                  <input
                    autoFocus
                    className="min-w-0 flex-1 rounded border border-slate-400 px-2 py-1 text-sm outline-none focus:border-black"
                    value={editDraft}
                    onChange={(event) => setEditDraft(event.target.value)}
                    onBlur={() => commitEdit(task.id)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitEdit(task.id)
                      if (event.key === 'Escape') { setEditingTaskId(null); setEditDraft('') }
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onDoubleClick={() => { setEditingTaskId(task.id); setEditDraft(task.text) }}
                    className={`min-w-0 flex-1 bg-transparent text-left text-sm font-semibold ${task.completed ? 'line-through text-slate-400' : 'text-slate-800'}`}
                  >
                    {task.text}
                  </button>
                )}
                <span className="text-xs font-medium text-slate-400">{task.completed ? '已完成' : '進行中'}</span>
                <button type="button" onClick={() => onRemoveHuntTask(id, task.id)} className="text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100" aria-label="刪除任務">
                  <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {isStageBoss && onCompleteHunt && totalCount > 0 && hpPercent === 0 && (
          <button type="button" onClick={onCompleteHunt} className="mt-5 w-full rounded-lg bg-black py-3 text-sm font-black text-white">
            討伐完成！確認晉升職業
          </button>
        )}
      </section>
    </div>
  )
}

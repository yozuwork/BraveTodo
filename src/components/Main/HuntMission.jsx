import { useState, useRef } from 'react'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import { TYPE_CONFIG } from '../../hooks/useMonsters'

const STAGE_COLORS = ['#a855f7', '#3b82f6', '#f97316', '#ef4444', '#10b981', '#f59e0b']

export default function HuntMission({
  target,           // normalised hunt target (monster or stageBoss)
  onAddHuntTask,
  onToggleHuntTask,
  onRemoveHuntTask,
  onUpdateHuntTask,
  onStopHunt,
  onCompleteHunt,   // only for stage bosses — locks in 'defeated'
}) {
  const [inputValue, setInputValue] = useState('')
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const isComposingRef = useRef(false)

  if (!target) {
    return (
      <div className="text-center py-20 text-gray-300">
        <p className="text-lg font-semibold">尚無討伐目標</p>
        <p className="text-sm mt-1">在討伐頁按下「可討伐」按鈕開始討伐任務！</p>
      </div>
    )
  }

  const { id, name, type, avatarSrc, avatar, huntTasks = [], stageRange, _type } = target
  const isStageBoss = _type === 'stageBoss'

  const cfg = isStageBoss
    ? { accent: STAGE_COLORS[(id - 1) % STAGE_COLORS.length], label: `第${id}階段Boss` }
    : (TYPE_CONFIG[type] ?? TYPE_CONFIG.minion)

  const completedCount = huntTasks.filter((t) => t.completed).length
  const totalCount = huntTasks.length
  const hpPercent = totalCount > 0 ? ((totalCount - completedCount) / totalCount) * 100 : 100

  const hpColor =
    hpPercent > 60 ? '#22c55e' :
    hpPercent > 30 ? '#f59e0b' :
    '#ef4444'

  const displayAvatar = avatarSrc ?? avatar

  const handleAddTask = () => {
    const text = inputValue.trim()
    if (!text || isComposingRef.current) return
    if (huntTasks.length >= 10) return
    onAddHuntTask(id, text)
    setInputValue('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !isComposingRef.current) handleAddTask()
  }

  const commitEdit = (taskId) => {
    const text = editDraft.trim()
    if (text) onUpdateHuntTask(id, taskId, text)
    setEditingTaskId(null)
    setEditDraft('')
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Target Header ── */}
      <div
        className="rounded-2xl overflow-hidden border"
        style={{ borderColor: `${cfg.accent}44` }}
      >
        {/* Banner */}
        <div
          className="relative flex items-center gap-4 p-4"
          style={{ background: `linear-gradient(135deg, #111827 0%, ${cfg.accent}33 100%)` }}
        >
          {/* Avatar */}
          <div
            className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border-2"
            style={{ borderColor: cfg.accent }}
          >
            {displayAvatar ? (
              <img src={displayAvatar} alt={name} className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-2xl font-extrabold"
                style={{ background: `${cfg.accent}22`, color: cfg.accent }}
              >
                {name[0]}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span
                className="text-xs font-bold text-white px-2 py-0.5 rounded-full"
                style={{ background: cfg.accent }}
              >
                {cfg.label}
              </span>
              {isStageBoss && stageRange && (
                <span className="text-xs font-mono text-gray-400">
                  LV{stageRange.min}–LV{stageRange.max}
                </span>
              )}
              <span
                className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}
              >
                ⚔ 討伐中
              </span>
            </div>
            <h2 className="text-white text-lg font-extrabold m-0 leading-tight truncate">{name}</h2>
            <p className="text-gray-400 text-xs m-0 mt-0.5">
              {completedCount}/{totalCount} 任務完成
            </p>
          </div>

          {/* Stop hunt button */}
          <button
            onClick={() => onStopHunt(id)}
            className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-400 border border-gray-600 hover:border-gray-400 hover:text-gray-200 transition-colors"
            style={{ background: 'rgba(0,0,0,0.4)' }}
          >
            撤退
          </button>
        </div>

        {/* HP Bar */}
        <div className="px-4 py-3 bg-gray-900">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">HP</span>
            <span className="text-xs font-bold font-mono" style={{ color: hpColor }}>
              {Math.round(hpPercent)}%
            </span>
          </div>
          <div className="h-4 rounded-full overflow-hidden bg-gray-700 relative">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${hpPercent}%`,
                background: `linear-gradient(90deg, ${hpColor}cc, ${hpColor})`,
                boxShadow: `0 0 8px ${hpColor}88`,
              }}
            />
            {totalCount > 0 && huntTasks.map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 w-px bg-gray-900/60"
                style={{ left: `${((i + 1) / totalCount) * 100}%` }}
              />
            ))}
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-gray-500">
              {totalCount === 0 ? '新增任務開始討伐！' : '完成任務以削減HP'}
            </span>
            <span className="text-[10px] text-gray-500 font-mono">
              {completedCount}/{totalCount}
            </span>
          </div>
        </div>

        {/* Stage boss defeat button — appears when all tasks complete */}
        {isStageBoss && onCompleteHunt && totalCount > 0 && hpPercent === 0 && (
          <div className="px-4 pb-4">
            <button
              onClick={() => onCompleteHunt()}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                boxShadow: '0 4px 16px rgba(245,158,11,0.5)',
              }}
            >
              🏆 討伐完成！確認晉升職業
            </button>
          </div>
        )}
      </div>

      {/* ── Task List ── */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-black m-0">討伐任務</h3>
          <span className="text-xs text-gray-400 font-mono">{huntTasks.length}/10</span>
        </div>

        {huntTasks.length < 10 && (
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-red-400 pointer-events-none">
              <AddIcon fontSize="small" />
            </span>
            <input
              type="text"
              className="w-full bg-white text-black border border-gray-200 rounded-xl py-3 pl-12 pr-20 text-sm focus:outline-none focus:border-red-400 transition-colors"
              placeholder="新增討伐任務..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onCompositionStart={() => { isComposingRef.current = true }}
              onCompositionEnd={() => { isComposingRef.current = false }}
              onKeyDown={handleKeyDown}
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-xs font-mono pointer-events-none">
              ENTER ↵
            </span>
          </div>
        )}

        {huntTasks.length === 0 ? (
          <div className="text-center py-10 text-gray-300">
            <p className="text-sm font-semibold">尚無討伐任務</p>
            <p className="text-xs mt-1">新增最多10個任務，完成任務削減目標HP！</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {huntTasks.map((task) => (
              <div
                key={task.id}
                className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 group transition-all"
                style={task.completed ? { opacity: 0.6 } : {}}
              >
                <button
                  onClick={() => onToggleHuntTask(id, task.id)}
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all"
                  style={task.completed ? {
                    background: '#ef4444', borderColor: '#ef4444',
                  } : {
                    borderColor: '#d1d5db', background: 'white',
                  }}
                >
                  {task.completed && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </button>

                {editingTaskId === task.id ? (
                  <input
                    autoFocus
                    className="flex-1 text-sm bg-stone-50 border border-red-200 rounded-lg px-2 py-1 outline-none focus:border-red-400"
                    value={editDraft}
                    onChange={(e) => setEditDraft(e.target.value)}
                    onBlur={() => commitEdit(task.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); commitEdit(task.id) }
                      if (e.key === 'Escape') { setEditingTaskId(null); setEditDraft('') }
                    }}
                  />
                ) : (
                  <span
                    className={`flex-1 text-sm cursor-text ${task.completed ? 'line-through text-gray-400' : 'text-black'}`}
                    onDoubleClick={() => {
                      setEditingTaskId(task.id)
                      setEditDraft(task.text)
                    }}
                  >
                    {task.text}
                  </span>
                )}

                <button
                  onClick={() => onRemoveHuntTask(id, task.id)}
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-300 hover:text-red-400"
                >
                  <DeleteOutlineIcon sx={{ fontSize: 16 }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {huntTasks.length === 10 && (
          <p className="text-center text-xs text-gray-400">已達上限（10個任務）</p>
        )}
      </div>
    </div>
  )
}

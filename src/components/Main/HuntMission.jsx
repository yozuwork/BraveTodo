import { useEffect, useRef, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import TaskAltOutlinedIcon from '@mui/icons-material/TaskAltOutlined'
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined'
import PlayArrowRoundedIcon from '@mui/icons-material/PlayArrowRounded'
import PauseRoundedIcon from '@mui/icons-material/PauseRounded'
import ReplayRoundedIcon from '@mui/icons-material/ReplayRounded'
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded'
import FitScreenOutlinedIcon from '@mui/icons-material/FitScreenOutlined'
import CropOutlinedIcon from '@mui/icons-material/CropOutlined'
import LayersOutlinedIcon from '@mui/icons-material/LayersOutlined'
import LayersClearOutlinedIcon from '@mui/icons-material/LayersClearOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import { TYPE_CONFIG } from '../../hooks/useMonsters'
import { playQuestCompleteSound } from '../../hooks/useQuests'
import { wsKey } from '../../utils/workspace'

const STAGE_COLORS = ['#a855f7', '#3b82f6', '#f97316', '#ef4444', '#10b981', '#f59e0b']
const POMODORO_PRESETS = [15, 25, 45, 60]
const MAX_POMODORO_MINUTES = 180
const DEFAULT_POMODORO = { mode: 'tasks', minutes: 25, endsAt: null, remainingMs: null, done: false }

// 番茄鐘狀態存在本機：用結束時間計算，切換分頁或重新整理都會繼續倒數
const pomodoroKey = (target) => (target ? wsKey(`hunt-pomodoro:${target._type ?? 'monster'}:${target.id}`) : null)

function readPomodoro(key) {
  if (!key) return DEFAULT_POMODORO
  try {
    const stored = JSON.parse(localStorage.getItem(key) || 'null')
    return stored ? { ...DEFAULT_POMODORO, ...stored } : DEFAULT_POMODORO
  } catch {
    return DEFAULT_POMODORO
  }
}

function writePomodoro(key, value) {
  if (!key) return
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Timer persistence is optional.
  }
}

function clearPomodoro(key) {
  if (!key) return
  try {
    localStorage.removeItem(key)
  } catch {
    // Ignore storage failures.
  }
}

// 立繪顯示方式（主角、對手各自記住）：fit = cover 填滿／contain 完整顯示（補黑邊）；overlay = 文字疊在圖上的漸層，關掉就放在圖片下方的實色底
const PORTRAIT_VIEW_KEY = wsKey('hunt-portrait-view')
const DEFAULT_PORTRAIT_VIEW = { fit: 'cover', overlay: true }

function readPortraitViews() {
  try {
    const stored = JSON.parse(localStorage.getItem(PORTRAIT_VIEW_KEY) || 'null') ?? {}
    return {
      hero: { ...DEFAULT_PORTRAIT_VIEW, ...stored.hero },
      boss: { ...DEFAULT_PORTRAIT_VIEW, ...stored.boss },
    }
  } catch {
    return { hero: DEFAULT_PORTRAIT_VIEW, boss: DEFAULT_PORTRAIT_VIEW }
  }
}

const PREVIEW_STATUS = {
  ready: { label: '可討伐', dot: 'bg-amber-400' },
  locked: { label: '未解鎖', dot: 'bg-slate-400' },
  defeated: { label: '已擊敗', dot: 'bg-emerald-400' },
  hunting: { label: '討伐中', dot: 'animate-pulse bg-red-500' },
}

function PortraitToggle({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-md backdrop-blur-sm transition-colors ${
        active ? 'bg-white text-black' : 'bg-black/50 text-white/85 hover:bg-black/75'
      }`}
      title={title}
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

// 立繪卡：圖片滿版；可切換完整顯示（黑邊不變形）與文字是否疊在圖上
function PortraitCard({ imageSrc, alt, fallback, imageStyle, dimmed = false, view, onViewChange, tag, action, className = '', children }) {
  const contain = view.fit === 'contain'
  const image = imageSrc ? (
    <img
      src={imageSrc}
      alt={alt}
      className={`absolute inset-0 h-full w-full transition-all duration-700 ease-out ${contain ? 'object-contain' : 'object-cover group-hover:scale-[1.04]'} ${dimmed ? 'grayscale' : ''}`}
      style={contain ? undefined : imageStyle}
      draggable={false}
    />
  ) : (
    <div className="absolute inset-0 flex items-center justify-center text-6xl font-black text-white/80">{fallback}</div>
  )

  return (
    <section className={`hunt-portrait group relative flex flex-col overflow-hidden rounded-2xl bg-black ${view.overlay ? 'aspect-[3/4] lg:aspect-auto' : ''} lg:min-h-[26rem] ${className}`}>
      <div className={`overflow-hidden bg-black ${view.overlay ? 'absolute inset-0' : 'relative aspect-[3/4] lg:aspect-auto lg:min-h-0 lg:flex-1'}`}>
        {image}
      </div>
      {view.overlay && <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/25 to-transparent" />}
      <span className="absolute left-3 top-3 rounded-md bg-white/90 px-2 py-1 text-[10px] font-black tracking-[0.2em] text-black">{tag}</span>
      <div className="absolute right-3 top-3 flex items-center gap-1">
        <div className="flex gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <PortraitToggle
            active={contain}
            onClick={() => onViewChange({ fit: contain ? 'cover' : 'contain' })}
            title={contain ? '目前：完整顯示（黑邊）・點一下改成填滿' : '目前：填滿・點一下完整顯示（黑邊不變形）'}
          >
            {contain ? <FitScreenOutlinedIcon sx={{ fontSize: 16 }} /> : <CropOutlinedIcon sx={{ fontSize: 16 }} />}
          </PortraitToggle>
          <PortraitToggle
            active={!view.overlay}
            onClick={() => onViewChange({ overlay: !view.overlay })}
            title={view.overlay ? '目前：文字疊在圖上・點一下改成不透明底' : '目前：不透明底・點一下改成疊在圖上'}
          >
            {view.overlay ? <LayersOutlinedIcon sx={{ fontSize: 16 }} /> : <LayersClearOutlinedIcon sx={{ fontSize: 16 }} />}
          </PortraitToggle>
        </div>
        {action}
      </div>
      <div className={`p-4 text-white ${view.overlay ? 'absolute inset-x-0 bottom-0' : 'relative shrink-0 bg-slate-950'}`}>
        {children}
      </div>
    </section>
  )
}

const formatClock = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

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
  preview = null, // 只是查看（沒在討伐這隻）：{ status: 'ready' | 'locked' | 'defeated' | 'hunting', unlockLevel, otherHuntName }
  onStartPreviewHunt,
  onBack,
}) {
  const [inputValue, setInputValue] = useState('')
  const [editingTaskId, setEditingTaskId] = useState(null)
  const [editDraft, setEditDraft] = useState('')
  const isComposingRef = useRef(false)
  const storageKey = pomodoroKey(target)
  const [pomodoro, setPomodoro] = useState(() => readPomodoro(storageKey))
  const [now, setNow] = useState(() => Date.now())
  const [minutesDraft, setMinutesDraft] = useState(() => String(readPomodoro(storageKey).minutes))
  const [portraitViews, setPortraitViews] = useState(readPortraitViews)

  const changePortraitView = (who, changes) => {
    setPortraitViews((prev) => {
      const next = { ...prev, [who]: { ...prev[who], ...changes } }
      try {
        localStorage.setItem(PORTRAIT_VIEW_KEY, JSON.stringify(next))
      } catch {
        // View preference is optional.
      }
      return next
    })
  }

  useEffect(() => {
    const next = readPomodoro(storageKey)
    setPomodoro(next)
    setMinutesDraft(String(next.minutes))
  }, [storageKey])

  const updatePomodoro = (changes) => {
    setPomodoro((prev) => {
      const next = { ...prev, ...changes }
      writePomodoro(storageKey, next)
      return next
    })
  }

  // 倒數：時間到就討伐成功（HP 歸零），播放音效並發出通知
  useEffect(() => {
    if (!pomodoro.endsAt) return undefined
    const tick = () => {
      const current = Date.now()
      setNow(current)
      if (current < pomodoro.endsAt) return
      updatePomodoro({ endsAt: null, remainingMs: 0, done: true })
      playQuestCompleteSound()
      try {
        if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
          new Notification('討伐成功！', { body: `番茄鐘時間到，${target?.name ?? '目標'} 已被擊敗。` })
        }
      } catch {
        // Notifications are optional.
      }
    }
    tick()
    const timer = window.setInterval(tick, 1000)
    return () => window.clearInterval(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pomodoro.endsAt])

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
  const isPomodoro = pomodoro.mode === 'pomodoro'
  const totalMs = pomodoro.minutes * 60 * 1000
  const remainingMs = pomodoro.done
    ? 0
    : pomodoro.endsAt ? Math.max(0, pomodoro.endsAt - now)
    : pomodoro.remainingMs ?? totalMs
  const pomodoroStatus = pomodoro.done ? 'done' : pomodoro.endsAt ? 'running' : pomodoro.remainingMs != null ? 'paused' : 'idle'
  const hpPercent = preview
    ? (preview.status === 'defeated' ? 0 : 100)
    : isPomodoro
      ? (totalMs > 0 ? (remainingMs / totalMs) * 100 : 100)
      : totalCount > 0 ? ((totalCount - completedCount) / totalCount) * 100 : 100
  const hpColor = hpPercent > 60 ? '#22c55e' : hpPercent > 30 ? '#f59e0b' : '#ef4444'

  const addTask = () => {
    const text = inputValue.trim()
    if (!text || isComposingRef.current || huntTasks.length >= 10) return
    onAddHuntTask(id, text)
    setInputValue('')
  }

  const startPomodoro = () => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
    const current = Date.now()
    setNow(current)
    updatePomodoro({ endsAt: current + remainingMs, remainingMs: null, done: false })
  }

  const pausePomodoro = () => updatePomodoro({ endsAt: null, remainingMs })
  const resetPomodoro = () => updatePomodoro({ endsAt: null, remainingMs: null, done: false })

  const changeMinutes = (value) => {
    const minutes = Math.min(MAX_POMODORO_MINUTES, Math.max(1, Math.floor(Number(value)) || 1))
    setMinutesDraft(String(minutes))
    updatePomodoro({ minutes, endsAt: null, remainingMs: null, done: false })
  }

  const finishHunt = () => {
    clearPomodoro(storageKey)
    if (onCompleteHunt) onCompleteHunt()
    else onStopHunt(id)
  }

  const retreat = () => {
    clearPomodoro(storageKey)
    onStopHunt(id)
  }

  const commitEdit = (taskId) => {
    const text = editDraft.trim()
    if (text) onUpdateHuntTask(id, taskId, text)
    setEditingTaskId(null)
    setEditDraft('')
  }

  const ringRadius = 92
  const ringLength = 2 * Math.PI * ringRadius
  const elapsedRatio = Math.min(1, Math.max(0, 1 - hpPercent / 100))
  const timerLocked = pomodoroStatus === 'running' || pomodoroStatus === 'paused'

  return (
    <div className="hunt-mission-page grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,15rem)]">
      {/* 主角：滿版立繪 */}
      <PortraitCard
        className="order-1"
        imageSrc={heroAvatar}
        alt={heroName}
        fallback={heroName[0]}
        imageStyle={{ objectPosition: `${heroImagePosition?.x ?? 50}% ${heroImagePosition?.y ?? 50}%` }}
        view={portraitViews.hero}
        onViewChange={(changes) => changePortraitView('hero', changes)}
        tag="主角"
      >
        <span className="inline-block rounded border border-white/60 px-1.5 py-0.5 font-mono text-[10px] font-black tracking-wider">LV {heroLevel}</span>
        <h1 className="m-0 mt-2 truncate text-xl font-black leading-tight sm:text-2xl">{heroName}</h1>
        <p className="m-0 mt-0.5 truncate text-xs font-medium text-white/70">{heroClassName || '初心者'}</p>
        <p className="m-0 mt-3 flex items-center gap-1.5 border-t border-white/20 pt-2.5 text-[11px] font-semibold text-white/80">
          <TaskAltOutlinedIcon sx={{ fontSize: 15 }} />
          {activeQuestCount} 個進行中任務
        </p>
      </PortraitCard>

      {/* 對手：滿版立繪 + HP */}
      <PortraitCard
        className="order-2 lg:order-3"
        imageSrc={displayAvatar}
        alt={name}
        fallback={name[0]}
        dimmed={hpPercent === 0}
        view={portraitViews.boss}
        onViewChange={(changes) => changePortraitView('boss', changes)}
        tag="對手"
        action={!preview && (
          <button
            type="button"
            onClick={retreat}
            className="rounded-md bg-black/50 px-2 py-1 text-[11px] font-bold text-white/85 backdrop-blur-sm transition-colors hover:bg-red-500 hover:text-white"
            title="放棄這次討伐"
          >
            撤退
          </button>
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded px-1.5 py-0.5 text-[10px] font-black text-white" style={{ background: accent }}>{typeLabel}</span>
          <span className="font-mono text-[10px] text-white/70">
            {isStageBoss && stageRange ? `LV${stageRange.min}–${stageRange.max}` : `推薦 LV${recommendedLevel ?? '?'}`}
          </span>
        </div>
        <h2 className="m-0 mt-2 truncate text-xl font-black leading-tight sm:text-2xl">{name}</h2>
        <div className="mt-3 border-t border-white/20 pt-2.5">
          <div className="mb-1.5 flex items-center justify-between text-[10px] font-black tracking-wider">
            <span className="flex items-center gap-1.5">
              <span className={`h-1.5 w-1.5 rounded-full ${(preview ? PREVIEW_STATUS[preview.status] : hpPercent === 0 ? PREVIEW_STATUS.defeated : PREVIEW_STATUS.hunting).dot}`} />
              {(preview ? PREVIEW_STATUS[preview.status] : hpPercent === 0 ? PREVIEW_STATUS.defeated : PREVIEW_STATUS.hunting).label}
            </span>
            <span className="font-mono text-white/80">HP {Math.round(hpPercent)}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${hpPercent}%`, background: hpColor }} />
          </div>
        </div>
      </PortraitCard>

      {/* 中央戰鬥區：番茄鐘或討伐待辦 */}
      <section className="hunt-task-panel order-3 col-span-2 flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 lg:order-2 lg:col-span-1">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 mb-2 flex w-fit items-center gap-1 rounded-full bg-transparent px-1.5 py-0.5 text-xs font-bold text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-800"
          >
            <ArrowBackRoundedIcon sx={{ fontSize: 15 }} />返回討伐列表
          </button>
        )}
        {preview ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
            <span className="rounded-full px-3 py-1 text-[11px] font-black tracking-wider text-white" style={{ background: accent }}>{typeLabel}</span>
            <h2 className="m-0 text-2xl font-black text-slate-950">{name}</h2>
            {preview.status === 'defeated' && (
              <p className="m-0 text-sm font-bold text-emerald-600">✓ 已討伐完成</p>
            )}
            {preview.status === 'locked' && (
              <p className="m-0 flex items-center gap-1.5 text-sm font-bold text-slate-500">
                <LockOutlinedIcon sx={{ fontSize: 17 }} />等級達到 LV{preview.unlockLevel} 才能討伐（目前 LV{heroLevel}）
              </p>
            )}
            {preview.status === 'hunting' && (
              <p className="m-0 text-sm font-bold text-red-500">這隻 Boss 也在討伐中</p>
            )}
            {preview.status === 'ready' && (
              <>
                <p className="m-0 text-sm text-slate-500">等級已達標，可以開始討伐</p>
                <button
                  type="button"
                  onClick={() => onStartPreviewHunt?.(id)}
                  className="flex items-center gap-1.5 rounded-full bg-black px-7 py-2.5 text-sm font-black text-white transition-transform hover:scale-[1.03] active:scale-[0.97]"
                >
                  ⚔ 開始討伐
                </button>
                {preview.otherHuntName && (
                  <p className="m-0 text-[11px] text-slate-400">目前正在討伐「{preview.otherHuntName}」</p>
                )}
              </>
            )}
          </div>
        ) : (
        <>
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 flex items-center gap-2 text-base font-black text-slate-950">
            {isPomodoro ? <TimerOutlinedIcon sx={{ fontSize: 20 }} /> : <TaskAltOutlinedIcon sx={{ fontSize: 20 }} />}
            {isPomodoro ? '番茄鐘討伐' : '討伐任務'}
            {!isPomodoro && <span className="font-mono text-xs font-bold text-slate-400">{huntTasks.length}/10</span>}
          </h2>
          <div className="relative flex rounded-full bg-slate-100 p-0.5">
            <span
              className="absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-black shadow transition-transform duration-300 ease-out"
              style={{ transform: isPomodoro ? 'translateX(100%)' : 'translateX(0)' }}
            />
            {[['tasks', '待辦'], ['pomodoro', '番茄鐘']].map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => updatePomodoro({ mode })}
                disabled={pomodoroStatus === 'running' && mode === 'tasks'}
                className={`relative z-[1] w-16 rounded-full bg-transparent py-1 text-xs font-black transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  pomodoro.mode === mode ? 'text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
                title={pomodoroStatus === 'running' && mode === 'tasks' ? '番茄鐘倒數中，請先暫停' : undefined}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {isPomodoro ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 pt-4">
            {/* 進度環：倒數越久環越滿，結束時變綠 */}
            <div className="relative h-[13rem] w-[13rem]">
              <svg viewBox="0 0 208 208" className="h-full w-full -rotate-90">
                <circle cx="104" cy="104" r={ringRadius} fill="none" stroke="#e2e8f0" strokeWidth="8" />
                <circle
                  cx="104"
                  cy="104"
                  r={ringRadius}
                  fill="none"
                  stroke={pomodoroStatus === 'done' ? '#10b981' : accent}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={ringLength}
                  strokeDashoffset={ringLength * (1 - elapsedRatio)}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.4s ease' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`font-mono text-5xl font-black tabular-nums tracking-tight ${pomodoroStatus === 'done' ? 'text-emerald-600' : 'text-slate-950'}`}>
                  {formatClock(remainingMs)}
                </span>
                <span className="mt-1 text-[11px] font-bold tracking-wider text-slate-400">
                  {pomodoroStatus === 'done' ? '討伐成功' : pomodoroStatus === 'running' ? '專注中' : pomodoroStatus === 'paused' ? '已暫停' : `${pomodoro.minutes} 分鐘`}
                </span>
              </div>
            </div>

            {pomodoroStatus === 'done' ? (
              <button type="button" onClick={finishHunt} className="w-full max-w-xs rounded-full bg-black py-3 text-sm font-black text-white transition-transform hover:scale-[1.02] active:scale-[0.98]">
                {isStageBoss && onCompleteHunt ? '討伐完成！確認晉升職業' : '討伐完成！結束討伐'}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                {pomodoroStatus === 'running' ? (
                  <button type="button" onClick={pausePomodoro} className="flex items-center gap-1.5 rounded-full border-2 border-black bg-white px-6 py-2 text-sm font-black text-black transition-transform hover:scale-[1.03] active:scale-[0.97]">
                    <PauseRoundedIcon sx={{ fontSize: 20 }} />暫停
                  </button>
                ) : (
                  <button type="button" onClick={startPomodoro} className="flex items-center gap-1.5 rounded-full bg-black px-6 py-2 text-sm font-black text-white transition-transform hover:scale-[1.03] active:scale-[0.97]">
                    <PlayArrowRoundedIcon sx={{ fontSize: 20 }} />{pomodoroStatus === 'paused' ? '繼續' : '開始討伐'}
                  </button>
                )}
                {pomodoroStatus !== 'idle' && (
                  <button type="button" onClick={resetPomodoro} className="flex items-center gap-1 rounded-full bg-transparent px-3 py-2 text-sm font-bold text-slate-400 hover:text-slate-800">
                    <ReplayRoundedIcon sx={{ fontSize: 18 }} />重來
                  </button>
                )}
              </div>
            )}

            {/* 時間設定：倒數中鎖住 */}
            <div className={`flex flex-wrap items-center justify-center gap-1.5 transition-opacity ${timerLocked ? 'opacity-40' : ''}`}>
              {POMODORO_PRESETS.map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  disabled={timerLocked}
                  onClick={() => changeMinutes(minutes)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-black transition-colors disabled:cursor-not-allowed ${
                    pomodoro.minutes === minutes ? 'bg-black text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {minutes}分
                </button>
              ))}
              <label className="flex items-center gap-1 rounded-full bg-slate-100 py-0.5 pl-2.5 pr-1 text-[11px] font-bold text-slate-500">
                自訂
                <input
                  type="number"
                  min="1"
                  max={MAX_POMODORO_MINUTES}
                  value={minutesDraft}
                  disabled={timerLocked}
                  onChange={(event) => setMinutesDraft(event.target.value)}
                  onBlur={() => changeMinutes(minutesDraft)}
                  onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }}
                  className="w-11 rounded-full border-0 bg-white px-1.5 py-0.5 text-center font-mono text-xs font-black text-black outline-none focus:ring-1 focus:ring-black disabled:cursor-not-allowed"
                />
                分
              </label>
            </div>
            <p className="m-0 text-center text-[11px] leading-relaxed text-slate-400">倒數時 Boss 的 HP 跟著減少；切換分頁或重新整理也會繼續計時</p>
          </div>
        ) : (
        <>
        <div className="mt-4 flex min-h-0 flex-1 flex-col">
        {huntTasks.length < 10 && (
          <div className="relative mb-3">
            <AddIcon className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-800" fontSize="small" />
            <input
              type="text"
              className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-20 text-sm text-black outline-none transition-colors focus:border-black"
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
          <div className="flex flex-1 flex-col items-center justify-center py-8 text-center text-slate-300">
            <p className="m-0 text-sm font-semibold">尚無討伐任務</p>
            <p className="m-0 mt-1 text-xs">新增最多 10 個任務，完成任務削減目標 HP！</p>
          </div>
        ) : (
          <div className="-mr-1 flex max-h-[22rem] flex-col gap-1.5 overflow-y-auto pr-1">
            {huntTasks.map((task) => (
              <div key={task.id} className={`hunt-task-row group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2.5 transition-colors hover:border-slate-400 ${task.completed ? 'opacity-60' : ''}`}>
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
          <button type="button" onClick={finishHunt} className="mt-4 w-full rounded-full bg-black py-3 text-sm font-black text-white transition-transform hover:scale-[1.01] active:scale-[0.99]">
            討伐完成！確認晉升職業
          </button>
        )}
        </div>
        </>
        )}
        </>
        )}
      </section>
    </div>
  )
}

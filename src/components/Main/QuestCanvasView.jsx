import { useEffect, useRef, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import CloseIcon from '@mui/icons-material/Close'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined'
import OpenInFullOutlinedIcon from '@mui/icons-material/OpenInFullOutlined'
import CenterFocusStrongOutlinedIcon from '@mui/icons-material/CenterFocusStrongOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import StickyNote2OutlinedIcon from '@mui/icons-material/StickyNote2Outlined'
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined'
import SportsMartialArtsIcon from '@mui/icons-material/SportsMartialArts'
import ContentCopyOutlinedIcon from '@mui/icons-material/ContentCopyOutlined'
import EventOutlinedIcon from '@mui/icons-material/EventOutlined'
import ContentCutOutlinedIcon from '@mui/icons-material/ContentCutOutlined'
import BookmarkAddOutlinedIcon from '@mui/icons-material/BookmarkAddOutlined'
import BookmarksOutlinedIcon from '@mui/icons-material/BookmarksOutlined'
import SearchIcon from '@mui/icons-material/Search'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ApprovalOutlinedIcon from '@mui/icons-material/ApprovalOutlined'
import StoredImage from '../common/StoredImage'
import useCanvasNotes, { NOTE_COLORS, NOTE_STAMPS } from '../../hooks/useCanvasNotes'
import { wsKey } from '../../utils/workspace'

const CARD_WIDTH = 260
const NOTE_WIDTH = 240
const HUNT_WIDTH = 280
const HUNT_POSITION_KEY = wsKey('brave-todo:canvas-hunt-position')
const GAP = 24
const COLUMNS = 3
const MIN_ZOOM = 0.3
const MAX_ZOOM = 2
const VIEWPORT_KEY = wsKey('brave-todo:canvas-viewport')
const DRAG_THRESHOLD = 4
const INTERACTIVE_SELECTOR = 'input, textarea, button, a, select, label'
const MIN_CARD_WIDTH = 180
const MAX_CARD_WIDTH = 900
const MIN_CARD_HEIGHT = 80

const QUEST_EXP_OPTIONS = [
  [1, '一般 +1'],
  [3, '中等 +3'],
  [5, '上等 +5'],
  [10, '特級 +10'],
  [20, '特殊 +20'],
]

const DAY_MS = 24 * 60 * 60 * 1000
const DUPLICATE_OFFSET = 30

const pad2 = (n) => String(n).padStart(2, '0')
const formatTime = (date) => `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
const formatSchedule = (date) => `${date.getMonth() + 1}/${date.getDate()} ${formatTime(date)}`

// 排程狀態 tag：依排程時間與現在時間決定文字和顏色
function getScheduleStatus(scheduledAt, completed, now) {
  const date = new Date(scheduledAt)
  if (Number.isNaN(date.getTime())) return null
  if (completed) return { label: '已完成', className: 'bg-emerald-500 text-white' }
  if (date.getTime() < now) return { label: '已逾期', className: 'bg-red-500 text-white' }
  const startOfToday = new Date(now)
  startOfToday.setHours(0, 0, 0, 0)
  const days = Math.floor((date.getTime() - startOfToday.getTime()) / DAY_MS)
  if (days === 0) return { label: `今天 ${formatTime(date)}`, className: 'bg-amber-400 text-amber-950' }
  if (days === 1) return { label: `明天 ${formatTime(date)}`, className: 'bg-sky-500 text-white' }
  return { label: `${days} 天後`, className: 'bg-purple-500 text-white' }
}

const isTypingTarget = (el) => el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

const viewportKey = (board) => (board ? `${VIEWPORT_KEY}:${board}` : VIEWPORT_KEY)

function readViewport(board) {
  try {
    const stored = JSON.parse(localStorage.getItem(viewportKey(board)) || 'null')
    if (Number.isFinite(stored?.x) && Number.isFinite(stored?.y) && Number.isFinite(stored?.zoom)) return stored
  } catch {
    // Start from the default viewport if the saved value is malformed.
  }
  return { x: 0, y: 0, zoom: 1 }
}

const clampZoom = (zoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

// Saved size lives on the position object; height is a minimum so content is never cut off
const cardSizeStyle = (position, defaultWidth, collapsed = false) => ({
  width: position.w ?? defaultWidth,
  ...(position.h && !collapsed ? { minHeight: position.h } : {}),
})

// 收合／展開按鈕：常駐顯示，收合時箭頭朝右
function CollapseToggle({ collapsed, onToggle, className = '' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded bg-transparent text-slate-400 hover:bg-black/5 hover:text-slate-800 ${className}`}
      title={collapsed ? '展開' : '收合'}
      aria-label={collapsed ? '展開卡片' : '收合卡片'}
      aria-expanded={!collapsed}
    >
      <ExpandMoreIcon sx={{ fontSize: 18 }} className={`transition-transform ${collapsed ? '-rotate-90' : ''}`} />
    </button>
  )
}

function ResizeHandle({ onResizeStart }) {
  return (
    <div
      onPointerDown={onResizeStart}
      onDoubleClick={(e) => e.stopPropagation()}
      className="absolute bottom-0 right-0 z-10 flex h-5 w-5 cursor-nwse-resize items-end justify-end p-1 opacity-0 transition-opacity group-hover/resize:opacity-100"
      title="拖曳調整大小"
    >
      <span className="block h-2.5 w-2.5 border-b-2 border-r-2 border-slate-400" />
    </div>
  )
}

// 沒有存過位置的卡片，依序排成三欄，高度用項目數粗估
function buildDefaultPositions(quests) {
  const columnHeights = Array(COLUMNS).fill(GAP)
  const positions = {}
  quests.forEach((quest) => {
    if (quest.canvasPosition) return
    const col = columnHeights.indexOf(Math.min(...columnHeights))
    positions[quest.id] = { x: GAP + col * (CARD_WIDTH + GAP), y: columnHeights[col] }
    const subTasks = quest.subTasks ?? []
    const imageCount = subTasks.filter((sub) => sub.imageId).length
    columnHeights[col] += 150 + (subTasks.length - imageCount) * 30 + imageCount * 220 + (quest.cover ? 160 : 0) + GAP
  })
  return positions
}

function CanvasCard({ quest, position, now, lockedExpLevels = {}, zIndex, selected, dragging, onDragStart, onResizeStart, onDelete, onDuplicate, onCut, onSaveTemplate, onToggleCollapsed, onSetSchedule, onOpenDetails, onUpdateQuest, onSetExp, onSetSubTaskExp, onToggleSubTask, onRemoveSubTask, onAddSubTask, onAddSubTaskImage }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const fileInputRef = useRef(null)
  const scheduleInputRef = useRef(null)
  const subTasks = quest.subTasks ?? []
  const scheduleStatus = quest.scheduledAt ? getScheduleStatus(quest.scheduledAt, quest.completed, now) : null

  const openSchedulePicker = () => {
    const input = scheduleInputRef.current
    if (!input) return
    try {
      input.showPicker()
    } catch {
      input.focus()
    }
  }
  const doneCount = subTasks.filter((sub) => sub.completed).length
  const earnedItemExp = subTasks.reduce((sum, sub) => sum + (sub.completed ? sub.awardedExp ?? 0 : 0), 0)
  const [subTaskExpDraft, setSubTaskExpDraft] = useState(String(quest.subTaskExp ?? 1))

  useEffect(() => {
    setSubTaskExpDraft(String(quest.subTaskExp ?? 1))
  }, [quest.subTaskExp])

  const submitDraft = () => {
    const text = draft.trim()
    if (text) onAddSubTask(quest.id, text)
    setDraft('')
  }

  return (
    <div
      data-canvas-card
      className={`group/card group/resize absolute flex touch-none select-none flex-col overflow-hidden rounded-lg border bg-white transition-shadow ${
        dragging ? 'cursor-grabbing shadow-[0_12px_32px_rgba(15,23,42,0.18)]' : 'cursor-grab shadow-[0_2px_10px_rgba(15,23,42,0.08)]'
      } ${selected ? 'border-purple-400 ring-2 ring-purple-300' : 'border-slate-200'}`}
      style={{ ...cardSizeStyle(position, CARD_WIDTH, quest.collapsed), left: position.x, top: position.y, zIndex }}
      onPointerDown={onDragStart}
    >
      {scheduleStatus && (
        <span
          className={`absolute right-3 top-0 z-10 rounded-b-md px-2 py-0.5 text-[11px] font-bold shadow-sm ${scheduleStatus.className}`}
          title={`排程：${formatSchedule(new Date(quest.scheduledAt))}`}
        >
          {scheduleStatus.label}
        </span>
      )}
      {quest.cover && !quest.collapsed && (
        <img src={quest.cover} alt="" className="block max-h-56 w-full bg-slate-900 object-contain" draggable={false} />
      )}
      <div className={`flex items-start gap-1 pb-2 pl-2 pr-4 ${scheduleStatus && (!quest.cover || quest.collapsed) ? 'pt-6' : 'pt-3'}`}>
        <CollapseToggle collapsed={quest.collapsed} onToggle={onToggleCollapsed} />
        {editingTitle ? (
          <input
            autoFocus
            defaultValue={quest.text}
            onBlur={(e) => {
              const text = e.target.value.trim()
              if (text && text !== quest.text) onUpdateQuest(quest.id, text)
              setEditingTitle(false)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') e.currentTarget.blur()
              if (e.key === 'Escape') setEditingTitle(false)
            }}
            className="min-w-0 flex-1 select-text rounded border border-purple-300 px-1.5 py-0.5 text-[15px] font-bold outline-none"
          />
        ) : (
          <p
            onDoubleClick={() => setEditingTitle(true)}
            className={`m-0 min-w-0 flex-1 break-words text-[15px] font-bold leading-snug ${quest.completed ? 'text-slate-400 line-through' : 'text-slate-900'}`}
            title="雙擊編輯標題"
          >
            {quest.text}
          </p>
        )}
        <button
          type="button"
          onClick={() => onOpenDetails(quest.id)}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-transparent text-slate-300 opacity-0 transition-opacity hover:text-slate-700 group-hover/card:opacity-100"
          title="開啟任務詳情"
          aria-label="開啟任務詳情"
        >
          <OpenInFullOutlinedIcon sx={{ fontSize: 15 }} />
        </button>
        <button
          type="button"
          onClick={onSaveTemplate}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-transparent text-slate-300 opacity-0 transition-opacity hover:text-purple-600 group-hover/card:opacity-100"
          title="加入常用待辦（之後可從左側「常用」選取）"
          aria-label="加入常用待辦"
        >
          <BookmarkAddOutlinedIcon sx={{ fontSize: 15 }} />
        </button>
        <button
          type="button"
          onClick={onCut}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-transparent text-slate-300 opacity-0 transition-opacity hover:text-slate-700 group-hover/card:opacity-100"
          title="剪下卡片，到另一個畫布按 Ctrl+V 貼上（選取後也可按 Ctrl+X）"
          aria-label="剪下卡片"
        >
          <ContentCutOutlinedIcon sx={{ fontSize: 14 }} />
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-transparent text-slate-300 opacity-0 transition-opacity hover:text-slate-700 group-hover/card:opacity-100"
          title="複製卡片（選取後也可按 Ctrl+D）"
          aria-label="複製卡片"
        >
          <ContentCopyOutlinedIcon sx={{ fontSize: 14 }} />
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-transparent text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover/card:opacity-100"
          title="刪除卡片（選取後也可按 Delete）"
          aria-label="刪除卡片"
        >
          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
        </button>
      </div>

      {quest.collapsed ? (
        <div className="flex items-center gap-2 px-4 pb-2.5 pl-10 text-xs text-slate-400">
          <span>{doneCount} / {subTasks.length} 完成</span>
          {quest.scheduledAt && <span>・{formatSchedule(new Date(quest.scheduledAt))}</span>}
        </div>
      ) : (
      <>
      <div className="flex flex-col gap-1 px-4">
        {subTasks.map((sub) => (
          <div key={sub.id} className={`group/item flex gap-2.5 ${sub.imageId ? 'flex-col py-1' : 'items-center py-0.5'}`}>
            <div className="flex min-w-0 items-center gap-2.5">
              <input
                type="checkbox"
                checked={sub.completed}
                onChange={() => onToggleSubTask(quest.id, sub.id)}
                className="h-4 w-4 shrink-0 cursor-pointer accent-emerald-600"
              />
              {!sub.imageId && (
                <span className={`min-w-0 flex-1 break-words text-sm ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{sub.text}</span>
              )}
              <button
                type="button"
                onClick={() => onRemoveSubTask(quest.id, sub.id)}
                className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded bg-transparent text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover/item:opacity-100"
                aria-label="刪除項目"
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </button>
            </div>
            {sub.imageId && (
              <StoredImage
                imageId={sub.imageId}
                className={`block w-full rounded-md bg-slate-900 object-contain ${sub.completed ? 'opacity-50' : ''}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-0.5 px-4 pb-2 pt-1.5">
        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitDraft()
              }
              if (e.key === 'Escape') {
                setDraft('')
                setAdding(false)
              }
            }}
            onBlur={() => {
              submitDraft()
              setAdding(false)
            }}
            placeholder="輸入項目，Enter 新增"
            className="w-full select-text rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-purple-400"
          />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1.5 bg-transparent py-1 text-left text-sm text-slate-400 hover:text-slate-700">
            <AddIcon sx={{ fontSize: 16 }} />新增項目
          </button>
        )}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 bg-transparent py-1 text-left text-sm text-slate-400 hover:text-slate-700"
          title="也可以把滑鼠移到卡片上直接 Ctrl+V 貼上圖片"
        >
          <ImageOutlinedIcon sx={{ fontSize: 16 }} />圖片待辦
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) onAddSubTaskImage(quest.id, file)
          }}
        />
      </div>

      <div className="mt-auto flex flex-col gap-1.5 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{doneCount} / {subTasks.length} 完成</span>
          {quest.completed ? (
            <span className="font-semibold text-emerald-600">✓ 已獲得完成獎勵</span>
          ) : earnedItemExp > 0 && (
            <span className="font-semibold text-purple-600">已獲得 {earnedItemExp} EXP</span>
          )}
          <div className="relative ml-auto flex items-center gap-0.5">
            <button
              type="button"
              onClick={openSchedulePicker}
              className={`flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-semibold transition-colors ${
                quest.scheduledAt ? 'border-purple-200 bg-purple-50 text-purple-700 hover:border-purple-400' : 'border-slate-200 bg-white text-slate-500 hover:border-purple-400 hover:text-slate-800'
              }`}
              title={quest.scheduledAt ? '修改排程時間' : '設定排程時間'}
            >
              <EventOutlinedIcon sx={{ fontSize: 14 }} />
              {quest.scheduledAt ? formatSchedule(new Date(quest.scheduledAt)) : '排程'}
            </button>
            {quest.scheduledAt && (
              <button
                type="button"
                onClick={() => onSetSchedule?.(quest.id, null)}
                className="flex h-5 w-5 items-center justify-center rounded bg-transparent text-slate-300 hover:text-red-500"
                title="清除排程"
                aria-label="清除排程"
              >
                <CloseIcon sx={{ fontSize: 13 }} />
              </button>
            )}
            <input
              ref={scheduleInputRef}
              type="datetime-local"
              value={quest.scheduledAt ?? ''}
              onChange={(e) => onSetSchedule?.(quest.id, e.target.value || null)}
              className="pointer-events-none absolute bottom-0 left-0 h-px w-px opacity-0"
              tabIndex={-1}
              aria-hidden="true"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <label className="flex items-center gap-1">
            每項
            <input
              type="text"
              inputMode="numeric"
              value={subTaskExpDraft}
              onChange={(e) => {
                const value = e.target.value
                if (!/^\d*$/.test(value)) return
                setSubTaskExpDraft(value)
                if (value !== '') onSetSubTaskExp?.(quest.id, value)
              }}
              onBlur={() => {
                if (subTaskExpDraft !== '') return
                setSubTaskExpDraft('0')
                onSetSubTaskExp?.(quest.id, '0')
              }}
              className="w-9 select-text rounded border border-slate-200 px-1 py-0.5 text-center text-xs font-semibold text-slate-800 outline-none focus:border-purple-400"
              title="每勾一項獲得的經驗（0 = 不給）"
            />
            EXP
          </label>
          <label className="flex items-center gap-1">
            全完成
            <select
              value={quest.expValue ?? 1}
              onChange={(e) => onSetExp?.(quest.id, Number(e.target.value))}
              className="rounded border border-slate-200 bg-white px-1 py-0.5 text-xs font-semibold text-slate-800 outline-none focus:border-purple-400"
              title="全部項目完成時的任務獎勵"
            >
              {QUEST_EXP_OPTIONS.map(([value, label]) => (
                <option key={value} value={value} disabled={Boolean(lockedExpLevels[value])}>
                  {lockedExpLevels[value] ? `🔒 ${label}（LV${lockedExpLevels[value]}）` : label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      </>
      )}
      <ResizeHandle onResizeStart={onResizeStart} />
    </div>
  )
}

function readHuntPosition() {
  try {
    const stored = JSON.parse(localStorage.getItem(HUNT_POSITION_KEY) || 'null')
    if (Number.isFinite(stored?.x) && Number.isFinite(stored?.y)) return stored
  } catch {
    // Fall back to the default spot if the saved value is malformed.
  }
  return { x: GAP + COLUMNS * (CARD_WIDTH + GAP), y: GAP }
}

// 目前討伐中的怪物／Boss 與討伐待辦；勾選與新增都沿用討伐頁的處理
function HuntCanvasCard({ target, handlers, position, zIndex, selected, dragging, onDragStart, onResizeStart, onOpenHunt }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const tasks = target.huntTasks ?? []
  const doneCount = tasks.filter((task) => task.completed).length
  const progress = tasks.length > 0 ? Math.round((doneCount / tasks.length) * 100) : 0

  const submitDraft = () => {
    const text = draft.trim()
    if (text) handlers.onAddHuntTask?.(target.id, text)
    setDraft('')
  }

  return (
    <div
      data-canvas-card
      className={`group/hunt group/resize absolute flex touch-none select-none flex-col overflow-hidden rounded-lg border-2 bg-white transition-shadow ${
        dragging ? 'cursor-grabbing shadow-[0_12px_32px_rgba(15,23,42,0.22)]' : 'cursor-grab shadow-[0_2px_12px_rgba(239,68,68,0.18)]'
      } ${selected ? 'border-red-500 ring-2 ring-red-300' : 'border-red-400'}`}
      style={{ ...cardSizeStyle(position, HUNT_WIDTH), left: position.x, top: position.y, zIndex }}
      onPointerDown={onDragStart}
    >
      <div className="relative bg-slate-900">
        {target.avatarSrc ? (
          <img src={target.avatarSrc} alt={target.name} className="block max-h-64 w-full object-contain" draggable={false} />
        ) : (
          <div className="flex h-32 items-center justify-center text-slate-500">
            <SportsMartialArtsIcon sx={{ fontSize: 48 }} />
          </div>
        )}
        <span className="absolute left-2 top-2 flex items-center gap-1 rounded-full bg-red-500 px-2 py-0.5 text-[11px] font-bold text-white shadow">
          <SportsMartialArtsIcon sx={{ fontSize: 13 }} />
          {target._type === 'stageBoss' ? '階段 Boss 討伐中' : '討伐中'}
        </span>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-4 pb-2.5 pt-8">
          <p className="m-0 break-words text-[15px] font-bold leading-snug text-white">{target.name}</p>
          {target.recommendedLevel != null && (
            <p className="m-0 mt-0.5 text-[11px] font-semibold text-white/70">推薦等級 LV{target.recommendedLevel}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-1 px-4 pt-3">
        {tasks.length === 0 && <p className="m-0 py-1 text-sm text-slate-400">還沒有討伐待辦</p>}
        {tasks.map((task) => (
          <div key={task.id} className="group/item flex items-center gap-2.5 py-0.5">
            <input
              type="checkbox"
              checked={Boolean(task.completed)}
              onChange={() => handlers.onToggleHuntTask?.(target.id, task.id)}
              className="h-4 w-4 shrink-0 cursor-pointer accent-red-500"
            />
            <span className={`min-w-0 flex-1 break-words text-sm ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.text}</span>
            <button
              type="button"
              onClick={() => handlers.onRemoveHuntTask?.(target.id, task.id)}
              className="ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded bg-transparent text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover/item:opacity-100"
              aria-label="刪除討伐待辦"
            >
              <CloseIcon sx={{ fontSize: 14 }} />
            </button>
          </div>
        ))}
      </div>

      <div className="px-4 pb-2 pt-1.5">
        {adding ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                submitDraft()
              }
              if (e.key === 'Escape') {
                setDraft('')
                setAdding(false)
              }
            }}
            onBlur={() => {
              submitDraft()
              setAdding(false)
            }}
            placeholder="輸入討伐待辦，Enter 新增"
            className="w-full select-text rounded border border-slate-200 px-2 py-1 text-sm outline-none focus:border-red-400"
          />
        ) : (
          <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1.5 bg-transparent py-1 text-left text-sm text-slate-400 hover:text-slate-700">
            <AddIcon sx={{ fontSize: 16 }} />新增討伐待辦
          </button>
        )}
      </div>

      <div className="flex flex-col gap-1.5 border-t border-slate-100 px-4 py-2.5">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{doneCount} / {tasks.length} 擊破</span>
          <span className="font-semibold text-red-500">{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden bg-red-100">
          <div className="h-full bg-red-500 transition-[width]" style={{ width: `${progress}%` }} />
        </div>
        <button
          type="button"
          onClick={onOpenHunt}
          className="mt-1 rounded-full bg-red-500 py-1.5 text-xs font-bold text-white transition-colors hover:bg-red-600"
        >
          前往討伐頁
        </button>
      </div>
      <ResizeHandle onResizeStart={onResizeStart} />
    </div>
  )
}

// 便利貼筆記：雙擊編輯，可放圖片（滑鼠移到筆記上 Ctrl+V 也能貼上）
function NoteCard({ note, position, zIndex, selected, dragging, editing, onStartEdit, onStopEdit, onDragStart, onResizeStart, onDelete, onSaveTemplate, onToggleCollapsed, onUpdate, onAddImage, onRemoveImage }) {
  const fileInputRef = useRef(null)
  const [showColors, setShowColors] = useState(false)
  const [showStamps, setShowStamps] = useState(false)
  const [titleDraft, setTitleDraft] = useState(note.title)
  const [textDraft, setTextDraft] = useState(note.text)

  useEffect(() => {
    if (editing) return
    setTitleDraft(note.title)
    setTextDraft(note.text)
  }, [editing, note.title, note.text])

  useEffect(() => {
    if (selected) return
    setShowColors(false)
    setShowStamps(false)
  }, [selected])

  const commit = () => {
    if (titleDraft !== note.title || textDraft !== note.text) onUpdate(note.id, { title: titleDraft.trim(), text: textDraft })
    onStopEdit()
  }

  const background = NOTE_COLORS[note.color]?.[0] ?? NOTE_COLORS.yellow[0]
  const isEmpty = !note.title && !note.text && note.imageIds.length === 0
  const stamp = note.stamp ? NOTE_STAMPS[note.stamp] : null

  return (
    <div
      data-canvas-card
      className={`group/note group/resize absolute flex touch-none select-none flex-col rounded-sm ${
        dragging ? 'cursor-grabbing' : editing ? 'cursor-default' : 'cursor-grab'
      } ${selected ? 'outline outline-2 outline-offset-2 outline-purple-400' : ''}`}
      style={{
        ...cardSizeStyle(position, NOTE_WIDTH, note.collapsed && !editing),
        left: position.x,
        top: position.y,
        zIndex,
        filter: dragging ? 'drop-shadow(0 12px 20px rgba(15,23,42,0.22))' : 'drop-shadow(0 2px 6px rgba(15,23,42,0.12))',
      }}
      onPointerDown={onDragStart}
      onDoubleClick={(e) => {
        if (!editing && !e.target.closest(INTERACTIVE_SELECTOR)) onStartEdit()
      }}
      onBlur={(e) => {
        if (editing && !e.currentTarget.contains(e.relatedTarget)) commit()
      }}
    >
      <div
        className="relative flex-1 text-[#2b2b2b] transition-opacity"
        style={{ opacity: stamp ? 0.45 : 1, background, clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)' }}
      >
        {note.imageIds.length > 0 && !(note.collapsed && !editing) && (
          <div className="flex flex-col">
            {note.imageIds.map((imageId) => (
              <div key={imageId} className="group/img relative">
                <StoredImage imageId={imageId} className="block w-full bg-slate-900 object-contain" />
                <button
                  type="button"
                  onClick={() => onRemoveImage(note.id, imageId)}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-red-500 group-hover/img:opacity-100"
                  title="移除圖片"
                  aria-label="移除圖片"
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </button>
              </div>
            ))}
          </div>
        )}

        {editing ? (
          <div className="flex flex-col px-4 pb-6 pt-3">
            <input
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') commit()
              }}
              placeholder="標題"
              className="w-full select-text border-0 bg-transparent p-0 text-[15px] font-bold text-inherit outline-none placeholder:text-black/35"
            />
            <textarea
              autoFocus
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') commit()
              }}
              rows={Math.max(3, textDraft.split('\n').length)}
              placeholder="寫點什麼…"
              className="mt-1.5 w-full resize-none select-text border-0 bg-transparent p-0 text-sm leading-6 text-inherit outline-none placeholder:text-black/35"
            />
          </div>
        ) : note.collapsed ? (
          <div className="flex items-center gap-1 pb-5 pl-1.5 pr-4 pt-2" title="已收合，雙擊編輯筆記">
            <CollapseToggle collapsed onToggle={onToggleCollapsed} className="text-black/45 hover:text-black" />
            <p className="m-0 min-w-0 flex-1 truncate text-[15px] font-bold leading-snug">
              {note.title || note.text.split('\n')[0] || '筆記'}
            </p>
            {note.imageIds.length > 0 && <span className="shrink-0 text-[11px] text-black/45">{note.imageIds.length} 張圖</span>}
          </div>
        ) : (
          <div className="px-4 pb-6 pt-3" title="雙擊編輯筆記">
            {note.title && <p className="m-0 break-words text-[15px] font-bold leading-snug">{note.title}</p>}
            {note.text ? (
              <p className={`m-0 whitespace-pre-wrap break-words text-sm leading-6 ${note.title ? 'mt-1.5' : ''}`}>{note.text}</p>
            ) : isEmpty && (
              <p className="m-0 text-sm text-black/40">雙擊編輯筆記</p>
            )}
          </div>
        )}

        {/* 摺角 */}
        <span
          className="pointer-events-none absolute bottom-0 right-0 h-[18px] w-[18px]"
          style={{ background: `linear-gradient(to top left, transparent 50%, color-mix(in srgb, ${background} 72%, #000) 50%)` }}
        />
      </div>

      {stamp && (
        <div className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center overflow-hidden">
          <span
            className={`-rotate-12 whitespace-nowrap rounded-lg border-double bg-white/40 font-black tracking-[0.2em] ${note.collapsed && !editing ? 'border-[3px] px-2 text-base' : 'border-[5px] px-4 py-1 text-[34px]'}`}
            style={{ color: stamp.color, borderColor: stamp.color, textShadow: '0 0 1px rgba(255,255,255,0.6)' }}
          >
            {stamp.label}
          </span>
        </div>
      )}

        <div className={`absolute right-1.5 top-1.5 z-[2] flex gap-0.5 rounded-md bg-white/75 p-0.5 transition-opacity ${selected || showColors || showStamps ? 'opacity-100' : 'opacity-0 group-hover/note:opacity-100'}`}>
          {!note.collapsed && (
            <button
              type="button"
              onClick={onToggleCollapsed}
              className="flex h-6 w-6 items-center justify-center rounded bg-transparent text-slate-500 hover:text-slate-900"
              title="收合"
              aria-label="收合筆記"
            >
              <ExpandMoreIcon sx={{ fontSize: 17 }} />
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setShowColors(false)
              setShowStamps((prev) => !prev)
            }}
            className={`flex h-6 w-6 items-center justify-center rounded bg-transparent hover:text-red-600 ${stamp ? 'text-red-600' : 'text-slate-500'}`}
            title="印章"
            aria-label="印章"
          >
            <ApprovalOutlinedIcon sx={{ fontSize: 15 }} />
          </button>
          <button
            type="button"
            onClick={() => {
              setShowStamps(false)
              setShowColors((prev) => !prev)
            }}
            className="flex h-6 w-6 items-center justify-center rounded bg-transparent text-slate-500 hover:text-slate-900"
            title="顏色"
            aria-label="筆記顏色"
          >
            <PaletteOutlinedIcon sx={{ fontSize: 15 }} />
          </button>
          <button
            type="button"
            onClick={onSaveTemplate}
            className="flex h-6 w-6 items-center justify-center rounded bg-transparent text-slate-500 hover:text-purple-700"
            title="加入常用筆記（之後可從左側「常用」選取）"
            aria-label="加入常用筆記"
          >
            <BookmarkAddOutlinedIcon sx={{ fontSize: 15 }} />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-6 w-6 items-center justify-center rounded bg-transparent text-slate-500 hover:text-slate-900"
            title="加入圖片（也可以把滑鼠移到筆記上 Ctrl+V 貼上）"
            aria-label="加入圖片"
          >
            <ImageOutlinedIcon sx={{ fontSize: 15 }} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="flex h-6 w-6 items-center justify-center rounded bg-transparent text-slate-500 hover:text-red-500"
            title="刪除筆記（選取後也可按 Delete）"
            aria-label="刪除筆記"
          >
            <DeleteOutlineIcon sx={{ fontSize: 15 }} />
          </button>
        </div>

      {showStamps && (
        <div className="absolute right-0 top-9 z-10 flex w-[150px] flex-col gap-0.5 rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg">
          <p className="m-0 px-1.5 pb-0.5 text-[11px] font-bold text-slate-400">印章</p>
          {Object.entries(NOTE_STAMPS).map(([key, item]) => {
            const active = note.stamp === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onUpdate(note.id, { stamp: active ? null : key })
                  setShowStamps(false)
                }}
                className={`flex items-center gap-2 rounded-md px-1.5 py-1.5 text-left text-sm font-bold hover:bg-slate-50 ${active ? 'bg-red-50' : 'bg-transparent'}`}
                style={{ color: item.color }}
              >
                <span className="flex h-4 w-4 items-center justify-center rounded border" style={{ borderColor: item.color, background: active ? item.color : 'transparent' }}>
                  {active && <span className="text-[10px] leading-none text-white">✓</span>}
                </span>
                {item.label}
              </button>
            )
          })}
        </div>
      )}

      {showColors && (
        <div className="absolute right-0 top-9 z-10 flex w-[150px] flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          {Object.entries(NOTE_COLORS).map(([key, [hex, label]]) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                onUpdate(note.id, { color: key })
                setShowColors(false)
              }}
              className={`h-6 w-6 rounded-full border-2 ${note.color === key ? 'border-purple-500' : 'border-slate-200'}`}
              style={{ background: hex }}
              title={label}
              aria-label={`${label}色`}
            />
          ))}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? [])
          e.target.value = ''
          files.forEach((file) => onAddImage(note.id, file))
        }}
      />
      <ResizeHandle onResizeStart={onResizeStart} />
    </div>
  )
}

// 常用待辦／筆記清單：可搜尋，點一下就新增到畫布
function FavoritesPanel({ query, onQueryChange, questTemplates, noteTemplates, onPick, onRemoveQuestTemplate, onRemoveNoteTemplate }) {
  const keyword = query.trim().toLowerCase()
  const matches = (...fields) => !keyword || fields.some((field) => field?.toLowerCase().includes(keyword))
  const quests = questTemplates.filter((template) => matches(template.name, template.text, ...(template.subTasks ?? []).map((sub) => sub.text)))
  const notes = noteTemplates.filter((template) => matches(template.title, template.text))

  const row = (kind, template, title, subtitle, swatch, onRemove) => (
    <div key={`${kind}:${template.id}`} className="group/fav flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
      <button type="button" onClick={() => onPick(kind, template)} className="flex min-w-0 flex-1 items-center gap-2 bg-transparent p-0 text-left">
        {swatch}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-slate-800">{title}</span>
          {subtitle && <span className="block truncate text-[11px] text-slate-400">{subtitle}</span>}
        </span>
      </button>
      <button
        type="button"
        onClick={() => onRemove(template.id)}
        className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-transparent text-slate-300 opacity-0 hover:text-red-500 group-hover/fav:opacity-100"
        title="從常用移除"
        aria-label="從常用移除"
      >
        <CloseIcon sx={{ fontSize: 14 }} />
      </button>
    </div>
  )

  return (
    <div data-canvas-ui className="absolute left-[84px] top-3 z-[1100] flex max-h-[calc(100%-24px)] w-72 flex-col rounded-xl border border-slate-200 bg-white shadow-lg">
      <div className="flex items-center gap-2 border-b border-slate-100 px-3 py-2">
        <SearchIcon sx={{ fontSize: 18 }} className="text-slate-400" />
        <input
          autoFocus
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="搜尋常用待辦、筆記"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>
      <div className="min-h-0 overflow-y-auto p-1.5">
        <p className="m-0 px-2 pb-1 pt-1 text-[11px] font-bold text-slate-400">常用待辦</p>
        {quests.length === 0 ? (
          <p className="m-0 px-2 py-1.5 text-xs text-slate-400">{keyword ? '沒有符合的待辦' : '在待辦卡片上點書籤圖示即可加入'}</p>
        ) : quests.map((template) => row(
          'q',
          template,
          template.name || template.text,
          template.subTasks?.length ? `${template.subTasks.length} 個項目：${template.subTasks.map((sub) => sub.text).join('、')}` : null,
          <ChecklistOutlinedIcon sx={{ fontSize: 17 }} className="shrink-0 text-slate-400" />,
          (id) => onRemoveQuestTemplate?.(id),
        ))}
        <p className="m-0 px-2 pb-1 pt-3 text-[11px] font-bold text-slate-400">常用筆記</p>
        {notes.length === 0 ? (
          <p className="m-0 px-2 py-1.5 text-xs text-slate-400">{keyword ? '沒有符合的筆記' : '在筆記上點書籤圖示即可加入'}</p>
        ) : notes.map((template) => row(
          'n',
          template,
          template.title || template.text.split('\n')[0] || '未命名筆記',
          template.title ? template.text.split('\n')[0] : null,
          <span className="h-4 w-4 shrink-0 rounded-sm border border-black/10" style={{ background: NOTE_COLORS[template.color]?.[0] }} />,
          onRemoveNoteTemplate,
        ))}
      </div>
    </div>
  )
}

export default function QuestCanvasView({ quests, huntTarget = null, huntTaskHandlers = {}, onOpenHunt, onPositionChange, onOpenDetails, onUpdateQuest, onSetExp, onSetSubTaskExp, onRemoveQuest, onToggleSubTask, onRemoveSubTask, onAddSubTask, onAddSubTaskImage, onAddCanvasQuest, onSetSchedule, onDuplicateQuest, lockedExpLevels = {}, board = null, onMoveQuestToBoard, clipboard = null, onClipboardChange, onSetQuestCollapsed, questTemplates = [], onAddFromTemplate, onSaveQuestTemplate, onRemoveQuestTemplate }) {
  const boardRef = useRef(null)
  const imageInputRef = useRef(null)
  const pointerRef = useRef(null)
  const [viewport, setViewport] = useState(() => readViewport(board))
  const [cardDrag, setCardDrag] = useState(null)
  const [cardResize, setCardResize] = useState(null)
  const [now, setNow] = useState(() => Date.now())
  const [panDrag, setPanDrag] = useState(null)
  const [stackOrder, setStackOrder] = useState([])
  // Selection, stacking and drag use keys: `q:<questId>` for task cards, `n:<noteId>` for notes
  // Ctrl/⌘ + 點擊可多選；拖曳、刪除、複製、剪下都作用在所有選取的卡片
  const [selectedKeys, setSelectedKeys] = useState([])
  const setSelectedKey = (key) => setSelectedKeys(key == null ? [] : [key])
  const isSelected = (key) => selectedKeys.includes(key)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [huntPosition, setHuntPosition] = useState(readHuntPosition)
  const { notes: allNotes, addNote, updateNote, addNoteImage, removeNoteImage, removeNote, noteTemplates, saveNoteTemplate, removeNoteTemplate } = useCanvasNotes()
  const [favoritesOpen, setFavoritesOpen] = useState(false)
  const [favoriteQuery, setFavoriteQuery] = useState('')
  const [savedNotice, setSavedNotice] = useState(null)
  const notes = allNotes.filter((note) => note.board === board)
  const defaults = buildDefaultPositions(quests)

  useEffect(() => {
    try {
      localStorage.setItem(viewportKey(board), JSON.stringify(viewport))
    } catch {
      // Viewport persistence is optional.
    }
  }, [viewport, board])

  const deleteCard = (quest) => {
    const hasContent = (quest.subTasks ?? []).length > 0
    if (hasContent && !window.confirm(`確定要刪除「${quest.text}」？卡片內的項目和圖片也會一起刪除。`)) return
    onRemoveQuest(quest.id)
    setSelectedKeys((prev) => prev.filter((key) => key !== `q:${quest.id}`))
  }

  // 排程 tag 需要隨時間更新（今天 → 已逾期）
  useEffect(() => {
    if (!quests.some((quest) => quest.scheduledAt)) return undefined
    const timer = window.setInterval(() => setNow(Date.now()), 60 * 1000)
    return () => window.clearInterval(timer)
  }, [quests])

  const duplicateCard = async (quest) => {
    const stored = quest.canvasPosition ?? defaults[quest.id] ?? { x: GAP, y: GAP }
    const newId = await onDuplicateQuest?.(quest.id, { ...stored, x: stored.x + DUPLICATE_OFFSET, y: stored.y + DUPLICATE_OFFSET })
    if (newId == null) return
    setSelectedKey(`q:${newId}`)
    setStackOrder((prev) => [...prev, `q:${newId}`])
  }

  const deleteNote = (note) => {
    const hasContent = note.title || note.text || note.imageIds.length > 0
    if (hasContent && !window.confirm(`確定要刪除這張筆記${note.title ? `「${note.title}」` : ''}？筆記內的圖片也會一起刪除。`)) return
    removeNote(note.id)
    setSelectedKeys((prev) => prev.filter((key) => key !== `n:${note.id}`))
  }

  const selectedQuests = () => quests.filter((quest) => isSelected(`q:${quest.id}`))
  const selectedNotes = () => notes.filter((note) => isSelected(`n:${note.id}`))

  const deleteSelected = () => {
    const targetQuests = selectedQuests()
    const targetNotes = selectedNotes()
    const total = targetQuests.length + targetNotes.length
    if (total === 0) return
    if (total === 1) {
      if (targetQuests[0]) deleteCard(targetQuests[0])
      else deleteNote(targetNotes[0])
      return
    }
    if (!window.confirm(`確定要刪除選取的 ${total} 張卡片？卡片內的項目和圖片也會一起刪除。`)) return
    targetQuests.forEach((quest) => onRemoveQuest(quest.id))
    targetNotes.forEach((note) => removeNote(note.id))
    setSelectedKeys([])
  }

  const duplicateSelected = async () => {
    const targets = selectedQuests()
    if (targets.length === 0) return
    const newKeys = []
    for (const quest of targets) {
      const stored = quest.canvasPosition ?? defaults[quest.id] ?? { x: GAP, y: GAP }
      const newId = await onDuplicateQuest?.(quest.id, { ...stored, x: stored.x + DUPLICATE_OFFSET, y: stored.y + DUPLICATE_OFFSET })
      if (newId != null) newKeys.push(`q:${newId}`)
    }
    setSelectedKeys(newKeys)
    setStackOrder((prev) => [...prev, ...newKeys])
  }

  useEffect(() => {
    const handleKey = (event) => {
      if (isTypingTarget(document.activeElement)) return
      // Ctrl+A 全選畫布上的卡片
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'a') {
        if (!boardRef.current?.isConnected) return
        event.preventDefault()
        setSelectedKeys([...quests.map((quest) => `q:${quest.id}`), ...notes.map((note) => `n:${note.id}`)])
        return
      }
      if (selectedKeys.length === 0) return
      if (event.key === 'Escape') setSelectedKeys([])
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        if (selectedQuests().length === 0) return
        event.preventDefault()
        duplicateSelected()
        return
      }
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (selectedQuests().length === 0 && selectedNotes().length === 0) return
      event.preventDefault()
      deleteSelected()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  // 剪下：被點的卡片若在多選裡就剪下整組，否則只剪這張
  const cutCard = (key) => {
    const keys = isSelected(key) ? selectedKeys : [key]
    const items = []
    keys.forEach((itemKey) => {
      const quest = quests.find((item) => `q:${item.id}` === itemKey)
      const note = notes.find((item) => `n:${item.id}` === itemKey)
      if (quest) items.push({ kind: 'q', id: quest.id, label: quest.text, position: quest.canvasPosition ?? defaults[quest.id] ?? { x: GAP, y: GAP } })
      else if (note) items.push({ kind: 'n', id: note.id, label: note.title || '筆記', position: note.position })
    })
    if (items.length === 0) return
    onClipboardChange?.({ items, label: items.length > 1 ? `${items.length} 張卡片` : items[0].label })
  }

  const isCut = (key) => Boolean(clipboard?.items?.some((item) => `${item.kind}:${item.id}` === key))

  // 貼到滑鼠所在位置；滑鼠不在畫布上就貼到畫面中央
  const pasteClipboard = () => {
    if (!clipboard) return
    const pointer = pointerRef.current
    const hovered = pointer ? document.elementFromPoint(pointer.x, pointer.y) : null
    const target = hovered && boardRef.current.contains(hovered) ? toWorld(pointer.x, pointer.y) : viewportCenter()
    const items = clipboard.items ?? []
    // 整組的左上角對齊貼上位置，卡片之間的相對位置不變
    const minX = Math.min(...items.map((item) => item.position?.x ?? 0))
    const minY = Math.min(...items.map((item) => item.position?.y ?? 0))
    const keys = []
    items.forEach((item) => {
      const position = {
        x: Math.max(0, Math.round(target.x + (item.position?.x ?? 0) - minX)),
        y: Math.max(0, Math.round(target.y + (item.position?.y ?? 0) - minY)),
      }
      if (item.kind === 'q') {
        onMoveQuestToBoard?.(item.id, board, position)
      } else {
        const note = allNotes.find((entry) => entry.id === item.id)
        if (!note) return
        updateNote(note.id, { board, position: { ...note.position, ...position } })
      }
      keys.push(`${item.kind}:${item.id}`)
    })
    setSelectedKeys(keys)
    setStackOrder((prev) => [...prev.filter((item) => !keys.includes(item)), ...keys])
    onClipboardChange?.(null)
  }

  // Ctrl+X 剪下選取的卡片、Ctrl+V 貼上（有剪下的卡片時優先於貼圖片）、Esc 取消
  useEffect(() => {
    const handleKey = (event) => {
      if (isTypingTarget(document.activeElement)) return
      if (event.key === 'Escape' && clipboard) {
        onClipboardChange?.(null)
        return
      }
      if (!(event.ctrlKey || event.metaKey)) return
      const key = event.key.toLowerCase()
      const cuttable = selectedKeys.filter((item) => !item.startsWith('h:'))
      if (key === 'x' && cuttable.length > 0) {
        event.preventDefault()
        cutCard(cuttable[cuttable.length - 1])
      } else if (key === 'v' && clipboard) {
        event.preventDefault()
        pasteClipboard()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const getPosition = (key, storedPosition) => {
    const dragItem = cardDrag?.moved ? cardDrag.items.find((item) => item.key === key) : null
    if (dragItem) return { ...storedPosition, x: Math.max(0, dragItem.originX + cardDrag.dx), y: Math.max(0, dragItem.originY + cardDrag.dy) }
    if (cardResize?.key === key) return { ...storedPosition, w: cardResize.w, h: cardResize.h }
    return storedPosition
  }

  const savePosition = (kind, id, position) => {
    if (kind === 'n') updateNote(id, { position })
    else if (kind === 'h') {
      setHuntPosition(position)
      try {
        localStorage.setItem(HUNT_POSITION_KEY, JSON.stringify(position))
      } catch {
        // Card position persistence is optional.
      }
    } else onPositionChange(id, position)
  }

  // 螢幕座標 → 畫布座標
  const toWorld = (clientX, clientY) => {
    const rect = boardRef.current.getBoundingClientRect()
    return {
      x: (clientX - rect.left - viewport.x) / viewport.zoom,
      y: (clientY - rect.top - viewport.y) / viewport.zoom,
    }
  }

  const viewportCenter = () => {
    const rect = boardRef.current.getBoundingClientRect()
    const center = toWorld(rect.left + rect.width / 2, rect.top + rect.height / 3)
    return { x: center.x - CARD_WIDTH / 2, y: center.y }
  }

  const createCard = (position, imageFile = null) => {
    onAddCanvasQuest(imageFile ? '圖片' : '新卡片', { x: Math.max(0, position.x), y: Math.max(0, position.y) }, imageFile, board)
  }

  useEffect(() => {
    if (!savedNotice) return undefined
    const timer = window.setTimeout(() => setSavedNotice(null), 1800)
    return () => window.clearTimeout(timer)
  }, [savedNotice])

  // 收合／展開；點的卡片在多選裡時整組一起切換
  const toggleCollapsed = (key) => {
    const isCollapsed = (itemKey) => {
      const quest = quests.find((item) => `q:${item.id}` === itemKey)
      if (quest) return quest.collapsed
      return notes.find((item) => `n:${item.id}` === itemKey)?.collapsed ?? false
    }
    const next = !isCollapsed(key)
    const keys = isSelected(key) && selectedKeys.length > 1 ? selectedKeys : [key]
    keys.forEach((itemKey) => {
      const [kind, ...rest] = itemKey.split(':')
      const rawId = rest.join(':')
      if (kind === 'q') {
        const quest = quests.find((item) => String(item.id) === rawId)
        if (quest) onSetQuestCollapsed?.(quest.id, next)
      } else if (kind === 'n') {
        const note = notes.find((item) => String(item.id) === rawId)
        if (note) updateNote(note.id, { collapsed: next })
      }
    })
  }

  const saveNoteAsTemplate = (note) => {
    saveNoteTemplate(note)
    setSavedNotice('已加入常用筆記')
  }

  const saveQuestAsTemplate = (quest) => {
    onSaveQuestTemplate?.(quest)
    setSavedNotice('已加入常用待辦')
  }

  // 從常用清單新增：放在畫面中央
  const addFromFavorite = async (kind, template) => {
    const center = viewportCenter()
    if (kind === 'q') {
      const id = onAddFromTemplate?.(template.id, { canvasPosition: { x: Math.max(0, center.x), y: Math.max(0, center.y) }, board })
      if (id != null) {
        setSelectedKey(`q:${id}`)
        setStackOrder((prev) => [...prev, `q:${id}`])
      }
    } else {
      const id = await addNote(
        { x: Math.max(0, center.x + (CARD_WIDTH - NOTE_WIDTH) / 2), y: Math.max(0, center.y) },
        null,
        board,
        { title: template.title, text: template.text, color: template.color },
      )
      setSelectedKey(`n:${id}`)
      setStackOrder((prev) => [...prev, `n:${id}`])
    }
    setFavoritesOpen(false)
    setFavoriteQuery('')
  }

  const createNote = async () => {
    const rect = boardRef.current.getBoundingClientRect()
    const center = toWorld(rect.left + rect.width / 2, rect.top + rect.height / 3)
    const id = await addNote({ x: Math.max(0, center.x - NOTE_WIDTH / 2), y: Math.max(0, center.y) }, null, board)
    setSelectedKey(`n:${id}`)
    setStackOrder((prev) => [...prev, `n:${id}`])
    setEditingNoteId(id)
  }

  const zoomAt = (nextZoom, clientX, clientY) => {
    const rect = boardRef.current.getBoundingClientRect()
    const anchorX = clientX - rect.left
    const anchorY = clientY - rect.top
    setViewport((prev) => {
      const zoom = clampZoom(nextZoom(prev.zoom))
      return {
        zoom,
        x: anchorX - ((anchorX - prev.x) / prev.zoom) * zoom,
        y: anchorY - ((anchorY - prev.y) / prev.zoom) * zoom,
      }
    })
  }

  const zoomFromCenter = (factor) => {
    const rect = boardRef.current.getBoundingClientRect()
    zoomAt((zoom) => zoom * factor, rect.left + rect.width / 2, rect.top + rect.height / 2)
  }

  // wheel 需要 passive: false 才能阻止頁面捲動
  useEffect(() => {
    const board = boardRef.current
    if (!board) return undefined
    const handleWheel = (event) => {
      event.preventDefault()
      if (event.ctrlKey || event.metaKey) {
        zoomAt((zoom) => zoom * Math.exp(-event.deltaY * 0.0015), event.clientX, event.clientY)
      } else {
        setViewport((prev) => ({ ...prev, x: prev.x - event.deltaX, y: prev.y - event.deltaY }))
      }
    }
    board.addEventListener('wheel', handleWheel, { passive: false })
    return () => board.removeEventListener('wheel', handleWheel)
  })

  // 在空白畫布上貼上圖片 → 在滑鼠位置新增一張圖片卡片（卡片上的貼上交給全域處理）
  useEffect(() => {
    const handlePaste = (event) => {
      const pointer = pointerRef.current
      const board = boardRef.current
      if (!pointer || !board) return
      const hovered = document.elementFromPoint(pointer.x, pointer.y)
      if (!hovered || !board.contains(hovered) || hovered.closest('[data-canvas-card], [data-canvas-ui]')) return
      const file = Array.from(event.clipboardData?.items ?? [])
        .find((item) => item.kind === 'file' && item.type.startsWith('image/'))
        ?.getAsFile()
      if (!file) return
      event.preventDefault()
      event.stopImmediatePropagation()
      createCard(toWorld(pointer.x, pointer.y), file)
    }
    window.addEventListener('paste', handlePaste, true)
    return () => window.removeEventListener('paste', handlePaste, true)
  })

  const handlePointerDown = (event) => {
    if (event.button !== 0 && event.button !== 1) return
    event.currentTarget.setPointerCapture(event.pointerId)
    if (!(event.ctrlKey || event.metaKey)) setSelectedKeys([])
    setPanDrag({ startX: event.clientX, startY: event.clientY, originX: viewport.x, originY: viewport.y })
  }

  // 卡片任何地方都能拖；按在輸入框、按鈕、勾選框上則照常操作
  const storedPositionOf = (key) => {
    if (key === 'h:hunt') return huntPosition
    const quest = quests.find((item) => `q:${item.id}` === key)
    if (quest) return quest.canvasPosition ?? defaults[quest.id]
    return notes.find((item) => `n:${item.id}` === key)?.position ?? null
  }

  const startCardDrag = (event, kind, id) => {
    event.stopPropagation()
    const key = `${kind}:${id}`
    const interactive = event.target.closest(INTERACTIVE_SELECTOR)
    // Ctrl/⌘ + 點擊：加入或移出多選，不拖曳
    if ((event.ctrlKey || event.metaKey) && event.button === 0 && !interactive) {
      setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((item) => item !== key) : [...prev, key]))
      setStackOrder((prev) => [...prev.filter((item) => item !== key), key])
      return
    }
    const groupKeys = isSelected(key) && selectedKeys.length > 1 ? selectedKeys : [key]
    if (!isSelected(key) || selectedKeys.length <= 1) setSelectedKey(key)
    setStackOrder((prev) => [...prev.filter((item) => !groupKeys.includes(item)), ...groupKeys])
    if (event.button !== 0 || interactive) return
    if (isTypingTarget(document.activeElement)) document.activeElement.blur()
    const items = groupKeys
      .map((itemKey) => {
        const stored = storedPositionOf(itemKey)
        if (!stored) return null
        const [itemKind, ...rest] = itemKey.split(':')
        const rawId = rest.join(':')
        const itemId = itemKind === 'h' ? rawId : (quests.find((q) => String(q.id) === rawId)?.id ?? notes.find((n) => String(n.id) === rawId)?.id)
        return { key: itemKey, kind: itemKind, id: itemId, stored, originX: stored.x, originY: stored.y }
      })
      .filter(Boolean)
    setCardDrag({ key, items, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, moved: false })
  }

  // 拖右下角調整卡片寬高（高度是最小高度，內容多時卡片仍會自動長高）
  const startCardResize = (event, kind, id, storedPosition) => {
    if (event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    const key = `${kind}:${id}`
    setSelectedKey(key)
    setStackOrder((prev) => [...prev.filter((item) => item !== key), key])
    if (isTypingTarget(document.activeElement)) document.activeElement.blur()
    const card = event.currentTarget.closest('[data-canvas-card]')
    boardRef.current.setPointerCapture(event.pointerId)
    setCardResize({
      key, kind, id, stored: storedPosition,
      startX: event.clientX, startY: event.clientY,
      originW: card.offsetWidth, originH: card.offsetHeight,
      w: card.offsetWidth, h: card.offsetHeight,
    })
  }

  const handlePointerMove = (event) => {
    pointerRef.current = { x: event.clientX, y: event.clientY }
    if (cardResize) {
      const w = cardResize.originW + (event.clientX - cardResize.startX) / viewport.zoom
      const h = cardResize.originH + (event.clientY - cardResize.startY) / viewport.zoom
      setCardResize({
        ...cardResize,
        w: Math.round(Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, w))),
        h: Math.round(Math.max(MIN_CARD_HEIGHT, h)),
      })
    } else if (cardDrag) {
      const dx = event.clientX - cardDrag.startX
      const dy = event.clientY - cardDrag.startY
      if (!cardDrag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      // 超過門檻才 capture，雙擊標題等點擊事件才不會被導到畫布上
      if (!cardDrag.moved) boardRef.current.setPointerCapture(cardDrag.pointerId)
      setCardDrag({ ...cardDrag, moved: true, dx: dx / viewport.zoom, dy: dy / viewport.zoom })
    } else if (panDrag) {
      setViewport((prev) => ({
        ...prev,
        x: panDrag.originX + event.clientX - panDrag.startX,
        y: panDrag.originY + event.clientY - panDrag.startY,
      }))
    }
  }

  const handlePointerUp = () => {
    if (cardResize && (cardResize.w !== cardResize.originW || cardResize.h !== cardResize.originH)) {
      savePosition(cardResize.kind, cardResize.id, { ...cardResize.stored, w: cardResize.w, h: cardResize.h })
    }
    // 在多選中單純點一下（沒拖動）→ 只選這張
    if (cardDrag && !cardDrag.moved && cardDrag.items.length > 1) setSelectedKey(cardDrag.key)
    if (cardDrag?.moved && (cardDrag.dx !== 0 || cardDrag.dy !== 0)) {
      cardDrag.items.forEach((item) => {
        savePosition(item.kind, item.id, {
          ...item.stored,
          x: Math.max(0, item.originX + cardDrag.dx),
          y: Math.max(0, item.originY + cardDrag.dy),
        })
      })
    }
    setCardResize(null)
    setCardDrag(null)
    setPanDrag(null)
  }

  const handleDrop = (event) => {
    const files = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith('image/'))
    if (files.length === 0) return
    event.preventDefault()
    const origin = toWorld(event.clientX, event.clientY)
    files.forEach((file, index) => createCard({ x: origin.x + index * 30, y: origin.y + index * 30 }, file))
  }

  const gridSize = 18 * viewport.zoom

  return (
    <div className="relative h-[calc(100vh-260px)] min-h-[520px] overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
      <div
        ref={boardRef}
        className={`absolute inset-0 touch-none ${cardResize ? 'cursor-nwse-resize' : panDrag ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{
          backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
          backgroundSize: `${gridSize}px ${gridSize}px`,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={(e) => {
          if (e.target === e.currentTarget) createCard(toWorld(e.clientX, e.clientY))
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        <div
          className="pointer-events-none absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})` }}
        >
          {quests.map((quest) => {
            const key = `q:${quest.id}`
            const storedPosition = quest.canvasPosition ?? defaults[quest.id]
            const stackIndex = stackOrder.indexOf(key)
            return (
              <div key={key} className={`pointer-events-auto ${isCut(key) ? 'opacity-40' : ''}`}>
                <CanvasCard
                  quest={quest}
                  position={getPosition(key, storedPosition)}
                  zIndex={cardDrag?.moved && cardDrag.items.some((item) => item.key === key) ? 1000 + stackIndex : stackIndex + 1}
                  selected={isSelected(key)}
                  dragging={Boolean(cardDrag?.moved && cardDrag.items.some((item) => item.key === key))}
                  onDragStart={(event) => startCardDrag(event, 'q', quest.id)}
                  onResizeStart={(event) => startCardResize(event, 'q', quest.id, storedPosition)}
                  onDelete={() => deleteCard(quest)}
                  onDuplicate={() => duplicateCard(quest)}
                  onCut={() => cutCard(key)}
                  onSaveTemplate={() => saveQuestAsTemplate(quest)}
                  onToggleCollapsed={() => toggleCollapsed(key)}
                  onSetSchedule={onSetSchedule}
                  now={now}
                  lockedExpLevels={lockedExpLevels}
                  onOpenDetails={onOpenDetails}
                  onUpdateQuest={onUpdateQuest}
                  onToggleSubTask={onToggleSubTask}
                  onSetExp={onSetExp}
                  onSetSubTaskExp={onSetSubTaskExp}
                  onRemoveSubTask={onRemoveSubTask}
                  onAddSubTask={onAddSubTask}
                  onAddSubTaskImage={onAddSubTaskImage}
                />
              </div>
            )
          })}
          {huntTarget && (
            <div className="pointer-events-auto">
              <HuntCanvasCard
                target={huntTarget}
                handlers={huntTaskHandlers}
                position={getPosition('h:hunt', huntPosition)}
                zIndex={cardDrag?.moved && cardDrag.items.some((item) => item.key === 'h:hunt') ? 1000 : stackOrder.indexOf('h:hunt') + 1}
                selected={isSelected('h:hunt')}
                dragging={Boolean(cardDrag?.moved && cardDrag.items.some((item) => item.key === 'h:hunt'))}
                onDragStart={(event) => startCardDrag(event, 'h', 'hunt')}
                onResizeStart={(event) => startCardResize(event, 'h', 'hunt', huntPosition)}
                onOpenHunt={onOpenHunt}
              />
            </div>
          )}
          {notes.map((note) => {
            const key = `n:${note.id}`
            const stackIndex = stackOrder.indexOf(key)
            return (
              <div key={key} className={`pointer-events-auto ${isCut(key) ? 'opacity-40' : ''}`}>
                <NoteCard
                  note={note}
                  position={getPosition(key, note.position)}
                  zIndex={cardDrag?.moved && cardDrag.items.some((item) => item.key === key) ? 1000 + stackIndex : stackIndex + 1}
                  selected={isSelected(key)}
                  dragging={Boolean(cardDrag?.moved && cardDrag.items.some((item) => item.key === key))}
                  editing={editingNoteId === note.id}
                  onStartEdit={() => setEditingNoteId(note.id)}
                  onStopEdit={() => setEditingNoteId((prev) => (prev === note.id ? null : prev))}
                  onDragStart={(event) => startCardDrag(event, 'n', note.id)}
                  onResizeStart={(event) => startCardResize(event, 'n', note.id, note.position)}
                  onDelete={() => deleteNote(note)}
                  onSaveTemplate={() => saveNoteAsTemplate(note)}
                  onToggleCollapsed={() => toggleCollapsed(key)}
                  onUpdate={updateNote}
                  onAddImage={addNoteImage}
                  onRemoveImage={removeNoteImage}
                />
              </div>
            )
          })}
        </div>

        {quests.length === 0 && notes.length === 0 && !huntTarget && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-slate-400">
            <p className="m-0 text-base font-semibold">畫布是空的</p>
            <p className="m-0 mt-1 text-sm">雙擊空白處新增卡片，或直接貼上／拖入圖片</p>
          </div>
        )}
      </div>

      {/* 左側工具列 */}
      <div data-canvas-ui className="absolute left-3 top-3 z-[1100] flex flex-col gap-1 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        <button
          type="button"
          onClick={() => createCard(viewportCenter())}
          className="flex w-14 flex-col items-center gap-0.5 rounded-lg bg-transparent py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
          title="新增待辦卡片（或雙擊畫布空白處）"
        >
          <ChecklistOutlinedIcon sx={{ fontSize: 22 }} />待辦
        </button>
        <button
          type="button"
          onClick={createNote}
          className="flex w-14 flex-col items-center gap-0.5 rounded-lg bg-transparent py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
          title="新增筆記（便利貼，可放文字和圖片）"
        >
          <StickyNote2OutlinedIcon sx={{ fontSize: 22 }} />筆記
        </button>
        <button
          type="button"
          onClick={() => imageInputRef.current?.click()}
          className="flex w-14 flex-col items-center gap-0.5 rounded-lg bg-transparent py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
          title="新增圖片卡片（也可以在空白處 Ctrl+V 或拖入圖片）"
        >
          <ImageOutlinedIcon sx={{ fontSize: 22 }} />圖片
        </button>
        <button
          type="button"
          onClick={() => setFavoritesOpen((prev) => !prev)}
          className={`flex w-14 flex-col items-center gap-0.5 rounded-lg py-2 text-[11px] font-semibold hover:bg-slate-100 ${favoritesOpen ? 'bg-purple-50 text-purple-600' : 'bg-transparent text-slate-600'}`}
          title="從常用待辦／筆記新增"
          aria-expanded={favoritesOpen}
        >
          <BookmarksOutlinedIcon sx={{ fontSize: 21 }} />常用
        </button>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            const origin = viewportCenter()
            files.forEach((file, index) => createCard({ x: origin.x + index * 30, y: origin.y + index * 30 }, file))
          }}
        />
      </div>

      {clipboard && (
        <div data-canvas-ui className="absolute left-1/2 top-3 z-[1100] flex max-w-[90%] -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          <ContentCutOutlinedIcon sx={{ fontSize: 15 }} />
          <span className="truncate">已剪下「{clipboard.label}」，到要放的畫布按 Ctrl+V 貼上</span>
          <button type="button" onClick={pasteClipboard} className="shrink-0 rounded-full bg-white/15 px-2.5 py-0.5 text-white hover:bg-white/25">貼到這裡</button>
          <button type="button" onClick={() => onClipboardChange?.(null)} className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-transparent text-white/60 hover:text-white" aria-label="取消剪下">
            <CloseIcon sx={{ fontSize: 14 }} />
          </button>
        </div>
      )}

      {favoritesOpen && (
        <>
          <div data-canvas-ui className="absolute inset-0 z-[1090]" onPointerDown={() => setFavoritesOpen(false)} />
          <FavoritesPanel
            query={favoriteQuery}
            onQueryChange={setFavoriteQuery}
            questTemplates={questTemplates}
            noteTemplates={noteTemplates}
            onPick={addFromFavorite}
            onRemoveQuestTemplate={onRemoveQuestTemplate}
            onRemoveNoteTemplate={removeNoteTemplate}
          />
        </>
      )}

      {savedNotice && (
        <div data-canvas-ui className="pointer-events-none absolute bottom-3 left-1/2 z-[1100] -translate-x-1/2 rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg">
          {savedNotice}
        </div>
      )}

      {/* 右下縮放控制 */}
      <div data-canvas-ui className="absolute bottom-3 right-3 z-[1100] flex items-center rounded-lg border border-slate-200 bg-white shadow-sm">
        <button type="button" onClick={() => zoomFromCenter(1 / 1.2)} className="flex h-8 w-8 items-center justify-center bg-transparent text-slate-600 hover:bg-slate-100" aria-label="縮小">
          <RemoveIcon sx={{ fontSize: 17 }} />
        </button>
        <span className="w-12 text-center text-xs font-semibold tabular-nums text-slate-600">{Math.round(viewport.zoom * 100)}%</span>
        <button type="button" onClick={() => zoomFromCenter(1.2)} className="flex h-8 w-8 items-center justify-center bg-transparent text-slate-600 hover:bg-slate-100" aria-label="放大">
          <AddIcon sx={{ fontSize: 17 }} />
        </button>
        <button type="button" onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })} className="flex h-8 w-8 items-center justify-center border-l border-slate-200 bg-transparent text-slate-600 hover:bg-slate-100" title="回到原點" aria-label="回到原點">
          <CenterFocusStrongOutlinedIcon sx={{ fontSize: 17 }} />
        </button>
      </div>
    </div>
  )
}

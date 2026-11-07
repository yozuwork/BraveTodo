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
import ArrowBackIcon from '@mui/icons-material/ArrowBack'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import VerticalAlignBottomIcon from '@mui/icons-material/VerticalAlignBottom'
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined'
import EditNoteOutlinedIcon from '@mui/icons-material/EditNoteOutlined'
import ViewColumnOutlinedIcon from '@mui/icons-material/ViewColumnOutlined'
import SpaceDashboardOutlinedIcon from '@mui/icons-material/SpaceDashboardOutlined'
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded'
import ChevronRightRoundedIcon from '@mui/icons-material/ChevronRightRounded'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import CanvasTableCard from './CanvasTableCard'
import { TABLE_WIDTH } from '../../utils/canvasTable'
import StoredImage from '../common/StoredImage'
import useCanvasNotes, { COLUMN_WIDTH, DEFAULT_NOTE_COLOR, NOTE_COLORS, NOTE_STAMPS, subBoardKey } from '../../hooks/useCanvasNotes'
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

const QUEST_STATUS_OPTIONS = [
  ['pending', '待處理', 'border-slate-300 bg-slate-50 text-slate-600'],
  ['progress', '進行中', 'border-sky-300 bg-sky-50 text-sky-700'],
  ['completed', '已完成', 'border-emerald-300 bg-emerald-50 text-emerald-700'],
]

const QUEST_EXP_OPTIONS = [
  [1, '一般 +1'],
  [3, '中等 +3'],
  [5, '上等 +5'],
  [10, '特級 +10'],
  [20, '特殊 +20'],
]

const DAY_MS = 24 * 60 * 60 * 1000
const DUPLICATE_OFFSET = 30
// 置頂卡片在畫面上的起點（避開左側工具箱）
const PIN_LEFT_OFFSET = 96
const PIN_TOP_OFFSET = 16

// 收進欄位的卡片：改成跟著欄位直向排列、寬度撐滿欄位，不能單獨改大小
const DOCKED_CARD_CLASS = '[&>[data-canvas-card]]:!relative [&>[data-canvas-card]]:!left-0 [&>[data-canvas-card]]:!top-0 [&>[data-canvas-card]]:!w-full [&_.cursor-nwse-resize]:!hidden'
const DOCKED_POSITION = { x: 0, y: 0 }

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

// textarea 依內容自動調整高度
const autoGrow = (el) => {
  if (!el) return
  el.style.height = 'auto'
  el.style.height = `${el.scrollHeight}px`
}

// 置頂卡片的圖釘標記
function PinBadge() {
  return (
    <span className="pointer-events-none absolute -left-2 -top-2 z-[3] flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow" title="已置頂">
      <PushPinIcon sx={{ fontSize: 14 }} />
    </span>
  )
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
function CollapseToggle({ collapsed, onToggle, className = '', label = '卡片', controls }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded bg-transparent text-slate-400 hover:bg-black/5 hover:text-slate-800 ${className}`}
      title={collapsed ? '展開' : '收合'}
      aria-label={`${collapsed ? '展開' : '收合'}${label}`}
      aria-expanded={!collapsed}
      aria-controls={controls}
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

function CanvasCard({ quest, position, now, lockedExpLevels = {}, focusEdit = false, zIndex, selected, dragging, onDragStart, onResizeStart, onToggleCollapsed, onSetSchedule, onSetStatus, onUpdateQuest, onSetExp, onSetSubTaskExp, onToggleSubTask, onRemoveSubTask, onUpdateSubTask, onReorderSubTasks, onSetSubTaskView, onToggleSubTaskPin, onAddSubTask, onAddSubTaskImage }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingSubTaskId, setEditingSubTaskId] = useState(null)
  // 專注編輯模式：卡片固定不動，按住子待辦可自由拖曳（跟著滑鼠浮起來），其他項目即時讓位，放開才存檔
  // { id, pointerId, startY, pointerY, active, order: [subId], grabOffset, listTop, scale }
  const [subDrag, setSubDrag] = useState(null)
  const subListRef = useRef(null)

  const startSubDrag = (event, subId) => {
    if (!focusEdit || event.button !== 0 || event.target.closest(INTERACTIVE_SELECTOR)) return
    const row = event.currentTarget
    const list = subListRef.current
    const rowRect = row.getBoundingClientRect()
    const listRect = list.getBoundingClientRect()
    setSubDrag({
      id: subId,
      pointerId: event.pointerId,
      startY: event.clientY,
      pointerY: event.clientY,
      active: false,
      order: null,
      grabOffset: event.clientY - rowRect.top,
      listTop: listRect.top,
      // 畫布縮放比例（螢幕 px / 卡片內 px）
      scale: listRect.width / (list.offsetWidth || listRect.width || 1),
    })
  }

  useEffect(() => {
    if (!focusEdit) setSubDrag(null)
  }, [focusEdit])

  useEffect(() => {
    if (!subDrag) return undefined
    const handleMove = (event) => {
      if (event.pointerId !== subDrag.pointerId) return
      if (!subDrag.active && Math.abs(event.clientY - subDrag.startY) < DRAG_THRESHOLD) return
      event.preventDefault()
      const baseOrder = subDrag.order ?? displayedSubTasks.map((sub) => sub.id)
      // 依目前畫面上其他項目的中線，算出拖曳項目應該插入的位置
      const rows = Array.from(subListRef.current?.querySelectorAll('[data-subtask-id]') ?? [])
        .filter((row) => row.dataset.subtaskId !== String(subDrag.id))
      const insertAt = rows.filter((row) => {
        const rect = row.getBoundingClientRect()
        return event.clientY > rect.top + rect.height / 2
      }).length
      const others = baseOrder.filter((id) => id !== subDrag.id)
      const order = [...others.slice(0, insertAt), subDrag.id, ...others.slice(insertAt)]
      setSubDrag({ ...subDrag, active: true, order, pointerY: event.clientY })
    }
    const handleUp = (event) => {
      if (event.pointerId !== subDrag.pointerId) return
      const { id, active, order } = subDrag
      setSubDrag(null)
      if (!active || !order) return
      const original = displayedSubTasks.map((sub) => sub.id)
      if (order.every((item, index) => item === original[index])) return
      const index = order.indexOf(id)
      if (index < order.length - 1) onReorderSubTasks?.(quest.id, id, order[index + 1], false)
      else onReorderSubTasks?.(quest.id, id, order[index - 1], true)
    }
    const handleCancel = () => setSubDrag(null)
    window.addEventListener('pointermove', handleMove, { passive: false })
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleCancel)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleCancel)
    }
  })

  const fileInputRef = useRef(null)
  const scheduleInputRef = useRef(null)
  const subTasks = quest.subTasks ?? []
  const status = quest.completed ? 'completed' : quest.status === 'progress' ? 'progress' : 'pending'
  const statusStyle = QUEST_STATUS_OPTIONS.find(([value]) => value === status)?.[2]
  const doneSubTasks = subTasks.filter((sub) => sub.completed)
  const orderSubTasks = (list) => (quest.subTaskSortDone
    ? [...list.filter((sub) => !sub.completed), ...list.filter((sub) => sub.completed)]
    : list)
  const displayedSubTasks = [
    ...orderSubTasks(subTasks.filter((sub) => sub.pinned)),
    ...orderSubTasks(subTasks.filter((sub) => !sub.pinned)),
  ].filter((sub) => !(quest.subTaskHideDone && sub.completed))
  const subById = new Map(subTasks.map((sub) => [sub.id, sub]))
  const renderedSubTasks = subDrag?.active && subDrag.order
    ? subDrag.order.map((id) => subById.get(id)).filter(Boolean)
    : displayedSubTasks
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

  const fitImages = !quest.collapsed && Boolean(position.h) && Boolean(quest.cover || subTasks.some((sub) => sub.imageId))
  const fitSubImages = fitImages && renderedSubTasks.some((sub) => sub.imageId)

  return (
    <div
      data-canvas-card
      className={`group/card group/resize absolute flex touch-none select-none flex-col overflow-hidden rounded-lg border bg-white transition-shadow ${
        dragging ? 'cursor-grabbing shadow-[0_12px_32px_rgba(15,23,42,0.18)]' : 'cursor-grab shadow-[0_2px_10px_rgba(15,23,42,0.08)]'
      } ${focusEdit ? 'border-purple-500 ring-4 ring-purple-200' : selected ? 'border-purple-400 ring-2 ring-purple-300' : 'border-slate-200'}`}
      style={{ ...cardSizeStyle(position, CARD_WIDTH, quest.collapsed), ...(fitImages ? { height: position.h } : {}), left: position.x, top: position.y, zIndex }}
      onPointerDown={onDragStart}
    >
      {quest.pinned && <span className="pointer-events-none absolute left-1 top-1 z-[3] flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-amber-950 shadow" title="已置頂"><PushPinIcon sx={{ fontSize: 12 }} /></span>}
      {scheduleStatus && (
        <span
          className={`absolute right-3 top-0 z-10 rounded-b-md px-2 py-0.5 text-[11px] font-bold shadow-sm ${scheduleStatus.className}`}
          title={`排程：${formatSchedule(new Date(quest.scheduledAt))}`}
        >
          {scheduleStatus.label}
        </span>
      )}
      {quest.cover && !quest.collapsed && (
        <img src={quest.cover} alt="" className={`canvas-task-image block w-full bg-black object-contain ${fitImages ? 'min-h-0 flex-1 basis-0' : 'max-h-56'}`} draggable={false} />
      )}
      <div className={`flex shrink-0 items-start gap-1 pb-2 pl-2 pr-4 ${scheduleStatus && (!quest.cover || quest.collapsed) ? 'pt-6' : 'pt-3'}`}>
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
        <select
          value={status}
          onChange={(e) => onSetStatus?.(quest.id, e.target.value)}
          className={`mt-0.5 shrink-0 cursor-pointer rounded-full border px-2 py-0.5 text-xs font-bold outline-none ${statusStyle}`}
          title="卡片狀態：選「已完成」才算整張卡片完成"
          aria-label="卡片狀態"
        >
          {QUEST_STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
      </div>

      {quest.collapsed ? (
        <div className="flex items-center gap-2 px-4 pb-2.5 pl-10 text-xs text-slate-400">
          <span>{doneCount} / {subTasks.length} 完成</span>
          {quest.scheduledAt && <span>・{formatSchedule(new Date(quest.scheduledAt))}</span>}
        </div>
      ) : (
      <>
      {focusEdit && (
        <div className="mx-4 mb-1.5 flex items-center gap-1.5 rounded-md bg-purple-50 px-2 py-1 text-[11px] font-semibold text-purple-600">
          <EditNoteOutlinedIcon sx={{ fontSize: 15 }} />專注編輯：卡片已固定，按住項目自由拖曳排序
        </div>
      )}
      <div ref={subListRef} className={`relative flex flex-col gap-1 px-4 ${fitSubImages ? 'min-h-0 flex-1 overflow-auto' : 'shrink-0'}`}>
        {subDrag?.active && subById.get(subDrag.id) && (() => {
          const sub = subById.get(subDrag.id)
          return (
            <div
              className="pointer-events-none absolute inset-x-2.5 z-20 flex cursor-grabbing items-center gap-2.5 rounded-md bg-white px-1.5 py-1 shadow-[0_10px_24px_rgba(124,58,237,0.28)] ring-2 ring-purple-400"
              style={{ top: (subDrag.pointerY - subDrag.listTop - subDrag.grabOffset) / subDrag.scale }}
            >
              <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 ${sub.completed ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-400 bg-white'}`}>
                {sub.completed && <span className="text-[10px] leading-none">✓</span>}
              </span>
              {sub.imageId ? (
                <StoredImage imageId={sub.imageId} className="block max-h-24 w-full rounded bg-slate-900 object-contain" />
              ) : (
                <span className={`min-w-0 flex-1 break-words text-sm ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{sub.text}</span>
              )}
            </div>
          )
        })()}
        {renderedSubTasks.map((sub) => {
          const draggingThis = subDrag?.active && subDrag.id === sub.id
          return (
          <div
            key={sub.id}
            data-subtask-id={sub.id}
            {...(focusEdit ? { 'data-subtask-drag': true } : {})}
            onPointerDown={(e) => startSubDrag(e, sub.id)}
            className={`group/item relative -mx-1.5 flex gap-2.5 rounded-md px-1.5 ${sub.imageId ? 'flex-col py-1' : 'items-center py-0.5'} ${
              draggingThis ? 'invisible' : !focusEdit ? '' : subDrag?.active ? 'cursor-grabbing' : 'cursor-grab hover:bg-purple-50/60'
            }`}
            style={fitSubImages && sub.imageId ? { flex: '1 0 80px', minHeight: 80 } : { flexShrink: 0 }}
            title={focusEdit ? '按住拖曳調整順序' : undefined}
          >
            <div className="flex min-w-0 shrink-0 items-center gap-2.5">
              {focusEdit && (
                <span className="pointer-events-none absolute -left-4 top-1 flex h-5 w-4 items-center justify-center text-purple-300 group-hover/item:text-purple-500">
                  <DragIndicatorIcon sx={{ fontSize: 15 }} />
                </span>
              )}
              <input
                type="checkbox"
                checked={sub.completed}
                onChange={() => onToggleSubTask(quest.id, sub.id)}
                className="h-4 w-4 shrink-0 cursor-pointer accent-emerald-600"
              />
              {!sub.imageId && (editingSubTaskId === sub.id ? (
                // 多行自動長高，完整顯示內容方便選取、複製
                <textarea
                  autoFocus
                  rows={1}
                  defaultValue={sub.text}
                  ref={autoGrow}
                  onInput={(e) => autoGrow(e.currentTarget)}
                  onBlur={(e) => {
                    const text = e.target.value.trim()
                    if (text && text !== sub.text) onUpdateSubTask?.(quest.id, sub.id, text)
                    setEditingSubTaskId(null)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault()
                      e.currentTarget.blur()
                    }
                    if (e.key === 'Escape') setEditingSubTaskId(null)
                  }}
                  className="min-w-0 flex-1 resize-none select-text overflow-hidden break-words rounded border border-purple-300 px-1.5 py-0.5 text-sm leading-5 outline-none"
                />
              ) : (
                <span
                  onDoubleClick={() => setEditingSubTaskId(sub.id)}
                  className={`min-w-0 flex-1 break-words text-sm ${sub.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                  title="雙擊編輯項目"
                >
                  {sub.text}
                </span>
              ))}
              <button
                type="button"
                onClick={() => onToggleSubTaskPin?.(quest.id, sub.id)}
                className={`ml-auto flex h-5 w-5 shrink-0 items-center justify-center rounded bg-transparent transition-opacity ${
                  sub.pinned ? 'text-amber-500 hover:text-amber-700' : 'text-slate-300 opacity-0 hover:text-slate-700 group-hover/item:opacity-100'
                }`}
                title={sub.pinned ? '取消置頂' : '置頂這個項目'}
                aria-label={sub.pinned ? '取消置頂項目' : '置頂項目'}
                aria-pressed={Boolean(sub.pinned)}
              >
                {sub.pinned ? <PushPinIcon sx={{ fontSize: 13 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 13 }} />}
              </button>
              <button
                type="button"
                onClick={() => onRemoveSubTask(quest.id, sub.id)}
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-transparent text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover/item:opacity-100"
                aria-label="刪除項目"
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </button>
            </div>
            {sub.imageId && (
              <StoredImage
                imageId={sub.imageId}
                className={`canvas-task-image pointer-events-none block w-full rounded-md bg-black object-contain ${fitSubImages ? 'min-h-0 h-0 flex-1' : ''} ${sub.completed ? 'opacity-50' : ''}`}
              />
            )}
          </div>
          )
        })}
      </div>

      <div className="flex shrink-0 flex-col gap-0.5 px-4 pb-2 pt-1.5">
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
          title="選擇圖片加入待辦，或把獨立圖片卡拖進來"
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

      {quest.subTaskHideDone && doneSubTasks.length > 0 && (
        <button
          type="button"
          onClick={() => onSetSubTaskView?.(quest.id, { subTaskHideDone: false })}
          className="mx-4 mb-1 mt-auto flex items-center gap-1.5 self-start rounded bg-transparent px-1 py-0.5 text-xs font-semibold text-slate-400 hover:bg-slate-50 hover:text-slate-700"
          title="顯示已完成的項目"
        >
          <VisibilityOffOutlinedIcon sx={{ fontSize: 14 }} />已隱藏 {doneSubTasks.length} 個已完成
        </button>
      )}

      <div className={`${quest.subTaskHideDone && doneSubTasks.length > 0 ? '' : 'mt-auto'} flex shrink-0 flex-col gap-1.5 border-t border-slate-100 px-4 py-2 text-xs text-slate-500`}>
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

// Standalone images have no note footer or task controls.
function ImageCanvasCard({ note, position, zIndex, selected, dragging, onDragStart, onResizeStart }) {
  return (
    <div
      data-canvas-card
      className={`group/resize absolute flex flex-col bg-black touch-none select-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${selected ? 'outline outline-2 outline-offset-2 outline-purple-400' : ''}`}
      style={{ left: position.x, top: position.y, width: position.w ?? NOTE_WIDTH, ...(position.h ? { height: position.h } : {}), zIndex }}
      onPointerDown={onDragStart}
      aria-label="獨立圖片，拖到筆記或待辦可加入"
    >
      {note.pinned && <PinBadge />}
      {note.imageIds.map((imageId) => (
        <StoredImage key={imageId} imageId={imageId} alt="畫布圖片" className={`pointer-events-none block w-full bg-black object-contain ${position.h ? 'min-h-0 h-0 flex-1' : ''}`} />
      ))}
      <ResizeHandle onResizeStart={onResizeStart} />
    </div>
  )
}

// 便利貼筆記：雙擊編輯，可放圖片。
function NoteCard({ note, position, zIndex, selected, dragging, editing, onStartEdit, onStopEdit, onDragStart, onResizeStart, onToggleCollapsed, onUpdate, onAddImage, onRemoveImage, boardCount = 0, onOpenBoard }) {
  const fileInputRef = useRef(null)
  const [titleDraft, setTitleDraft] = useState(note.title)
  const [textDraft, setTextDraft] = useState(note.text)

  useEffect(() => {
    if (editing) return
    setTitleDraft(note.title)
    setTextDraft(note.text)
  }, [editing, note.title, note.text])

  const commit = () => {
    if (titleDraft !== note.title || textDraft !== note.text) onUpdate(note.id, { title: titleDraft.trim(), text: textDraft })
    onStopEdit()
  }

  const background = NOTE_COLORS[note.color]?.[0] ?? NOTE_COLORS[DEFAULT_NOTE_COLOR][0]
  const isEmpty = !note.title && !note.text && note.imageIds.length === 0
  const stamp = note.stamp ? NOTE_STAMPS[note.stamp] : null

  // Board：雙擊開啟獨立畫布；雙擊名稱可重新命名
  if (note.isBoard) {
    const plain = note.color === DEFAULT_NOTE_COLOR
    return (
      <div
        data-canvas-card
        className={`group/note absolute flex w-[150px] touch-none select-none flex-col items-center rounded-xl bg-white px-3 pb-3 pt-3.5 text-center transition-shadow ${
          dragging ? 'cursor-grabbing shadow-[0_12px_32px_rgba(15,23,42,0.18)]' : 'cursor-grab shadow-[0_2px_10px_rgba(15,23,42,0.1)] hover:shadow-[0_6px_20px_rgba(15,23,42,0.16)]'
        } ${selected ? 'outline outline-2 outline-offset-2 outline-purple-400' : ''}`}
        style={{ left: position.x, top: position.y, zIndex }}
        onPointerDown={onDragStart}
        onDoubleClick={(e) => {
          if (e.target.closest(INTERACTIVE_SELECTOR)) return
          if (e.target.closest('[data-board-title]')) onStartEdit()
          else onOpenBoard?.()
        }}
        onBlur={(e) => {
          if (editing && !e.currentTarget.contains(e.relatedTarget)) commit()
        }}
        title="雙擊開啟 Board"
      >
        {note.pinned && <PinBadge />}
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl transition-transform duration-200 group-hover/note:scale-105"
          style={{ background: plain ? '#7c3aed' : background, color: plain ? '#ffffff' : 'rgba(0,0,0,0.62)' }}
        >
          <SpaceDashboardOutlinedIcon sx={{ fontSize: 34 }} />
        </div>
        {editing ? (
          <input
            autoFocus
            value={titleDraft}
            onChange={(e) => setTitleDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur()
            }}
            placeholder="Board 名稱"
            className="mt-2.5 w-full select-text rounded border border-purple-300 px-1 py-0.5 text-center text-sm font-bold outline-none"
          />
        ) : (
          <p data-board-title className="m-0 mt-2.5 w-full truncate text-sm font-bold text-slate-800" title="雙擊重新命名">
            {note.title || '未命名 Board'}
          </p>
        )}
        <p className="m-0 mt-0.5 text-[11px] text-slate-400">{boardCount} 張卡片</p>
      </div>
    )
  }

  const collapsedView = note.collapsed && !editing
  const hasImages = note.imageIds.length > 0
  // 有圖片且拖拉過高度：卡片固定高度，圖片等比縮放塞進剩餘空間，多出來的地方補黑邊
  const fitImages = hasImages && !collapsedView && Boolean(position.h)

  return (
    <div
      data-canvas-card
      className={`group/note group/resize absolute flex touch-none select-none flex-col rounded-sm ${
        dragging ? 'cursor-grabbing' : editing ? 'cursor-default' : 'cursor-grab'
      } ${selected ? 'outline outline-2 outline-offset-2 outline-purple-400' : ''}`}
      style={{
        ...cardSizeStyle(position, NOTE_WIDTH, collapsedView),
        ...(fitImages ? { height: position.h } : {}),
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
      {note.pinned && <PinBadge />}
      <div
        className="relative flex min-h-0 flex-1 flex-col text-[#2b2b2b] transition-opacity"
        style={{ opacity: stamp ? 0.45 : 1, background, clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)' }}
      >
        {hasImages && !collapsedView && (
          <div className={`relative flex flex-col bg-slate-900 ${fitImages ? 'min-h-0 flex-1' : ''}`}>
            <CollapseToggle
              collapsed={false}
              onToggle={onToggleCollapsed}
              className="absolute left-1.5 top-1.5 z-[2] bg-black/50 text-white opacity-0 transition-opacity hover:bg-black/70 hover:text-white group-hover/note:opacity-100"
            />
            {note.imageIds.map((imageId) => (
              <div key={imageId} className={`group/img relative ${fitImages ? 'min-h-0 flex-1' : ''}`}>
                <StoredImage
                  imageId={imageId}
                  className={`block w-full bg-slate-900 object-contain ${fitImages ? 'h-full' : ''}`}
                />
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
          <div className="flex shrink-0 flex-col px-4 pb-6 pt-3">
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
          <div className="flex shrink-0 items-center gap-1 pb-5 pl-1.5 pr-4 pt-2" title="已收合，雙擊編輯筆記">
            <CollapseToggle collapsed onToggle={onToggleCollapsed} className="text-black/45 hover:text-black" />
            <p className="m-0 min-w-0 flex-1 truncate text-[15px] font-bold leading-snug">
              {note.title || note.text.split('\n')[0] || '筆記'}
            </p>
            {note.imageIds.length > 0 && <span className="shrink-0 text-[11px] text-black/45">{note.imageIds.length} 張圖</span>}
          </div>
        ) : (
          <div className={`flex shrink-0 items-start gap-1 pb-6 pr-4 ${hasImages ? 'pl-4 pt-2' : 'pl-1.5 pt-2.5'}`} title="雙擊編輯筆記">
            {!hasImages && (
              <CollapseToggle collapsed={false} onToggle={onToggleCollapsed} className="text-black/45 hover:text-black" />
            )}
            <div className={`min-w-0 flex-1 ${hasImages ? '' : 'pt-0.5'}`}>
              {note.title && <p className="m-0 break-words text-[15px] font-bold leading-snug">{note.title}</p>}
              {note.text ? (
                <p className={`m-0 whitespace-pre-wrap break-words text-sm leading-6 ${note.title ? 'mt-1.5' : ''}`}>{note.text}</p>
              ) : isEmpty && (
                <p className="m-0 text-sm text-black/40">雙擊編輯筆記</p>
              )}
            </div>
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

// 欄（版面）：把多張卡片收成一組，拖欄位整組一起移動；卡片拖進拖出即可加入／移出
function ColumnCard({ column, position, width, count, dropActive, dragging, onDragStart, onResizeStart, onToggleCollapsed, onRename, onRemove, children }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(column.title)

  useEffect(() => {
    if (!editing) setDraft(column.title)
  }, [editing, column.title])

  const commit = () => {
    setEditing(false)
    const title = draft.trim()
    if (title !== column.title) onRename(title)
  }

  return (
    <div
      data-column-id={column.id}
      className={`group/column group/resize absolute flex touch-none select-none flex-col rounded-lg border bg-white p-2 transition-shadow ${
        dragging ? 'cursor-grabbing shadow-[0_12px_32px_rgba(15,23,42,0.18)]' : 'cursor-grab shadow-[0_2px_10px_rgba(15,23,42,0.08)]'
      } ${dropActive ? 'border-purple-400 ring-2 ring-purple-300' : 'border-slate-200'}`}
      style={{ left: position.x, top: position.y, width, zIndex: dragging ? 999 : 0 }}
      onPointerDown={onDragStart}
    >
      <div className={`relative px-7 pt-1 text-center ${column.collapsed ? '' : 'pb-2'}`} onDoubleClick={(event) => { if (!event.target.closest('button')) setEditing(true) }} title="雙擊編輯欄位名稱">
        <CollapseToggle collapsed={column.collapsed} onToggle={onToggleCollapsed} label="欄位" controls={`canvas-column-body-${column.id}`} className="absolute left-0 top-0" />
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit()
              if (e.key === 'Escape') {
                setDraft(column.title)
                setEditing(false)
              }
            }}
            placeholder="欄位名稱"
            className="w-full select-text rounded border border-purple-300 px-1.5 py-0.5 text-center text-base font-bold outline-none"
          />
        ) : (
          <p className="m-0 truncate text-base font-bold text-slate-800">{column.title || '未命名欄位'}</p>
        )}
        <p className="m-0 mt-0.5 text-xs text-slate-400">{count} 張卡片</p>
        <button
          type="button"
          onClick={onRemove}
          className="absolute right-0 top-0 flex h-6 w-6 items-center justify-center rounded bg-transparent text-slate-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-500 group-hover/column:opacity-100"
          title="刪除欄位（裡面的卡片會留在畫布上）"
          aria-label="刪除欄位"
        >
          <CloseIcon sx={{ fontSize: 16 }} />
        </button>
      </div>
      <div id={`canvas-column-body-${column.id}`} data-column-body hidden={column.collapsed} className={column.collapsed ? 'hidden' : `flex min-h-[72px] flex-col gap-2 rounded-md p-2 transition-colors ${dropActive ? 'bg-purple-50' : 'bg-slate-100'}`}>
        {children}
        {count === 0 && <p className="m-auto py-3 text-center text-xs text-slate-400">把待辦、筆記或圖片卡片拖進來</p>}
      </div>
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

export default function QuestCanvasView({ quests: rootQuests, allQuests = null, rootLabel = '畫布', huntTarget: rootHuntTarget = null, huntTaskHandlers = {}, onOpenHunt, onPositionChange, onOpenDetails, onUpdateQuest, onSetExp, onSetSubTaskExp, onRemoveQuest, onToggleSubTask, onSetQuestStatus, onRemoveSubTask, onUpdateSubTask, onAddSubTask, onAddSubTaskImage, onAddCanvasQuest, onSetSchedule, onDuplicateQuest, lockedExpLevels = {}, board: rootBoard = null, onMoveQuestToBoard, clipboard = null, onClipboardChange, onSetQuestCollapsed, onReorderSubTasks, onSetQuestSubTaskView, onToggleSubTaskPin, onTogglePin, questTemplates = [], onAddFromTemplate, onSaveQuestTemplate, onRemoveQuestTemplate, attached = false }) {
  const boardRef = useRef(null)
  const imageInputRef = useRef(null)
  const pointerRef = useRef(null)
  // 開啟中的 Board 路徑（Board 筆記的 id，由外到內）；空陣列 = 這個分頁的主畫布
  const [boardStack, setBoardStack] = useState([])
  const board = boardStack.length > 0 ? subBoardKey(boardStack[boardStack.length - 1]) : rootBoard
  const everyQuest = allQuests ?? rootQuests
  const quests = boardStack.length > 0 ? everyQuest.filter((quest) => quest.board === board) : rootQuests
  const huntTarget = boardStack.length > 0 ? null : rootHuntTarget
  const viewportBoardRef = useRef(board)
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
  const {
    notes: allNotes, addNote, updateNote, addNoteImage, removeNoteImage, removeNote, noteTemplates, saveNoteTemplate, removeNoteTemplate,
    columns: allColumns, addColumn, updateColumn, removeColumn, placeCardsInColumn,
  } = useCanvasNotes()
  const [columnDrag, setColumnDrag] = useState(null)
  const [columnResize, setColumnResize] = useState(null)
  const [favoritesOpen, setFavoritesOpen] = useState(false)
  const [toolPopover, setToolPopover] = useState(null) // 'stamps' | 'colors'
  const [focusEditKey, setFocusEditKey] = useState(null) // 專注編輯中的待辦卡片
  const noteImageInputRef = useRef(null)
  const [favoriteQuery, setFavoriteQuery] = useState('')
  const [savedNotice, setSavedNotice] = useState(null)
  const notes = allNotes.filter((note) => note.board === board)
  const defaults = buildDefaultPositions(quests)
  const columns = allColumns.filter((column) => column.board === board)
  // 卡片 key → 所在欄位 id（只算這個畫布上還存在的卡片）
  const cardKeySet = new Set([...quests.map((quest) => `q:${quest.id}`), ...notes.map((note) => `n:${note.id}`)])
  const dockedColumnOf = {}
  columns.forEach((column) => column.cardKeys.forEach((key) => {
    if (cardKeySet.has(key) && dockedColumnOf[key] == null) dockedColumnOf[key] = column.id
  }))

  useEffect(() => {
    // 切換 Board 的那一拍 viewport 還是舊畫布的，不要寫到新畫布
    if (viewportBoardRef.current !== board) return
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

  const navigateToBoard = (stack) => {
    const key = stack.length > 0 ? subBoardKey(stack[stack.length - 1]) : rootBoard
    viewportBoardRef.current = key
    setViewport(readViewport(key))
    setBoardStack(stack)
    setSelectedKeys([])
    setEditingNoteId(null)
    setFocusEditKey(null)
    setToolPopover(null)
    setFavoritesOpen(false)
  }
  const openSubBoard = (note) => navigateToBoard([...boardStack, note.id])

  // 開啟中的 Board 被刪掉（或剪到別處）時退回還存在的那一層
  useEffect(() => {
    const broken = boardStack.findIndex((id) => !allNotes.some((note) => note.id === id && note.isBoard))
    if (broken !== -1) navigateToBoard(boardStack.slice(0, broken))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allNotes, boardStack])

  // Board 裡的所有東西（含更深層的 Board）
  const collectBoardContents = (noteId, acc = { quests: [], notes: [], columns: [] }) => {
    const key = subBoardKey(noteId)
    everyQuest.filter((quest) => quest.board === key).forEach((quest) => acc.quests.push(quest))
    allColumns.filter((column) => column.board === key).forEach((column) => acc.columns.push(column))
    allNotes.filter((note) => note.board === key).forEach((note) => {
      acc.notes.push(note)
      if (note.isBoard) collectBoardContents(note.id, acc)
    })
    return acc
  }
  const boardItemCount = (noteId) => {
    const key = subBoardKey(noteId)
    return everyQuest.filter((quest) => quest.board === key).length + allNotes.filter((note) => note.board === key).length
  }
  const removeNoteDeep = (note) => {
    if (note.isBoard) {
      const contents = collectBoardContents(note.id)
      contents.quests.forEach((quest) => onRemoveQuest(quest.id))
      contents.notes.forEach((item) => removeNote(item.id))
      contents.columns.forEach((column) => removeColumn(column.id))
    }
    removeNote(note.id)
  }

  const deleteNote = (note) => {
    if (note.isBoard) {
      const inside = collectBoardContents(note.id)
      const total = inside.quests.length + inside.notes.length
      if (total > 0 && !window.confirm(`確定要刪除 Board「${note.title || '未命名 Board'}」？裡面的 ${total} 張卡片也會一起刪除。`)) return
    } else {
      const hasContent = note.title || note.text || note.imageIds.length > 0 || note.table?.rows.some((row) => row.cells.some(Boolean))
      if (hasContent && !window.confirm(note.isImage ? '確定要刪除這張圖片？' : note.isTable ? `確定要刪除表格「${note.title || '未命名表格'}」及所有儲存格內容？` : `確定要刪除這張筆記${note.title ? `「${note.title}」` : ''}？筆記內的圖片也會一起刪除。`)) return
    }
    removeNoteDeep(note)
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
    targetNotes.forEach((note) => removeNoteDeep(note))
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
      else if (note) items.push({ kind: 'n', id: note.id, label: note.title || (note.isImage ? '圖片' : '筆記'), position: note.position })
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
        x: Math.round(target.x + (item.position?.x ?? 0) - minX),
        y: Math.round(target.y + (item.position?.y ?? 0) - minY),
      }
      if (item.kind === 'q') {
        onMoveQuestToBoard?.(item.id, board, position)
      } else {
        const note = allNotes.find((entry) => entry.id === item.id)
        if (!note || (note.isBoard && boardStack.includes(note.id))) return
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

  // 置頂卡片固定在畫面左上角（工具箱右邊），平移畫布時不跟著移動；依置頂時的先後由左往右排
  const pinnedAnchors = (() => {
    const pinnedCards = [
      ...quests.filter((quest) => quest.pinned).map((quest) => ({
        key: `q:${quest.id}`, stored: quest.canvasPosition ?? defaults[quest.id] ?? { x: GAP, y: GAP }, width: CARD_WIDTH,
      })),
      ...notes.filter((note) => note.pinned).map((note) => ({ key: `n:${note.id}`, stored: note.position, width: note.isTable ? TABLE_WIDTH : NOTE_WIDTH })),
    ].sort((a, b) => a.stored.x - b.stored.x || a.stored.y - b.stored.y)
    const anchors = {}
    let x = (PIN_LEFT_OFFSET - viewport.x) / viewport.zoom
    const y = (PIN_TOP_OFFSET - viewport.y) / viewport.zoom
    pinnedCards.forEach((card) => {
      anchors[card.key] = { x, y }
      x += (card.stored.w ?? card.width) + GAP
    })
    return anchors
  })()

  const getPosition = (key, storedPosition) => {
    if (pinnedAnchors[key]) {
      const size = cardResize?.key === key ? { w: cardResize.w, h: cardResize.h } : {}
      return { ...storedPosition, ...size, ...pinnedAnchors[key] }
    }
    const dragItem = cardDrag?.moved ? cardDrag.items.find((item) => item.key === key) : null
    if (dragItem) return { ...storedPosition, x: dragItem.originX + cardDrag.dx, y: dragItem.originY + cardDrag.dy }
    if (cardResize?.key === key) return { ...storedPosition, w: cardResize.w, h: cardResize.h }
    return storedPosition
  }

  const draggingKeys = new Set(cardDrag?.moved ? cardDrag.items.map((item) => item.key) : [])
  const isDocked = (key) => dockedColumnOf[key] != null && !draggingKeys.has(key) && !pinnedAnchors[key]

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

  const bringToFront = (key) => setStackOrder((prev) => [...prev.filter((item) => item !== key), key])

  const createCard = async (position, imageFile = null) => {
    if (imageFile) {
      try {
        const id = await addNote(position, imageFile, board, { isImage: true })
        bringToFront(`n:${id}`)
        setSelectedKey(`n:${id}`)
      } catch {
        setSavedNotice('圖片新增失敗，請再試一次')
      }
      return
    }
    const id = await onAddCanvasQuest('新卡片', { x: position.x, y: position.y }, null, board)
    if (id == null) return
    bringToFront(`q:${id}`)
    setSelectedKey(`q:${id}`)
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
      const id = onAddFromTemplate?.(template.id, { canvasPosition: { x: center.x, y: center.y }, board })
      if (id != null) {
        setSelectedKey(`q:${id}`)
        setStackOrder((prev) => [...prev, `q:${id}`])
      }
    } else {
      const id = await addNote(
        { x: center.x + (CARD_WIDTH - NOTE_WIDTH) / 2, y: center.y },
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

  const isPinnedKey = (key) => {
    const quest = quests.find((item) => `q:${item.id}` === key)
    if (quest) return quest.pinned
    return notes.find((item) => `n:${item.id}` === key)?.pinned ?? false
  }

  // 選取卡片時工具列的專屬功能
  const actionableKeys = selectedKeys.filter((key) => !key.startsWith('h:'))
  const selectedQuest = actionableKeys.length === 1 ? quests.find((quest) => `q:${quest.id}` === actionableKeys[0]) ?? null : null
  const selectedNote = actionableKeys.length === 1 ? notes.find((note) => `n:${note.id}` === actionableKeys[0]) ?? null : null

  useEffect(() => {
    if (!selectedNote) setToolPopover(null)
  }, [selectedNote])

  // 選取換到別張卡片（或取消選取）時離開專注編輯
  useEffect(() => {
    if (focusEditKey && !(actionableKeys.length === 1 && actionableKeys[0] === focusEditKey)) setFocusEditKey(null)
  }, [focusEditKey, actionableKeys])

  const selectionTools = (() => {
    if (actionableKeys.length === 0) return null
    const firstKey = actionableKeys[0]
    const collapsedNow = (() => {
      const quest = quests.find((item) => `q:${item.id}` === firstKey)
      if (quest) return quest.collapsed
      return notes.find((item) => `n:${item.id}` === firstKey)?.collapsed ?? false
    })()
    const collapseAction = {
      id: 'collapse',
      icon: <ExpandMoreIcon sx={{ fontSize: 22 }} className={collapsedNow ? '-rotate-90' : ''} />,
      label: collapsedNow ? '展開' : '收合',
      title: collapsedNow ? '展開卡片' : '收合卡片',
      onClick: () => toggleCollapsed(firstKey),
    }
    const cutAction = {
      id: 'cut',
      icon: <ContentCutOutlinedIcon sx={{ fontSize: 20 }} />,
      label: '剪下',
      title: '剪下，到另一個畫布按 Ctrl+V 貼上（Ctrl+X）',
      onClick: () => cutCard(firstKey),
    }
    const deleteAction = {
      id: 'delete',
      icon: <DeleteOutlineIcon sx={{ fontSize: 21 }} />,
      label: '刪除',
      title: '刪除（Delete）',
      danger: true,
      onClick: deleteSelected,
    }

    const pinned = isPinnedKey(firstKey)
    const pinAction = {
      id: 'pin',
      icon: pinned ? <PushPinIcon sx={{ fontSize: 19 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 19 }} />,
      label: pinned ? '取消置頂' : '置頂',
      title: pinned ? '取消置頂' : '置頂：排到畫布左上角，其他卡片自動讓開',
      active: pinned,
      onClick: () => togglePinCard(firstKey),
    }

    if (selectedQuest) {
      const focusing = focusEditKey === firstKey
      return {
        label: focusing ? '專注編輯' : '待辦',
        actions: [
          {
            id: 'focus-edit',
            icon: <EditNoteOutlinedIcon sx={{ fontSize: 22 }} />,
            label: focusing ? '結束專注' : '專注編輯',
            title: focusing ? '結束專注編輯，恢復拖曳卡片' : '專注編輯：固定卡片，子待辦可自由拖曳排序',
            active: focusing,
            onClick: () => setFocusEditKey(focusing ? null : firstKey),
          },
          pinAction,
          collapseAction,
          {
            id: 'sort-done',
            icon: <VerticalAlignBottomIcon sx={{ fontSize: 20 }} />,
            label: '完成置底',
            title: selectedQuest.subTaskSortDone ? '已開啟：已完成的項目排到最下面（點一下關閉）' : '已完成的項目自動排到最下面',
            active: selectedQuest.subTaskSortDone,
            onClick: () => onSetQuestSubTaskView?.(selectedQuest.id, { subTaskSortDone: !selectedQuest.subTaskSortDone }),
          },
          {
            id: 'hide-done',
            icon: <VisibilityOffOutlinedIcon sx={{ fontSize: 19 }} />,
            label: '隱藏完成',
            title: selectedQuest.subTaskHideDone ? '已開啟：隱藏已完成的項目（點一下顯示）' : '隱藏已完成的項目',
            active: selectedQuest.subTaskHideDone,
            onClick: () => onSetQuestSubTaskView?.(selectedQuest.id, { subTaskHideDone: !selectedQuest.subTaskHideDone }),
          },
          { id: 'details', icon: <OpenInFullOutlinedIcon sx={{ fontSize: 19 }} />, label: '詳情', title: '開啟任務詳情', onClick: () => onOpenDetails(selectedQuest.id) },
          { id: 'template', icon: <BookmarkAddOutlinedIcon sx={{ fontSize: 21 }} />, label: '常用', title: '加入常用待辦', onClick: () => saveQuestAsTemplate(selectedQuest) },
          cutAction,
          { id: 'duplicate', icon: <ContentCopyOutlinedIcon sx={{ fontSize: 19 }} />, label: '複製', title: '複製卡片（Ctrl+D）', onClick: () => duplicateCard(selectedQuest) },
          deleteAction,
        ],
      }
    }
    if (selectedNote?.isImage) {
      return { label: '圖片', actions: [pinAction, cutAction, deleteAction] }
    }
    if (selectedNote?.isTable) {
      return { label: '表格', actions: [pinAction, collapseAction, cutAction, deleteAction] }
    }
    if (selectedNote?.isBoard) {
      return {
        label: 'Board',
        actions: [
          { id: 'open', icon: <OpenInNewRoundedIcon sx={{ fontSize: 20 }} />, label: '開啟', title: '開啟 Board（也可以雙擊）', onClick: () => openSubBoard(selectedNote) },
          pinAction,
          { id: 'color', icon: <PaletteOutlinedIcon sx={{ fontSize: 20 }} />, label: '顏色', title: 'Board 顏色', active: toolPopover === 'colors', onClick: () => setToolPopover((prev) => (prev === 'colors' ? null : 'colors')) },
          cutAction,
          deleteAction,
        ],
      }
    }
    if (selectedNote) {
      const stamped = Boolean(selectedNote.stamp)
      return {
        label: '筆記',
        actions: [
          pinAction,
          collapseAction,
          { id: 'stamp', icon: <ApprovalOutlinedIcon sx={{ fontSize: 20 }} />, label: '印章', title: '印章', active: toolPopover === 'stamps', color: stamped && toolPopover !== 'stamps' ? '#dc2626' : undefined, onClick: () => setToolPopover((prev) => (prev === 'stamps' ? null : 'stamps')) },
          { id: 'color', icon: <PaletteOutlinedIcon sx={{ fontSize: 20 }} />, label: '顏色', title: '筆記顏色', active: toolPopover === 'colors', onClick: () => setToolPopover((prev) => (prev === 'colors' ? null : 'colors')) },
          { id: 'template', icon: <BookmarkAddOutlinedIcon sx={{ fontSize: 21 }} />, label: '常用', title: '加入常用筆記', onClick: () => saveNoteAsTemplate(selectedNote) },
          { id: 'image', icon: <ImageOutlinedIcon sx={{ fontSize: 21 }} />, label: '圖片', title: '選擇圖片加入筆記，或把獨立圖片卡拖進來', onClick: () => noteImageInputRef.current?.click() },
          cutAction,
          deleteAction,
        ],
      }
    }
    const hasQuests = selectedQuests().length > 0
    return {
      label: `${actionableKeys.length} 張`,
      actions: [
        collapseAction,
        cutAction,
        ...(hasQuests ? [{ id: 'duplicate', icon: <ContentCopyOutlinedIcon sx={{ fontSize: 19 }} />, label: '複製', title: '複製選取的待辦（Ctrl+D）', onClick: duplicateSelected }] : []),
        deleteAction,
      ],
    }
  })()

  // position: world coordinates of the note's top-left; defaults to the middle of the view
  const createNote = async (position = null) => {
    const rect = boardRef.current.getBoundingClientRect()
    const center = toWorld(rect.left + rect.width / 2, rect.top + rect.height / 3)
    const target = position ?? { x: center.x - NOTE_WIDTH / 2, y: center.y }
    const id = await addNote({ x: target.x, y: target.y }, null, board)
    setSelectedKey(`n:${id}`)
    bringToFront(`n:${id}`)
    setEditingNoteId(id)
  }

  const createBoard = async (position = null) => {
    const rect = boardRef.current.getBoundingClientRect()
    const center = toWorld(rect.left + rect.width / 2, rect.top + rect.height / 3)
    const target = position ?? { x: center.x - 75, y: center.y }
    const id = await addNote({ x: Math.round(target.x), y: Math.round(target.y) }, null, board, { title: '新 Board', isBoard: true })
    setSelectedKey(`n:${id}`)
    bringToFront(`n:${id}`)
    setEditingNoteId(id)
  }

  const createTable = async (position = null) => {
    const center = viewportCenter()
    const target = position ?? { x: center.x + (CARD_WIDTH - TABLE_WIDTH) / 2, y: center.y }
    const id = await addNote({ ...target, w: TABLE_WIDTH }, null, board, { title: '新表格', isTable: true })
    setSelectedKey(`n:${id}`)
    bringToFront(`n:${id}`)
  }

  // 從左側工具列拖到畫布上，放開的位置就是新卡片的位置
  const [toolDrag, setToolDrag] = useState(null) // { kind: 'q' | 'n' | 'c' | 'b' | 't', startX, startY, x, y, moved }
  const startToolDrag = (event, kind) => {
    if (event.button !== 0) return
    setToolDrag({ kind, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, moved: false })
  }

  useEffect(() => {
    if (!toolDrag) return undefined
    const handleMove = (event) => {
      setToolDrag((prev) => {
        if (!prev) return prev
        const moved = prev.moved || Math.hypot(event.clientX - prev.startX, event.clientY - prev.startY) > DRAG_THRESHOLD
        return { ...prev, x: event.clientX, y: event.clientY, moved }
      })
    }
    const handleUp = (event) => {
      const drag = toolDrag
      setToolDrag(null)
      if (!drag.moved) return
      suppressToolClickRef.current = true
      const hovered = document.elementFromPoint(event.clientX, event.clientY)
      if (!hovered || !boardRef.current.contains(hovered)) return
      const world = toWorld(event.clientX, event.clientY)
      // 游標大約落在卡片標題的位置
      const position = { x: world.x - 24, y: world.y - 16 }
      if (drag.kind === 'n') createNote(position)
      else if (drag.kind === 'c') createColumn(position)
      else if (drag.kind === 'b') createBoard(position)
      else if (drag.kind === 't') createTable(position)
      else createCard(position)
    }
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
  })

  // A drag ends with a click on some browsers; ignore that click so it doesn't add a second card
  const suppressToolClickRef = useRef(false)
  const handleToolClick = (create) => {
    if (suppressToolClickRef.current) {
      suppressToolClickRef.current = false
      return
    }
    create()
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

  // Clipboard images always become independent cards, including over notes/tasks.
  useEffect(() => {
    const trackPointer = (event) => { pointerRef.current = { x: event.clientX, y: event.clientY } }
    const handlePaste = (event) => {
      if (event.defaultPrevented || document.querySelector('.MuiModal-root:not(.MuiModal-hidden), [data-paste-scope]')) return
      const pointer = pointerRef.current
      const board = boardRef.current
      if (!board) return
      const hovered = pointer ? document.elementFromPoint(pointer.x, pointer.y) : null
      if (!board.parentElement.contains(hovered) && !board.contains(document.activeElement)) return
      const items = Array.from(event.clipboardData?.items ?? [])
      if (isTypingTarget(event.target) && items.some((item) => item.type === 'text/plain')) return
      const files = items.filter((item) => item.kind === 'file' && item.type.startsWith('image/')).map((item) => item.getAsFile()).filter(Boolean)
      if (!files.length) return
      event.preventDefault()
      event.stopImmediatePropagation()
      const origin = hovered && board.contains(hovered) ? toWorld(pointer.x, pointer.y) : viewportCenter()
      files.forEach((file, index) => createCard({ x: origin.x + index * 30, y: origin.y + index * 30 }, file))
    }
    window.addEventListener('pointermove', trackPointer, { passive: true })
    window.addEventListener('paste', handlePaste, true)
    return () => {
      window.removeEventListener('pointermove', trackPointer)
      window.removeEventListener('paste', handlePaste, true)
    }
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

  // ── 置頂：置頂卡片排在左上角一列；擋到的卡片整體往下移，彼此相對位置不變 ──
  const measureCard = (key) => {
    const el = boardRef.current?.querySelector(`[data-card-key="${key}"]`)?.firstElementChild
    return { w: el?.offsetWidth ?? CARD_WIDTH, h: el?.offsetHeight ?? 160 }
  }

  const relayoutForPins = (overrides) => {
    const cards = [
      ...quests.map((quest) => {
        const key = `q:${quest.id}`
        return { key, kind: 'q', id: quest.id, pinned: overrides[key] ?? quest.pinned, stored: quest.canvasPosition ?? defaults[quest.id] ?? { x: GAP, y: GAP } }
      }),
      ...notes.map((note) => {
        const key = `n:${note.id}`
        return { key, kind: 'n', id: note.id, pinned: overrides[key] ?? note.pinned, stored: note.position }
      }),
      ...(huntTarget ? [{ key: 'h:hunt', kind: 'h', id: 'hunt', pinned: false, stored: huntPosition }] : []),
    ].map((card) => ({ ...card, ...measureCard(card.key) }))

    const newlyPinned = Object.keys(overrides).filter((key) => overrides[key])
    const pinned = cards
      .filter((card) => card.pinned)
      .sort((a, b) => (newlyPinned.includes(b.key) - newlyPinned.includes(a.key)) || a.stored.x - b.stored.x || a.stored.y - b.stored.y)
    const others = cards.filter((card) => !card.pinned)

    // 從畫面可見區的左上角（工具箱右邊）開始排，置頂卡片不會被工具箱擋住
    const rect = boardRef.current.getBoundingClientRect()
    const origin = toWorld(rect.left + PIN_LEFT_OFFSET, rect.top + PIN_TOP_OFFSET)
    const originX = Math.round(origin.x)
    const originY = Math.round(origin.y)
    let x = originX
    let bandBottom = originY
    pinned.forEach((card) => {
      if (card.stored.x !== x || card.stored.y !== originY) savePosition(card.kind, card.id, { ...card.stored, x, y: originY })
      bandBottom = Math.max(bandBottom, originY + card.h)
      x += card.w + GAP
    })
    if (pinned.length === 0) return
    const bandRight = x
    const delta = Math.max(0, ...others
      .filter((card) => card.stored.y < bandBottom + GAP && card.stored.y + card.h > originY && card.stored.x < bandRight && card.stored.x + card.w > originX)
      .map((card) => bandBottom + GAP - card.stored.y))
    if (delta === 0) return
    others.forEach((card) => savePosition(card.kind, card.id, { ...card.stored, y: Math.round(card.stored.y + delta) }))
  }

  const togglePinCard = (key) => {
    const next = !isPinnedKey(key)
    const quest = quests.find((item) => `q:${item.id}` === key)
    const note = notes.find((item) => `n:${item.id}` === key)
    if (quest) onTogglePin?.(quest.id)
    else if (note) updateNote(note.id, { pinned: next })
    else return
    if (next && dockedColumnOf[key] != null) placeCardsInColumn([key], null)
    bringToFront(key)
    relayoutForPins({ [key]: next })
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
    if (event.button !== 0 || interactive || event.target.closest('[data-subtask-drag]') || focusEditKey === key) return
    if (isTypingTarget(document.activeElement)) document.activeElement.blur()
    const items = groupKeys
      .filter((itemKey) => !isPinnedKey(itemKey))
      .map((itemKey) => {
        let stored = storedPositionOf(itemKey)
        if (dockedColumnOf[itemKey] != null) {
          const el = boardRef.current?.querySelector(`[data-card-key="${itemKey}"] > [data-canvas-card]`)
          if (el) {
            const rect = el.getBoundingClientRect()
            const world = toWorld(rect.left, rect.top)
            stored = { ...(stored ?? {}), x: Math.round(world.x), y: Math.round(world.y) }
          }
        }
        if (!stored) return null
        const [itemKind, ...rest] = itemKey.split(':')
        const rawId = rest.join(':')
        const itemId = itemKind === 'h' ? rawId : (quests.find((q) => String(q.id) === rawId)?.id ?? notes.find((n) => String(n.id) === rawId)?.id)
        return { key: itemKey, kind: itemKind, id: itemId, stored, originX: stored.x, originY: stored.y }
      })
      .filter(Boolean)
    setCardDrag({ key, items, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dx: 0, dy: 0, moved: false })
  }

  // 圖片待辦使用指定高度，其餘卡片以內容決定最小高度。
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
    const images = kind === 'q' ? Array.from(card.querySelectorAll('.canvas-task-image')) : []
    const minH = images.length
      ? Math.max(MIN_CARD_HEIGHT, card.offsetHeight - images.reduce((height, image) => height + image.offsetHeight, 0) + 80 * images.length)
      : MIN_CARD_HEIGHT
    setCardResize({
      key, kind, id, stored: storedPosition,
      startX: event.clientX, startY: event.clientY,
      originW: card.offsetWidth, originH: card.offsetHeight,
      w: card.offsetWidth, h: card.offsetHeight,
      minH,
    })
  }

  // 滑鼠底下的欄位（拖卡片放進欄位用）
  const columnAt = (clientX, clientY) => {
    const els = Array.from(boardRef.current?.querySelectorAll('[data-column-id]') ?? [])
    for (let index = els.length - 1; index >= 0; index -= 1) {
      const rect = els[index].getBoundingClientRect()
      if (clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom) {
        const column = columns.find((item) => String(item.id) === els[index].dataset.columnId)
        if (column) return { column, el: els[index] }
      }
    }
    return null
  }

  const imageDropTarget = (drag, clientX, clientY) => {
    if (drag.items.length !== 1) return null
    const source = notes.find((note) => `n:${note.id}` === drag.items[0].key && note.isImage)
    if (!source?.imageIds.length) return null
    for (const element of document.elementsFromPoint(clientX, clientY)) {
      const card = element.closest('[data-card-key]')
      if (!card || !boardRef.current.contains(card)) continue
      const key = card.dataset.cardKey
      if (key === drag.items[0].key) continue
      const quest = quests.find((item) => `q:${item.id}` === key)
      if (quest && onAddSubTaskImage) return { kind: 'q', id: quest.id, key }
      const note = notes.find((item) => `n:${item.id}` === key)
      if (note && !note.isImage && !note.isBoard && !note.isTable) return { kind: 'n', id: note.id, key }
    }
    return null
  }

  const attachImageCard = async (sourceId, target) => {
    const source = notes.find((note) => note.id === sourceId)
    if (!source) return
    try {
      if (target.kind === 'q') {
        for (const imageId of source.imageIds) await onAddSubTaskImage(target.id, { imageId })
      } else {
        const note = notes.find((item) => item.id === target.id)
        if (!note) return
        updateNote(note.id, { imageIds: [...note.imageIds, ...source.imageIds] })
      }
      // Ownership moves to the destination; keep its stored image intact.
      removeNote(source.id, { keepImages: true })
      placeCardsInColumn([`n:${source.id}`], null)
      setSelectedKey(target.key)
      setSavedNotice(target.kind === 'q' ? '圖片已加入待辦' : '圖片已加入筆記')
    } catch {
      setSavedNotice('圖片加入失敗，原圖已保留')
    }
  }

  const createColumn = (position = null) => {
    const rect = boardRef.current.getBoundingClientRect()
    const center = toWorld(rect.left + rect.width / 2, rect.top + rect.height / 3)
    const target = position ?? { x: center.x - COLUMN_WIDTH / 2, y: center.y }
    addColumn({ x: Math.round(target.x), y: Math.round(target.y) }, board)
  }

  const startColumnDrag = (event, column) => {
    event.stopPropagation()
    if (event.button !== 0 || event.target.closest(INTERACTIVE_SELECTOR)) return
    if (isTypingTarget(document.activeElement)) document.activeElement.blur()
    setSelectedKeys([])
    setColumnDrag({
      id: column.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
      originX: column.position.x, originY: column.position.y, dx: 0, dy: 0, moved: false,
    })
  }

  const startColumnResize = (event, column) => {
    if (event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    const el = event.currentTarget.closest('[data-column-id]')
    boardRef.current.setPointerCapture(event.pointerId)
    setColumnResize({ id: column.id, startX: event.clientX, originW: el.offsetWidth, w: el.offsetWidth })
  }

  // 刪除欄位：裡面的卡片留在畫布上目前看到的位置
  const removeColumnKeepCards = (column) => {
    column.cardKeys.forEach((key, index) => {
      const el = boardRef.current?.querySelector(`[data-card-key="${key}"] > [data-canvas-card]`)
      if (!el) return
      const rect = el.getBoundingClientRect()
      const world = column.collapsed
        ? { x: column.position.x + 16, y: column.position.y + 64 + index * 32 }
        : toWorld(rect.left, rect.top)
      const quest = quests.find((item) => `q:${item.id}` === key)
      const note = notes.find((item) => `n:${item.id}` === key)
      const target = quest ? ['q', quest.id] : note ? ['n', note.id] : null
      if (target) savePosition(target[0], target[1], { ...storedPositionOf(key), x: Math.round(world.x), y: Math.round(world.y) })
    })
    removeColumn(column.id)
  }

  const handlePointerMove = (event) => {
    pointerRef.current = { x: event.clientX, y: event.clientY }
    if (columnResize) {
      const w = columnResize.originW + (event.clientX - columnResize.startX) / viewport.zoom
      setColumnResize({ ...columnResize, w: Math.round(Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH + 40, w))) })
    } else if (columnDrag) {
      const dx = event.clientX - columnDrag.startX
      const dy = event.clientY - columnDrag.startY
      if (!columnDrag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      if (!columnDrag.moved) boardRef.current.setPointerCapture(columnDrag.pointerId)
      setColumnDrag({ ...columnDrag, moved: true, dx: dx / viewport.zoom, dy: dy / viewport.zoom })
    } else if (cardResize) {
      const w = cardResize.originW + (event.clientX - cardResize.startX) / viewport.zoom
      const h = cardResize.originH + (event.clientY - cardResize.startY) / viewport.zoom
      setCardResize({
        ...cardResize,
        w: Math.round(Math.min(MAX_CARD_WIDTH, Math.max(MIN_CARD_WIDTH, w))),
        h: Math.round(Math.max(cardResize.minH ?? MIN_CARD_HEIGHT, h)),
      })
    } else if (cardDrag) {
      const dx = event.clientX - cardDrag.startX
      const dy = event.clientY - cardDrag.startY
      if (!cardDrag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      // 超過門檻才 capture，雙擊標題等點擊事件才不會被導到畫布上
      if (!cardDrag.moved) boardRef.current.setPointerCapture(cardDrag.pointerId)
      const droppable = cardDrag.items.some((item) => item.kind !== 'h')
      const overColumnId = droppable ? columnAt(event.clientX, event.clientY)?.column.id ?? null : null
      const overAttachmentKey = imageDropTarget(cardDrag, event.clientX, event.clientY)?.key ?? null
      setCardDrag({ ...cardDrag, moved: true, dx: dx / viewport.zoom, dy: dy / viewport.zoom, overColumnId, overAttachmentKey })
    } else if (panDrag) {
      setViewport((prev) => ({
        ...prev,
        x: panDrag.originX + event.clientX - panDrag.startX,
        y: panDrag.originY + event.clientY - panDrag.startY,
      }))
    }
  }

  const handlePointerUp = (event) => {
    if (columnResize) {
      const column = columns.find((item) => item.id === columnResize.id)
      if (column && columnResize.w !== columnResize.originW) updateColumn(column.id, { position: { ...column.position, w: columnResize.w } })
    }
    if (columnDrag?.moved) {
      const column = columns.find((item) => item.id === columnDrag.id)
      if (column) {
        updateColumn(column.id, {
          position: { ...column.position, x: Math.round(columnDrag.originX + columnDrag.dx), y: Math.round(columnDrag.originY + columnDrag.dy) },
        })
      }
    }
    if (cardResize && (cardResize.w !== cardResize.originW || cardResize.h !== cardResize.originH)) {
      savePosition(cardResize.kind, cardResize.id, { ...cardResize.stored, w: cardResize.w, h: cardResize.h })
    }
    // 在多選中單純點一下（沒拖動）→ 只選這張
    if (cardDrag && !cardDrag.moved && cardDrag.items.length > 1) setSelectedKey(cardDrag.key)
    const attachment = cardDrag?.moved && event && event.type !== 'pointercancel' ? imageDropTarget(cardDrag, event.clientX, event.clientY) : null
    if (attachment) {
      attachImageCard(cardDrag.items[0].id, attachment)
    } else if (cardDrag?.moved && (cardDrag.dx !== 0 || cardDrag.dy !== 0)) {
      cardDrag.items.forEach((item) => {
        savePosition(item.kind, item.id, {
          ...item.stored,
          x: item.originX + cardDrag.dx,
          y: item.originY + cardDrag.dy,
        })
      })
      // 放在欄位上 → 收進欄位（依放開的高度決定插入位置）；放在空白處 → 移出原本的欄位
      const dockKeys = cardDrag.items.filter((item) => item.kind !== 'h').map((item) => item.key)
      const target = dockKeys.length > 0 && event ? columnAt(event.clientX, event.clientY) : null
      if (target) {
        const rows = Array.from(target.el.querySelectorAll('[data-column-body] > [data-card-key]'))
        const index = target.column.collapsed ? null : rows.filter((row) => {
          const rect = row.getBoundingClientRect()
          return event.clientY > rect.top + rect.height / 2
        }).length
        placeCardsInColumn(dockKeys, target.column.id, index)
      } else if (dockKeys.some((key) => dockedColumnOf[key] != null)) {
        placeCardsInColumn(dockKeys, null)
      }
    }
    setColumnResize(null)
    setColumnDrag(null)
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

  // 卡片畫在畫布上，或收在欄位裡（docked）
  const renderQuestCard = (quest, docked = false) => {
    const key = `q:${quest.id}`
    const storedPosition = quest.canvasPosition ?? defaults[quest.id]
    const stackIndex = stackOrder.indexOf(key)
    return (
      <div key={key} data-card-key={key} data-image-drop-target={cardDrag?.overAttachmentKey === key || undefined} className={`pointer-events-auto ${docked ? DOCKED_CARD_CLASS : ''} ${isCut(key) ? 'opacity-40' : ''}`}>
        <CanvasCard
          quest={quest}
          position={docked ? DOCKED_POSITION : getPosition(key, storedPosition)}
          zIndex={docked ? undefined : pinnedAnchors[key] ? 900 + stackIndex : cardDrag?.moved && cardDrag.items.some((item) => item.key === key) ? 1000 + stackIndex : stackIndex + 1}
          selected={isSelected(key)}
          dragging={Boolean(cardDrag?.moved && cardDrag.items.some((item) => item.key === key))}
          onDragStart={(event) => startCardDrag(event, 'q', quest.id)}
          onResizeStart={(event) => startCardResize(event, 'q', quest.id, storedPosition)}
          onToggleCollapsed={() => toggleCollapsed(key)}
          onSetSchedule={onSetSchedule}
          onSetStatus={onSetQuestStatus}
          now={now}
          focusEdit={focusEditKey === key}
          lockedExpLevels={lockedExpLevels}
          onUpdateQuest={onUpdateQuest}
          onToggleSubTask={onToggleSubTask}
          onSetExp={onSetExp}
          onSetSubTaskExp={onSetSubTaskExp}
          onRemoveSubTask={onRemoveSubTask}
          onUpdateSubTask={onUpdateSubTask}
          onReorderSubTasks={onReorderSubTasks}
          onSetSubTaskView={onSetQuestSubTaskView}
          onToggleSubTaskPin={onToggleSubTaskPin}
          onAddSubTask={onAddSubTask}
          onAddSubTaskImage={onAddSubTaskImage}
        />
      </div>
    )
  }

  const renderNoteCard = (note, docked = false) => {
    const key = `n:${note.id}`
    const stackIndex = stackOrder.indexOf(key)
    const NoteComponent = note.isImage ? ImageCanvasCard : note.isTable ? CanvasTableCard : NoteCard
    return (
      <div key={key} data-card-key={key} data-image-drop-target={cardDrag?.overAttachmentKey === key || undefined} className={`pointer-events-auto ${docked ? DOCKED_CARD_CLASS : ''} ${isCut(key) ? 'opacity-40' : ''}`}>
        <NoteComponent
          note={note}
          position={docked ? DOCKED_POSITION : getPosition(key, note.position)}
          zIndex={docked ? undefined : pinnedAnchors[key] ? 900 + stackIndex : cardDrag?.moved && cardDrag.items.some((item) => item.key === key) ? 1000 + stackIndex : stackIndex + 1}
          selected={isSelected(key)}
          dragging={Boolean(cardDrag?.moved && cardDrag.items.some((item) => item.key === key))}
          editing={editingNoteId === note.id}
          onStartEdit={() => setEditingNoteId(note.id)}
          onStopEdit={() => setEditingNoteId((prev) => (prev === note.id ? null : prev))}
          onDragStart={(event) => startCardDrag(event, 'n', note.id)}
          onResizeStart={(event) => startCardResize(event, 'n', note.id, note.position)}
          onToggleCollapsed={() => toggleCollapsed(key)}
          onUpdate={updateNote}
          onAddImage={addNoteImage}
          onRemoveImage={removeNoteImage}
          boardCount={note.isBoard ? boardItemCount(note.id) : 0}
          onOpenBoard={() => openSubBoard(note)}
        />
      </div>
    )
  }

  const gridSize = 18 * viewport.zoom

  return (
    <div className={`relative h-[calc(100vh-260px)] min-h-[520px] overflow-hidden border border-slate-200 bg-slate-50 ${attached ? 'work-task-body rounded-b-xl border-t-0' : 'rounded-xl'}`}>
      <div
        ref={boardRef}
        className={`absolute inset-0 touch-none ${cardResize || columnResize ? 'cursor-nwse-resize' : panDrag ? 'cursor-grabbing' : 'cursor-grab'}`}
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
          {columns.map((column) => {
            const members = column.cardKeys.filter((key) => dockedColumnOf[key] === column.id && isDocked(key))
            const position = columnDrag?.moved && columnDrag.id === column.id
              ? { x: columnDrag.originX + columnDrag.dx, y: columnDrag.originY + columnDrag.dy }
              : column.position
            return (
              <div key={`c:${column.id}`} className="pointer-events-auto">
                <ColumnCard
                  column={column}
                  position={position}
                  width={columnResize?.id === column.id ? columnResize.w : column.position.w ?? COLUMN_WIDTH}
                  count={members.length}
                  dropActive={Boolean(cardDrag?.moved && cardDrag.overColumnId === column.id)}
                  dragging={Boolean(columnDrag?.moved && columnDrag.id === column.id)}
                  onDragStart={(event) => startColumnDrag(event, column)}
                  onResizeStart={(event) => startColumnResize(event, column)}
                  onToggleCollapsed={() => {
                    updateColumn(column.id, { collapsed: !column.collapsed })
                    if (!column.collapsed) setSelectedKeys((keys) => keys.filter((key) => !column.cardKeys.includes(key)))
                  }}
                  onRename={(title) => updateColumn(column.id, { title })}
                  onRemove={() => removeColumnKeepCards(column)}
                >
                  {members.map((key) => {
                    const quest = quests.find((item) => `q:${item.id}` === key)
                    if (quest) return renderQuestCard(quest, true)
                    const note = notes.find((item) => `n:${item.id}` === key)
                    return note ? renderNoteCard(note, true) : null
                  })}
                </ColumnCard>
              </div>
            )
          })}
          {quests.filter((quest) => !isDocked(`q:${quest.id}`)).map((quest) => renderQuestCard(quest))}
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
          {notes.filter((note) => !isDocked(`n:${note.id}`)).map((note) => renderNoteCard(note))}
        </div>

        {quests.length === 0 && notes.length === 0 && columns.length === 0 && !huntTarget && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-slate-400">
            <p className="m-0 text-base font-semibold">畫布是空的</p>
            <p className="m-0 mt-1 text-sm">雙擊空白處新增卡片，或直接貼上／拖入圖片</p>
          </div>
        )}
      </div>

      {boardStack.length > 0 && (
        <nav data-canvas-ui className="absolute left-1/2 top-3 z-[1100] flex max-w-[calc(100%-180px)] -translate-x-1/2 items-center gap-0.5 overflow-hidden rounded-full border border-slate-200 bg-white/95 py-1 pl-1 pr-3 text-sm shadow-sm backdrop-blur">
          <button
            type="button"
            onClick={() => navigateToBoard(boardStack.slice(0, -1))}
            className="mr-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
            title="回上一層"
            aria-label="回上一層"
          >
            <ArrowBackIcon sx={{ fontSize: 16 }} />
          </button>
          <button
            type="button"
            onClick={() => navigateToBoard([])}
            className="shrink-0 rounded bg-transparent px-1 font-semibold text-slate-500 hover:text-slate-900"
          >
            {rootLabel}
          </button>
          {boardStack.map((id, index) => {
            const boardNote = allNotes.find((note) => note.id === id)
            const last = index === boardStack.length - 1
            return (
              <span key={id} className="flex min-w-0 items-center gap-0.5">
                <ChevronRightRoundedIcon sx={{ fontSize: 16 }} className="shrink-0 text-slate-300" />
                {last ? (
                  <span className="truncate px-1 font-bold text-slate-900">{boardNote?.title || '未命名 Board'}</span>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigateToBoard(boardStack.slice(0, index + 1))}
                    className="truncate rounded bg-transparent px-1 font-semibold text-slate-500 hover:text-slate-900"
                  >
                    {boardNote?.title || '未命名 Board'}
                  </button>
                )}
              </span>
            )
          })}
        </nav>
      )}

      {/* 左側工具列：沒選取時是新增工具；選取卡片時暫時變成該卡片的專屬功能 */}
      <div data-canvas-ui className="absolute left-3 top-3 z-[1100] flex max-h-[calc(100%-24px)] select-none flex-col gap-1 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm">
        {selectionTools ? (
          <>
            <button
              type="button"
              onClick={() => setSelectedKeys([])}
              className="flex h-8 w-14 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
              title="返回工具箱（Esc）"
              aria-label="返回工具箱"
            >
              <ArrowBackIcon sx={{ fontSize: 18 }} />
            </button>
            <span className="w-14 border-b border-slate-100 pb-1.5 text-center text-[10px] font-bold text-purple-600">{selectionTools.label}</span>
            {selectionTools.actions.map((action) => (
              <button
                key={action.id}
                type="button"
                onClick={action.onClick}
                className={`flex w-14 flex-col items-center gap-0.5 rounded-lg py-2 text-[11px] font-semibold ${
                  action.active ? 'bg-purple-50 text-purple-600' : action.danger ? 'bg-transparent text-slate-600 hover:bg-red-50 hover:text-red-500' : 'bg-transparent text-slate-600 hover:bg-slate-100'
                }`}
                title={action.title}
                style={action.color ? { color: action.color } : undefined}
              >
                {action.icon}{action.label}
              </button>
            ))}
          </>
        ) : (
        <>
        <button
          type="button"
          onPointerDown={(e) => startToolDrag(e, 'q')}
          onClick={() => handleToolClick(() => createCard(viewportCenter()))}
          className="flex w-14 cursor-grab touch-none flex-col items-center gap-0.5 rounded-lg bg-transparent py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
          title="點一下新增待辦卡片，或拖到畫布上指定位置（也可雙擊畫布空白處）"
        >
          <ChecklistOutlinedIcon sx={{ fontSize: 22 }} />待辦
        </button>
        <button
          type="button"
          onPointerDown={(e) => startToolDrag(e, 'n')}
          onClick={() => handleToolClick(() => createNote())}
          className="flex w-14 cursor-grab touch-none flex-col items-center gap-0.5 rounded-lg bg-transparent py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
          title="點一下新增筆記，或拖到畫布上指定位置"
        >
          <StickyNote2OutlinedIcon sx={{ fontSize: 22 }} />筆記
        </button>
        <button
          type="button"
          onPointerDown={(e) => startToolDrag(e, 't')}
          onClick={() => handleToolClick(() => createTable())}
          className="flex w-14 cursor-grab touch-none flex-col items-center gap-0.5 rounded-lg bg-transparent py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
          title="點一下新增表格，或拖到畫布上指定位置"
          aria-label="新增表格"
        >
          <TableChartOutlinedIcon sx={{ fontSize: 22 }} />表格
        </button>
        <button
          type="button"
          onPointerDown={(e) => startToolDrag(e, 'c')}
          onClick={() => handleToolClick(() => createColumn())}
          className="flex w-14 cursor-grab touch-none flex-col items-center gap-0.5 rounded-lg bg-transparent py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
          title="新增欄位：把待辦、筆記、圖片卡片拖進去收成一組"
        >
          <ViewColumnOutlinedIcon sx={{ fontSize: 22 }} />欄位
        </button>
        <button
          type="button"
          onPointerDown={(e) => startToolDrag(e, 'b')}
          onClick={() => handleToolClick(() => createBoard())}
          className="flex w-14 cursor-grab touch-none flex-col items-center gap-0.5 rounded-lg bg-transparent py-2 text-[11px] font-semibold text-slate-600 hover:bg-slate-100"
          title="新增 Board：雙擊進去就是一張獨立畫布"
        >
          <SpaceDashboardOutlinedIcon sx={{ fontSize: 22 }} />Board
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
        </>
        )}
        <input
          ref={noteImageInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? [])
            e.target.value = ''
            if (selectedNote) files.forEach((file) => addNoteImage(selectedNote.id, file))
          }}
        />
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

      {toolPopover && selectedNote && (
        <>
          <div data-canvas-ui className="absolute inset-0 z-[1090]" onPointerDown={() => setToolPopover(null)} />
          <div data-canvas-ui className="absolute left-[84px] top-3 z-[1100] rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
            {toolPopover === 'stamps' ? (
              <div className="flex w-[150px] flex-col gap-0.5">
                <p className="m-0 px-1.5 pb-0.5 text-[11px] font-bold text-slate-400">印章</p>
                {Object.entries(NOTE_STAMPS).map(([stampKey, item]) => {
                  const active = selectedNote.stamp === stampKey
                  return (
                    <button
                      key={stampKey}
                      type="button"
                      onClick={() => {
                        updateNote(selectedNote.id, { stamp: active ? null : stampKey })
                        setToolPopover(null)
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
            ) : (
              <div className="flex w-[150px] flex-wrap gap-1.5">
                {Object.entries(NOTE_COLORS).map(([colorKey, [hex, label]]) => (
                  <button
                    key={colorKey}
                    type="button"
                    onClick={() => {
                      updateNote(selectedNote.id, { color: colorKey })
                      setToolPopover(null)
                    }}
                    className={`h-6 w-6 rounded-full border-2 ${selectedNote.color === colorKey ? 'border-purple-500' : 'border-slate-200'}`}
                    style={{ background: hex }}
                    title={label}
                    aria-label={`${label}色`}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

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

      {toolDrag?.moved && (
        <div
          className="pointer-events-none fixed z-[2000] w-40 -translate-x-6 -translate-y-4 rounded-lg border-2 border-dashed border-purple-400 px-3 py-2 text-sm font-bold text-slate-700 opacity-90 shadow-xl"
          style={{ left: toolDrag.x, top: toolDrag.y, background: toolDrag.kind === 'n' ? NOTE_COLORS[DEFAULT_NOTE_COLOR][0] : '#ffffff' }}
        >
          {toolDrag.kind === 'n' ? '新筆記' : toolDrag.kind === 'c' ? '新欄位' : toolDrag.kind === 'b' ? '新 Board' : toolDrag.kind === 't' ? '新表格' : '新卡片'}
          <p className="m-0 mt-1 text-[11px] font-medium text-slate-400">放開即可新增</p>
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

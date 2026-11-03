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
import StoredImage from '../common/StoredImage'
import useCanvasNotes, { NOTE_COLORS } from '../../hooks/useCanvasNotes'
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

const QUEST_EXP_OPTIONS = [
  [1, '一般 +1'],
  [3, '中等 +3'],
  [5, '上等 +5'],
  [10, '特級 +10'],
  [20, '特殊 +20'],
]

const isTypingTarget = (el) => el instanceof HTMLElement && (el.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))

function readViewport() {
  try {
    const stored = JSON.parse(localStorage.getItem(VIEWPORT_KEY) || 'null')
    if (Number.isFinite(stored?.x) && Number.isFinite(stored?.y) && Number.isFinite(stored?.zoom)) return stored
  } catch {
    // Start from the default viewport if the saved value is malformed.
  }
  return { x: 0, y: 0, zoom: 1 }
}

const clampZoom = (zoom) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom))

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

function CanvasCard({ quest, position, zIndex, selected, dragging, onDragStart, onDelete, onOpenDetails, onUpdateQuest, onSetExp, onSetSubTaskExp, onToggleSubTask, onRemoveSubTask, onAddSubTask, onAddSubTaskImage }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const fileInputRef = useRef(null)
  const subTasks = quest.subTasks ?? []
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
      className={`group/card absolute flex touch-none select-none flex-col overflow-hidden rounded-lg border bg-white transition-shadow ${
        dragging ? 'cursor-grabbing shadow-[0_12px_32px_rgba(15,23,42,0.18)]' : 'cursor-grab shadow-[0_2px_10px_rgba(15,23,42,0.08)]'
      } ${selected ? 'border-purple-400 ring-2 ring-purple-300' : 'border-slate-200'}`}
      style={{ width: CARD_WIDTH, left: position.x, top: position.y, zIndex }}
      onPointerDown={onDragStart}
    >
      {quest.cover && (
        <img src={quest.cover} alt="" className="block max-h-56 w-full bg-slate-900 object-contain" draggable={false} />
      )}
      <div className="flex items-start gap-1 px-4 pb-2 pt-3">
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
          onClick={onDelete}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-transparent text-slate-300 opacity-0 transition-opacity hover:text-red-500 group-hover/card:opacity-100"
          title="刪除卡片（選取後也可按 Delete）"
          aria-label="刪除卡片"
        >
          <DeleteOutlineIcon sx={{ fontSize: 16 }} />
        </button>
      </div>

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

      <div className="flex flex-col gap-1.5 border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        <div className="flex items-center justify-between gap-2">
          <span>{doneCount} / {subTasks.length} 完成</span>
          {quest.completed ? (
            <span className="font-semibold text-emerald-600">✓ 已獲得完成獎勵</span>
          ) : earnedItemExp > 0 && (
            <span className="font-semibold text-purple-600">已獲得 {earnedItemExp} EXP</span>
          )}
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
              {QUEST_EXP_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          </label>
        </div>
      </div>
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
function HuntCanvasCard({ target, handlers, position, zIndex, selected, dragging, onDragStart, onOpenHunt }) {
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
      className={`group/hunt absolute flex touch-none select-none flex-col overflow-hidden rounded-lg border-2 bg-white transition-shadow ${
        dragging ? 'cursor-grabbing shadow-[0_12px_32px_rgba(15,23,42,0.22)]' : 'cursor-grab shadow-[0_2px_12px_rgba(239,68,68,0.18)]'
      } ${selected ? 'border-red-500 ring-2 ring-red-300' : 'border-red-400'}`}
      style={{ width: HUNT_WIDTH, left: position.x, top: position.y, zIndex }}
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
    </div>
  )
}

// 便利貼筆記：雙擊編輯，可放圖片（滑鼠移到筆記上 Ctrl+V 也能貼上）
function NoteCard({ note, position, zIndex, selected, dragging, editing, onStartEdit, onStopEdit, onDragStart, onDelete, onUpdate, onAddImage, onRemoveImage }) {
  const fileInputRef = useRef(null)
  const [showColors, setShowColors] = useState(false)
  const [titleDraft, setTitleDraft] = useState(note.title)
  const [textDraft, setTextDraft] = useState(note.text)

  useEffect(() => {
    if (editing) return
    setTitleDraft(note.title)
    setTextDraft(note.text)
  }, [editing, note.title, note.text])

  useEffect(() => {
    if (!selected) setShowColors(false)
  }, [selected])

  const commit = () => {
    if (titleDraft !== note.title || textDraft !== note.text) onUpdate(note.id, { title: titleDraft.trim(), text: textDraft })
    onStopEdit()
  }

  const background = NOTE_COLORS[note.color]?.[0] ?? NOTE_COLORS.yellow[0]
  const isEmpty = !note.title && !note.text && note.imageIds.length === 0

  return (
    <div
      data-canvas-card
      className={`group/note absolute touch-none select-none rounded-sm ${
        dragging ? 'cursor-grabbing' : editing ? 'cursor-default' : 'cursor-grab'
      } ${selected ? 'outline outline-2 outline-offset-2 outline-purple-400' : ''}`}
      style={{
        width: NOTE_WIDTH,
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
        className="relative text-[#2b2b2b]"
        style={{ background, clipPath: 'polygon(0 0, 100% 0, 100% calc(100% - 18px), calc(100% - 18px) 100%, 0 100%)' }}
      >
        {note.imageIds.length > 0 && (
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

        <div className={`absolute right-1.5 top-1.5 flex gap-0.5 rounded-md bg-white/75 p-0.5 transition-opacity ${selected || showColors ? 'opacity-100' : 'opacity-0 group-hover/note:opacity-100'}`}>
          <button
            type="button"
            onClick={() => setShowColors((prev) => !prev)}
            className="flex h-6 w-6 items-center justify-center rounded bg-transparent text-slate-500 hover:text-slate-900"
            title="顏色"
            aria-label="筆記顏色"
          >
            <PaletteOutlinedIcon sx={{ fontSize: 15 }} />
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
      </div>

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
    </div>
  )
}

export default function QuestCanvasView({ quests, huntTarget = null, huntTaskHandlers = {}, onOpenHunt, onPositionChange, onOpenDetails, onUpdateQuest, onSetExp, onSetSubTaskExp, onRemoveQuest, onToggleSubTask, onRemoveSubTask, onAddSubTask, onAddSubTaskImage, onAddCanvasQuest }) {
  const boardRef = useRef(null)
  const imageInputRef = useRef(null)
  const pointerRef = useRef(null)
  const [viewport, setViewport] = useState(readViewport)
  const [cardDrag, setCardDrag] = useState(null)
  const [panDrag, setPanDrag] = useState(null)
  const [stackOrder, setStackOrder] = useState([])
  // Selection, stacking and drag use keys: `q:<questId>` for task cards, `n:<noteId>` for notes
  const [selectedKey, setSelectedKey] = useState(null)
  const [editingNoteId, setEditingNoteId] = useState(null)
  const [huntPosition, setHuntPosition] = useState(readHuntPosition)
  const { notes, addNote, updateNote, addNoteImage, removeNoteImage, removeNote } = useCanvasNotes()
  const defaults = buildDefaultPositions(quests)

  useEffect(() => {
    try {
      localStorage.setItem(VIEWPORT_KEY, JSON.stringify(viewport))
    } catch {
      // Viewport persistence is optional.
    }
  }, [viewport])

  const deleteCard = (quest) => {
    const hasContent = (quest.subTasks ?? []).length > 0
    if (hasContent && !window.confirm(`確定要刪除「${quest.text}」？卡片內的項目和圖片也會一起刪除。`)) return
    onRemoveQuest(quest.id)
    setSelectedKey((prev) => (prev === `q:${quest.id}` ? null : prev))
  }

  const deleteNote = (note) => {
    const hasContent = note.title || note.text || note.imageIds.length > 0
    if (hasContent && !window.confirm(`確定要刪除這張筆記${note.title ? `「${note.title}」` : ''}？筆記內的圖片也會一起刪除。`)) return
    removeNote(note.id)
    setSelectedKey((prev) => (prev === `n:${note.id}` ? null : prev))
  }

  useEffect(() => {
    if (selectedKey === null) return undefined
    const handleKey = (event) => {
      if (isTypingTarget(document.activeElement)) return
      if (event.key === 'Escape') setSelectedKey(null)
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      const quest = quests.find((item) => `q:${item.id}` === selectedKey)
      const note = notes.find((item) => `n:${item.id}` === selectedKey)
      if (!quest && !note) return
      event.preventDefault()
      if (quest) deleteCard(quest)
      else deleteNote(note)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const getPosition = (key, storedPosition) => {
    if (cardDrag?.key === key && cardDrag.moved) return { x: cardDrag.x, y: cardDrag.y }
    return storedPosition
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
    onAddCanvasQuest(imageFile ? '圖片' : '新卡片', { x: Math.max(0, position.x), y: Math.max(0, position.y) }, imageFile)
  }

  const createNote = async () => {
    const rect = boardRef.current.getBoundingClientRect()
    const center = toWorld(rect.left + rect.width / 2, rect.top + rect.height / 3)
    const id = await addNote({ x: Math.max(0, center.x - NOTE_WIDTH / 2), y: Math.max(0, center.y) })
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
    setSelectedKey(null)
    setPanDrag({ startX: event.clientX, startY: event.clientY, originX: viewport.x, originY: viewport.y })
  }

  // 卡片任何地方都能拖；按在輸入框、按鈕、勾選框上則照常操作
  const startCardDrag = (event, kind, id, storedPosition) => {
    event.stopPropagation()
    const key = `${kind}:${id}`
    setSelectedKey(key)
    setStackOrder((prev) => [...prev.filter((item) => item !== key), key])
    if (event.button !== 0 || event.target.closest(INTERACTIVE_SELECTOR)) return
    if (isTypingTarget(document.activeElement)) document.activeElement.blur()
    const origin = getPosition(key, storedPosition)
    setCardDrag({ key, kind, id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: origin.x, originY: origin.y, x: origin.x, y: origin.y, moved: false })
  }

  const handlePointerMove = (event) => {
    pointerRef.current = { x: event.clientX, y: event.clientY }
    if (cardDrag) {
      const dx = event.clientX - cardDrag.startX
      const dy = event.clientY - cardDrag.startY
      if (!cardDrag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return
      // 超過門檻才 capture，雙擊標題等點擊事件才不會被導到畫布上
      if (!cardDrag.moved) boardRef.current.setPointerCapture(cardDrag.pointerId)
      setCardDrag({
        ...cardDrag,
        moved: true,
        x: Math.max(0, cardDrag.originX + dx / viewport.zoom),
        y: Math.max(0, cardDrag.originY + dy / viewport.zoom),
      })
    } else if (panDrag) {
      setViewport((prev) => ({
        ...prev,
        x: panDrag.originX + event.clientX - panDrag.startX,
        y: panDrag.originY + event.clientY - panDrag.startY,
      }))
    }
  }

  const handlePointerUp = () => {
    if (cardDrag?.moved && (cardDrag.x !== cardDrag.originX || cardDrag.y !== cardDrag.originY)) {
      const position = { x: cardDrag.x, y: cardDrag.y }
      if (cardDrag.kind === 'n') updateNote(cardDrag.id, { position })
      else if (cardDrag.kind === 'h') {
        setHuntPosition(position)
        try {
          localStorage.setItem(HUNT_POSITION_KEY, JSON.stringify(position))
        } catch {
          // Card position persistence is optional.
        }
      } else onPositionChange(cardDrag.id, position)
    }
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
        className={`absolute inset-0 touch-none ${panDrag ? 'cursor-grabbing' : 'cursor-grab'}`}
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
              <div key={key} className="pointer-events-auto">
                <CanvasCard
                  quest={quest}
                  position={getPosition(key, storedPosition)}
                  zIndex={cardDrag?.key === key ? 1000 : stackIndex + 1}
                  selected={selectedKey === key}
                  dragging={cardDrag?.key === key && cardDrag.moved}
                  onDragStart={(event) => startCardDrag(event, 'q', quest.id, storedPosition)}
                  onDelete={() => deleteCard(quest)}
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
                zIndex={cardDrag?.key === 'h:hunt' ? 1000 : stackOrder.indexOf('h:hunt') + 1}
                selected={selectedKey === 'h:hunt'}
                dragging={cardDrag?.key === 'h:hunt' && cardDrag.moved}
                onDragStart={(event) => startCardDrag(event, 'h', 'hunt', huntPosition)}
                onOpenHunt={onOpenHunt}
              />
            </div>
          )}
          {notes.map((note) => {
            const key = `n:${note.id}`
            const stackIndex = stackOrder.indexOf(key)
            return (
              <div key={key} className="pointer-events-auto">
                <NoteCard
                  note={note}
                  position={getPosition(key, note.position)}
                  zIndex={cardDrag?.key === key ? 1000 : stackIndex + 1}
                  selected={selectedKey === key}
                  dragging={cardDrag?.key === key && cardDrag.moved}
                  editing={editingNoteId === note.id}
                  onStartEdit={() => setEditingNoteId(note.id)}
                  onStopEdit={() => setEditingNoteId((prev) => (prev === note.id ? null : prev))}
                  onDragStart={(event) => startCardDrag(event, 'n', note.id, note.position)}
                  onDelete={() => deleteNote(note)}
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

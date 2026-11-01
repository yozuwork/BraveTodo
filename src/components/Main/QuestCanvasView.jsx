import { useEffect, useRef, useState } from 'react'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import CloseIcon from '@mui/icons-material/Close'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import ChecklistOutlinedIcon from '@mui/icons-material/ChecklistOutlined'
import OpenInFullOutlinedIcon from '@mui/icons-material/OpenInFullOutlined'
import CenterFocusStrongOutlinedIcon from '@mui/icons-material/CenterFocusStrongOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import StoredImage from '../common/StoredImage'

const CARD_WIDTH = 260
const GAP = 24
const COLUMNS = 3
const MIN_ZOOM = 0.3
const MAX_ZOOM = 2
const VIEWPORT_KEY = 'brave-todo:canvas-viewport'
const DRAG_THRESHOLD = 4
const INTERACTIVE_SELECTOR = 'input, textarea, button, a, select, label'

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

function CanvasCard({ quest, position, zIndex, selected, dragging, onDragStart, onDelete, onOpenDetails, onUpdateQuest, onToggleSubTask, onRemoveSubTask, onAddSubTask, onAddSubTaskImage }) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const fileInputRef = useRef(null)
  const subTasks = quest.subTasks ?? []
  const doneCount = subTasks.filter((sub) => sub.completed).length

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

      <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-500">
        {doneCount} / {subTasks.length} 完成
      </div>
    </div>
  )
}

export default function QuestCanvasView({ quests, onPositionChange, onOpenDetails, onUpdateQuest, onRemoveQuest, onToggleSubTask, onRemoveSubTask, onAddSubTask, onAddSubTaskImage, onAddCanvasQuest }) {
  const boardRef = useRef(null)
  const imageInputRef = useRef(null)
  const pointerRef = useRef(null)
  const [viewport, setViewport] = useState(readViewport)
  const [cardDrag, setCardDrag] = useState(null)
  const [panDrag, setPanDrag] = useState(null)
  const [stackOrder, setStackOrder] = useState([])
  const [selectedId, setSelectedId] = useState(null)
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
    setSelectedId((prev) => (prev === quest.id ? null : prev))
  }

  useEffect(() => {
    if (selectedId === null) return undefined
    const handleKey = (event) => {
      if (isTypingTarget(document.activeElement)) return
      if (event.key === 'Escape') setSelectedId(null)
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      const quest = quests.find((item) => item.id === selectedId)
      if (!quest) return
      event.preventDefault()
      deleteCard(quest)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const getPosition = (quest) => {
    if (cardDrag?.id === quest.id && cardDrag.moved) return { x: cardDrag.x, y: cardDrag.y }
    return quest.canvasPosition ?? defaults[quest.id]
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
    setSelectedId(null)
    setPanDrag({ startX: event.clientX, startY: event.clientY, originX: viewport.x, originY: viewport.y })
  }

  // 卡片任何地方都能拖；按在輸入框、按鈕、勾選框上則照常操作
  const startCardDrag = (event, quest) => {
    event.stopPropagation()
    setSelectedId(quest.id)
    setStackOrder((prev) => [...prev.filter((id) => id !== quest.id), quest.id])
    if (event.button !== 0 || event.target.closest(INTERACTIVE_SELECTOR)) return
    if (isTypingTarget(document.activeElement)) document.activeElement.blur()
    const origin = getPosition(quest)
    setCardDrag({ id: quest.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, originX: origin.x, originY: origin.y, x: origin.x, y: origin.y, moved: false })
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
      onPositionChange(cardDrag.id, { x: cardDrag.x, y: cardDrag.y })
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
            const stackIndex = stackOrder.indexOf(quest.id)
            return (
              <div key={quest.id} className="pointer-events-auto">
                <CanvasCard
                  quest={quest}
                  position={getPosition(quest)}
                  zIndex={cardDrag?.id === quest.id ? 1000 : stackIndex + 1}
                  selected={selectedId === quest.id}
                  dragging={cardDrag?.id === quest.id && cardDrag.moved}
                  onDragStart={(event) => startCardDrag(event, quest)}
                  onDelete={() => deleteCard(quest)}
                  onOpenDetails={onOpenDetails}
                  onUpdateQuest={onUpdateQuest}
                  onToggleSubTask={onToggleSubTask}
                  onRemoveSubTask={onRemoveSubTask}
                  onAddSubTask={onAddSubTask}
                  onAddSubTaskImage={onAddSubTaskImage}
                />
              </div>
            )
          })}
        </div>

        {quests.length === 0 && (
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

import { useEffect, useRef, useState } from 'react'
import Drawer from '@mui/material/Drawer'
import Checkbox from '@mui/material/Checkbox'
import Switch from '@mui/material/Switch'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import AddPhotoAlternateOutlinedIcon from '@mui/icons-material/AddPhotoAlternateOutlined'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import AddIcon from '@mui/icons-material/Add'
import StarIcon from '@mui/icons-material/Star'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined'
import StoredImage from '../common/StoredImage'

const PRIORITIES = [
  ['high', '優先'],
  ['normal', '次要'],
  ['low', '最後'],
]

const EXP_OPTIONS = [
  [1, '一般 +1'],
  [3, '中等 +3'],
  [5, '上等 +5'],
  [10, '特級 +10'],
  [20, '特殊任務 +20'],
]

export default function QuestDetailDrawer({
  lockedExpLevels = {},
  open,
  quest,
  defaultCover,
  onClose,
  onUpdate,
  onCoverChange,
  onCardMediaChange,
  globalCoverRatio,
  onAllCoverRatioChange,
  onToggle,
  onRemove,
  onTogglePin,
  onToggleCore,
  onSaveTemplate,
  onSetPriority,
  onSetStatus,
  onSetExp,
  onAddSubTask,
  onToggleSubTask,
  onRemoveSubTask,
  onUpdateSubTask,
}) {
  const [title, setTitle] = useState('')
  const [subTaskDraft, setSubTaskDraft] = useState('')
  const coverInputRef = useRef(null)
  const coverDragRef = useRef(null)
  const [previewPosition, setPreviewPosition] = useState({ x: 50, y: 50 })
  const [previewCoverRatio, setPreviewCoverRatio] = useState(100)
  const subTasks = quest?.subTasks ?? []
  const completedSubTasks = subTasks.filter((subTask) => subTask.completed).length
  const hp = quest?.completed
    ? 0
    : subTasks.length > 0
      ? Math.round(((subTasks.length - completedSubTasks) / subTasks.length) * 100)
      : 100

  useEffect(() => {
    setTitle(quest?.text ?? '')
    setSubTaskDraft('')
  }, [quest?.id, quest?.text])

  useEffect(() => {
    setPreviewPosition(quest?.coverPosition ?? { x: 50, y: 50 })
  }, [quest?.coverPosition])

  useEffect(() => {
    setPreviewCoverRatio(globalCoverRatio ?? 100)
  }, [globalCoverRatio])

  if (!quest) return null

  const commitTitle = () => {
    const value = title.trim()
    if (value && value !== quest.text) onUpdate(quest.id, value)
    else if (!value) setTitle(quest.text)
  }

  const changeStatus = (status) => {
    if (status === 'completed') {
      if (!quest.completed) onToggle(quest.id)
      return
    }
    if (quest.completed) onToggle(quest.id)
    onSetStatus(quest.id, status)
  }

  const addSubTask = (event) => {
    event.preventDefault()
    const value = subTaskDraft.trim()
    if (!value) return
    onAddSubTask(quest.id, value)
    setSubTaskDraft('')
  }

  const deleteQuest = () => {
    if (!window.confirm(`確定要刪除「${quest.text}」嗎？`)) return
    onRemove(quest.id)
    onClose()
  }

  const startCoverDrag = (event) => {
    if (quest.coverFit === 'contain') return
    event.preventDefault()
    event.currentTarget.setPointerCapture(event.pointerId)
    const rect = event.currentTarget.getBoundingClientRect()
    coverDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      width: rect.width,
      height: rect.height,
      position: previewPosition,
    }
  }

  const moveCover = (event) => {
    if (!coverDragRef.current) return
    const drag = coverDragRef.current
    const next = {
      x: Math.min(100, Math.max(0, drag.position.x - ((event.clientX - drag.startX) / drag.width) * 100)),
      y: Math.min(100, Math.max(0, drag.position.y - ((event.clientY - drag.startY) / drag.height) * 100)),
    }
    coverDragRef.current.next = next
    setPreviewPosition(next)
  }

  const finishCoverDrag = () => {
    if (!coverDragRef.current) return
    const next = coverDragRef.current.next ?? previewPosition
    coverDragRef.current = null
    onCardMediaChange(quest.id, { coverPosition: next })
  }

  const commitCoverRatio = () => {
    onAllCoverRatioChange(previewCoverRatio)
  }

  const fieldClass = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-purple-400'

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: { xs: '100%', sm: 430 },
          maxWidth: '100vw',
          bgcolor: '#fff',
          backgroundImage: 'none',
        },
      }}
    >
      <aside className="quest-detail-drawer flex min-h-full flex-col text-slate-900">
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div>
            <p className="m-0 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Quest Detail</p>
            <h2 className="m-0 mt-1 text-lg font-extrabold">查看／編輯任務</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600" aria-label="關閉">
            <CloseIcon />
          </button>
        </header>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto px-5 py-5">
          <section>
            <div
              className={`relative h-44 touch-none overflow-hidden rounded-xl border border-slate-200 bg-slate-100 ${quest.coverFit === 'contain' ? '' : 'cursor-grab active:cursor-grabbing'}`}
              style={{ height: `${Math.round(176 * (previewCoverRatio / 100))}px` }}
              onPointerDown={startCoverDrag}
              onPointerMove={moveCover}
              onPointerUp={finishCoverDrag}
              onPointerCancel={finishCoverDrag}
            >
              <img
                src={quest.cover || defaultCover}
                alt="任務卡片圖片"
                className="pointer-events-none h-full w-full select-none"
                style={{
                  objectFit: quest.coverFit === 'contain' ? 'contain' : 'cover',
                  objectPosition: `${previewPosition.x}% ${previewPosition.y}%`,
                }}
                draggable={false}
              />
              {quest.coverFit !== 'contain' && (
                <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/65 px-3 py-1 text-[11px] font-bold text-white">拖曳調整顯示範圍</span>
              )}
              <div className="absolute inset-x-3 bottom-3 flex flex-wrap justify-end gap-2" onPointerDown={(event) => event.stopPropagation()}>
                <button type="button" onClick={() => coverInputRef.current?.click()} className="flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow">
                  <AddPhotoAlternateOutlinedIcon sx={{ fontSize: 17 }} />上傳圖片
                </button>
                {quest.cover && (
                  <button type="button" onClick={() => onCoverChange(quest.id, null)} className="flex items-center gap-2 rounded-lg bg-white/95 px-3 py-2 text-xs font-bold text-slate-700 shadow">
                    <RestartAltIcon sx={{ fontSize: 17 }} />恢復頭貼
                  </button>
                )}
              </div>
              <input ref={coverInputRef} type="file" accept="image/*" hidden onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) onCoverChange(quest.id, file)
                event.target.value = ''
              }} />
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <span>
                <span className="block text-sm font-bold text-slate-800">顯示完整圖片</span>
                <span className="mt-0.5 block text-xs text-slate-400">開啟後完整縮放圖片，不裁切內容</span>
              </span>
              <Switch
                checked={quest.coverFit === 'contain'}
                onChange={(event) => onCardMediaChange(quest.id, { coverFit: event.target.checked ? 'contain' : 'cover' })}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#a855f7' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#a855f7' } }}
              />
            </label>
            <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <span className="block text-sm font-bold text-slate-800">封面顯示占比</span>
                  <span className="mt-0.5 block text-xs text-slate-400">調整圖片區塊在卡片中的高度</span>
                </div>
                <b className="rounded-md bg-white px-2 py-1 text-xs text-slate-700">{previewCoverRatio}%</b>
              </div>
              <input
                type="range"
                min="60"
                max="180"
                step="5"
                value={previewCoverRatio}
                onChange={(event) => setPreviewCoverRatio(Number(event.target.value))}
                onPointerUp={commitCoverRatio}
                onTouchEnd={commitCoverRatio}
                onKeyUp={commitCoverRatio}
                onBlur={commitCoverRatio}
                className="w-full accent-purple-500"
                aria-label="封面顯示占比"
              />
              <div className="mt-1 flex justify-between text-[10px] font-bold text-slate-400"><span>60%</span><span>180%</span></div>
              <p className="m-0 mt-2 text-[11px] leading-5 text-slate-400">此設定會統一套用到所有現有與新增卡片。</p>
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-500">任務名稱</label>
            <input value={title} onChange={(event) => setTitle(event.target.value)} onBlur={commitTitle} onKeyDown={(event) => { if (event.key === 'Enter') event.currentTarget.blur() }} className={fieldClass} />
          </section>

          <section className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-2 text-xs font-bold text-slate-500">
              狀態
              <select value={quest.completed ? 'completed' : quest.status ?? 'pending'} onChange={(event) => changeStatus(event.target.value)} className={fieldClass}>
                <option value="pending">待處理</option>
                <option value="progress">進行中</option>
                <option value="completed">已完成</option>
              </select>
            </label>
            <label className="flex flex-col gap-2 text-xs font-bold text-slate-500">
              優先級
              <select value={quest.priority ?? 'normal'} onChange={(event) => onSetPriority(quest.id, event.target.value)} className={fieldClass}>
                {PRIORITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="col-span-2 flex flex-col gap-2 text-xs font-bold text-slate-500">
              經驗獎勵
              <select value={quest.expValue === 2 ? 3 : quest.expValue ?? 1} onChange={(event) => onSetExp(quest.id, Number(event.target.value))} className={fieldClass}>
                {EXP_OPTIONS.map(([value, label]) => (
                  <option key={value} value={value} disabled={Boolean(lockedExpLevels[value])}>
                    {lockedExpLevels[value] ? `🔒 ${label}（LV${lockedExpLevels[value]}）` : label}
                  </option>
                ))}
              </select>
            </label>
          </section>

          <section className="rounded-xl border border-slate-200 px-4 py-4">
            <div className="flex items-center gap-3 text-xs font-black">
              <span>HP</span>
              <div className="quest-card__hp-track flex-1"><div className="quest-card__hp-fill" style={{ width: `${hp}%` }} /></div>
              <span>{hp} / 100</span>
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="m-0 text-sm font-extrabold">子任務</h3>
              <span className="text-xs font-bold text-slate-400">{completedSubTasks}/{subTasks.length}</span>
            </div>
            <div className="flex flex-col gap-2">
              {subTasks.map((subTask) => (
                <div key={subTask.id} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
                  <Checkbox checked={subTask.completed} onChange={() => onToggleSubTask(quest.id, subTask.id)} size="small" sx={{ p: 0.4, '&.Mui-checked': { color: '#a855f7' } }} />
                  {subTask.imageId ? (
                    <StoredImage imageId={subTask.imageId} className={`min-w-0 flex-1 rounded-md bg-slate-900 object-contain max-h-48 w-full ${subTask.completed ? 'opacity-50' : ''}`} />
                  ) : (
                  <input
                    defaultValue={subTask.text}
                    onBlur={(event) => {
                      const value = event.target.value.trim()
                      if (value && value !== subTask.text) onUpdateSubTask(quest.id, subTask.id, value)
                      else event.target.value = subTask.text
                    }}
                    className={`min-w-0 flex-1 bg-transparent text-sm outline-none ${subTask.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                  />
                  )}
                  <button type="button" onClick={() => onRemoveSubTask(quest.id, subTask.id)} className="flex h-8 w-8 items-center justify-center bg-transparent text-slate-300 hover:text-red-500" aria-label="刪除子任務">
                    <DeleteOutlineIcon sx={{ fontSize: 17 }} />
                  </button>
                </div>
              ))}
            </div>
            <form onSubmit={addSubTask} className="flex gap-2">
              <input value={subTaskDraft} onChange={(event) => setSubTaskDraft(event.target.value)} placeholder="新增子任務..." className={`${fieldClass} min-w-0 flex-1`} />
              <button type="submit" className="flex w-11 items-center justify-center rounded-lg bg-black text-white" aria-label="新增子任務"><AddIcon /></button>
            </form>
          </section>

          <section className="grid grid-cols-3 gap-2 border-t border-slate-200 pt-5">
            <button type="button" onClick={() => onTogglePin(quest.id)} className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 px-2 py-3 text-xs font-bold text-slate-600">
              {quest.pinned ? <PushPinIcon /> : <PushPinOutlinedIcon />}置頂
            </button>
            <button type="button" onClick={() => onToggleCore(quest.id)} className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 px-2 py-3 text-xs font-bold text-slate-600">
              {quest.isCore ? <StarIcon /> : <StarBorderIcon />}核心
            </button>
            <button type="button" onClick={() => onSaveTemplate?.(quest)} className="flex flex-col items-center gap-1 rounded-lg bg-slate-50 px-2 py-3 text-xs font-bold text-slate-600">
              <LibraryBooksOutlinedIcon />存為模板
            </button>
          </section>
        </div>

        <footer className="border-t border-slate-200 p-5">
          <button type="button" onClick={deleteQuest} className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-extrabold text-red-600 hover:bg-red-100">
            <DeleteOutlineIcon />刪除任務
          </button>
        </footer>
      </aside>
    </Drawer>
  )
}

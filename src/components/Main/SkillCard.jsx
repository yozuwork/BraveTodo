/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CloseIcon from '@mui/icons-material/Close'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import PushPinIcon from '@mui/icons-material/PushPin'
import StarBorderIcon from '@mui/icons-material/StarBorder'
import { resolveImg } from '../../utils/imageSrc'

const SKILL_STATUS = {
  learning: { label: '修練中', bg: '#f5f3ff', text: '#7c3aed', border: '#ddd6fe' },
  mastered: { label: '已掌握', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  passive: { label: '被動', bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  archived: { label: '封存', bg: '#f5f5f4', text: '#78716c', border: '#d6d3d1' },
}

export default function SkillCard({
  skill,
  stages,
  currentLevel,
  onUpdate,
  onRemove,
  onCoverChange,
  onTogglePin,
}) {
  const { id, name, category, level = 1, description, notes, stageIds = [], cover, coverPosition = { x: 50, y: 50 }, pinned, status = 'learning' } = skill
  const statusConfig = SKILL_STATUS[status] ?? SKILL_STATUS.learning
  const boundStages = (stages ?? []).filter((stage) => stageIds.includes(stage.id))
  const requiredLevel = boundStages.length > 0
    ? Math.min(...boundStages.map((stage) => stage.minLevel ?? level))
    : level
  const locked = boundStages.length > 0 && (currentLevel ?? 1) < requiredLevel
  const [open, setOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState(name)
  const [categoryDraft, setCategoryDraft] = useState(category ?? '')
  const [levelDraft, setLevelDraft] = useState(level)
  const [descriptionDraft, setDescriptionDraft] = useState(description ?? '')
  const [notesDraft, setNotesDraft] = useState(notes ?? '')
  const [stageIdsDraft, setStageIdsDraft] = useState(stageIds)
  const fileInputRef = useRef(null)
  const nameInputRef = useRef(null)
  const coverDragRef = useRef(null)
  const draftBoundStages = (stages ?? []).filter((stage) => stageIdsDraft.includes(stage.id))
  const draftRequiredLevel = draftBoundStages.length > 0
    ? Math.min(...draftBoundStages.map((stage) => stage.minLevel ?? 1))
    : levelDraft

  useEffect(() => {
    if (!open) {
      setNameDraft(name)
      setCategoryDraft(category ?? '')
      setLevelDraft(level)
      setDescriptionDraft(description ?? '')
      setNotesDraft(notes ?? '')
      setStageIdsDraft(stageIds)
    }
  }, [category, description, level, name, notes, open, stageIds])

  useEffect(() => {
    if (open) requestAnimationFrame(() => nameInputRef.current?.focus())
  }, [open])

  const saveSkill = () => {
    const nextLevel = Number.parseInt(levelDraft, 10)
    const selectedStages = (stages ?? []).filter((stage) => stageIdsDraft.includes(stage.id))
    const stageLevel = selectedStages.length > 0
      ? Math.min(...selectedStages.map((stage) => stage.minLevel ?? 1))
      : null
    onUpdate(id, {
      name: nameDraft.trim() || '未命名技能',
      category: categoryDraft.trim() || '未分類',
      level: stageLevel ?? (Number.isNaN(nextLevel) ? 1 : Math.max(1, Math.min(99, nextLevel))),
      description: descriptionDraft.trim(),
      notes: notesDraft.trim(),
      stageIds: stageIdsDraft,
    })
    setOpen(false)
  }

  const toggleStageDraft = (stageId) => {
    setStageIdsDraft((prev) => (
      prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]
    ))
  }

  const handleCoverPointerDown = (e) => {
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    coverDragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: coverPosition.x ?? 50,
      startPosY: coverPosition.y ?? 50,
      moved: false,
    }
  }

  const handleCoverPointerMove = (e) => {
    if (!coverDragRef.current || !cover) return
    const dx = e.clientX - coverDragRef.current.startX
    const dy = e.clientY - coverDragRef.current.startY
    if (!coverDragRef.current.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
    coverDragRef.current.moved = true
    const rect = e.currentTarget.getBoundingClientRect()
    onUpdate(id, {
      coverPosition: {
        x: Math.min(100, Math.max(0, coverDragRef.current.startPosX - (dx / rect.width) * 100)),
        y: Math.min(100, Math.max(0, coverDragRef.current.startPosY - (dy / rect.height) * 100)),
      },
    })
  }

  const handleCoverPointerUp = () => {
    if (!coverDragRef.current?.moved) fileInputRef.current?.click()
    coverDragRef.current = null
  }

  const previewText = description?.trim() || notes?.trim() || '點開卡片記錄技能效果'

  return (
    <>
      <div
        className={`flex flex-col rounded-2xl overflow-hidden shadow-md select-none border bg-white transition-all ${
          locked ? 'grayscale opacity-70' : 'hover:-translate-y-0.5 hover:shadow-lg'
        }`}
        style={{
          width: 220,
          height: 390,
          flexShrink: 0,
          borderColor: pinned ? '#8b5cf6' : '#f3f4f6',
          boxShadow: pinned ? '0 0 0 2px rgba(139,92,246,0.18), 0 10px 22px rgba(0,0,0,0.10)' : undefined,
        }}
      >
        <div
          className="relative overflow-hidden bg-violet-950 cursor-pointer"
          style={{ height: 220, flexShrink: 0 }}
          onPointerDown={handleCoverPointerDown}
          onPointerMove={handleCoverPointerMove}
          onPointerUp={handleCoverPointerUp}
          onPointerCancel={() => { coverDragRef.current = null }}
          title={cover ? '拖曳調整位置・點擊上傳封面' : '點擊上傳封面'}
        >
          {cover ? (
            <img
              src={resolveImg(cover)}
              alt={name}
              className={`w-full h-full object-cover ${locked ? 'filter grayscale' : ''}`}
              style={{ objectPosition: `${coverPosition.x ?? 50}% ${coverPosition.y ?? 50}%` }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-violet-950 via-indigo-900 to-fuchsia-800">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border border-white/20 bg-white/10">
                <StarBorderIcon sx={{ fontSize: 33, color: 'rgba(255,255,255,0.72)' }} />
              </div>
              <span className="text-xs font-semibold text-white/70">技能封面</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onTogglePin(id)
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors border border-white/20 ${
                pinned ? 'bg-violet-500 hover:bg-violet-600' : 'bg-black/60 hover:bg-black/80'
              }`}
              title={pinned ? '取消置頂' : '置頂技能'}
            >
              {pinned ? (
                <PushPinIcon sx={{ fontSize: 14, color: 'white' }} />
              ) : (
                <PushPinOutlinedIcon sx={{ fontSize: 14, color: 'white' }} />
              )}
            </button>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onRemove(id)
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-red-500/80 hover:bg-red-500 transition-colors border border-white/20"
              title="刪除技能"
            >
              <DeleteOutlineIcon sx={{ fontSize: 14, color: 'white' }} />
            </button>
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-1 z-10">
            {pinned && (
              <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full bg-violet-500">
                置頂
              </span>
            )}
            <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full bg-black/55 border border-white/15">
              Lv.{requiredLevel}
            </span>
            {locked && (
              <span className="text-[10px] font-bold text-white px-2 py-0.5 rounded-full bg-black/55 border border-white/15">
                未解鎖
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2.5 px-4 pt-4 pb-5 bg-white flex-1 border-t border-violet-100">
          <div className="min-h-[42px]">
            <p
              className="text-sm font-bold text-black m-0 leading-tight overflow-hidden"
              style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
            >
              {name}
            </p>
            <p className="text-[11px] font-semibold text-violet-500 mt-1 m-0 truncate">{category || '未分類'}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-fit rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700 hover:bg-violet-100 transition-colors"
          >
            開啟卡片
          </button>
          <p
            className="text-xs text-gray-400 m-0 leading-relaxed overflow-hidden"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
          >
            {previewText}
          </p>
          {boundStages.length > 0 && (
            <div className="flex items-center gap-1.5 mt-auto">
              <div className="flex -space-x-1.5">
                {boundStages.slice(0, 3).map((stage) => (
                  <img
                    key={stage.id}
                    src={stage.avatarSrc}
                    alt={stage.className}
                    className="w-6 h-6 rounded-full object-cover border-2 border-white bg-violet-50"
                    draggable={false}
                  />
                ))}
              </div>
              <span className="text-[10px] font-bold text-violet-500">
              {boundStages.length} 階段
            </span>
          </div>
          )}
          <select
            value={status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation()
              onUpdate(id, { status: e.target.value })
            }}
            className="self-end max-w-[86px] h-6 rounded-full border px-2 text-[10px] font-bold outline-none cursor-pointer"
            style={{
              background: statusConfig.bg,
              color: statusConfig.text,
              borderColor: statusConfig.border,
              appearance: 'none',
              WebkitAppearance: 'none',
              textAlign: 'center',
            }}
            title="技能狀態"
          >
            {Object.entries(SKILL_STATUS).map(([key, cfg]) => (
              <option key={key} value={key}>
                {cfg.label}
              </option>
            ))}
          </select>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onCoverChange(id, e.target.files[0])
            e.target.value = ''
          }}
        />
      </div>

      {open && (
        <div
          className="fixed inset-0 z-[80] bg-black/55 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 min-w-0">
                <StarBorderIcon sx={{ fontSize: 20, color: '#7c3aed' }} />
                <span className="text-sm font-bold text-gray-500">技能資訊</span>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
                aria-label="關閉"
              >
                <CloseIcon sx={{ fontSize: 18 }} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
              {cover && (
                <div
                  className="w-full shrink-0 rounded-2xl overflow-hidden bg-violet-950 border border-gray-100 flex items-center justify-center"
                  style={{ height: 'min(62vh, 620px)', minHeight: 420 }}
                >
                  <img
                    src={resolveImg(cover)}
                    alt={name}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </div>
              )}
              <input
                ref={nameInputRef}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="w-full text-3xl max-md:text-2xl font-extrabold text-black bg-transparent border-0 border-b border-gray-200 px-0 py-2 outline-none focus:border-violet-500"
                placeholder="技能名稱"
              />
              <div className="grid grid-cols-[1fr_120px] max-md:grid-cols-1 gap-3">
                <input
                  value={categoryDraft}
                  onChange={(e) => setCategoryDraft(e.target.value)}
                  className="w-full text-sm text-gray-600 bg-violet-50/70 border border-violet-100 rounded-2xl px-4 py-3 outline-none focus:border-violet-400"
                  placeholder="分類，例如：主動、被動、魔法"
                />
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={draftRequiredLevel}
                  onChange={(e) => setLevelDraft(e.target.value)}
                  disabled={draftBoundStages.length > 0}
                  className="w-full text-sm text-gray-600 bg-violet-50/70 border border-violet-100 rounded-2xl px-4 py-3 outline-none focus:border-violet-400 disabled:text-violet-500 disabled:font-bold"
                  placeholder="等級"
                  title={draftBoundStages.length > 0 ? '綁定階段後會使用階段開始等級' : '技能等級'}
                />
              </div>
              <textarea
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                className="min-h-[150px] w-full resize-y text-base leading-8 text-gray-800 bg-stone-50 border border-gray-100 rounded-2xl px-4 py-4 outline-none focus:border-violet-400"
                placeholder="技能效果、消耗、條件..."
              />
              <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="text-sm font-bold text-gray-700 m-0">綁定階段</p>
                  <span className="text-xs font-semibold text-violet-500">{stageIdsDraft.length} 已選</span>
                </div>
                {(stages ?? []).length === 0 ? (
                  <p className="text-sm text-gray-400 m-0">尚未建立階段</p>
                ) : (
                  <div className="grid grid-cols-2 max-md:grid-cols-1 gap-2">
                    {(stages ?? []).map((stage) => {
                      const checked = stageIdsDraft.includes(stage.id)
                      return (
                        <label
                          key={stage.id}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer transition-colors ${
                            checked
                              ? 'border-violet-300 bg-white shadow-sm'
                              : 'border-transparent bg-white/60 hover:bg-white'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleStageDraft(stage.id)}
                            className="accent-violet-600"
                          />
                          <img
                            src={stage.avatarSrc}
                            alt={stage.className}
                            className="w-10 h-10 rounded-lg object-cover bg-violet-100 border border-violet-100"
                            draggable={false}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-bold text-gray-800 truncate">{stage.className}</span>
                            <span className="block text-[11px] font-mono text-gray-400">
                              LV {stage.minLevel} - {stage.maxLevel}
                            </span>
                          </span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                className="min-h-[240px] max-md:min-h-[180px] w-full resize-y text-base leading-8 text-gray-800 bg-stone-50 border border-gray-100 rounded-2xl px-4 py-4 outline-none focus:border-violet-400"
                placeholder="修練筆記..."
              />
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-white">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={saveSkill}
                className="px-5 py-2 rounded-full bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-colors"
              >
                儲存技能
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

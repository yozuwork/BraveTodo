/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CloseIcon from '@mui/icons-material/Close'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import { resolveImg } from '../../utils/imageSrc'

const VISIBILITY_CONFIG = {
  visible: { label: '顯示中', bg: '#ecfeff', text: '#0e7490', border: '#a5f3fc' },
  hidden: { label: '隱藏中', bg: '#f5f5f4', text: '#78716c', border: '#d6d3d1' },
}

export default function NpcCard({
  npc,
  onUpdate,
  onRemove,
  onCoverChange,
}) {
  const { id, name, excerpt, content, cover, coverPosition = { x: 50, y: 50 }, visibility = 'visible' } = npc
  const visibilityConfig = VISIBILITY_CONFIG[visibility] ?? VISIBILITY_CONFIG.visible
  const [open, setOpen] = useState(false)
  const [nameDraft, setNameDraft] = useState(name)
  const [excerptDraft, setExcerptDraft] = useState(excerpt ?? '')
  const [contentDraft, setContentDraft] = useState(content ?? '')
  const fileInputRef = useRef(null)
  const nameInputRef = useRef(null)
  const coverDragRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setNameDraft(name)
      setExcerptDraft(excerpt ?? '')
      setContentDraft(content ?? '')
    }
  }, [content, excerpt, name, open])

  useEffect(() => {
    if (open) requestAnimationFrame(() => nameInputRef.current?.focus())
  }, [open])

  const saveNpc = () => {
    onUpdate(id, {
      name: nameDraft.trim() || '未命名 NPC',
      excerpt: excerptDraft.trim(),
      content: contentDraft,
    })
    setOpen(false)
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

  const previewText = excerpt?.trim() || content?.trim() || '點開卡片撰寫 NPC 設定'

  return (
    <>
      <div
        className="flex flex-col rounded-2xl overflow-hidden shadow-md select-none border border-cyan-100 bg-white hover:-translate-y-0.5 hover:shadow-lg transition-all"
        style={{ width: 220, height: 390, flexShrink: 0 }}
      >
        <div
          className="relative overflow-hidden bg-cyan-950 cursor-pointer"
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
              className="w-full h-full object-cover"
              style={{ objectPosition: `${coverPosition.x ?? 50}% ${coverPosition.y ?? 50}%` }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-cyan-950 via-slate-900 to-teal-800">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border border-white/20 bg-white/10">
                <PersonOutlineIcon sx={{ fontSize: 34, color: 'rgba(255,255,255,0.72)' }} />
              </div>
              <span className="text-xs font-semibold text-white/70">NPC 封面</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation()
              onRemove(id)
            }}
            className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center bg-red-500/80 hover:bg-red-500 transition-colors border border-white/20 z-10"
            title="刪除 NPC"
          >
            <DeleteOutlineIcon sx={{ fontSize: 14, color: 'white' }} />
          </button>
        </div>

        <div className="flex flex-col gap-2.5 px-4 pt-4 pb-5 bg-white flex-1 border-t border-cyan-100">
          <p
            className="text-sm font-bold text-black m-0 leading-tight overflow-hidden"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
          >
            {name}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-fit rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-bold text-cyan-700 hover:bg-cyan-100 transition-colors"
          >
            開啟卡片
          </button>
          <p
            className="text-xs text-gray-400 m-0 leading-relaxed overflow-hidden"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
          >
            {previewText}
          </p>
          <select
            value={visibility}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation()
              onUpdate(id, { visibility: e.target.value })
            }}
            className="self-end mt-auto max-w-[86px] h-6 rounded-full border px-2 text-[10px] font-bold outline-none cursor-pointer"
            style={{
              background: visibilityConfig.bg,
              color: visibilityConfig.text,
              borderColor: visibilityConfig.border,
              appearance: 'none',
              WebkitAppearance: 'none',
              textAlign: 'center',
            }}
            title="NPC 顯示狀態"
          >
            {Object.entries(VISIBILITY_CONFIG).map(([key, cfg]) => (
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
                <PersonOutlineIcon sx={{ fontSize: 20, color: '#0e7490' }} />
                <span className="text-sm font-bold text-gray-500">NPC 卡片</span>
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
                  className="w-full shrink-0 rounded-2xl overflow-hidden bg-cyan-950 border border-gray-100 flex items-center justify-center"
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
                className="w-full text-3xl max-md:text-2xl font-extrabold text-black bg-transparent border-0 border-b border-gray-200 px-0 py-2 outline-none focus:border-cyan-500"
                placeholder="NPC 名稱"
              />
              <input
                value={excerptDraft}
                onChange={(e) => setExcerptDraft(e.target.value)}
                className="w-full text-sm text-gray-600 bg-cyan-50/70 border border-cyan-100 rounded-2xl px-4 py-3 outline-none focus:border-cyan-400"
                placeholder="短簡介"
              />
              <textarea
                value={contentDraft}
                onChange={(e) => setContentDraft(e.target.value)}
                className="min-h-[420px] max-md:min-h-[320px] w-full resize-y text-base leading-8 text-gray-800 bg-stone-50 border border-gray-100 rounded-2xl px-4 py-4 outline-none focus:border-cyan-400"
                placeholder="在這裡寫 NPC 背景、個性、關係、台詞或任務線..."
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
                onClick={saveNpc}
                className="px-5 py-2 rounded-full bg-cyan-600 text-white text-sm font-bold hover:bg-cyan-700 transition-colors"
              >
                儲存 NPC
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

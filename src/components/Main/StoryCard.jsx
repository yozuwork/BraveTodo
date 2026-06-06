/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined'
import CloseIcon from '@mui/icons-material/Close'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import PushPinIcon from '@mui/icons-material/PushPin'
import { resolveImg } from '../../utils/imageSrc'

const STORY_STATUS = {
  not_started: { label: '未開始', bg: '#f3f4f6', text: '#4b5563', border: '#e5e7eb' },
  in_progress: { label: '進行中', bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
  completed: { label: '已完成', bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
  archived: { label: '封存', bg: '#f5f5f4', text: '#78716c', border: '#d6d3d1' },
}

export default function StoryCard({
  story,
  onUpdate,
  onRemove,
  onCoverChange,
  onTogglePin,
}) {
  const { id, title, excerpt, content, cover, pinned, status = 'not_started' } = story
  const statusConfig = STORY_STATUS[status] ?? STORY_STATUS.not_started
  const [open, setOpen] = useState(false)
  const [titleDraft, setTitleDraft] = useState(title)
  const [excerptDraft, setExcerptDraft] = useState(excerpt ?? '')
  const [contentDraft, setContentDraft] = useState(content ?? '')
  const fileInputRef = useRef(null)
  const titleInputRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setTitleDraft(title)
      setExcerptDraft(excerpt ?? '')
      setContentDraft(content ?? '')
    }
  }, [content, excerpt, open, title])

  useEffect(() => {
    if (open) requestAnimationFrame(() => titleInputRef.current?.focus())
  }, [open])

  const saveStory = () => {
    const nextTitle = titleDraft.trim() || '未命名故事'
    onUpdate(id, {
      title: nextTitle,
      excerpt: excerptDraft.trim(),
      content: contentDraft,
    })
    setOpen(false)
  }

  const previewText = excerpt?.trim() || content?.trim() || '點開卡片開始寫文章'

  return (
    <>
      <div
        className="flex flex-col rounded-2xl overflow-hidden shadow-md select-none border bg-white hover:-translate-y-0.5 hover:shadow-lg transition-all"
        style={{
          width: 220,
          height: 390,
          flexShrink: 0,
          borderColor: pinned ? '#f59e0b' : '#f3f4f6',
          boxShadow: pinned ? '0 0 0 2px rgba(245,158,11,0.18), 0 10px 22px rgba(0,0,0,0.10)' : undefined,
        }}
      >
        <div
          className="relative overflow-hidden bg-slate-950 cursor-pointer"
          style={{ height: 220, flexShrink: 0 }}
          onClick={(e) => {
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
          title="點擊上傳封面"
        >
          {cover ? (
            <img
              src={resolveImg(cover)}
              alt={title}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-slate-900 via-slate-800 to-amber-900">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border border-white/20 bg-white/10">
                <ArticleOutlinedIcon sx={{ fontSize: 31, color: 'rgba(255,255,255,0.72)' }} />
              </div>
              <span className="text-xs font-semibold text-white/70">故事封面</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onTogglePin(id)
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors border border-white/20 ${
                pinned ? 'bg-amber-500 hover:bg-amber-600' : 'bg-black/60 hover:bg-black/80'
              }`}
              title={pinned ? '取消置頂' : '置頂故事'}
            >
              {pinned ? (
                <PushPinIcon sx={{ fontSize: 14, color: 'white' }} />
              ) : (
                <PushPinOutlinedIcon sx={{ fontSize: 14, color: 'white' }} />
              )}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(id)
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-red-500/80 hover:bg-red-500 transition-colors border border-white/20"
              title="刪除故事"
            >
              <DeleteOutlineIcon sx={{ fontSize: 14, color: 'white' }} />
            </button>
          </div>
          {pinned && (
            <span className="absolute bottom-2 left-2 text-[10px] font-bold text-white px-2 py-0.5 rounded-full bg-amber-500 z-10">
              置頂
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2.5 px-4 pt-4 pb-5 bg-white flex-1 border-t border-amber-100">
          <p
            className="text-sm font-bold text-black m-0 leading-tight overflow-hidden"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
          >
            {title}
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-700 hover:bg-amber-100 transition-colors"
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
            value={status}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => {
              e.stopPropagation()
              onUpdate(id, { status: e.target.value })
            }}
            className="self-end mt-auto max-w-[86px] h-6 rounded-full border px-2 text-[10px] font-bold outline-none cursor-pointer"
            style={{
              background: statusConfig.bg,
              color: statusConfig.text,
              borderColor: statusConfig.border,
              appearance: 'none',
              WebkitAppearance: 'none',
              textAlign: 'center',
            }}
            title="故事狀態"
          >
            {Object.entries(STORY_STATUS).map(([key, cfg]) => (
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
                <ArticleOutlinedIcon sx={{ fontSize: 20, color: '#b45309' }} />
                <span className="text-sm font-bold text-gray-500">故事文章</span>
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
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="w-full text-3xl max-md:text-2xl font-extrabold text-black bg-transparent border-0 border-b border-gray-200 px-0 py-2 outline-none focus:border-amber-500"
                placeholder="故事標題"
              />
              <input
                value={excerptDraft}
                onChange={(e) => setExcerptDraft(e.target.value)}
                className="w-full text-sm text-gray-600 bg-amber-50/70 border border-amber-100 rounded-2xl px-4 py-3 outline-none focus:border-amber-400"
                placeholder="短摘要"
              />
              <textarea
                value={contentDraft}
                onChange={(e) => setContentDraft(e.target.value)}
                className="min-h-[420px] max-md:min-h-[320px] w-full resize-y text-base leading-8 text-gray-800 bg-stone-50 border border-gray-100 rounded-2xl px-4 py-4 outline-none focus:border-amber-400"
                placeholder="在這裡寫文章..."
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
                onClick={saveStory}
                className="px-5 py-2 rounded-full bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 transition-colors"
              >
                儲存文章
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

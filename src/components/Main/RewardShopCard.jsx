/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import RedeemOutlinedIcon from '@mui/icons-material/RedeemOutlined'
import CloseIcon from '@mui/icons-material/Close'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import PushPinIcon from '@mui/icons-material/PushPin'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import { resolveImg } from '../../utils/imageSrc'
import { REWARD_TYPES } from '../../hooks/useRewardShop'

function parseRewardCost(cost) {
  const matched = String(cost ?? '').match(/\d+/)
  return matched ? Math.max(0, parseInt(matched[0], 10) || 0) : 0
}

export default function RewardShopCard({
  reward,
  gold,
  onUpdate,
  onRemove,
  onCoverChange,
  onTogglePin,
  onPurchase,
  onArchive,
  onUse,
  onSaveTemplate,
}) {
  const {
    id,
    title,
    cost,
    excerpt,
    notes,
    rewardType = 'own_once',
    cover,
    coverSrc,
    coverPosition = { x: 50, y: 50 },
    pinned,
    ownedCount = 0,
    status = 'available',
  } = reward
  const costValue = parseRewardCost(cost)
  const isArchived = status === 'archived'
  const normalizedOwnedCount = Math.max(0, Number(ownedCount) || 0)
  const hasOwnedItems = normalizedOwnedCount > 0
  const purchaseDisabled = isArchived || gold < costValue
  const useDisabled = isArchived || !hasOwnedItems
  const [open, setOpen] = useState(false)
  const [titleDraft, setTitleDraft] = useState(title)
  const [costDraft, setCostDraft] = useState(cost ?? '')
  const [excerptDraft, setExcerptDraft] = useState(excerpt ?? '')
  const [notesDraft, setNotesDraft] = useState(notes ?? '')
  const [rewardTypeDraft, setRewardTypeDraft] = useState(rewardType)
  const [previewCover, setPreviewCover] = useState(() => coverSrc ? resolveImg(coverSrc) : resolveImg(cover))
  const fileInputRef = useRef(null)
  const titleInputRef = useRef(null)
  const coverDragRef = useRef(null)

  useEffect(() => {
    if (!open) {
      setTitleDraft(title)
      setCostDraft(cost ?? '')
      setExcerptDraft(excerpt ?? '')
      setNotesDraft(notes ?? '')
      setRewardTypeDraft(rewardType)
    }
  }, [cost, excerpt, notes, open, rewardType, title])

  useEffect(() => {
    if (open) requestAnimationFrame(() => titleInputRef.current?.focus())
  }, [open])

  useEffect(() => {
    setPreviewCover(coverSrc ? resolveImg(coverSrc) : resolveImg(cover))
  }, [cover, coverSrc])

  const saveReward = () => {
    const nextTitle = titleDraft.trim() || '未命名獎勵'
    onUpdate(id, {
      title: nextTitle,
      cost: costDraft.trim() || '未設定價格',
      excerpt: excerptDraft.trim(),
      notes: notesDraft,
      rewardType: rewardTypeDraft,
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
    if (!coverDragRef.current) return
    if (!coverDragRef.current.moved) fileInputRef.current?.click()
    coverDragRef.current = null
  }

  const previewText = excerpt?.trim() || notes?.trim() || '點開卡片編輯你的獎勵內容'

  return (
    <>
      <div
        className="flex flex-col rounded-2xl overflow-hidden shadow-md select-none border bg-white hover:-translate-y-0.5 hover:shadow-lg transition-all"
        style={{
          width: 220,
          height: 390,
          flexShrink: 0,
          borderColor: pinned ? '#f97316' : '#f3f4f6',
          boxShadow: pinned ? '0 0 0 2px rgba(249,115,22,0.18), 0 10px 22px rgba(0,0,0,0.10)' : undefined,
        }}
      >
        <div
          className="relative overflow-hidden cursor-pointer"
          style={{ height: 220, flexShrink: 0, background: 'linear-gradient(135deg, #1f2937 0%, #7c2d12 52%, #fed7aa 100%)' }}
          onPointerDown={handleCoverPointerDown}
          onPointerMove={handleCoverPointerMove}
          onPointerUp={handleCoverPointerUp}
          onPointerCancel={() => { coverDragRef.current = null }}
          title={previewCover ? '拖曳調整位置・點擊上傳封面' : '點擊上傳封面'}
        >
          {previewCover ? (
            <img
              src={previewCover}
              alt={title}
              className="w-full h-full object-cover"
              style={{ objectPosition: `${coverPosition.x ?? 50}% ${coverPosition.y ?? 50}%` }}
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-center px-5">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border border-white/20 bg-white/10">
                <RedeemOutlinedIcon sx={{ fontSize: 31, color: 'rgba(255,255,255,0.8)' }} />
              </div>
              <span className="text-xs font-semibold text-white/80">獎勵商店卡片</span>
              <span className="text-[11px] text-white/60 leading-relaxed">可放封面、票券、零食、休息日或任何你想兌換的獎勵</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />
          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onTogglePin(id)
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors border border-white/20 ${
                pinned ? 'bg-orange-500 hover:bg-orange-600' : 'bg-black/60 hover:bg-black/80'
              }`}
              title={pinned ? '取消置頂' : '置頂獎勵'}
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
              onPointerUp={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                onRemove(id)
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-red-500/80 hover:bg-red-500 transition-colors border border-white/20"
              title="刪除獎勵"
            >
              <DeleteOutlineIcon sx={{ fontSize: 14, color: 'white' }} />
            </button>
          </div>
          <div className="absolute left-3 bottom-3 z-10 flex flex-col gap-1.5">
            {pinned && (
              <span className="w-fit text-[10px] font-bold text-white px-2 py-0.5 rounded-full bg-orange-500">
                精選
              </span>
            )}
            <span className="w-fit text-[11px] font-black text-white px-2.5 py-1 rounded-full bg-black/60 border border-white/15 tracking-[0.08em]">
              {cost || '未設定價格'}
            </span>
          </div>
        </div>

        <div className="relative flex flex-col gap-2.5 px-4 pt-6 pb-5 bg-white flex-1 border-t border-orange-100">
          <span className="absolute left-4 -top-3 inline-flex w-fit items-center rounded-full border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700 shadow-sm">
            擁有 {normalizedOwnedCount}
          </span>
          <div className="relative h-0">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="absolute right-0 -top-1 w-7 h-7 rounded-full flex items-center justify-center bg-orange-50 hover:bg-orange-100 transition-colors border border-orange-200"
              title="開啟卡片"
            >
              <OpenInFullIcon sx={{ fontSize: 14, color: '#c2410c' }} />
            </button>
          </div>
          <p
            className="text-sm font-bold text-black m-0 leading-tight overflow-hidden"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
          >
            {title}
          </p>
          <span className="inline-flex w-fit items-center rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700">
            {REWARD_TYPES[rewardType] ?? REWARD_TYPES.own_once}
          </span>
          <p
            className="text-xs text-gray-400 m-0 leading-relaxed overflow-hidden"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
          >
            {previewText}
          </p>
          <div className="mt-auto mb-4 flex items-center gap-2">
              <button
                type="button"
                onClick={() => onPurchase(id)}
                disabled={purchaseDisabled}
                className={`flex-1 rounded-full px-3 py-1.5 text-[10px] font-bold transition-colors ${
                  purchaseDisabled
                    ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                    : 'bg-orange-500 text-white hover:bg-orange-600'
                }`}
                title={gold < costValue ? '金幣不足' : isArchived ? '已封存' : '購買'}
              >
                購買
              </button>
              <button
                type="button"
                onClick={() => onUse(id)}
                disabled={useDisabled}
                className={`flex-1 rounded-full px-3 py-1.5 text-[10px] font-bold transition-colors ${
                  useDisabled
                    ? 'cursor-not-allowed bg-gray-100 text-gray-300'
                    : 'bg-violet-500 text-white hover:bg-violet-600'
                }`}
                title={hasOwnedItems ? `使用 1 個（目前 ${normalizedOwnedCount}）` : '需先購買'}
              >
                使用
              </button>
              <button
                type="button"
                onClick={() => onArchive(id, isArchived)}
                className={`flex-1 rounded-full px-3 py-1.5 text-[10px] font-bold transition-colors ${
                  isArchived
                    ? 'bg-stone-200 text-stone-700 hover:bg-stone-300'
                    : 'bg-stone-100 text-stone-500 hover:bg-stone-200'
                }`}
              >
                {isArchived ? '取消封存' : '封存'}
              </button>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) {
              const objectUrl = URL.createObjectURL(file)
              setPreviewCover(objectUrl)
              onCoverChange(id, file)
            }
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
                <RedeemOutlinedIcon sx={{ fontSize: 20, color: '#ea580c' }} />
                <span className="text-sm font-bold text-gray-500">獎勵卡片</span>
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
              {previewCover && (
                <div
                  className="w-full shrink-0 rounded-2xl overflow-hidden bg-slate-950 border border-gray-100 flex items-center justify-center"
                  style={{ height: 'min(62vh, 620px)', minHeight: 420 }}
                >
                  <img
                    src={previewCover}
                    alt={title}
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                </div>
              )}
              <input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                className="reward-editor-title w-full text-3xl max-md:text-2xl font-extrabold text-black bg-transparent border-0 border-b border-gray-200 px-0 py-2 outline-none focus:border-orange-500"
                placeholder="獎勵名稱"
              />
              <input
                value={costDraft}
                onChange={(e) => setCostDraft(e.target.value)}
                className="reward-editor-input reward-editor-input-accent w-full text-sm text-gray-700 bg-orange-50/70 border border-orange-100 rounded-2xl px-4 py-3 outline-none focus:border-orange-400"
                placeholder="價格 / 兌換條件，例如 300 金幣、完成 5 次討伐"
              />
              <input
                value={excerptDraft}
                onChange={(e) => setExcerptDraft(e.target.value)}
                className="reward-editor-input w-full text-sm text-gray-600 bg-stone-50 border border-gray-100 rounded-2xl px-4 py-3 outline-none focus:border-orange-300"
                placeholder="短摘要"
              />
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-gray-500">獎勵分類</span>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Object.entries(REWARD_TYPES).map(([key, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRewardTypeDraft(key)}
                      className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                        rewardTypeDraft === key
                          ? 'border-orange-300 bg-orange-50 text-orange-700'
                          : 'border-gray-200 bg-stone-50 text-gray-600 hover:border-orange-200 hover:bg-orange-50/70'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <textarea
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                className="reward-editor-input reward-editor-textarea min-h-[420px] max-md:min-h-[320px] w-full resize-y text-base leading-8 text-gray-800 bg-stone-50 border border-gray-100 rounded-2xl px-4 py-4 outline-none focus:border-orange-300"
                placeholder="在這裡寫下獎勵細節、兌換規則、限制或給自己的備註..."
              />
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2 bg-white">
              <button
                type="button"
                onClick={() => onSaveTemplate({
                  title: titleDraft,
                  cost: costDraft,
                  excerpt: excerptDraft,
                  notes: notesDraft,
                  rewardType: rewardTypeDraft,
                  cover,
                  coverPosition,
                })}
                className="px-4 py-2 rounded-full bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition-colors"
              >
                加入常用模板
              </button>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="px-4 py-2 rounded-full bg-gray-100 text-gray-600 text-sm font-semibold hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={saveReward}
                className="px-5 py-2 rounded-full bg-orange-600 text-white text-sm font-bold hover:bg-orange-700 transition-colors"
              >
                儲存獎勵
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

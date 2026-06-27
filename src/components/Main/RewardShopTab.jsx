/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import AddIcon from '@mui/icons-material/Add'
import DragIndicatorIcon from '@mui/icons-material/DragIndicator'
import LibraryBooksOutlinedIcon from '@mui/icons-material/LibraryBooksOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import RedeemOutlinedIcon from '@mui/icons-material/RedeemOutlined'
import RewardShopCard from './RewardShopCard'
import { REWARD_TYPES } from '../../hooks/useRewardShop'
import { resolveImg } from '../../utils/imageSrc'

function TemplateCard({ template, onApply, onEdit, onRemove, onAdjustCoverPosition }) {
  const previewText = template.excerpt?.trim() || template.notes?.trim() || '尚未填寫模板說明'
  const coverSrc = template.coverSrc ? resolveImg(template.coverSrc) : resolveImg(template.cover)
  const dragStateRef = useRef(null)
  const suppressClickRef = useRef(false)
  const previewPosition = template.coverPosition ?? { x: 50, y: 50 }

  const handlePointerDown = (e) => {
    if (!coverSrc) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStateRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosX: previewPosition.x ?? 50,
      startPosY: previewPosition.y ?? 50,
      moved: false,
    }
  }

  const handlePointerMove = (e) => {
    if (!dragStateRef.current || !coverSrc) return
    e.stopPropagation()
    const dx = e.clientX - dragStateRef.current.startX
    const dy = e.clientY - dragStateRef.current.startY
    if (!dragStateRef.current.moved && Math.abs(dx) < 4 && Math.abs(dy) < 4) return
    dragStateRef.current.moved = true
    suppressClickRef.current = true
    const rect = e.currentTarget.getBoundingClientRect()
    onAdjustCoverPosition(template.id, {
      x: Math.min(100, Math.max(0, dragStateRef.current.startPosX - (dx / rect.width) * 100)),
      y: Math.min(100, Math.max(0, dragStateRef.current.startPosY - (dy / rect.height) * 100)),
    })
  }

  const handlePointerUp = (e) => {
    if (!dragStateRef.current) return
    e.stopPropagation()
    if (!dragStateRef.current.moved) {
      suppressClickRef.current = false
      onApply(template.id)
    }
    dragStateRef.current = null
  }

  const stopCardEvent = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => {
        if (suppressClickRef.current) {
          suppressClickRef.current = false
          return
        }
        onApply(template.id)
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onApply(template.id)
        }
      }}
      className="group relative overflow-hidden rounded-[1.35rem] border border-stone-200 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-lg"
    >
      <div
        className="relative h-32 overflow-hidden border-b border-white/10"
        style={{ background: 'linear-gradient(135deg, #1f2937 0%, #7c2d12 55%, #fed7aa 100%)' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { dragStateRef.current = null }}
        title={coverSrc ? '拖曳查看封面範圍，點一下直接套用' : '點一下直接套用'}
      >
        {coverSrc ? (
          <img
            src={coverSrc}
            alt={template.name}
            className="h-full w-full object-cover"
            style={{ objectPosition: `${previewPosition.x ?? 50}% ${previewPosition.y ?? 50}%` }}
            draggable={false}
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 px-6 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/20 bg-white/10">
              <RedeemOutlinedIcon sx={{ fontSize: 28, color: 'rgba(255,255,255,0.8)' }} />
            </div>
            <p className="m-0 text-sm font-bold text-white/90">常用獎勵卡</p>
            <p className="m-0 text-[11px] leading-relaxed text-white/65">點一下就能直接套用成新卡片</p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/75 to-transparent pointer-events-none" />
        <div className="absolute right-2.5 top-2.5 z-10 flex items-center gap-1.5">
          <button
            type="button"
            onPointerDown={stopCardEvent}
            onPointerUp={stopCardEvent}
            onClick={(e) => {
              stopCardEvent(e)
              onEdit(template)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/55 text-white transition-colors hover:bg-black/75"
            title="編輯模板"
          >
            <EditOutlinedIcon sx={{ fontSize: 14 }} />
          </button>
          <button
            type="button"
            onPointerDown={stopCardEvent}
            onPointerUp={stopCardEvent}
            onClick={(e) => {
              stopCardEvent(e)
              onRemove(template.id)
            }}
            className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-red-500/80 text-white transition-colors hover:bg-red-500"
            title="刪除模板"
          >
            <DeleteOutlineIcon sx={{ fontSize: 14 }} />
          </button>
        </div>
        <div className="absolute bottom-2.5 left-2.5 z-10 flex flex-wrap items-center gap-1.5">
          <span className="rounded-full border border-white/15 bg-black/60 px-2.5 py-1 text-[10px] font-black tracking-[0.08em] text-white">
            {template.cost || '未設定價格'}
          </span>
          <span className="rounded-full border border-orange-200/40 bg-orange-500/80 px-2 py-1 text-[9px] font-bold text-white">
            {REWARD_TYPES[template.rewardType] ?? REWARD_TYPES.own_once}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-2 px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m-0 text-[13px] font-bold text-black line-clamp-1">{template.name}</p>
            <p className="m-0 mt-1 text-[11px] text-stone-400 line-clamp-2">{previewText}</p>
          </div>
          <span className="shrink-0 rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-700">
            套用
          </span>
        </div>
        {coverSrc && (
          <p className="m-0 text-[10px] text-stone-400">
            拖曳封面可查看圖片範圍
          </p>
        )}
      </div>
    </div>
  )
}

export default function RewardShopTab({
  rewards,
  rewardTemplates,
  gold,
  onAdd,
  onAddFromTemplate,
  onUpdate,
  onRemove,
  onCoverChange,
  onTogglePin,
  onPurchase,
  onArchive,
  onUse,
  onReorder,
  onSaveTemplate,
  onUpdateTemplate,
  onRemoveTemplate,
}) {
  const [showArchived, setShowArchived] = useState(false)
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [templateForm, setTemplateForm] = useState({
    name: '',
    title: '',
    cost: '',
    excerpt: '',
    notes: '',
    rewardType: 'own_once',
  })
  const dragIdRef = useRef(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [insertBefore, setInsertBefore] = useState(true)
  const visibleRewards = showArchived
    ? rewards
    : rewards.filter((reward) => reward.status !== 'archived')
  const archivedCount = rewards.filter((reward) => reward.status === 'archived').length

  const sortedTemplates = useMemo(
    () => [...rewardTemplates].sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)),
    [rewardTemplates]
  )

  const [localTemplatePositions, setLocalTemplatePositions] = useState({})

  useEffect(() => {
    setLocalTemplatePositions({})
  }, [templateDialogOpen])

  const handleDragStart = (e, id) => {
    dragIdRef.current = id
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setDragOverId(id)
    setInsertBefore(e.clientX < rect.left + rect.width / 2)
  }

  const handleDrop = (e, id) => {
    e.preventDefault()
    if (dragIdRef.current && dragIdRef.current !== id) {
      onReorder(dragIdRef.current, id, insertBefore)
    }
    dragIdRef.current = null
    setDragOverId(null)
  }

  const handleDragEnd = () => {
    dragIdRef.current = null
    setDragOverId(null)
  }

  const openEditDialog = (template) => {
    setEditingTemplate(template)
    setTemplateForm({
      name: template.name ?? '',
      title: template.title ?? '',
      cost: template.cost ?? '',
      excerpt: template.excerpt ?? '',
      notes: template.notes ?? '',
      rewardType: template.rewardType ?? 'own_once',
    })
  }

  const closeEditDialog = () => {
    setEditingTemplate(null)
    setTemplateForm({
      name: '',
      title: '',
      cost: '',
      excerpt: '',
      notes: '',
      rewardType: 'own_once',
    })
  }

  const saveTemplateEdit = () => {
    if (!editingTemplate) return
    onUpdateTemplate(editingTemplate.id, {
      name: templateForm.name.trim() || templateForm.title.trim() || '未命名模板',
      title: templateForm.title.trim() || templateForm.name.trim() || '新的獎勵',
      cost: templateForm.cost.trim() || '100 金幣',
      excerpt: templateForm.excerpt.trim(),
      notes: templateForm.notes,
      rewardType: templateForm.rewardType,
    })
    closeEditDialog()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3 max-md:flex-col">
        <div>
          <h2 className="text-base font-bold text-black m-0">獎勵商店</h2>
          <p className="text-xs text-gray-400 mt-0.5 m-0">用卡片陳列想兌換的獎勵，整體感覺比照故事篇章</p>
        </div>
        <div className="flex items-center gap-3 max-md:w-full max-md:justify-between">
          <label className="flex items-center gap-2 text-xs font-semibold text-gray-500 select-none cursor-pointer">
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="accent-orange-600"
            />
            顯示已封存獎勵{archivedCount > 0 ? ` (${archivedCount})` : ''}
          </label>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={() => setTemplateDialogOpen(true)}
            sx={{
              borderColor: '#ea580c',
              color: '#ea580c',
              borderRadius: 99,
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'none',
              px: 1.5,
              flexShrink: 0,
              '&:hover': { borderColor: '#c2410c', bgcolor: '#fff7ed' },
            }}
          >
            新增
          </Button>
        </div>
      </div>

      {visibleRewards.length === 0 ? (
        <div className="text-center py-16 text-gray-300">
          <p className="text-lg font-semibold">{rewards.length === 0 ? '還沒有獎勵' : '沒有符合篩選的獎勵'}</p>
          <p className="text-sm mt-1">{rewards.length === 0 ? '新增第一張獎勵卡，開始規劃你的兌換商店。' : '已封存的獎勵目前被隱藏。'}</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-4">
          {visibleRewards.map((reward) => (
            <div
              key={reward.id}
              draggable
              onDragStart={(e) => handleDragStart(e, reward.id)}
              onDragOver={(e) => handleDragOver(e, reward.id)}
              onDrop={(e) => handleDrop(e, reward.id)}
              onDragEnd={handleDragEnd}
              className="relative group/drag"
              style={{ opacity: dragIdRef.current === reward.id ? 0.42 : 1 }}
            >
              {dragOverId === reward.id && insertBefore && (
                <div className="absolute left-0 right-0 -top-2 h-1 rounded-full bg-orange-400 z-20" />
              )}
              <div className="absolute -left-2 top-3 z-20 opacity-0 group-hover/drag:opacity-100 transition-opacity pointer-events-none">
                <DragIndicatorIcon sx={{ fontSize: 18, color: '#f97316' }} />
              </div>
              <RewardShopCard
                reward={reward}
                gold={gold}
                onUpdate={onUpdate}
                onRemove={onRemove}
                onCoverChange={onCoverChange}
                onTogglePin={onTogglePin}
                onPurchase={onPurchase}
                onArchive={onArchive}
                onUse={onUse}
                onSaveTemplate={onSaveTemplate}
              />
              {dragOverId === reward.id && !insertBefore && (
                <div className="absolute left-0 right-0 -bottom-2 h-1 rounded-full bg-orange-400 z-20" />
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        fullWidth
        maxWidth="lg"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 800, pb: 1 }}>
          選擇常用卡片
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <div className="grid grid-cols-1 gap-4 pb-2 md:grid-cols-2 xl:grid-cols-3">
            <button
              type="button"
              onClick={() => {
                onAdd()
                setTemplateDialogOpen(false)
              }}
              className="flex min-h-[260px] flex-col justify-between rounded-[1.6rem] border border-dashed border-orange-300 bg-gradient-to-br from-orange-500 to-orange-400 p-5 text-left transition-all hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/70 text-white">
                <AddIcon sx={{ fontSize: 28 }} />
              </div>
              <div>
                <p className="m-0 text-xl font-black text-white">空白卡片</p>
                <p className="m-0 mt-2 text-sm text-orange-100">從零開始新增一張獎勵卡</p>
              </div>
            </button>

            {sortedTemplates.length === 0 ? (
              <div className="col-span-full rounded-2xl border border-gray-100 bg-stone-50 px-4 py-10 text-center text-gray-400">
                <LibraryBooksOutlinedIcon sx={{ fontSize: 26, color: '#cbd5e1' }} />
                <p className="m-0 mt-2 text-sm font-semibold">還沒有常用模板</p>
                <p className="m-0 mt-1 text-xs">先開啟一張獎勵卡，按下「加入常用模板」即可收藏。</p>
              </div>
            ) : (
              sortedTemplates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={{
                    ...template,
                    coverPosition: localTemplatePositions[template.id] ?? template.coverPosition,
                  }}
                  onApply={(templateId) => {
                    onAddFromTemplate(templateId)
                    setTemplateDialogOpen(false)
                  }}
                  onEdit={openEditDialog}
                  onRemove={onRemoveTemplate}
                  onAdjustCoverPosition={(templateId, position) => {
                    setLocalTemplatePositions((prev) => ({
                      ...prev,
                      [templateId]: position,
                    }))
                  }}
                />
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(editingTemplate)}
        onClose={closeEditDialog}
        fullWidth
        maxWidth="sm"
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 800, pb: 1 }}>
          編輯常用卡片
        </DialogTitle>
        <DialogContent sx={{ pt: 1 }}>
          <div className="flex flex-col gap-3 py-1">
            <input
              value={templateForm.name}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-black outline-none transition-colors focus:border-orange-400"
              placeholder="模板名稱"
            />
            <input
              value={templateForm.title}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, title: e.target.value }))}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-black outline-none transition-colors focus:border-orange-400"
              placeholder="獎勵標題"
            />
            <input
              value={templateForm.cost}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, cost: e.target.value }))}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-black outline-none transition-colors focus:border-orange-400"
              placeholder="價格"
            />
            <input
              value={templateForm.excerpt}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, excerpt: e.target.value }))}
              className="w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-black outline-none transition-colors focus:border-orange-400"
              placeholder="短摘要"
            />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {Object.entries(REWARD_TYPES).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTemplateForm((prev) => ({ ...prev, rewardType: key }))}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition-colors ${
                    templateForm.rewardType === key
                      ? 'border-orange-300 bg-orange-50 text-orange-700'
                      : 'border-gray-200 bg-stone-50 text-gray-600 hover:border-orange-200 hover:bg-orange-50/70'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <textarea
              value={templateForm.notes}
              onChange={(e) => setTemplateForm((prev) => ({ ...prev, notes: e.target.value }))}
              className="min-h-[220px] w-full resize-y rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm leading-7 text-black outline-none transition-colors focus:border-orange-400"
              placeholder="模板說明 / 備註"
            />
          </div>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
          <Button
            onClick={closeEditDialog}
            sx={{ color: '#57534e', textTransform: 'none', fontWeight: 700 }}
          >
            取消
          </Button>
          <Button
            variant="contained"
            onClick={saveTemplateEdit}
            sx={{
              bgcolor: '#ea580c',
              textTransform: 'none',
              fontWeight: 800,
              borderRadius: 99,
              px: 2.2,
              '&:hover': { bgcolor: '#c2410c' },
            }}
          >
            儲存模板
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

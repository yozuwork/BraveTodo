import { useRef, useState, useEffect } from 'react'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CollectionsIcon from '@mui/icons-material/Collections'
import ZoomOutMapIcon from '@mui/icons-material/ZoomOutMap'
import CloseIcon from '@mui/icons-material/Close'
import { resolveImg } from '../../utils/imageSrc'
import GalleryImagePicker from '../common/GalleryImagePicker'

const STAGE_COLORS = ['#a855f7', '#3b82f6', '#f97316', '#ef4444', '#10b981', '#f59e0b']

export default function StageBossCard({
  stage,         // { id, minLevel, maxLevel, className, bossName, bossAvatar, bossHuntStatus, bossHuntTasks }
  stageIndex,
  currentLevel,
  onStartHunt,
  onStopHunt,
  onCompleteHunt,
  onBossNameChange,
  onBossAvatarChange,
  onStageLevelChange,
  onRemove,
  canDelete,
  pasteSelected = false,  // 點一下選取後顯示黃色框，Ctrl+V 由 HuntTab 貼到這張
  onSelectPaste,
}) {
  const {
    id, minLevel, maxLevel, className,
    bossName, bossAvatar,
    bossHuntStatus, bossHuntTasks = [],
  } = stage

  const accent   = STAGE_COLORS[stageIndex % STAGE_COLORS.length]
  const canHunt  = currentLevel >= maxLevel - 3
  const isHunting  = bossHuntStatus === 'hunting'
  const isDefeated = bossHuntStatus === 'defeated'

  const completedCount = bossHuntTasks.filter((t) => t.completed).length
  const totalCount     = bossHuntTasks.length
  const hpPercent      = totalCount > 0 ? ((totalCount - completedCount) / totalCount) * 100 : 100
  const hpColor = hpPercent > 60 ? '#22c55e' : hpPercent > 30 ? '#f59e0b' : '#ef4444'

  const [editingName, setEditingName] = useState(false)
  const [nameDraft,   setNameDraft]   = useState(bossName)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const nameInputRef  = useRef(null)
  const fileInputRef  = useRef(null)

  useEffect(() => { if (!editingName) setNameDraft(bossName) }, [bossName, editingName])
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  useEffect(() => {
    if (!previewOpen) return
    const handleKey = (event) => { if (event.key === 'Escape') setPreviewOpen(false) }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [previewOpen])

  // 第一次點選取（可貼上），已選取時再點一下開啟本地上傳
  const handleImageClick = () => {
    if (pasteSelected) fileInputRef.current?.click()
    else onSelectPaste?.(id)
  }

  const commitName = () => {
    const t = nameDraft.trim()
    if (t) onBossNameChange(id, t)
    else setNameDraft(bossName)
    setEditingName(false)
  }

  return (
    <div
      data-boss-paste-target
      className="group/boss flex flex-col rounded-2xl overflow-hidden shadow-md select-none border"
      style={{
        width: 160,
        height: 290,
        flexShrink: 0,
        borderColor: pasteSelected ? '#fbbf24'
          : isDefeated ? `${accent}cc`
          : isHunting  ? `${accent}88`
          : '#e5e7eb',
        boxShadow: pasteSelected ? '0 0 0 4px #fde68a'
          : isDefeated ? `0 0 20px ${accent}55`
          : isHunting  ? `0 0 16px ${accent}44, 0 0 6px rgba(239,68,68,0.3)`
          : undefined,
      }}
    >
      {/* ── Image ── */}
      <div
        className="relative overflow-hidden"
        style={{ height: 186, background: '#111827', flexShrink: 0 }}
        title={pasteSelected ? 'Ctrl+V 貼上替換，或再點一下上傳' : '點一下選取（可貼上圖片）'}
      >
        {bossAvatar ? (
          <img
            src={resolveImg(bossAvatar)}
            alt={bossName}
            className="w-full h-full object-contain"
            draggable={false}
            onClick={handleImageClick}
            style={{ cursor: 'pointer' }}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${accent}33 0%, #111827 100%)` }}
            onClick={handleImageClick}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: `${accent}22`, border: `2px dashed ${accent}66` }}
            >
              <PhotoCameraIcon sx={{ fontSize: 22, color: accent, opacity: 0.6 }} />
            </div>
            {true && (
              <span className="text-[10px] font-medium" style={{ color: `${accent}99` }}>
                點一下選取後 Ctrl+V 貼上
              </span>
            )}
          </div>
        )}

        {/* Gradient bottom fade */}
        <div
          className="absolute bottom-0 left-0 right-0 h-10 pointer-events-none"
          style={{ background: 'linear-gradient(to top, #111827 0%, transparent 100%)' }}
        />

        {/* Stage badge — top left */}
        <span
          className="absolute top-2.5 left-2.5 text-[10px] font-bold text-white px-2 py-0.5 rounded-full z-10"
          style={{ background: accent }}
        >
          第{stageIndex + 1}階段
        </span>

        {/* Defeated crown — top right */}
        <button
          onClick={() => onRemove(id)}
          disabled={!canDelete}
          className="absolute top-2.5 right-2.5 w-7 h-7 rounded-full flex items-center justify-center bg-black/55 hover:bg-red-600 transition-colors border border-white/20 z-20 disabled:opacity-30 disabled:cursor-not-allowed"
          title="刪除"
        >
          <DeleteOutlineIcon sx={{ fontSize: 15, color: 'white' }} />
        </button>

        {isDefeated && (
          <div className="absolute top-11 right-2.5 z-10">
            <CheckCircleIcon sx={{ fontSize: 18, color: accent }} />
          </div>
        )}

        {pasteSelected && (
          <div className="pointer-events-none absolute inset-0 z-[5] flex flex-col items-center justify-center gap-1 bg-amber-300/45 text-xs font-bold text-amber-950">
            <span>Ctrl+V 貼上替換</span>
            <span className="text-[10px]">再點一下開啟上傳</span>
          </div>
        )}

        {/* Edit-mode camera overlay */}
        <div className="absolute bottom-2 right-2 flex gap-1 z-10">
          {bossAvatar && (
            <button
              onClick={() => setPreviewOpen(true)}
              className="w-6 h-6 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 transition-colors border border-white/20"
              title="查看全圖"
            >
              <ZoomOutMapIcon sx={{ fontSize: 13, color: 'white' }} />
            </button>
          )}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-6 h-6 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 transition-colors border border-white/20"
            title="本地上傳"
          >
            <PhotoCameraIcon sx={{ fontSize: 13, color: 'white' }} />
          </button>
          <button
            onClick={() => setGalleryOpen(true)}
            className="w-6 h-6 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 transition-colors border border-white/20"
            title="從圖庫選擇"
          >
            <CollectionsIcon sx={{ fontSize: 13, color: 'white' }} />
          </button>
        </div>

        {/* Hunting glow overlay */}
        {isHunting && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to top, rgba(239,68,68,0.18) 0%, transparent 60%)' }}
          />
        )}
      </div>

      {/* ── Info ── */}
      <div
        className="flex flex-col items-center justify-center gap-1 px-3 bg-white flex-1"
        style={{ borderTop: `2px solid ${accent}33` }}
      >
        {/* Boss name — editable in edit mode */}
        {editingName ? (
          <input
            ref={nameInputRef}
            className="w-full text-xs font-bold text-center bg-stone-50 border border-purple-200 rounded-lg px-2 py-1 outline-none focus:border-purple-400"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitName() }
              if (e.key === 'Escape') { setNameDraft(bossName); setEditingName(false) }
            }}
          />
        ) : (
          <p
            className="text-xs font-bold text-black text-center m-0 leading-tight"
            onDoubleClick={() => setEditingName(true)}
            title="雙擊編輯 Boss 名稱"
            style={{ cursor: 'text' }}
          >
            {bossName}
          </p>
        )}

        {/* Level range */}
        <p className="text-[10px] text-gray-400 font-mono m-0">
          LV{minLevel} — <span className="font-bold" style={{ color: accent }}>LV{maxLevel}</span>
        </p>

        {/* Mini HP bar — only while hunting */}
        <div className="flex items-center justify-center gap-1 text-[10px] text-gray-400 font-mono m-0">
          <span>LV</span>
          <input
            type="text"
            inputMode="numeric"
            value={minLevel}
            onChange={(e) => onStageLevelChange(id, 'minLevel', e.target.value)}
            className="w-8 text-center text-[10px] font-mono bg-stone-50 border border-gray-200 rounded px-1 py-0.5 outline-none focus:border-purple-400"
          />
          <span>-</span>
          <input
            type="text"
            inputMode="numeric"
            value={maxLevel}
            onChange={(e) => onStageLevelChange(id, 'maxLevel', e.target.value)}
            className="w-8 text-center text-[10px] font-mono bg-stone-50 border border-gray-200 rounded px-1 py-0.5 outline-none focus:border-purple-400"
            style={{ color: accent }}
          />
        </div>

        {isHunting && totalCount > 0 && (
          <div className="w-full mt-0.5">
            <div className="h-1.5 rounded-full overflow-hidden bg-gray-200">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${hpPercent}%`, background: hpColor }}
              />
            </div>
          </div>
        )}

        {/* Defeated badge */}
        {isDefeated && (
          <button
            onClick={() => onStopHunt(id)}
            className="w-full mt-1 py-1 rounded-lg text-[10px] font-bold transition-all duration-200"
            style={{ background: `${accent}22`, color: accent }}
            title="解除討伐狀態"
          >
            解除討伐
          </button>
        )}

        {/* Hunt button */}
        {!isDefeated && canHunt && (
          <button
            onClick={() => isHunting ? onStopHunt(id) : onStartHunt(id)}
            className="w-full mt-1 py-1 rounded-lg text-[10px] font-bold text-white transition-all duration-200"
            style={isHunting ? {
              background: 'linear-gradient(135deg, #dc2626 0%, #991b1b 100%)',
              boxShadow: '0 2px 8px rgba(220,38,38,0.45)',
            } : {
              background: `linear-gradient(135deg, ${accent}cc 0%, ${accent} 100%)`,
            }}
          >
            {isHunting ? '⚔ 討伐中' : '⚔ 可討伐'}
          </button>
        )}

        {!isDefeated && (
          <button
            onClick={() => onCompleteHunt(id)}
            className="w-full mt-1 py-1 rounded-lg text-[10px] font-bold transition-all duration-200 border"
            style={{
              borderColor: `${accent}66`,
              color: accent,
              background: '#ffffff',
            }}
            title="手動標記為已討伐"
          >
            完成討伐
          </button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { onBossAvatarChange(id, e.target.files[0]); e.target.value = '' }}
      />
      {previewOpen && bossAvatar && (
        <div
          className="fixed inset-0 z-[1400] flex items-center justify-center bg-black/90 p-4 md:p-10"
          onClick={() => setPreviewOpen(false)}
        >
          <img
            src={resolveImg(bossAvatar)}
            alt={bossName}
            className="max-h-full max-w-full select-none object-contain"
            draggable={false}
            onClick={(e) => e.stopPropagation()}
          />
          <span className="absolute left-4 top-4 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
            第{stageIndex + 1}階段・{bossName}
          </span>
          <button
            type="button"
            onClick={() => setPreviewOpen(false)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
            aria-label="關閉"
          >
            <CloseIcon sx={{ fontSize: 19 }} />
          </button>
        </div>
      )}
      <GalleryImagePicker
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialTab="monster"
        onSelect={(src) => onBossAvatarChange(id, src)}
      />
    </div>
  )
}

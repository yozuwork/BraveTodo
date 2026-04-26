import { useRef, useState, useEffect } from 'react'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { resolveImg } from '../../utils/imageSrc'

const STAGE_COLORS = ['#a855f7', '#3b82f6', '#f97316', '#ef4444', '#10b981', '#f59e0b']

export default function StageBossCard({
  stage,         // { id, minLevel, maxLevel, className, bossName, bossAvatar, bossHuntStatus, bossHuntTasks }
  stageIndex,
  currentLevel,
  onStartHunt,
  onStopHunt,
  onBossNameChange,
  onBossAvatarChange,
  isEditMode,
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
  const nameInputRef  = useRef(null)
  const fileInputRef  = useRef(null)

  useEffect(() => { if (!editingName) setNameDraft(bossName) }, [bossName, editingName])
  useEffect(() => {
    if (editingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [editingName])

  const commitName = () => {
    const t = nameDraft.trim()
    if (t) onBossNameChange(id, t)
    else setNameDraft(bossName)
    setEditingName(false)
  }

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden shadow-md select-none border"
      style={{
        width: 160,
        height: 290,
        flexShrink: 0,
        borderColor: isDefeated ? `${accent}cc`
          : isHunting  ? `${accent}88`
          : '#e5e7eb',
        boxShadow: isDefeated ? `0 0 20px ${accent}55`
          : isHunting  ? `0 0 16px ${accent}44, 0 0 6px rgba(239,68,68,0.3)`
          : undefined,
      }}
    >
      {/* ── Image ── */}
      <div
        className="relative overflow-hidden"
        style={{ height: 186, background: '#111827', flexShrink: 0 }}
      >
        {bossAvatar ? (
          <img
            src={resolveImg(bossAvatar)}
            alt={bossName}
            className="w-full h-full object-contain"
            draggable={false}
            onClick={() => isEditMode && fileInputRef.current?.click()}
            style={{ cursor: isEditMode ? 'pointer' : 'default' }}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${accent}33 0%, #111827 100%)` }}
            onClick={() => isEditMode && fileInputRef.current?.click()}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: `${accent}22`, border: `2px dashed ${accent}66` }}
            >
              <PhotoCameraIcon sx={{ fontSize: 22, color: accent, opacity: 0.6 }} />
            </div>
            {isEditMode && (
              <span className="text-[10px] font-medium" style={{ color: `${accent}99` }}>
                點擊上傳圖片
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
        {isDefeated && (
          <div className="absolute top-2.5 right-2.5 z-10">
            <CheckCircleIcon sx={{ fontSize: 18, color: accent }} />
          </div>
        )}

        {/* Edit-mode camera overlay */}
        {isEditMode && bossAvatar && (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 transition-colors border border-white/20 z-10"
          >
            <PhotoCameraIcon sx={{ fontSize: 13, color: 'white' }} />
          </button>
        )}

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
            onDoubleClick={() => isEditMode && setEditingName(true)}
            title={isEditMode ? '雙擊編輯Boss名稱' : undefined}
            style={{ cursor: isEditMode ? 'text' : 'default' }}
          >
            {bossName}
          </p>
        )}

        {/* Level range */}
        <p className="text-[10px] text-gray-400 font-mono m-0">
          LV{minLevel} — <span className="font-bold" style={{ color: accent }}>LV{maxLevel}</span>
        </p>

        {/* Mini HP bar — only while hunting */}
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
          <span
            className="text-[10px] font-bold px-2 py-0.5 rounded-full mt-0.5"
            style={{ background: `${accent}22`, color: accent }}
          >
            ✓ 已討伐
          </span>
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
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { onBossAvatarChange(id, e.target.files[0]); e.target.value = '' }}
      />
    </div>
  )
}

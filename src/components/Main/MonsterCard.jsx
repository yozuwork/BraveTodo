import { useRef, useState, useEffect } from 'react'
import IconButton from '@mui/material/IconButton'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import { MONSTER_TYPES, TYPE_CONFIG } from '../../hooks/useMonsters'

const MIN_CARD_W = 130
const MAX_CARD_W = 420
const MIN_CARD_H = 200
const MAX_CARD_H = 600
const TEXT_AREA_H = 72   // fixed height for the bottom text section

export default function MonsterCard({ monster, isEditMode, onUpdate, onRemove, onAvatarChange }) {
  const { id, name, recommendedLevel, type, avatar, cardW, cardH } = monster

  const [editingName, setEditingName] = useState(false)
  const [editingLevel, setEditingLevel] = useState(false)
  const [nameDraft, setNameDraft] = useState(name)
  const [levelDraft, setLevelDraft] = useState(String(recommendedLevel))

  const fileInputRef = useRef(null)
  const nameInputRef = useRef(null)
  const levelInputRef = useRef(null)
  const cardResizeRef = useRef(null)

  const cfg = TYPE_CONFIG[type] ?? TYPE_CONFIG.minion
  const imgH = cardH - TEXT_AREA_H

  useEffect(() => {
    if (editingName && nameInputRef.current) { nameInputRef.current.focus(); nameInputRef.current.select() }
  }, [editingName])

  useEffect(() => {
    if (editingLevel && levelInputRef.current) { levelInputRef.current.focus(); levelInputRef.current.select() }
  }, [editingLevel])

  useEffect(() => { if (!editingName)  setNameDraft(name) },                     [name, editingName])
  useEffect(() => { if (!editingLevel) setLevelDraft(String(recommendedLevel)) }, [recommendedLevel, editingLevel])

  const commitName = () => {
    const t = nameDraft.trim()
    if (t) onUpdate(id, { name: t }); else setNameDraft(name)
    setEditingName(false)
  }

  const commitLevel = () => {
    const v = parseInt(levelDraft, 10)
    onUpdate(id, { recommendedLevel: isNaN(v) ? recommendedLevel : Math.max(1, v) })
    setEditingLevel(false)
  }

  // ── Card resize ──────────────────────────────────────────────
  const handleResizeDown = (e) => {
    if (!isEditMode) return
    e.stopPropagation()
    e.currentTarget.setPointerCapture(e.pointerId)
    cardResizeRef.current = { startX: e.clientX, startY: e.clientY, startW: cardW, startH: cardH }
  }

  const handleResizeMove = (e) => {
    if (!cardResizeRef.current) return
    const dx = e.clientX - cardResizeRef.current.startX
    const dy = e.clientY - cardResizeRef.current.startY
    onUpdate(id, {
      cardW: Math.max(MIN_CARD_W, Math.min(MAX_CARD_W, cardResizeRef.current.startW + dx)),
      cardH: Math.max(MIN_CARD_H, Math.min(MAX_CARD_H, cardResizeRef.current.startH + dy)),
    })
  }

  const handleResizeUp = () => { cardResizeRef.current = null }

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden shadow-md select-none border border-gray-100"
      style={{ width: cardW, height: cardH, flexShrink: 0 }}
      onPointerMove={handleResizeMove}
      onPointerUp={handleResizeUp}
    >
      {/* ── Image section ── */}
      <div
        className="relative overflow-hidden"
        style={{ height: imgH, background: '#111827', flexShrink: 0 }}
      >
        {avatar ? (
          <img
            src={avatar}
            alt={name}
            className="w-full h-full object-contain"
            draggable={false}
            onClick={() => isEditMode && fileInputRef.current?.click()}
            style={{ cursor: isEditMode ? 'pointer' : 'default' }}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center gap-2 cursor-pointer"
            style={{ background: `linear-gradient(135deg, ${cfg.accent}44 0%, #111827 100%)` }}
            onClick={() => fileInputRef.current?.click()}
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center"
              style={{ background: `${cfg.accent}22`, border: `2px dashed ${cfg.accent}66` }}
            >
              <PhotoCameraIcon sx={{ fontSize: 28, color: cfg.accent, opacity: 0.6 }} />
            </div>
            <span className="text-xs font-medium" style={{ color: `${cfg.accent}99` }}>
              點擊上傳圖片
            </span>
          </div>
        )}

        {/* Type badge / dropdown — top right */}
        <div className="absolute top-2.5 right-2.5 z-10">
          {isEditMode ? (
            <select
              value={type}
              onChange={(e) => onUpdate(id, { type: e.target.value })}
              className="text-xs font-bold text-white rounded-full border-none outline-none cursor-pointer px-2.5 py-1"
              style={{ background: cfg.accent, appearance: 'none', WebkitAppearance: 'none' }}
            >
              {MONSTER_TYPES.map((t) => (
                <option key={t} value={t} style={{ background: '#1f2937', color: 'white' }}>
                  {TYPE_CONFIG[t].label}
                </option>
              ))}
            </select>
          ) : (
            <span
              className="text-xs font-bold text-white px-2.5 py-1 rounded-full"
              style={{ background: cfg.accent }}
            >
              {cfg.label}
            </span>
          )}
        </div>

        {/* Edit mode controls — top left */}
        {isEditMode && (
          <div className="absolute top-2 left-2 flex items-center gap-1 z-10">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-black/60 hover:bg-black/80 transition-colors border border-white/20"
            >
              <PhotoCameraIcon sx={{ fontSize: 14, color: 'white' }} />
            </button>
            <button
              onClick={() => onRemove(id)}
              className="w-7 h-7 rounded-full flex items-center justify-center transition-colors border border-white/20"
              style={{ background: 'rgba(239,68,68,0.75)' }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239,68,68,1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(239,68,68,0.75)'}
            >
              <DeleteOutlineIcon sx={{ fontSize: 14, color: 'white' }} />
            </button>
          </div>
        )}

        {/* Resize handle — bottom right */}
        {isEditMode && (
          <div
            className="absolute bottom-1 right-1 w-6 h-6 flex items-center justify-center cursor-se-resize z-10 rounded-md bg-black/40 hover:bg-black/70 transition-colors"
            onPointerDown={handleResizeDown}
            title="拖曳調整卡片大小"
          >
            <OpenInFullIcon sx={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', transform: 'rotate(90deg)' }} />
          </div>
        )}
      </div>

      {/* ── Text section ── */}
      <div
        className="flex flex-col items-center justify-center gap-1 px-3 bg-white"
        style={{ height: TEXT_AREA_H, flexShrink: 0, borderTop: `2px solid ${cfg.accent}33` }}
      >
        {editingName ? (
          <input
            ref={nameInputRef}
            className="w-full text-sm font-bold text-center bg-stone-50 border border-purple-200 rounded-lg px-2 py-1 outline-none focus:border-purple-400"
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitName() }
              if (e.key === 'Escape') { setNameDraft(name); setEditingName(false) }
            }}
          />
        ) : (
          <p
            className="text-sm font-bold text-black text-center m-0 leading-tight cursor-text"
            onDoubleClick={() => setEditingName(true)}
            title="雙擊編輯名稱"
          >
            {name}
          </p>
        )}

        {editingLevel ? (
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">推薦</span>
            <input
              ref={levelInputRef}
              type="number"
              min={1}
              className="w-16 text-xs font-mono font-bold text-center bg-stone-50 border border-purple-200 rounded px-1 py-0.5 outline-none focus:border-purple-400"
              style={{ color: cfg.accent }}
              value={levelDraft}
              onChange={(e) => setLevelDraft(e.target.value)}
              onBlur={commitLevel}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); commitLevel() }
                if (e.key === 'Escape') { setLevelDraft(String(recommendedLevel)); setEditingLevel(false) }
              }}
            />
          </div>
        ) : (
          <p
            className="text-xs text-gray-400 text-center m-0 cursor-text font-mono"
            onDoubleClick={() => setEditingLevel(true)}
            title="雙擊編輯推薦等級"
          >
            推薦 <span className="font-bold" style={{ color: cfg.accent }}>LV {recommendedLevel}</span>
          </p>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => { onAvatarChange(id, e.target.files[0]); e.target.value = '' }}
      />
    </div>
  )
}

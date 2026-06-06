/* eslint-disable react/prop-types */
import { useEffect, useRef, useState } from 'react'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import MapOutlinedIcon from '@mui/icons-material/MapOutlined'
import CloseIcon from '@mui/icons-material/Close'
import OpenInFullIcon from '@mui/icons-material/OpenInFull'
import EditIcon from '@mui/icons-material/Edit'
import { resolveImg } from '../../utils/imageSrc'

const MIN_CARD_W = 280
const MAX_CARD_W = 980
const MIN_CARD_H = 230
const MAX_CARD_H = 760
const TITLE_AREA_H = 104

export default function MapCard({
  map,
  onUpdate,
  onRemove,
  onCoverChange,
}) {
  const { id, name, description, cover, cardW = 560, cardH = 390 } = map
  const [open, setOpen] = useState(false)
  const [resizeMode, setResizeMode] = useState(false)
  const [nameDraft, setNameDraft] = useState(name)
  const [descriptionDraft, setDescriptionDraft] = useState(description ?? '')
  const fileInputRef = useRef(null)
  const nameInputRef = useRef(null)
  const cardResizeRef = useRef(null)
  const suppressOpenRef = useRef(false)

  const imageH = Math.max(154, cardH - TITLE_AREA_H)

  useEffect(() => {
    if (!open) {
      setNameDraft(name)
      setDescriptionDraft(description ?? '')
    }
  }, [description, name, open])

  useEffect(() => {
    if (open) requestAnimationFrame(() => nameInputRef.current?.focus())
  }, [open])

  const saveMap = () => {
    onUpdate(id, {
      name: nameDraft.trim() || '未命名地圖',
      description: descriptionDraft.trim(),
    })
    setOpen(false)
  }

  const handleResizeDown = (e, mode) => {
    e.stopPropagation()
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    cardResizeRef.current = {
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startW: cardW,
      startH: cardH,
      ratio: cardW / cardH,
      moved: false,
    }
  }

  const handleResizeMove = (e) => {
    if (!cardResizeRef.current) return
    const dx = e.clientX - cardResizeRef.current.startX
    const dy = e.clientY - cardResizeRef.current.startY
    if (!cardResizeRef.current.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return
    cardResizeRef.current.moved = true
    suppressOpenRef.current = true

    if (cardResizeRef.current.mode === 'width') {
      onUpdate(id, {
        cardW: Math.max(MIN_CARD_W, Math.min(MAX_CARD_W, cardResizeRef.current.startW + dx)),
      })
      return
    }

    if (cardResizeRef.current.mode === 'height') {
      onUpdate(id, {
        cardH: Math.max(MIN_CARD_H, Math.min(MAX_CARD_H, cardResizeRef.current.startH + dy)),
      })
      return
    }

    const useHorizontalDrag = Math.abs(dx) >= Math.abs(dy)
    const scale = 1 + (useHorizontalDrag ? dx / cardResizeRef.current.startW : dy / cardResizeRef.current.startH)
    let nextW = Math.max(MIN_CARD_W, Math.min(MAX_CARD_W, cardResizeRef.current.startW * scale))
    let nextH = nextW / cardResizeRef.current.ratio

    if (nextH < MIN_CARD_H) {
      nextH = MIN_CARD_H
      nextW = nextH * cardResizeRef.current.ratio
    }
    if (nextH > MAX_CARD_H) {
      nextH = MAX_CARD_H
      nextW = nextH * cardResizeRef.current.ratio
    }

    onUpdate(id, {
      cardW: Math.max(MIN_CARD_W, Math.min(MAX_CARD_W, nextW)),
      cardH: Math.max(MIN_CARD_H, Math.min(MAX_CARD_H, nextH)),
    })
  }

  const handleResizeUp = () => {
    if (cardResizeRef.current?.moved) {
      window.setTimeout(() => {
        suppressOpenRef.current = false
      }, 0)
    } else {
      suppressOpenRef.current = false
    }
    cardResizeRef.current = null
  }

  return (
    <>
      <div
        className="relative flex flex-col rounded-2xl overflow-hidden shadow-md select-none border border-emerald-100 bg-white hover:-translate-y-0.5 hover:shadow-lg transition-all"
        style={{
          width: `min(${cardW}px, 100%)`,
          height: cardH,
          flexShrink: 0,
        }}
        onPointerMove={handleResizeMove}
        onPointerUp={handleResizeUp}
        onPointerCancel={handleResizeUp}
      >
        <div
          className="relative overflow-hidden bg-emerald-950 w-full cursor-pointer"
          style={{ height: imageH, flexShrink: 0 }}
          onClick={(e) => {
            e.stopPropagation()
            fileInputRef.current?.click()
          }}
          title="點擊上傳封面"
        >
          {cover ? (
            <img
              src={resolveImg(cover)}
              alt={name}
              className="w-full h-full object-cover"
              draggable={false}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-emerald-950 via-teal-900 to-lime-800">
              <div className="w-16 h-16 rounded-full flex items-center justify-center border border-white/20 bg-white/10">
                <MapOutlinedIcon sx={{ fontSize: 32, color: 'rgba(255,255,255,0.72)' }} />
              </div>
              <span className="text-xs font-semibold text-white/70">地圖封面</span>
            </div>
          )}
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
          <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setResizeMode((value) => !value)
              }}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors border border-white/20 ${
                resizeMode ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-black/60 hover:bg-black/80'
              }`}
              title={resizeMode ? '完成調整大小' : '編輯卡片大小'}
            >
              <EditIcon sx={{ fontSize: 14, color: 'white' }} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onRemove(id)
              }}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-red-500/80 hover:bg-red-500 transition-colors border border-white/20"
              title="刪除地圖"
            >
              <DeleteOutlineIcon sx={{ fontSize: 14, color: 'white' }} />
            </button>
          </div>
        </div>

        <div
          className="flex flex-col items-center justify-center gap-2 px-5 py-4 bg-white border-t border-emerald-100"
          style={{ height: TITLE_AREA_H, flexShrink: 0 }}
        >
          <p
            className="text-xl font-extrabold text-black text-center m-0 leading-tight overflow-hidden"
            style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}
          >
            {name}
          </p>
          <button
            type="button"
            onClick={() => {
              if (suppressOpenRef.current) return
              setOpen(true)
            }}
            className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition-colors"
          >
            開啟卡片
          </button>
        </div>

        {resizeMode && (
          <>
            <div className="absolute inset-0 border-2 border-emerald-400/70 rounded-2xl pointer-events-none z-20" />
            <div
              className="absolute top-1/2 right-0 -translate-y-1/2 w-4 h-20 flex items-center justify-center cursor-ew-resize z-30 rounded-l-md bg-black/25 hover:bg-black/55 transition-colors"
              onPointerDown={(e) => handleResizeDown(e, 'width')}
              onClick={(e) => e.stopPropagation()}
              title="拖曳調整寬度"
            >
              <span className="w-1 h-10 rounded-full bg-white/75" />
            </div>

            <div
              className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-4 flex items-center justify-center cursor-ns-resize z-30 rounded-t-md bg-black/25 hover:bg-black/55 transition-colors"
              onPointerDown={(e) => handleResizeDown(e, 'height')}
              onClick={(e) => e.stopPropagation()}
              title="拖曳調整高度"
            >
              <span className="w-12 h-1 rounded-full bg-white/75" />
            </div>

            <div
              className="absolute bottom-1.5 right-1.5 w-8 h-8 flex items-center justify-center cursor-nwse-resize z-40 rounded-md bg-black/45 hover:bg-black/70 transition-colors"
              onPointerDown={(e) => handleResizeDown(e, 'scale')}
              onClick={(e) => e.stopPropagation()}
              title="等比拖曳整張卡片"
            >
              <OpenInFullIcon sx={{ fontSize: 14, color: 'rgba(255,255,255,0.86)', transform: 'rotate(90deg)' }} />
            </div>
          </>
        )}

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
            className="w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 min-w-0">
                <MapOutlinedIcon sx={{ fontSize: 20, color: '#047857' }} />
                <span className="text-sm font-bold text-gray-500">地圖資訊</span>
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
                ref={nameInputRef}
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                className="w-full text-3xl max-md:text-2xl font-extrabold text-black bg-transparent border-0 border-b border-gray-200 px-0 py-2 outline-none focus:border-emerald-500"
                placeholder="地圖名稱"
              />
              <textarea
                value={descriptionDraft}
                onChange={(e) => setDescriptionDraft(e.target.value)}
                className="min-h-[260px] w-full resize-y text-base leading-8 text-gray-800 bg-stone-50 border border-gray-100 rounded-2xl px-4 py-4 outline-none focus:border-emerald-400"
                placeholder="寫下這張地圖的區域、入口、背景或備註..."
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
                onClick={saveMap}
                className="px-5 py-2 rounded-full bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors"
              >
                儲存地圖
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

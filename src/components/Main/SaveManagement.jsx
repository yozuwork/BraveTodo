import { useEffect, useMemo, useRef, useState } from 'react'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera'
import CollectionsIcon from '@mui/icons-material/Collections'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { resolveImg } from '../../utils/imageSrc'
import { compressImage } from '../../utils/compressImage'
import { DEFAULT_RULES } from '../../hooks/useLevelingRules'
import { calcLevelInfo, normalizeLevelingRules } from '../../utils/levelingRules'
import GalleryImagePicker from '../common/GalleryImagePicker'

const DB_NAME = 'brave-todo-save-slots'
const DB_VERSION = 1
const STORE_NAME = 'saves'
const PAGE_SIZE = 20

const FIRESTORE_DOCS = [
  'quests',
  'monsters',
  'inbox',
  'stages',
  'character',
  'levelingRules',
]

const LOCAL_SAVE_KEYS = [
  'brave-todo:leveling-rules',
  'brave-todo:levelingRules',
  'brave-todo:soundEnabled',
  'characterCardSize',
  'brave-todo:favicon',
  'brave-todo:pageTitle',
]

function openSaveDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore(mode, action) {
  const db = await openSaveDb()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, mode)
      const store = tx.objectStore(STORE_NAME)
      const req = action(store)
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

const getAllSaves = () => withStore('readonly', (store) => store.getAll())
const putSave = (save) => withStore('readwrite', (store) => store.put(save))
const deleteSave = (id) => withStore('readwrite', (store) => store.delete(id))

async function captureSavePayload() {
  const firestore = {}
  await Promise.all(
    FIRESTORE_DOCS.map(async (name) => {
      const snap = await getDoc(doc(db, 'meta', name))
      if (snap.exists()) firestore[name] = snap.data()
    }),
  )

  const local = {}
  LOCAL_SAVE_KEYS.forEach((key) => {
    const value = localStorage.getItem(key)
    if (value !== null) local[key] = value
  })

  return { firestore, local }
}

function downloadJsonSave(save) {
  const blob = new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `braveTodo-save-${Date.now()}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

async function loadSavePayload(save) {
  await Promise.all(
    Object.entries(save.firestore ?? {}).map(([name, data]) =>
      setDoc(doc(db, 'meta', name), data),
    ),
  )

  LOCAL_SAVE_KEYS.forEach((key) => localStorage.removeItem(key))
  Object.entries(save.local ?? {}).forEach(([key, value]) => {
    if (typeof value === 'string') localStorage.setItem(key, value)
  })
}

function formatDate(value) {
  if (!value) return '未知時間'
  return new Intl.DateTimeFormat('zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function buildSaveMetadata({ currentLevel, currentStage }) {
  const stageName = currentStage?.className ?? '未知階段'
  const minLevel = currentStage?.minLevel ?? 1
  const maxLevel = currentStage?.maxLevel ?? currentLevel

  return {
    level: currentLevel,
    stageName,
    stageMinLevel: minLevel,
    stageMaxLevel: maxLevel,
    thumbnail: currentStage?.avatarSrc ?? null,
    thumbnailPosition: currentStage?.avatarPositions?.[0] ?? { x: 50, y: 50 },
  }
}

function resolveImportedStage(stagesDoc, level) {
  const rawStages = Array.isArray(stagesDoc?.items) && stagesDoc.items.length > 0
    ? stagesDoc.items
    : [{ id: 1, minLevel: 1, maxLevel: 10, className: '初心者' }]
  const bossHunts = stagesDoc?.bossHunts ?? {}
  const sorted = [...rawStages].sort((a, b) => a.minLevel - b.minLevel)
  let displayStage = sorted[0]

  for (let i = 0; i < sorted.length; i += 1) {
    const stage = sorted[i]
    if (level < stage.minLevel) break
    if (i === 0) {
      displayStage = stage
    } else {
      const prev = sorted[i - 1]
      if (bossHunts[prev.id]?.huntStatus === 'defeated') displayStage = stage
      else break
    }
  }

  const avatars = Array.isArray(displayStage.avatars)
    ? displayStage.avatars.filter(Boolean)
    : (displayStage.avatar ? [displayStage.avatar] : [])

  return {
    stageName: displayStage.className ?? '未知階段',
    stageMinLevel: displayStage.minLevel ?? 1,
    stageMaxLevel: displayStage.maxLevel ?? level,
    thumbnail: avatars[0] ?? null,
    thumbnailPosition: displayStage.avatarPositions?.[0] ?? { x: 50, y: 50 },
  }
}

function metadataFromPayload(payload) {
  const rulesDoc = payload.firestore?.levelingRules
  const savedRules = Array.isArray(rulesDoc?.items)
    ? rulesDoc.items.map((item) => {
        const defaultRule = DEFAULT_RULES.find((rule) => rule.id === item?.id)
        return defaultRule ? { ...defaultRule, ...item } : item
      })
    : DEFAULT_RULES
  const rules = normalizeLevelingRules(savedRules)
  const completions = Number(payload.firestore?.quests?.lifetimeCompletions) || 0
  const { level } = calcLevelInfo(completions, rules)
  const stage = resolveImportedStage(payload.firestore?.stages, level)

  return { level, ...stage }
}

function normalizeImportedPayload(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('存檔格式錯誤')
  }

  if (raw.firestore && typeof raw.firestore === 'object') {
    return {
      firestore: raw.firestore,
      local: raw.local && typeof raw.local === 'object'
        ? raw.local
        : Object.fromEntries(
            Object.entries(raw).filter(([key, value]) =>
              LOCAL_SAVE_KEYS.includes(key) && typeof value === 'string',
            ),
          ),
    }
  }

  throw new Error('找不到可匯入的存檔資料')
}

function SaveSlotCard({
  save,
  onOpen,
  onThumbnailPositionChange,
}) {
  const dragRef = useRef(null)
  const savedThumbnailPosition = save.thumbnailPosition ?? { x: 50, y: 50 }
  const [thumbnailPosition, setThumbnailPosition] = useState(savedThumbnailPosition)

  useEffect(() => {
    setThumbnailPosition(savedThumbnailPosition)
  }, [savedThumbnailPosition.x, savedThumbnailPosition.y])

  const updatePosition = (e, commit = false) => {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    if (!dragRef.current.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return
    dragRef.current.moved = true
    const rect = e.currentTarget.getBoundingClientRect()
    const next = {
      x: Math.min(100, Math.max(0, dragRef.current.startPos.x - (dx / rect.width) * 100)),
      y: Math.min(100, Math.max(0, dragRef.current.startPos.y - (dy / rect.height) * 100)),
    }
    dragRef.current.next = next
    setThumbnailPosition(next)
    if (commit) onThumbnailPositionChange(save.id, next)
  }

  return (
    <div className="flex flex-col rounded-2xl overflow-hidden shadow-md select-none border border-gray-100 bg-white w-[180px] h-[288px] shrink-0">
      <div className="relative h-[188px] bg-gray-900 overflow-hidden">
        {save.thumbnail ? (
          <img
            src={resolveImg(save.thumbnail)}
            alt={save.name}
            className="w-full h-full object-cover cursor-grab active:cursor-grabbing select-none"
            style={{ objectPosition: `${thumbnailPosition.x}% ${thumbnailPosition.y}%` }}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId)
              dragRef.current = {
                startX: e.clientX,
                startY: e.clientY,
                startPos: savedThumbnailPosition,
                moved: false,
                next: savedThumbnailPosition,
              }
            }}
            onPointerMove={updatePosition}
            onPointerUp={(e) => {
              updatePosition(e, true)
              dragRef.current = null
            }}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-purple-500/30 to-gray-900 flex items-center justify-center text-white/50 text-xs font-bold">
            NO IMAGE
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-gray-900 to-transparent pointer-events-none" />
        <span className="absolute top-2.5 left-2.5 text-[10px] font-bold text-white px-2 py-0.5 rounded-full bg-purple-500">
          LV {save.level ?? 1}
        </span>
        <span className="absolute bottom-2.5 left-2.5 right-2.5 text-[10px] font-semibold text-white/80 truncate">
          {formatDate(save.updatedAt ?? save.createdAt)}
        </span>
      </div>

      <div className="flex flex-col gap-1.5 px-3 py-3 flex-1 border-t-2 border-purple-100">
        <p className="text-sm font-bold text-black text-center m-0 leading-tight truncate" title={save.name}>
          {save.name}
        </p>
        <p className="text-[10px] text-gray-400 text-center m-0 font-mono">
          {save.stageName} · LV{save.stageMinLevel} - LV{save.stageMaxLevel}
        </p>
        {save.note && (
          <p className="text-[11px] text-gray-500 text-center m-0 truncate" title={save.note}>
            {save.note}
          </p>
        )}
        <button
          onClick={() => onOpen(save.id)}
          className="mt-auto rounded-lg bg-purple-500 text-white text-[12px] font-bold py-2 flex items-center justify-center"
        >
          編輯與檢視
        </button>
      </div>
    </div>
  )
}

function SaveDetailDialog({ save, open, busy, onClose, onPatch, onLoad, onDelete }) {
  const [loadConfirm, setLoadConfirm] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [localThumbnailPosition, setLocalThumbnailPosition] = useState({ x: 50, y: 50 })
  const [localStagePositions, setLocalStagePositions] = useState({})
  const [imageTarget, setImageTarget] = useState(null)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const fileInputRef = useRef(null)
  const thumbnailDragRef = useRef(null)
  const stageDragRef = useRef(null)

  useEffect(() => {
    setLoadConfirm(false)
    setDeleteConfirm(false)
    setLocalThumbnailPosition(save?.thumbnailPosition ?? { x: 50, y: 50 })
    setLocalStagePositions({})
  }, [save?.id, open])

  if (!save) return null

  const stages = Array.isArray(save.firestore?.stages?.items)
    ? save.firestore.stages.items
    : []

  const patchSave = (patch) => onPatch(save.id, patch)
  const patchStage = (stageId, patch) => {
    const nextStages = stages.map((stage) => (
      stage.id === stageId ? { ...stage, ...patch } : stage
    ))
    const nextFirestore = {
      ...(save.firestore ?? {}),
      stages: {
        ...(save.firestore?.stages ?? {}),
        items: nextStages,
      },
    }
    const metadata = metadataFromPayload({ firestore: nextFirestore, local: save.local ?? {} })
    patchSave({ firestore: nextFirestore, ...metadata })
  }
  const patchStageAvatarPosition = (stageId, avatarIndex, position) => {
    const nextStages = stages.map((stage) => {
      if (stage.id !== stageId) return stage
      const positions = Array.isArray(stage.avatarPositions) ? [...stage.avatarPositions] : []
      positions[avatarIndex] = position
      return { ...stage, avatarPositions: positions }
    })
    const nextFirestore = {
      ...(save.firestore ?? {}),
      stages: {
        ...(save.firestore?.stages ?? {}),
        items: nextStages,
      },
    }
    const metadata = metadataFromPayload({ firestore: nextFirestore, local: save.local ?? {} })
    patchSave({ firestore: nextFirestore, ...metadata })
  }
  const patchStageAvatar = (stageId, image) => {
    const nextStages = stages.map((stage) => {
      if (stage.id !== stageId) return stage
      return {
        ...stage,
        avatar: image,
        avatars: [image],
        avatarPositions: [{ x: 50, y: 50 }],
      }
    })
    const nextFirestore = {
      ...(save.firestore ?? {}),
      stages: {
        ...(save.firestore?.stages ?? {}),
        items: nextStages,
      },
    }
    const metadata = metadataFromPayload({ firestore: nextFirestore, local: save.local ?? {} })
    setLocalStagePositions((prev) => ({ ...prev, [`${stageId}:0`]: { x: 50, y: 50 } }))
    patchSave({ firestore: nextFirestore, ...metadata })
  }
  const addStage = () => {
    const last = [...stages].sort((a, b) => (a.maxLevel ?? 0) - (b.maxLevel ?? 0)).at(-1)
    const minLevel = last?.maxLevel ?? 1
    const maxLevel = minLevel + 10
    const nextId = Math.max(0, ...stages.map((stage) => Number(stage.id) || 0)) + 1
    const nextStages = [
      ...stages,
      {
        id: nextId,
        minLevel,
        maxLevel,
        className: '新階段',
        avatar: null,
        avatars: [],
        avatarPositions: [],
      },
    ]
    const nextFirestore = {
      ...(save.firestore ?? {}),
      stages: {
        ...(save.firestore?.stages ?? {}),
        items: nextStages,
      },
    }
    const metadata = metadataFromPayload({ firestore: nextFirestore, local: save.local ?? {} })
    patchSave({ firestore: nextFirestore, ...metadata })
  }
  const handleImageFile = async (file) => {
    if (!file || !imageTarget) return
    const dataUrl = await compressImage(file)
    patchStageAvatar(imageTarget.stageId, dataUrl)
  }
  const handleGallerySelect = (src) => {
    if (!src || !imageTarget) return
    patchStageAvatar(imageTarget.stageId, src)
  }
  const handleThumbnailMove = (e, commit = false) => {
    if (!thumbnailDragRef.current) return
    const dx = e.clientX - thumbnailDragRef.current.startX
    const dy = e.clientY - thumbnailDragRef.current.startY
    if (!thumbnailDragRef.current.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return
    thumbnailDragRef.current.moved = true
    const rect = e.currentTarget.getBoundingClientRect()
    const next = {
      x: Math.min(100, Math.max(0, thumbnailDragRef.current.startPos.x - (dx / rect.width) * 100)),
      y: Math.min(100, Math.max(0, thumbnailDragRef.current.startPos.y - (dy / rect.height) * 100)),
    }
    thumbnailDragRef.current.next = next
    setLocalThumbnailPosition(next)
    if (commit) patchSave({ thumbnailPosition: next })
  }
  const handleStageImageMove = (e, commit = false) => {
    if (!stageDragRef.current) return
    const dx = e.clientX - stageDragRef.current.startX
    const dy = e.clientY - stageDragRef.current.startY
    if (!stageDragRef.current.moved && Math.abs(dx) < 3 && Math.abs(dy) < 3) return
    stageDragRef.current.moved = true
    const rect = e.currentTarget.getBoundingClientRect()
    const next = {
      x: Math.min(100, Math.max(0, stageDragRef.current.startPos.x - (dx / rect.width) * 100)),
      y: Math.min(100, Math.max(0, stageDragRef.current.startPos.y - (dy / rect.height) * 100)),
    }
    stageDragRef.current.next = next
    setLocalStagePositions((prev) => ({
      ...prev,
      [`${stageDragRef.current.stageId}:${stageDragRef.current.avatarIndex}`]: next,
    }))
    if (commit) {
      patchStageAvatarPosition(stageDragRef.current.stageId, stageDragRef.current.avatarIndex, next)
      stageDragRef.current = null
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 800, pb: 1.5 }}>
        編輯與檢視
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <div className="grid gap-5 md:grid-cols-[220px_1fr]">
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl overflow-hidden bg-gray-900 border border-gray-100 shadow-sm">
              <div className="relative h-64">
                {save.thumbnail ? (
                  <img
                    src={resolveImg(save.thumbnail)}
                    alt={save.name}
                    draggable={false}
                    className="w-full h-full object-cover cursor-grab active:cursor-grabbing select-none"
                    style={{ objectPosition: `${localThumbnailPosition.x}% ${localThumbnailPosition.y}%` }}
                    onPointerDown={(e) => {
                      e.currentTarget.setPointerCapture(e.pointerId)
                      thumbnailDragRef.current = {
                        startX: e.clientX,
                        startY: e.clientY,
                        startPos: localThumbnailPosition,
                        moved: false,
                        next: localThumbnailPosition,
                      }
                    }}
                    onPointerMove={handleThumbnailMove}
                    onPointerUp={(e) => {
                      handleThumbnailMove(e, true)
                      thumbnailDragRef.current = null
                    }}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-purple-500/30 to-gray-900 flex items-center justify-center text-white/50 text-xs font-bold">
                    NO IMAGE
                  </div>
                )}
                <span className="absolute top-3 left-3 text-[10px] font-bold text-white px-2 py-0.5 rounded-full bg-purple-500">
                  LV {save.level ?? 1}
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold text-gray-500">存檔名稱</label>
              <input
                value={save.name}
                onChange={(e) => patchSave({ name: e.target.value || save.name })}
                className="w-full text-sm font-bold text-black bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400"
              />
              <label className="text-xs font-semibold text-gray-500">備註</label>
              <input
                value={save.note ?? ''}
                onChange={(e) => patchSave({ note: e.target.value })}
                className="w-full text-sm text-gray-600 bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400"
                placeholder="可留空"
              />
              <p className="text-xs text-gray-400 m-0">
                {save.stageName} · LV{save.stageMinLevel} - LV{save.stageMaxLevel}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-black m-0">階段設置</h3>
                  <p className="text-xs text-gray-400 mt-0.5 m-0">這裡的修改會直接寫回此存檔</p>
                </div>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AddIcon />}
                  onClick={addStage}
                  sx={{
                    borderColor: '#a855f7',
                    color: '#a855f7',
                    borderRadius: 99,
                    textTransform: 'none',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    '&:hover': { borderColor: '#9333ea', bgcolor: '#faf5ff' },
                  }}
                >
                  新增階段
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-2 max-h-[430px] overflow-y-auto pr-1">
              {stages.length === 0 ? (
                <div className="rounded-xl border border-gray-100 bg-stone-50 px-4 py-8 text-center text-xs font-semibold text-gray-400">
                  此存檔沒有階段資料
                </div>
              ) : (
                stages.map((stage) => {
                  const avatars = Array.isArray(stage.avatars)
                    ? stage.avatars.filter(Boolean)
                    : (stage.avatar ? [stage.avatar] : [])
                  const avatarKey = `${stage.id}:0`
                  const avatarPos = localStagePositions[avatarKey] ?? stage.avatarPositions?.[0] ?? { x: 50, y: 50 }
                  return (
                    <div key={stage.id} className="rounded-xl border border-gray-100 bg-white px-3 py-3 flex items-center gap-3">
                      <div className="relative w-16 h-16 rounded-xl overflow-hidden bg-gray-900 shrink-0 group">
                        {avatars[0] ? (
                          <img
                            src={resolveImg(avatars[0])}
                            alt={stage.className}
                            draggable={false}
                            className="w-full h-full object-cover cursor-grab active:cursor-grabbing select-none"
                            style={{ objectPosition: `${avatarPos.x}% ${avatarPos.y}%` }}
                            onPointerDown={(e) => {
                              e.currentTarget.setPointerCapture(e.pointerId)
                              stageDragRef.current = {
                                stageId: stage.id,
                                avatarIndex: 0,
                                startX: e.clientX,
                                startY: e.clientY,
                                startPos: avatarPos,
                                moved: false,
                                next: avatarPos,
                              }
                            }}
                            onPointerMove={handleStageImageMove}
                            onPointerUp={(e) => handleStageImageMove(e, true)}
                          />
                        ) : (
                          <div className="w-full h-full bg-purple-500/20" />
                        )}
                        <div className="absolute inset-x-1 bottom-1 flex justify-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => {
                              setImageTarget({ stageId: stage.id })
                              fileInputRef.current?.click()
                            }}
                            className="w-6 h-6 rounded-full bg-black/65 hover:bg-black/85 flex items-center justify-center"
                            title="本地上傳"
                          >
                            <PhotoCameraIcon sx={{ fontSize: 13, color: 'white' }} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setImageTarget({ stageId: stage.id })
                              setGalleryOpen(true)
                            }}
                            className="w-6 h-6 rounded-full bg-black/65 hover:bg-black/85 flex items-center justify-center"
                            title="從世界圖庫選擇"
                          >
                            <CollectionsIcon sx={{ fontSize: 13, color: 'white' }} />
                          </button>
                        </div>
                      </div>
                      <div className="flex-1 grid gap-2 md:grid-cols-[1fr_72px_72px]">
                        <input
                          value={stage.className ?? ''}
                          onChange={(e) => patchStage(stage.id, { className: e.target.value })}
                          className="text-sm font-bold text-black bg-stone-50 border border-gray-200 rounded-lg px-3 py-2 outline-none focus:border-purple-400"
                        />
                        <input
                          type="number"
                          value={stage.minLevel ?? 1}
                          onChange={(e) => patchStage(stage.id, { minLevel: Math.max(1, Number(e.target.value) || 1) })}
                          className="text-xs font-mono text-center text-gray-600 bg-stone-50 border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-purple-400"
                        />
                        <input
                          type="number"
                          value={stage.maxLevel ?? 1}
                          onChange={(e) => patchStage(stage.id, { maxLevel: Math.max(1, Number(e.target.value) || 1) })}
                          className="text-xs font-mono text-center text-purple-600 bg-stone-50 border border-gray-200 rounded-lg px-2 py-2 outline-none focus:border-purple-400"
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </DialogContent>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void handleImageFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <GalleryImagePicker
        open={galleryOpen}
        onClose={() => setGalleryOpen(false)}
        initialTab="character"
        onSelect={handleGallerySelect}
      />
      <DialogActions sx={{ px: 3, pb: 2.5, justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          startIcon={<DeleteOutlineIcon />}
          onClick={() => {
            if (!deleteConfirm) {
              setDeleteConfirm(true)
              setLoadConfirm(false)
              return
            }
            onDelete(save)
          }}
          disabled={busy}
          sx={{
            borderColor: deleteConfirm ? '#ef4444' : '#fecaca',
            color: deleteConfirm ? '#ef4444' : '#dc2626',
            borderRadius: 99,
            textTransform: 'none',
            fontWeight: 700,
            '&:hover': { borderColor: '#ef4444', bgcolor: '#fef2f2' },
          }}
        >
          {deleteConfirm ? '確認刪除' : '刪除存檔'}
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={onClose} sx={{ color: '#6b7280', borderRadius: 99, textTransform: 'none', fontWeight: 700 }}>
            關閉
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayArrowIcon />}
            onClick={() => {
              if (!loadConfirm) {
                setLoadConfirm(true)
                setDeleteConfirm(false)
                return
              }
              onLoad(save)
            }}
            disabled={busy}
            sx={{
              bgcolor: loadConfirm ? '#ef4444' : '#a855f7',
              borderRadius: 99,
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { bgcolor: loadConfirm ? '#dc2626' : '#9333ea' },
            }}
          >
            {loadConfirm ? '確認載入' : '載入存檔'}
          </Button>
        </div>
      </DialogActions>
    </Dialog>
  )
}

export default function SaveManagement({ currentLevel, currentStage }) {
  const importInputRef = useRef(null)
  const [saves, setSaves] = useState([])
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [selectedSaveId, setSelectedSaveId] = useState(null)
  const [status, setStatus] = useState('')

  const sortedSaves = useMemo(
    () => [...saves].sort((a, b) => new Date(b.updatedAt ?? b.createdAt) - new Date(a.updatedAt ?? a.createdAt)),
    [saves],
  )
  const totalPages = Math.max(1, Math.ceil(sortedSaves.length / PAGE_SIZE))
  const visibleSaves = sortedSaves.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const selectedSave = saves.find((save) => save.id === selectedSaveId) ?? null

  const refresh = async () => {
    setLoading(true)
    try {
      setSaves(await getAllSaves())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh().catch((err) => {
      console.error(err)
      setStatus('讀取存檔失敗')
      setLoading(false)
    })
  }, [])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const handleCreate = async () => {
    setBusy(true)
    setStatus('')
    try {
      const now = new Date().toISOString()
      const metadata = buildSaveMetadata({ currentLevel, currentStage })
      const payload = await captureSavePayload()
      const save = {
        id: crypto.randomUUID(),
        name: `${metadata.stageName} LV${metadata.level}`,
        note: '',
        createdAt: now,
        updatedAt: now,
        ...metadata,
        ...payload,
      }
      await putSave(save)
      setSaves((prev) => [...prev, save])
      setPage(1)
      setStatus('已建立新存檔')
    } catch (err) {
      console.error(err)
      setStatus('建立存檔失敗')
    } finally {
      setBusy(false)
    }
  }

  const handleExportCurrent = async () => {
    setBusy(true)
    setStatus('')
    try {
      const metadata = buildSaveMetadata({ currentLevel, currentStage })
      const payload = await captureSavePayload()
      downloadJsonSave({
        _version: 2,
        _exportedAt: new Date().toISOString(),
        _snapshot: { level: metadata.level },
        ...metadata,
        ...payload,
      })
      setStatus('已匯出目前狀態 JSON')
    } catch (err) {
      console.error(err)
      setStatus('匯出失敗')
    } finally {
      setBusy(false)
    }
  }

  const handleLoad = async (save) => {
    setBusy(true)
    try {
      await loadSavePayload(save)
      window.location.reload()
    } catch (err) {
      console.error(err)
      setStatus('載入存檔失敗')
      setBusy(false)
    }
  }

  const handleDelete = async (save) => {
    setBusy(true)
    setStatus('')
    try {
      await deleteSave(save.id)
      setSaves((prev) => prev.filter((item) => item.id !== save.id))
      setSelectedSaveId(null)
      setStatus('存檔已刪除')
    } catch (err) {
      console.error(err)
      setStatus('刪除存檔失敗')
    } finally {
      setBusy(false)
    }
  }

  const handlePatchSave = async (id, patch) => {
    const save = saves.find((item) => item.id === id)
    if (!save) return
    const next = { ...save, ...patch, updatedAt: new Date().toISOString() }
    await putSave(next)
    setSaves((prev) => prev.map((item) => (item.id === id ? next : item)))
  }

  const handleThumbnailPositionChange = (id, position) => {
    void handlePatchSave(id, { thumbnailPosition: position })
  }

  const handleImportFile = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      setBusy(true)
      setStatus('')
      try {
        const raw = JSON.parse(event.target.result)
        const payload = normalizeImportedPayload(raw)
        const metadata = metadataFromPayload(payload)
        const now = new Date().toISOString()
        const save = {
          id: crypto.randomUUID(),
          name: raw.name || `${metadata.stageName} LV${metadata.level}`,
          note: raw.note || '匯入的本地存檔',
          createdAt: now,
          updatedAt: now,
          ...metadata,
          ...payload,
        }

        await putSave(save)
        setSaves((prev) => [...prev, save])
        setPage(1)
        setStatus('已匯入本地存檔，按卡片上的「載入」即可套用')
      } catch (err) {
        console.error(err)
        setStatus(`匯入失敗：${err.message}`)
      } finally {
        setBusy(false)
      }
    }
    reader.readAsText(file)
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-black m-0">存檔管理</h2>
          <p className="text-xs text-gray-400 mt-0.5 m-0">
            建立多個本機存檔，每個存檔會保存目前進度、圖片與系統設定
          </p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadIcon />}
            onClick={handleExportCurrent}
            disabled={busy}
            sx={{
              borderColor: '#a855f7',
              color: '#a855f7',
              borderRadius: 99,
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'none',
              px: 1.5,
              flexShrink: 0,
              '&:hover': { borderColor: '#9333ea', bgcolor: '#faf5ff' },
            }}
          >
            匯出目前狀態
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileUploadIcon />}
            onClick={() => importInputRef.current?.click()}
            disabled={busy}
            sx={{
              borderColor: '#6b7280',
              color: '#6b7280',
              borderRadius: 99,
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'none',
              px: 1.5,
              flexShrink: 0,
              '&:hover': { borderColor: '#4b5563', bgcolor: '#f9fafb' },
            }}
          >
            匯入本地存檔
          </Button>
          <Button
            variant="outlined"
            size="small"
            startIcon={<AddIcon />}
            onClick={handleCreate}
            disabled={busy}
            sx={{
              borderColor: '#a855f7',
              color: '#a855f7',
              borderRadius: 99,
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'none',
              px: 1.5,
              flexShrink: 0,
              '&:hover': { borderColor: '#9333ea', bgcolor: '#faf5ff' },
            }}
          >
            新增存檔
          </Button>
          <input
            ref={importInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              handleImportFile(e.target.files?.[0])
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {status && (
        <div className="rounded-xl border border-purple-100 bg-purple-50 px-4 py-3 text-xs font-semibold text-purple-600">
          {status}
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-gray-300 text-sm font-semibold">讀取存檔中...</div>
      ) : saves.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 py-16 text-center">
          <p className="text-sm font-bold text-gray-400 m-0">尚未建立存檔</p>
          <p className="text-xs text-gray-300 mt-1 m-0">按下「新增存檔」保存目前進度</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-4">
            {visibleSaves.map((save) => (
              <SaveSlotCard
                key={save.id}
                save={save}
                onOpen={setSelectedSaveId}
                onThumbnailPositionChange={handleThumbnailPositionChange}
              />
            ))}
          </div>

          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-500 disabled:opacity-40"
            >
              <NavigateBeforeIcon sx={{ fontSize: 18 }} />
            </button>
            <span className="text-xs font-semibold text-gray-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-500 disabled:opacity-40"
            >
              <NavigateNextIcon sx={{ fontSize: 18 }} />
            </button>
          </div>
        </>
      )}
      <SaveDetailDialog
        save={selectedSave}
        open={selectedSave !== null}
        busy={busy}
        onClose={() => setSelectedSaveId(null)}
        onPatch={handlePatchSave}
        onLoad={handleLoad}
        onDelete={handleDelete}
      />
    </div>
  )
}

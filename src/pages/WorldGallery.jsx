import { useState, useRef, useEffect } from 'react'
import AddIcon from '@mui/icons-material/Add'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import CollectionsIcon from '@mui/icons-material/Collections'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import PetsIcon from '@mui/icons-material/Pets'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CloseIcon from '@mui/icons-material/Close'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { compressImage, getCompressedImageExtension } from '../utils/compressImage'
import useGallery from '../hooks/useGallery'
import { resolveImg, saveImageToDisk } from '../utils/imageSrc'

const TABS = [
  { id: 'all', label: '全部', icon: CollectionsIcon },
  { id: 'character', label: '角色', icon: PersonOutlineIcon },
  { id: 'monster', label: '怪物', icon: PetsIcon },
]

const TAG_IDS = ['character', 'monster']
const THUMB_SIZE_KEY = 'gallery-thumb-size'

function readThumbSize() {
  try {
    const stored = Number(localStorage.getItem(THUMB_SIZE_KEY))
    if (stored >= 120 && stored <= 360) return stored
  } catch {
    // Fall back to the default size when storage is unavailable.
  }
  return 200
}

function EmptyState({ onUpload }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-28 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 md:border-white/15">
        <ImageOutlinedIcon sx={{ fontSize: 32 }} className="text-slate-300 md:text-white/25" />
      </div>
      <div>
        <p className="m-0 text-sm font-semibold text-slate-500 md:text-white/60">尚未上傳任何圖片</p>
        <p className="m-0 mt-1 text-xs text-slate-400 md:text-white/35">點擊上傳，或直接 Ctrl+V 貼上圖片</p>
      </div>
      <button
        type="button"
        onClick={onUpload}
        className="flex items-center gap-1 rounded-full bg-purple-500 px-4 py-2 text-xs font-bold text-white hover:bg-purple-600"
      >
        <AddIcon sx={{ fontSize: 16 }} />上傳圖片
      </button>
    </div>
  )
}

function MasonryGrid({ images, thumbSize, selectedKey, onSelect, onOpen, onDelete }) {
  return (
    <div
      className="columns-2 gap-2 p-3 md:[column-count:auto] md:[column-width:var(--thumb)] md:gap-4 md:p-5"
      style={{ '--thumb': `${thumbSize}px` }}
    >
      {images.map((img) => {
        const selected = img.key === selectedKey
        return (
          <div
            key={img.key}
            onClick={() => (window.matchMedia('(max-width: 767px)').matches ? onOpen(img.key) : onSelect(img.key))}
            onDoubleClick={() => onOpen(img.key)}
            className={`group/card relative mb-2 cursor-pointer break-inside-avoid overflow-hidden rounded-xl bg-slate-200 md:mb-4 md:rounded-lg md:bg-white/5 md:outline md:outline-2 md:outline-offset-2 ${
              selected ? 'md:outline-sky-400' : 'md:outline-transparent md:hover:outline-white/20'
            }`}
          >
            <img src={resolveImg(img.src)} alt="" className="block h-auto w-full select-none" draggable={false} loading="lazy" />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(img)
              }}
              className="absolute right-1.5 top-1.5 hidden h-7 w-7 items-center justify-center rounded-full border-0 bg-black/60 p-0 text-white opacity-0 transition-opacity group-hover/card:opacity-100 md:flex"
              aria-label="刪除圖片"
            >
              <DeleteOutlineIcon sx={{ fontSize: 15 }} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default function WorldGallery() {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedKey, setSelectedKey] = useState(null)
  const [previewKey, setPreviewKey] = useState(null)
  const [thumbSize, setThumbSize] = useState(readThumbSize)
  const { images, addImages, deleteImage, replaceImage } = useGallery()
  const fileInputRef = useRef(null)
  const replaceInputRef = useRef(null)

  const allImages = TAG_IDS.flatMap((tag) => (
    (images[tag] ?? []).map((img) => ({ ...img, tag, key: `${tag}:${img.id}` }))
  ))
  const currentImages = activeTab === 'all' ? allImages : allImages.filter((img) => img.tag === activeTab)
  const previewIndex = currentImages.findIndex((img) => img.key === previewKey)
  const previewImage = previewIndex >= 0 ? currentImages[previewIndex] : null
  const activeLabel = TABS.find((tab) => tab.id === activeTab)?.label

  const getTabCount = (tabId) => (tabId === 'all' ? allImages.length : (images[tabId]?.length ?? 0))

  const openPicker = () => fileInputRef.current?.click()
  const openReplacePicker = () => replaceInputRef.current?.click()

  const stepPreview = (delta) => {
    if (currentImages.length === 0 || previewIndex < 0) return
    const next = currentImages[(previewIndex + delta + currentImages.length) % currentImages.length]
    setPreviewKey(next.key)
    setSelectedKey(next.key)
  }

  useEffect(() => {
    if (!previewImage) return
    const handleKey = (e) => {
      if (e.key === 'Escape') setPreviewKey(null)
      if (e.key === 'ArrowLeft') stepPreview(-1)
      if (e.key === 'ArrowRight') stepPreview(1)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  })

  const changeThumbSize = (value) => {
    setThumbSize(value)
    try {
      localStorage.setItem(THUMB_SIZE_KEY, String(value))
    } catch {
      // Size preference is optional.
    }
  }

  const buildGalleryImage = async (file, index, id = null) => {
    const dataUrl = await compressImage(file, 1000, 0.85, true)
    const suffix = id ?? `${Date.now()}-${index}-${globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)}`
    const ext = getCompressedImageExtension(file)
    const path = `uploads/gallery/${suffix}.${ext}`
    const savedPath = await saveImageToDisk(dataUrl, path)

    return { id: suffix, src: savedPath ?? dataUrl }
  }

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return
    const newImgs = await Promise.all(files.map((file, index) => buildGalleryImage(file, index)))
    addImages(activeTab === 'all' ? 'character' : activeTab, newImgs)
  }

  const handleReplaceFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !previewImage) return
    const nextImage = await buildGalleryImage(file, 0, `${previewImage.id}-${Date.now()}`)
    replaceImage(previewImage.tag, previewImage.id, nextImage.src)
  }

  const handleDelete = (img) => {
    deleteImage(img.tag, img.id)
    if (selectedKey === img.key) setSelectedKey(null)
    if (previewKey === img.key) setPreviewKey(null)
  }

  return (
    <div className="mx-auto max-w-[1440px] md:px-8 md:py-6">
      <div className="flex flex-col md:h-[calc(100vh-72px-48px)] md:min-h-[520px] md:flex-row md:overflow-hidden md:rounded-2xl md:border md:border-slate-800 md:bg-[#1c1d22] md:shadow-xl">

        {/* Desktop sidebar */}
        <aside className="hidden w-56 shrink-0 flex-col border-r border-white/5 bg-[#16171b] p-3 md:flex">
          <div className="mb-4 flex items-center gap-2 px-2 pt-1">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
              <CollectionsIcon sx={{ fontSize: 16 }} />
            </div>
            <span className="text-sm font-bold text-white">圖庫</span>
          </div>
          <p className="m-0 mb-1 px-2 text-[11px] font-semibold text-white/35">分類</p>
          <nav className="flex flex-col gap-0.5">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={`flex items-center gap-2.5 rounded-md border-0 px-2.5 py-1.5 text-left text-[13px] transition-colors ${
                  activeTab === id ? 'bg-white/10 text-white' : 'bg-transparent text-white/65 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon sx={{ fontSize: 17 }} />
                <span className="flex-1">{label}</span>
                <span className="text-[11px] text-white/35">{getTabCount(id)}</span>
              </button>
            ))}
          </nav>
          <p className="m-0 mt-auto px-2 text-[11px] leading-relaxed text-white/30">
            單擊選取、雙擊預覽<br />Ctrl+V 可直接貼上圖片
          </p>
        </aside>

        <section className="flex min-w-0 flex-1 flex-col">
          {/* Desktop toolbar */}
          <div className="hidden h-14 shrink-0 items-center gap-4 border-b border-white/5 px-5 md:flex">
            <span className="text-sm font-semibold text-white">{activeLabel}</span>
            <span className="text-xs text-white/35">{currentImages.length} 張</span>
            <input
              type="range"
              min={120}
              max={360}
              step={10}
              value={thumbSize}
              onChange={(e) => changeThumbSize(Number(e.target.value))}
              className="ml-auto w-32 accent-white"
              aria-label="縮圖大小"
            />
            <button
              type="button"
              onClick={openPicker}
              className="flex items-center gap-1 rounded-md bg-purple-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-purple-600"
            >
              <AddIcon sx={{ fontSize: 16 }} />上傳
            </button>
          </div>

          {/* Mobile header */}
          <div className="sticky top-[72px] z-20 border-b border-slate-100 bg-stone-50/95 px-4 pb-3 pt-4 backdrop-blur md:hidden">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="m-0 text-lg font-bold text-slate-900">圖庫</h1>
                <p className="m-0 text-xs text-slate-400">{currentImages.length} 張圖片</p>
              </div>
              <button
                type="button"
                onClick={openPicker}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500 text-white shadow"
                aria-label="上傳圖片"
              >
                <AddIcon />
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              {TABS.map(({ id, label }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActiveTab(id)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
                    activeTab === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'
                  }`}
                >
                  {label} {getTabCount(id)}
                </button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 md:overflow-y-auto" onClick={(e) => e.target === e.currentTarget && setSelectedKey(null)}>
            {currentImages.length === 0 ? (
              <EmptyState onUpload={openPicker} />
            ) : (
              <MasonryGrid
                images={currentImages}
                thumbSize={thumbSize}
                selectedKey={selectedKey}
                onSelect={setSelectedKey}
                onOpen={(key) => {
                  setSelectedKey(key)
                  setPreviewKey(key)
                }}
                onDelete={handleDelete}
              />
            )}
          </div>
        </section>
      </div>

      {previewImage && (
        <div
          data-paste-scope
          className="fixed inset-0 z-[60] flex flex-col bg-black/90"
          onMouseDown={() => setPreviewKey(null)}
        >
          <input ref={replaceInputRef} type="file" accept="image/*" className="hidden" onChange={handleReplaceFile} />

          {/* Desktop top bar */}
          <div className="hidden items-center justify-end gap-2 p-4 md:flex" onMouseDown={(e) => e.stopPropagation()}>
            <span className="mr-auto text-xs text-white/50">{previewIndex + 1} / {currentImages.length} · Ctrl+V 貼上可替換</span>
            <button type="button" onClick={openReplacePicker} className="flex items-center gap-1 rounded-full bg-purple-500 px-4 py-2 text-xs font-bold text-white hover:bg-purple-600">
              <FileUploadOutlinedIcon sx={{ fontSize: 16 }} />重新上傳
            </button>
            <button type="button" onClick={() => handleDelete(previewImage)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="刪除圖片">
              <DeleteOutlineIcon sx={{ fontSize: 19 }} />
            </button>
            <button type="button" onClick={() => setPreviewKey(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="關閉預覽">
              <CloseIcon sx={{ fontSize: 19 }} />
            </button>
          </div>

          <div className="relative flex min-h-0 flex-1 items-center justify-center px-2 md:px-16">
            <img
              src={resolveImg(previewImage.src)}
              alt=""
              className="max-h-full max-w-full select-none object-contain"
              draggable={false}
              onMouseDown={(e) => e.stopPropagation()}
            />
            {currentImages.length > 1 && (
              <>
                <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => stepPreview(-1)} className="absolute left-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:flex" aria-label="上一張">
                  <ChevronLeftIcon />
                </button>
                <button type="button" onMouseDown={(e) => e.stopPropagation()} onClick={() => stepPreview(1)} className="absolute right-4 top-1/2 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 md:flex" aria-label="下一張">
                  <ChevronRightIcon />
                </button>
              </>
            )}
          </div>

          {/* Mobile bottom bar */}
          <div className="grid grid-cols-3 gap-2 p-4 pb-8 md:hidden" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" onClick={openReplacePicker} className="flex flex-col items-center gap-1 rounded-xl bg-white/10 py-2.5 text-[11px] font-bold text-white">
              <FileUploadOutlinedIcon sx={{ fontSize: 20 }} />重新上傳
            </button>
            <button type="button" onClick={() => handleDelete(previewImage)} className="flex flex-col items-center gap-1 rounded-xl bg-white/10 py-2.5 text-[11px] font-bold text-white">
              <DeleteOutlineIcon sx={{ fontSize: 20 }} />刪除
            </button>
            <button type="button" onClick={() => setPreviewKey(null)} className="flex flex-col items-center gap-1 rounded-xl bg-white/10 py-2.5 text-[11px] font-bold text-white">
              <CloseIcon sx={{ fontSize: 20 }} />關閉
            </button>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFiles}
      />
    </div>
  )
}

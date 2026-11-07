import { useState, useRef, useEffect } from 'react'
import Popover from '@mui/material/Popover'
import AddIcon from '@mui/icons-material/Add'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import CollectionsIcon from '@mui/icons-material/Collections'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import PetsIcon from '@mui/icons-material/Pets'
import LabelOutlinedIcon from '@mui/icons-material/LabelOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import CheckIcon from '@mui/icons-material/Check'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CloseIcon from '@mui/icons-material/Close'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import { compressImage, getCompressedImageExtension } from '../utils/compressImage'
import useGallery from '../hooks/useGallery'
import { resolveImg, saveImageToDisk } from '../utils/imageSrc'

const ALL_TAB = { id: 'all', name: '全部' }
const CATEGORY_ICONS = { all: CollectionsIcon, character: PersonOutlineIcon, monster: PetsIcon }
const DRAG_TYPE = 'application/x-gallery-image'
const CATEGORY_DRAG_TYPE = 'application/x-gallery-category'
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

const categoryIcon = (id) => CATEGORY_ICONS[id] ?? LabelOutlinedIcon

function EmptyState({ onUpload, isCategory }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-28 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 md:border-white/15">
        <ImageOutlinedIcon sx={{ fontSize: 32 }} className="text-slate-300 md:text-white/25" />
      </div>
      <div>
        <p className="m-0 text-sm font-semibold text-slate-500 md:text-white/60">{isCategory ? '這個分類還沒有圖片' : '尚未上傳任何圖片'}</p>
        <p className="m-0 mt-1 text-xs text-slate-400 md:text-white/35">
          {isCategory ? '上傳圖片，或從其他分類把圖片拖曳到左側分類' : '點擊上傳，或直接 Ctrl+V 貼上圖片'}
        </p>
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

function NameInput({ initial = '', placeholder, onSubmit, onCancel, className = '' }) {
  const [value, setValue] = useState(initial)
  const submit = () => {
    const name = value.trim()
    if (name) onSubmit(name)
    else onCancel()
  }
  return (
    <input
      autoFocus
      value={value}
      placeholder={placeholder}
      onChange={(e) => setValue(e.target.value)}
      onBlur={submit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') submit()
        if (e.key === 'Escape') onCancel()
      }}
      onClick={(e) => e.stopPropagation()}
      className={`min-w-0 flex-1 rounded border-0 bg-white/10 px-1.5 py-0.5 text-[13px] text-white outline-none ring-1 ring-sky-400 placeholder:text-white/30 ${className}`}
    />
  )
}

// Popover listing every category with a checkbox, so one image can live in several
function CategoryPopover({ anchorEl, image, categories, onClose, onToggle, onCreate }) {
  const [creating, setCreating] = useState(false)
  return (
    <Popover
      open={Boolean(anchorEl && image)}
      anchorEl={anchorEl}
      onClose={() => { setCreating(false); onClose() }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      onMouseDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      slotProps={{ paper: { sx: { bgcolor: '#24252b', color: '#fff', borderRadius: 2, border: '1px solid rgba(255,255,255,0.08)', minWidth: 200 } } }}
    >
      <div className="p-1.5" onClick={(e) => e.stopPropagation()}>
        <p className="m-0 px-2 pb-1 pt-1 text-[11px] font-semibold text-white/40">加入分類（可複選）</p>
        {categories.map((cat) => {
          const checked = image?.tags.includes(cat.id)
          const Icon = categoryIcon(cat.id)
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => onToggle(image.id, cat.id)}
              className="flex w-full items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1.5 text-left text-[13px] text-white/80 hover:bg-white/10"
            >
              <span className={`flex h-4 w-4 items-center justify-center rounded border ${checked ? 'border-sky-400 bg-sky-400 text-[#16171b]' : 'border-white/30'}`}>
                {checked && <CheckIcon sx={{ fontSize: 12 }} />}
              </span>
              <Icon sx={{ fontSize: 15 }} className="text-white/50" />
              <span className="flex-1 truncate">{cat.name}</span>
            </button>
          )
        })}
        <div className="mt-1 border-t border-white/10 pt-1">
          {creating ? (
            <div className="flex px-2 py-1">
              <NameInput
                placeholder="新分類名稱"
                onSubmit={(name) => { onCreate(name, image.id); setCreating(false) }}
                onCancel={() => setCreating(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="flex w-full items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1.5 text-left text-[13px] text-white/60 hover:bg-white/10 hover:text-white"
            >
              <AddIcon sx={{ fontSize: 16 }} />新增分類
            </button>
          )}
        </div>
      </div>
    </Popover>
  )
}

function CategoryNav({ tabs, activeTab, getCount, onSelect, onDropImage, onMoveCategory, onRename, onDelete, onCreate }) {
  const [editingId, setEditingId] = useState(null)
  const [creating, setCreating] = useState(false)
  const [dropTarget, setDropTarget] = useState(null)
  const [draggingId, setDraggingId] = useState(null)
  const [reorderTarget, setReorderTarget] = useState(null) // { id, after }

  return (
    <nav className="-mx-1 flex min-h-0 flex-col gap-0.5 overflow-y-auto px-1">
      {tabs.map(({ id, name }) => {
        const Icon = categoryIcon(id)
        const isCategory = id !== 'all'
        const editing = editingId === id
        return (
          <div
            key={id}
            role="button"
            tabIndex={0}
            onClick={() => !editing && onSelect(id)}
            onKeyDown={(e) => e.key === 'Enter' && !editing && onSelect(id)}
            onDoubleClick={() => isCategory && setEditingId(id)}
            draggable={isCategory && !editing}
            onDragStart={(e) => {
              e.dataTransfer.setData(CATEGORY_DRAG_TYPE, id)
              e.dataTransfer.effectAllowed = 'move'
              setDraggingId(id)
            }}
            onDragEnd={() => { setDraggingId(null); setReorderTarget(null) }}
            onDragOver={(e) => {
              if (!isCategory) return
              if (e.dataTransfer.types.includes(CATEGORY_DRAG_TYPE)) {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                const rect = e.currentTarget.getBoundingClientRect()
                const after = e.clientY > rect.top + rect.height / 2
                setReorderTarget((cur) => (cur?.id === id && cur.after === after ? cur : { id, after }))
                return
              }
              if (!e.dataTransfer.types.includes(DRAG_TYPE)) return
              e.preventDefault()
              e.dataTransfer.dropEffect = e.ctrlKey || e.altKey || activeTab === 'all' ? 'copy' : 'move'
              setDropTarget(id)
            }}
            onDragLeave={() => {
              setDropTarget((cur) => (cur === id ? null : cur))
              setReorderTarget((cur) => (cur?.id === id ? null : cur))
            }}
            onDrop={(e) => {
              e.preventDefault()
              setDropTarget(null)
              setReorderTarget(null)
              const categoryId = e.dataTransfer.getData(CATEGORY_DRAG_TYPE)
              if (categoryId) {
                const rect = e.currentTarget.getBoundingClientRect()
                onMoveCategory(categoryId, id, e.clientY > rect.top + rect.height / 2)
                return
              }
              const imageId = e.dataTransfer.getData(DRAG_TYPE)
              if (imageId) onDropImage(imageId, id, e.ctrlKey || e.altKey)
            }}
            className={`group/nav relative flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] transition-colors ${
              draggingId === id ? 'opacity-40' : ''
            } ${
              dropTarget === id
                ? 'bg-sky-500/25 text-white ring-1 ring-sky-400'
                : activeTab === id ? 'bg-white/10 text-white' : 'text-white/65 hover:bg-white/5 hover:text-white'
            }`}
          >
            {reorderTarget?.id === id && reorderTarget.id !== draggingId && (
              <span className={`pointer-events-none absolute inset-x-1 h-0.5 rounded-full bg-sky-400 ${reorderTarget.after ? '-bottom-px' : '-top-px'}`} />
            )}
            <Icon sx={{ fontSize: 17 }} />
            {editing ? (
              <NameInput
                initial={name}
                onSubmit={(next) => { onRename(id, next); setEditingId(null) }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <span className="min-w-0 flex-1 truncate">{name}</span>
            )}
            {isCategory && !editing && (
              <span className="hidden items-center gap-0.5 group-hover/nav:flex">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setEditingId(id) }}
                  className="flex h-5 w-5 items-center justify-center rounded border-0 bg-transparent p-0 text-white/45 hover:bg-white/10 hover:text-white"
                  aria-label="重新命名分類"
                >
                  <EditOutlinedIcon sx={{ fontSize: 13 }} />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onDelete(id) }}
                  className="flex h-5 w-5 items-center justify-center rounded border-0 bg-transparent p-0 text-white/45 hover:bg-red-500/20 hover:text-red-300"
                  aria-label="刪除分類"
                >
                  <DeleteOutlineIcon sx={{ fontSize: 13 }} />
                </button>
              </span>
            )}
            {!editing && (
              <span className={`text-[11px] text-white/35 ${isCategory ? 'group-hover/nav:hidden' : ''}`}>{getCount(id)}</span>
            )}
          </div>
        )
      })}
      {creating ? (
        <div className="flex items-center gap-2.5 px-2.5 py-1.5">
          <LabelOutlinedIcon sx={{ fontSize: 17 }} className="text-white/65" />
          <NameInput
            placeholder="新分類名稱"
            onSubmit={(name) => { onCreate(name); setCreating(false) }}
            onCancel={() => setCreating(false)}
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="flex items-center gap-2.5 rounded-md border-0 bg-transparent px-2.5 py-1.5 text-left text-[13px] text-white/40 hover:bg-white/5 hover:text-white"
        >
          <AddIcon sx={{ fontSize: 17 }} />新增分類
        </button>
      )}
    </nav>
  )
}

function MasonryGrid({ images, thumbSize, selectedKey, onSelect, onOpen, onDelete, onTogglePin, onOpenCategories }) {
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
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData(DRAG_TYPE, img.id)
              e.dataTransfer.effectAllowed = 'copyMove'
              onSelect(img.key)
            }}
            onClick={() => (window.matchMedia('(max-width: 767px)').matches ? onOpen(img.key) : onSelect(img.key))}
            onDoubleClick={() => onOpen(img.key)}
            className={`group/card relative mb-2 cursor-pointer break-inside-avoid overflow-hidden rounded-xl bg-slate-200 md:mb-4 md:rounded-lg md:bg-white/5 md:outline md:outline-2 md:outline-offset-2 ${
              selected ? 'md:outline-sky-400' : 'md:outline-transparent md:hover:outline-white/20'
            }`}
          >
            <img src={resolveImg(img.src)} alt="" className="block h-auto w-full select-none" draggable={false} loading="lazy" />
            {img.pinned && (
              <span className="absolute left-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-amber-300 md:h-7 md:w-7">
                <PushPinIcon sx={{ fontSize: 14 }} />
              </span>
            )}
            <div className="absolute right-1.5 top-1.5 hidden gap-1 opacity-0 transition-opacity group-hover/card:opacity-100 md:flex">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onTogglePin(img.id) }}
                className={`flex h-7 w-7 items-center justify-center rounded-full border-0 bg-black/60 p-0 hover:bg-black/80 ${img.pinned ? 'text-amber-300' : 'text-white'}`}
                aria-label={img.pinned ? '取消置頂' : '置頂'}
                title={img.pinned ? '取消置頂' : '置頂'}
              >
                {img.pinned ? <PushPinIcon sx={{ fontSize: 15 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 15 }} />}
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onOpenCategories(e.currentTarget, img.id) }}
                className="flex h-7 w-7 items-center justify-center rounded-full border-0 bg-black/60 p-0 text-white hover:bg-black/80"
                aria-label="設定分類"
                title="設定分類"
              >
                <LabelOutlinedIcon sx={{ fontSize: 15 }} />
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete(img) }}
                className="flex h-7 w-7 items-center justify-center rounded-full border-0 bg-black/60 p-0 text-white hover:bg-red-500/80"
                aria-label="刪除圖片"
                title="刪除圖片"
              >
                <DeleteOutlineIcon sx={{ fontSize: 15 }} />
              </button>
            </div>
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
  const [categoryMenu, setCategoryMenu] = useState(null) // { anchorEl, imageId }
  const [mobileEditing, setMobileEditing] = useState(false)
  const {
    images, categories, addImages, deleteImage, replaceImage, togglePin,
    toggleImageTag, assignImageToCategory, addCategory, renameCategory, moveCategory, deleteCategory,
  } = useGallery()
  const fileInputRef = useRef(null)
  const replaceInputRef = useRef(null)

  const tabs = [ALL_TAB, ...categories]
  const allImages = images.map((img) => ({ ...img, key: img.id }))
  const currentImages = activeTab === 'all' ? allImages : allImages.filter((img) => img.tags.includes(activeTab))
  const previewIndex = currentImages.findIndex((img) => img.key === previewKey)
  const previewImage = previewIndex >= 0 ? currentImages[previewIndex] : null
  const activeLabel = tabs.find((tab) => tab.id === activeTab)?.name
  const menuImage = categoryMenu ? allImages.find((img) => img.id === categoryMenu.imageId) : null

  useEffect(() => {
    if (activeTab !== 'all' && !categories.some((c) => c.id === activeTab)) setActiveTab('all')
  }, [categories, activeTab])

  const getTabCount = (tabId) => (tabId === 'all' ? allImages.length : allImages.filter((img) => img.tags.includes(tabId)).length)

  const openPicker = () => fileInputRef.current?.click()
  const openReplacePicker = () => replaceInputRef.current?.click()

  const stepPreview = (delta) => {
    if (currentImages.length === 0 || previewIndex < 0) return
    const next = currentImages[(previewIndex + delta + currentImages.length) % currentImages.length]
    setPreviewKey(next.key)
    setSelectedKey(next.key)
  }

  useEffect(() => {
    if (!previewImage || categoryMenu) return
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
    addImages(activeTab === 'all' ? null : activeTab, newImgs)
  }

  const handleReplaceFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !previewImage) return
    const nextImage = await buildGalleryImage(file, 0, `${previewImage.id}-${Date.now()}`)
    replaceImage(previewImage.id, nextImage.src)
  }

  const handleDelete = (img) => {
    deleteImage(img.id)
    if (selectedKey === img.key) setSelectedKey(null)
    if (previewKey === img.key) setPreviewKey(null)
  }

  // Dragging out of a category moves the image; from 全部 or with Ctrl/Alt held it is copied
  const handleDropImage = (imageId, targetId, copy) => {
    const fromId = !copy && activeTab !== 'all' && activeTab !== targetId ? activeTab : null
    assignImageToCategory(imageId, targetId, fromId)
  }

  const handleDeleteCategory = (id) => {
    const cat = categories.find((c) => c.id === id)
    if (!cat) return
    if (!window.confirm(`刪除分類「${cat.name}」？\n分類內的圖片不會被刪除，仍可在「全部」中找到。`)) return
    deleteCategory(id)
    if (activeTab === id) setActiveTab('all')
  }

  const handleCreateCategory = (name, imageId = null) => {
    const id = addCategory(name)
    if (imageId) assignImageToCategory(imageId, id)
    return id
  }

  const promptCategoryName = (initial = '') => {
    const name = window.prompt('分類名稱', initial)?.trim()
    return name || null
  }

  const openCategoryMenu = (anchorEl, imageId) => setCategoryMenu({ anchorEl, imageId })

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
          <CategoryNav
            tabs={tabs}
            activeTab={activeTab}
            getCount={getTabCount}
            onSelect={setActiveTab}
            onDropImage={handleDropImage}
            onMoveCategory={moveCategory}
            onRename={renameCategory}
            onDelete={handleDeleteCategory}
            onCreate={handleCreateCategory}
          />
          <p className="m-0 mt-auto px-2 pt-3 text-[11px] leading-relaxed text-white/30">
            單擊選取、雙擊預覽<br />
            拖曳圖片到分類可移動，按住 Ctrl 為複製<br />
            拖曳分類可調整順序<br />
            Ctrl+V 可直接貼上圖片
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
            <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-0.5">
              {tabs.map(({ id, name }) => {
                const editable = mobileEditing && id !== 'all'
                return (
                  <span key={id} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        if (!editable) { setActiveTab(id); return }
                        const next = promptCategoryName(name)
                        if (next) renameCategory(id, next)
                      }}
                      className={`rounded-full px-3.5 py-1.5 text-xs font-bold ${
                        editable
                          ? 'bg-white text-slate-700 ring-1 ring-purple-300'
                          : activeTab === id ? 'bg-slate-900 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'
                      }`}
                    >
                      {name} {getTabCount(id)}
                    </button>
                    {editable && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(id)}
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 p-0 text-white"
                        aria-label="刪除分類"
                      >
                        <CloseIcon sx={{ fontSize: 11 }} />
                      </button>
                    )}
                  </span>
                )
              })}
              <button
                type="button"
                onClick={() => {
                  const name = promptCategoryName()
                  if (name) setActiveTab(handleCreateCategory(name))
                }}
                className="flex shrink-0 items-center rounded-full bg-white px-2.5 py-1.5 text-xs font-bold text-slate-500 ring-1 ring-slate-200"
                aria-label="新增分類"
              >
                <AddIcon sx={{ fontSize: 14 }} />
              </button>
              <button
                type="button"
                onClick={() => setMobileEditing((v) => !v)}
                className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${mobileEditing ? 'bg-purple-500 text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200'}`}
              >
                {mobileEditing ? '完成' : '編輯'}
              </button>
            </div>
          </div>

          <div className="min-h-0 flex-1 md:overflow-y-auto" onClick={(e) => e.target === e.currentTarget && setSelectedKey(null)}>
            {currentImages.length === 0 ? (
              <EmptyState onUpload={openPicker} isCategory={activeTab !== 'all'} />
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
                onTogglePin={togglePin}
                onOpenCategories={openCategoryMenu}
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
            <span className="mr-auto flex items-center gap-2 text-xs text-white/50">
              {previewIndex + 1} / {currentImages.length} · Ctrl+V 貼上可替換
              {previewImage.tags.map((tagId) => {
                const cat = categories.find((c) => c.id === tagId)
                return cat ? <span key={tagId} className="rounded-full bg-white/10 px-2 py-0.5 text-white/70">{cat.name}</span> : null
              })}
            </span>
            <button type="button" onClick={openReplacePicker} className="flex items-center gap-1 rounded-full bg-purple-500 px-4 py-2 text-xs font-bold text-white hover:bg-purple-600">
              <FileUploadOutlinedIcon sx={{ fontSize: 16 }} />重新上傳
            </button>
            <button type="button" onClick={() => togglePin(previewImage.id)} className={`flex h-9 w-9 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 ${previewImage.pinned ? 'text-amber-300' : 'text-white'}`} aria-label={previewImage.pinned ? '取消置頂' : '置頂'} title={previewImage.pinned ? '取消置頂' : '置頂'}>
              {previewImage.pinned ? <PushPinIcon sx={{ fontSize: 18 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 18 }} />}
            </button>
            <button type="button" onClick={(e) => openCategoryMenu(e.currentTarget, previewImage.id)} className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20" aria-label="設定分類" title="設定分類">
              <LabelOutlinedIcon sx={{ fontSize: 18 }} />
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
          <div className="grid grid-cols-5 gap-2 p-4 pb-8 md:hidden" onMouseDown={(e) => e.stopPropagation()}>
            <button type="button" onClick={openReplacePicker} className="flex flex-col items-center gap-1 rounded-xl bg-white/10 py-2.5 text-[11px] font-bold text-white">
              <FileUploadOutlinedIcon sx={{ fontSize: 20 }} />替換
            </button>
            <button type="button" onClick={() => togglePin(previewImage.id)} className={`flex flex-col items-center gap-1 rounded-xl bg-white/10 py-2.5 text-[11px] font-bold ${previewImage.pinned ? 'text-amber-300' : 'text-white'}`}>
              {previewImage.pinned ? <PushPinIcon sx={{ fontSize: 20 }} /> : <PushPinOutlinedIcon sx={{ fontSize: 20 }} />}
              {previewImage.pinned ? '取消置頂' : '置頂'}
            </button>
            <button type="button" onClick={(e) => openCategoryMenu(e.currentTarget, previewImage.id)} className="flex flex-col items-center gap-1 rounded-xl bg-white/10 py-2.5 text-[11px] font-bold text-white">
              <LabelOutlinedIcon sx={{ fontSize: 20 }} />分類
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

      <CategoryPopover
        anchorEl={categoryMenu?.anchorEl}
        image={menuImage}
        categories={categories}
        onClose={() => setCategoryMenu(null)}
        onToggle={toggleImageTag}
        onCreate={handleCreateCategory}
      />

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

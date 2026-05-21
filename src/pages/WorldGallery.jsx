import { useState, useRef } from 'react'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import AddIcon from '@mui/icons-material/Add'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import CollectionsIcon from '@mui/icons-material/Collections'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import PetsIcon from '@mui/icons-material/Pets'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import CloseIcon from '@mui/icons-material/Close'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import { compressImage, getCompressedImageExtension } from '../utils/compressImage'
import useGallery from '../hooks/useGallery'
import { resolveImg, saveImageToDisk } from '../utils/imageSrc'

const TABS = [
  { id: 'all', label: '全部', icon: <CollectionsIcon sx={{ fontSize: 16 }} /> },
  { id: 'character', label: '角色', icon: <PersonOutlineIcon sx={{ fontSize: 16 }} /> },
  { id: 'monster',   label: '怪物', icon: <PetsIcon sx={{ fontSize: 16 }} /> },
]

const TAG_IDS = ['character', 'monster']

function EmptyState({ onUpload }) {
  return (
    <div className="flex flex-col items-center justify-center py-28 gap-4">
      <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-gray-200 flex items-center justify-center bg-gray-50">
        <ImageOutlinedIcon sx={{ fontSize: 32, color: '#d1d5db' }} />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-gray-500">尚未上傳任何圖片</p>
        <p className="text-xs text-gray-400 mt-1">點擊下方按鈕新增圖片到此分類</p>
      </div>
      <Button
        variant="outlined"
        startIcon={<AddIcon />}
        onClick={onUpload}
        sx={{
          borderColor: '#a855f7',
          color: '#a855f7',
          borderRadius: 99,
          fontWeight: 600,
          fontSize: '0.8rem',
          textTransform: 'none',
          px: 2.5,
          '&:hover': { borderColor: '#9333ea', bgcolor: '#faf5ff' },
        }}
      >
        上傳圖片
      </Button>
    </div>
  )
}

function ImageGrid({ images, onDelete, onOpen }) {
  return (
    <div className="p-6 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
      {images.map((img) => {
        const src = resolveImg(img.src)

        return (
          <div
            key={img.key}
            onDoubleClick={() => onOpen(img.key)}
            className="relative group/card rounded-xl overflow-hidden border border-gray-200 bg-stone-900 cursor-zoom-in"
          >
            <img
              src={src}
              alt=""
              className="w-full aspect-square object-contain block"
              draggable={false}
            />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                onDelete(img)
              }}
              className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white border-0 p-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity cursor-pointer"
            >
              <DeleteOutlineIcon sx={{ fontSize: 13 }} />
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default function WorldGallery() {
  const [activeTab, setActiveTab] = useState('all')
  const [selectedImageKey, setSelectedImageKey] = useState(null)
  const { images, addImages, deleteImage, updateImage } = useGallery()
  const fileInputRef = useRef(null)
  const replaceInputRef = useRef(null)

  const allImages = TAG_IDS.flatMap((tag) => (
    (images[tag] ?? []).map((img) => ({ ...img, tag, key: `${tag}:${img.id}` }))
  ))
  const currentImages = activeTab === 'all'
    ? allImages
    : (images[activeTab] ?? []).map((img) => ({ ...img, tag: activeTab, key: `${activeTab}:${img.id}` }))
  const selectedImage = currentImages.find((img) => img.key === selectedImageKey) ?? null
  const selectedSrc = resolveImg(selectedImage?.src)

  const openPicker = () => fileInputRef.current?.click()
  const openReplacePicker = () => replaceInputRef.current?.click()

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
    if (files.length === 0) return
    const newImgs = await Promise.all(files.map((file, index) => buildGalleryImage(file, index)))
    addImages(activeTab === 'all' ? 'character' : activeTab, newImgs)
    e.target.value = ''
  }

  const handleReplaceFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !selectedImage) return
    const nextImage = await buildGalleryImage(file, 0, selectedImage.id)
    updateImage(selectedImage.tag, selectedImage.id, { src: nextImage.src })
    e.target.value = ''
  }

  const handleDelete = (img) => {
    deleteImage(img.tag, img.id)
    if (selectedImageKey === img.key) setSelectedImageKey(null)
  }

  const getTabCount = (tabId) => (
    tabId === 'all' ? allImages.length : (images[tabId]?.length ?? 0)
  )

  return (
    <div className="max-w-[1200px] mx-auto px-4 md:px-10 py-8">

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-black m-0">世界圖庫</h1>
          <p className="text-sm text-gray-400 mt-1 m-0">管理與瀏覽所有已上傳的圖片資源</p>
        </div>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={openPicker}
          sx={{
            bgcolor: '#a855f7',
            borderRadius: 99,
            fontWeight: 600,
            fontSize: '0.8rem',
            textTransform: 'none',
            px: 2.5,
            boxShadow: 'none',
            '&:hover': { bgcolor: '#9333ea', boxShadow: 'none' },
          }}
        >
          上傳圖片
        </Button>
      </div>

      {/* Tab nav */}
      <div className="flex gap-0 border-b border-gray-200 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer bg-transparent border-x-0 border-t-0 ${
              activeTab === tab.id
                ? 'text-purple-600 border-b-purple-500'
                : 'text-gray-500 border-b-transparent hover:text-gray-800'
            }`}
          >
            {tab.icon}
            {tab.label}
            {getTabCount(tab.id) > 0 && (
              <span className="ml-1 text-xs bg-purple-100 text-purple-600 font-bold px-1.5 py-0.5 rounded-full">
                {getTabCount(tab.id)}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl border border-gray-100 min-h-[480px]">
        {currentImages.length === 0 ? (
          <EmptyState onUpload={openPicker} />
        ) : (
          <ImageGrid
            images={currentImages}
            onDelete={handleDelete}
            onOpen={setSelectedImageKey}
          />
        )}
      </div>

      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/80 px-4 py-6 flex items-center justify-center"
          onMouseDown={() => setSelectedImageKey(null)}
        >
          <div
            className="relative w-full max-w-5xl max-h-full flex flex-col gap-3"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end gap-2">
              <Button
                variant="contained"
                startIcon={<FileUploadOutlinedIcon />}
                onClick={openReplacePicker}
                sx={{
                  bgcolor: '#a855f7',
                  borderRadius: 99,
                  boxShadow: 'none',
                  textTransform: 'none',
                  fontWeight: 700,
                  '&:hover': { bgcolor: '#9333ea', boxShadow: 'none' },
                }}
              >
                重新上傳
              </Button>
              <IconButton
                aria-label="delete image"
                onClick={() => handleDelete(selectedImage)}
                sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.35)', '&:hover': { bgcolor: 'rgba(0,0,0,0.55)' } }}
              >
                <DeleteOutlineIcon />
              </IconButton>
              <IconButton
                aria-label="close preview"
                onClick={() => setSelectedImageKey(null)}
                sx={{ color: 'white', bgcolor: 'rgba(0,0,0,0.35)', '&:hover': { bgcolor: 'rgba(0,0,0,0.55)' } }}
              >
                <CloseIcon />
              </IconButton>
            </div>
            <div className="min-h-0 flex-1 flex items-center justify-center">
              <img
                src={selectedSrc}
                alt=""
                className="max-w-full max-h-[calc(100vh-120px)] object-contain select-none"
                draggable={false}
              />
            </div>
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
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleReplaceFile}
      />
    </div>
  )
}

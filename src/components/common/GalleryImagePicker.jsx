import { useEffect, useMemo, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Button from '@mui/material/Button'
import CollectionsIcon from '@mui/icons-material/Collections'
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import PetsIcon from '@mui/icons-material/Pets'
import CheckIcon from '@mui/icons-material/Check'
import useGallery from '../../hooks/useGallery'
import { resolveImg } from '../../utils/imageSrc'

const TABS = [
  { id: 'all', label: '全部', icon: <CollectionsIcon sx={{ fontSize: 16 }} /> },
  { id: 'character', label: '角色', icon: <PersonOutlineIcon sx={{ fontSize: 16 }} /> },
  { id: 'monster', label: '怪物', icon: <PetsIcon sx={{ fontSize: 16 }} /> },
]

const TAG_IDS = ['character', 'monster']

export default function GalleryImagePicker({
  open,
  onClose,
  onSelect,
  initialTab = 'character',
  multiple = false,
}) {
  const { images } = useGallery()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [selectedIds, setSelectedIds] = useState([])

  useEffect(() => {
    if (!open) return
    setActiveTab(initialTab)
    setSelectedIds([])
  }, [open, initialTab])

  const allImages = TAG_IDS.flatMap((tag) => (
    (images[tag] ?? []).map((img) => ({ ...img, tag, key: `${tag}:${img.id}` }))
  ))
  const currentImages = activeTab === 'all'
    ? allImages
    : (images[activeTab] ?? []).map((img) => ({ ...img, tag: activeTab, key: `${activeTab}:${img.id}` }))
  const selectedImages = useMemo(
    () => currentImages.filter((img) => selectedIds.includes(img.key)),
    [currentImages, selectedIds],
  )

  const toggleImage = (key) => {
    if (!multiple) {
      setSelectedIds([key])
      return
    }
    setSelectedIds((prev) => (
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    ))
  }

  const getTabCount = (tabId) => (
    tabId === 'all' ? allImages.length : (images[tabId]?.length ?? 0)
  )

  const confirm = () => {
    if (selectedImages.length === 0) return
    onSelect(multiple ? selectedImages.map((img) => img.src) : selectedImages[0].src)
    onClose()
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 3 } }}
    >
      <DialogTitle sx={{ fontSize: '1rem', fontWeight: 800, pb: 1 }}>
        從世界圖庫選擇圖片
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <div className="flex gap-0 border-b border-gray-200 mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id)
                setSelectedIds([])
              }}
              className={`flex items-center gap-1.5 px-4 py-2 text-sm font-semibold transition-colors border-b-2 -mb-px cursor-pointer bg-transparent border-x-0 border-t-0 ${
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

        {currentImages.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">
            這個分類還沒有圖片
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[52vh] overflow-y-auto pr-1">
            {currentImages.map((img) => {
              const selected = selectedIds.includes(img.key)
              return (
                <button
                  key={img.key}
                  type="button"
                  onClick={() => toggleImage(img.key)}
                  onDoubleClick={() => {
                    onSelect(multiple ? [img.src] : img.src)
                    onClose()
                  }}
                  className={`relative aspect-square overflow-hidden rounded-lg border-2 bg-stone-900 p-0 cursor-pointer transition-all ${
                    selected
                      ? 'border-purple-500 shadow-[0_0_0_3px_rgba(168,85,247,0.18)]'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <img
                    src={resolveImg(img.src)}
                    alt=""
                    className="w-full h-full object-contain"
                    draggable={false}
                  />
                  {selected && (
                    <span className="absolute top-1 right-1 w-6 h-6 rounded-full bg-purple-500 text-white flex items-center justify-center">
                      <CheckIcon sx={{ fontSize: 15 }} />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        <div className="flex justify-end gap-2 mt-5">
          <Button onClick={onClose} sx={{ color: '#6b7280', borderRadius: 99, textTransform: 'none' }}>
            取消
          </Button>
          <Button
            variant="contained"
            disabled={selectedImages.length === 0}
            onClick={confirm}
            sx={{
              bgcolor: '#a855f7',
              borderRadius: 99,
              boxShadow: 'none',
              textTransform: 'none',
              fontWeight: 700,
              '&:hover': { bgcolor: '#9333ea', boxShadow: 'none' },
            }}
          >
            選擇
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

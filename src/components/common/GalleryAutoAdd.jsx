import { useEffect, useRef, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Button from '@mui/material/Button'
import CollectionsIcon from '@mui/icons-material/Collections'
import { compressImageQuietly, setImageUploadListener } from '../../utils/compressImage'
import { addGalleryImages, findGalleryDuplicate, hashImageSrc } from '../../hooks/useGallery'
import { resolveImg } from '../../utils/imageSrc'

const newAutoId = () => `auto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

// 任何地方上傳圖片都自動加入圖庫；圖庫已有相同圖片時詢問要用圖庫那張還是再加一張
export default function GalleryAutoAdd() {
  const [queue, setQueue] = useState([]) // [{ src, hash, existing }]
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  const showToast = (text) => {
    setToast(text)
    window.clearTimeout(toastTimerRef.current)
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2200)
  }

  useEffect(() => {
    setImageUploadListener(async (file) => {
      try {
        // Gallery copy uses the same size/quality as uploads made in the gallery page
        const src = await compressImageQuietly(file, 1000, 0.85, true)
        const hash = await hashImageSrc(src)
        const existing = await findGalleryDuplicate(hash)
        if (existing) {
          setQueue((prev) => [...prev, { src, hash, existing }])
          return
        }
        await addGalleryImages(null, [{ id: newAutoId(), src, hash }])
        showToast('已自動加入圖庫')
      } catch (error) {
        console.error('Failed to add upload to gallery:', error)
      }
    })
    return () => {
      setImageUploadListener(null)
      window.clearTimeout(toastTimerRef.current)
    }
  }, [])

  const current = queue[0] ?? null
  const next = () => setQueue((prev) => prev.slice(1))

  const useExisting = () => {
    next()
    showToast('使用圖庫裡的這張，沒有重複加入')
  }

  const addAnyway = async () => {
    const item = current
    next()
    if (!item) return
    await addGalleryImages(null, [{ id: newAutoId(), src: item.src, hash: item.hash }])
    showToast('已加入圖庫')
  }

  return (
    <>
      <Dialog open={Boolean(current)} onClose={useExisting} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogTitle sx={{ fontSize: '1rem', fontWeight: 800, pb: 1 }}>圖庫裡已經有這張圖片</DialogTitle>
        <DialogContent>
          <p className="m-0 mb-3 text-sm text-slate-500">剛上傳的圖片和圖庫裡的這張相同，要直接選擇圖庫這張，還是再加入一張新的？</p>
          {current && (
            <div className="overflow-hidden rounded-xl bg-slate-900">
              <img src={resolveImg(current.existing.src)} alt="" className="block max-h-64 w-full object-contain" />
            </div>
          )}
          <div className="mt-4 flex flex-col gap-2 sm:flex-row-reverse">
            <Button
              variant="contained"
              onClick={useExisting}
              startIcon={<CollectionsIcon />}
              sx={{ bgcolor: '#a855f7', borderRadius: 99, boxShadow: 'none', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#9333ea', boxShadow: 'none' } }}
            >
              選擇圖庫這張
            </Button>
            <Button onClick={addAnyway} sx={{ color: '#6b7280', borderRadius: 99, textTransform: 'none', fontWeight: 600 }}>
              仍要加入新的一張
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="pointer-events-none fixed bottom-24 left-1/2 z-[2000] flex -translate-x-1/2 items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-lg md:bottom-6">
          <CollectionsIcon sx={{ fontSize: 15 }} />
          {toast}
        </div>
      )}
    </>
  )
}

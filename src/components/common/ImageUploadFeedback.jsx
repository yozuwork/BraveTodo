import { useEffect, useRef, useState } from 'react'
import Backdrop from '@mui/material/Backdrop'
import CircularProgress from '@mui/material/CircularProgress'
import Dialog from '@mui/material/Dialog'
import DialogContent from '@mui/material/DialogContent'
import Button from '@mui/material/Button'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

const START_EVENT = 'brave:image-upload-start'
const FINISH_EVENT = 'brave:image-upload-finish'

export default function ImageUploadFeedback() {
  const [activeCount, setActiveCount] = useState(0)
  const [completeOpen, setCompleteOpen] = useState(false)
  const activeCountRef = useRef(0)
  const completeTimerRef = useRef(null)

  useEffect(() => {
    const clearCompleteTimer = () => {
      if (completeTimerRef.current) {
        window.clearTimeout(completeTimerRef.current)
        completeTimerRef.current = null
      }
    }

    const handleStart = () => {
      clearCompleteTimer()
      activeCountRef.current += 1
      setCompleteOpen(false)
      setActiveCount(activeCountRef.current)
    }

    const handleFinish = () => {
      activeCountRef.current = Math.max(0, activeCountRef.current - 1)
      setActiveCount(activeCountRef.current)
      clearCompleteTimer()

      if (activeCountRef.current === 0) {
        completeTimerRef.current = window.setTimeout(() => {
          setCompleteOpen(true)
          completeTimerRef.current = null
        }, 350)
      }
    }

    window.addEventListener(START_EVENT, handleStart)
    window.addEventListener(FINISH_EVENT, handleFinish)

    return () => {
      clearCompleteTimer()
      window.removeEventListener(START_EVENT, handleStart)
      window.removeEventListener(FINISH_EVENT, handleFinish)
    }
  }, [])

  return (
    <>
      <Backdrop
        open={activeCount > 0}
        sx={{
          zIndex: 1400,
          bgcolor: 'rgba(15,23,42,0.34)',
          backdropFilter: 'blur(2px)',
        }}
      >
        <div className="flex flex-col items-center gap-3 rounded-2xl bg-white px-6 py-5 shadow-2xl">
          <CircularProgress size={34} thickness={4} sx={{ color: '#a855f7' }} />
          <span className="text-sm font-bold text-gray-700">圖片上傳中...</span>
        </div>
      </Backdrop>

      <Dialog
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        PaperProps={{ sx: { borderRadius: 4, width: 'min(360px, calc(100vw - 40px))' } }}
      >
        <DialogContent sx={{ px: 4, py: 4 }}>
          <div className="flex flex-col items-center text-center gap-3">
            <CheckCircleOutlineIcon sx={{ fontSize: 52, color: '#22c55e' }} />
            <div>
              <p className="text-lg font-extrabold text-gray-900 m-0">已上傳完成</p>
              <p className="text-sm text-gray-400 mt-1 mb-0">圖片已成功處理並套用。</p>
            </div>
            <Button
              variant="contained"
              onClick={() => setCompleteOpen(false)}
              sx={{
                mt: 1,
                bgcolor: '#a855f7',
                borderRadius: 99,
                boxShadow: 'none',
                textTransform: 'none',
                fontWeight: 800,
                px: 4,
                '&:hover': { bgcolor: '#9333ea', boxShadow: 'none' },
              }}
            >
              知道了
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

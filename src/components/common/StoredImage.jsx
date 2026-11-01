import { useEffect, useState } from 'react'
import { fetchImageSrcs } from '../../utils/imageStorage'

// 依 imageId 從 images collection 讀出圖片並顯示
export default function StoredImage({ imageId, className = '', alt = '' }) {
  const [src, setSrc] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchImageSrcs([imageId])
      .then((map) => {
        if (!cancelled) setSrc(map[imageId] ?? null)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [imageId])

  if (!src) return <div className={`aspect-video animate-pulse bg-slate-200 ${className}`} />
  return <img src={src} alt={alt} className={className} draggable={false} />
}

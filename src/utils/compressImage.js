const DEFAULT_MAX_PX = 1600
const DEFAULT_QUALITY = 0.95

function getOutputType(file) {
  if (file?.type === 'image/png' || file?.type === 'image/webp') return file.type
  return 'image/jpeg'
}

export function getCompressedImageExtension(file) {
  const outputType = getOutputType(file)
  if (outputType === 'image/png') return 'png'
  if (outputType === 'image/webp') return 'webp'
  return 'jpg'
}

/**
 * Resize an image File to a high-quality base64 data URL.
 * Keeps PNG/WebP when possible; other formats become JPEG.
 *
 * @param {File} file      - the original image file
 * @param {number} maxPx   - max width or height in pixels (default 1600)
 * @param {number} quality - JPEG/WebP quality 0-1 (default 0.95)
 * @returns {Promise<string>} base64 data URL
 */
export function compressImage(file, maxPx = DEFAULT_MAX_PX, quality = DEFAULT_QUALITY) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = reject
    reader.onload = (e) => {
      const img = new Image()
      img.onerror = reject
      img.onload = () => {
        let { width, height } = img
        if (width > height) {
          if (width > maxPx) { height = Math.round(height * maxPx / width); width = maxPx }
        } else {
          if (height > maxPx) { width = Math.round(width * maxPx / height); height = maxPx }
        }
        const canvas = document.createElement('canvas')
        canvas.width  = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL(getOutputType(file), quality))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

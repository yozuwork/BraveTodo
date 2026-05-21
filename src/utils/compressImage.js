const DEFAULT_MAX_PX = 1600
const DEFAULT_QUALITY = 0.95
const STORE_LIMIT = 750_000 // safe margin under Firestore's 1MB field limit

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
 * Resize an image File to a base64 data URL that fits within Firestore's
 * 1MB field limit. Always outputs WebP (transparency-safe, small) or JPEG
 * when storing; iteratively reduces quality if the output is still too large.
 *
 * @param {File} file
 * @param {number} maxPx   max width or height in pixels (default 1600)
 * @param {number} quality JPEG/WebP quality 0-1 (default 0.95)
 * @param {boolean} enforceLimit reduce quality until output < 750KB (default false)
 */
export function compressImage(file, maxPx = DEFAULT_MAX_PX, quality = DEFAULT_QUALITY, enforceLimit = false) {
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

        if (!enforceLimit) {
          resolve(canvas.toDataURL(getOutputType(file), quality))
          return
        }

        // For storage: use WebP (transparency + compression), fall back to JPEG
        let result = canvas.toDataURL('image/webp', quality)
        if (!result.startsWith('data:image/webp')) {
          result = canvas.toDataURL('image/jpeg', quality)
        }

        // Reduce quality until under limit
        let q = quality
        while (result.length > STORE_LIMIT && q > 0.3) {
          q = Math.max(0.3, q - 0.1)
          result = canvas.toDataURL('image/jpeg', q)
        }

        // Last resort: halve dimensions
        if (result.length > STORE_LIMIT) {
          const half = document.createElement('canvas')
          half.width  = Math.round(width / 2)
          half.height = Math.round(height / 2)
          half.getContext('2d').drawImage(canvas, 0, 0, half.width, half.height)
          result = half.toDataURL('image/jpeg', 0.7)
        }

        resolve(result)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

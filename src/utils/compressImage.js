/**
 * Compress an image File to a smaller base64 JPEG.
 * @param {File} file      - the original image file
 * @param {number} maxPx   - max width or height in pixels (default 600)
 * @param {number} quality - JPEG quality 0-1 (default 0.72)
 * @returns {Promise<string>} base64 data URL
 */
export function compressImage(file, maxPx = 600, quality = 0.72) {
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
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

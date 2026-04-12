/**
 * Resolve a stored image value (base64 data URL or relative path) into a usable <img src>.
 *
 * - base64 / blob / http(s) URLs → returned as-is
 * - relative paths (e.g. "uploads/stages/1.jpg") → prefixed with Vite's BASE_URL
 *   so they work correctly in both dev ("/") and GitHub Pages ("/BraveTodo/").
 */
export function resolveImg(src) {
  if (!src) return null
  if (
    src.startsWith('data:') ||
    src.startsWith('blob:') ||
    src.startsWith('http')
  ) {
    return src
  }
  const clean = src.startsWith('/') ? src.slice(1) : src
  return import.meta.env.BASE_URL + clean
}

/**
 * In dev mode: POST the image to the Vite dev-server, which writes it to
 * public/{relativePath}. Returns the relative path on success, null otherwise.
 *
 * @param {string} dataUrl       - Compressed base64 data URL
 * @param {string} relativePath  - e.g. "uploads/stages/1.jpg"
 */
export async function saveImageToDisk(dataUrl, relativePath) {
  if (!import.meta.env.DEV) return null
  try {
    const res = await fetch('/api/save-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, path: relativePath }),
    })
    if (res.ok) return relativePath
  } catch {
    // dev server unavailable — silently fall back
  }
  return null
}

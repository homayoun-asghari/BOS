import { fileToBase64 } from '../utils'

const PREFIX = 'tiptap_img_cache_v1_'

// In-memory cache for fast access during the same session
const memoryCache = new Map<string, { name: string; type: string; dataUrl: string }>()

const isBrowser = typeof window !== 'undefined' && typeof sessionStorage !== 'undefined'

export const cacheImageFile = async (id: string, file: File): Promise<void> => {
  try {
    const dataUrl = await fileToBase64(file)
    const payload = { name: file.name, type: file.type || 'application/octet-stream', dataUrl }
    memoryCache.set(id, payload)
    if (isBrowser) {
      try {
        sessionStorage.setItem(PREFIX + id, JSON.stringify(payload))
      } catch {
        // Ignore storage quota errors
      }
    }
  } catch {
    // Silently ignore caching failures
  }
}

export const getCachedImageFile = (id: string): File | null => {
  try {
    let payload = memoryCache.get(id)
    if (!payload && isBrowser) {
      const raw = sessionStorage.getItem(PREFIX + id)
      if (raw) {
        payload = JSON.parse(raw) as { name: string; type: string; dataUrl: string }
        memoryCache.set(id, payload)
      }
    }
    if (!payload) return null

    // Convert data URL back to Blob
    const [header, base64] = payload.dataUrl.split(',')
    const mime = header.split(':')[1]?.split(';')[0] || payload.type
    const binary = atob(base64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const blob = new Blob([bytes], { type: mime })
    return new File([blob], payload.name, { type: mime })
  } catch {
    return null
  }
}

export const removeCachedImageFile = (id: string): void => {
  memoryCache.delete(id)
  if (isBrowser) {
    try {
      sessionStorage.removeItem(PREFIX + id)
    } catch {
      // Ignore
    }
  }
}

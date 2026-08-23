const MAX_SIZE = 1600
const MAX_BYTES = 2.5 * 1024 * 1024
const JPEG_QUALITY = 0.82
const HEIC_MESSAGE =
  '这张图可能是 iPhone 的 HEIC 格式。请改用 jpg 或 png；也可在 iPhone 设置里关闭“高效”，或先用相册转换成 JPEG。'

function isHeic(file: File): boolean {
  return /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name)
}

function isSupportedImage(file: File): boolean {
  return (
    ['image/jpeg', 'image/png', 'image/jpg', 'image/heic', 'image/heif'].includes(file.type) ||
    /\.(jpe?g|png|heic|heif)$/i.test(file.name)
  )
}

export async function fileToCompressedDataUrl(file: File): Promise<{
  dataUrl: string
  compressed: boolean
  originalBytes: number
  resultBytes: number
}> {
  if (!isSupportedImage(file)) {
    throw new Error('只支持 jpg、png 图片。iPhone 相册如果是 HEIC，请先转换成 JPEG。')
  }

  const originalBytes = file.size
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(isHeic(file) ? HEIC_MESSAGE : '浏览器无法读取这张图片，请换一张 jpg 或 png。')
  }
  const scale = Math.min(1, MAX_SIZE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) {
    throw new Error('浏览器无法处理这张图片，请换一张再试。')
  }
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  const mime = file.type === 'image/png' && originalBytes < MAX_BYTES ? 'image/png' : 'image/jpeg'
  const dataUrl = canvas.toDataURL(mime, JPEG_QUALITY)
  const resultBytes = Math.ceil((dataUrl.length * 3) / 4)
  return {
    dataUrl,
    compressed: scale < 1 || resultBytes < originalBytes,
    originalBytes,
    resultBytes,
  }
}

export function dataUrlToBase64(dataUrl: string): { mime: string; base64: string } {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/)
  if (!match) {
    throw new Error('图片数据格式不正确。')
  }
  return { mime: match[1], base64: match[2] }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

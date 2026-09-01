import { useRef } from 'react'
import type { AppNotice } from '../types'
import { fileToCompressedDataUrl, formatFileSize } from '../utils/image'

const ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif'

export default function ImageUploader({
  imageDataUrl,
  onChange,
  onNotice,
  disabled,
  compact = false,
}: {
  imageDataUrl: string
  onChange: (dataUrl: string) => void
  onNotice: (notice: AppNotice) => void
  disabled?: boolean
  compact?: boolean
}) {
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | undefined) {
    if (!file) return
    try {
      const result = await fileToCompressedDataUrl(file)
      onChange(result.dataUrl)
      if (result.compressed) {
        onNotice({
          type: 'info',
          message: `图片已优化：${formatFileSize(result.originalBytes)} → ${formatFileSize(result.resultBytes)}。`,
        })
      } else {
        onNotice({ type: 'info', message: '图片已就绪，可以开始识别。' })
      }
    } catch (error) {
      onNotice({
        type: 'error',
        message: error instanceof Error ? error.message : '图片读取失败，请换一张 jpg 或 png。',
      })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2 sm:gap-3">
        <button
          className="flex-1 rounded-xl bg-[#2f5d50] py-2.5 px-3 text-sm font-bold text-white shadow-xs hover:bg-[#254b40] disabled:opacity-60"
          type="button"
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
        >
          📷 手机拍照
        </button>
        <button
          className="flex-1 rounded-xl border border-[#2f5d50] bg-white py-2.5 px-3 text-sm font-semibold text-[#2f5d50] hover:bg-[#fbfaf5] disabled:opacity-60"
          type="button"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
        >
          🖼️ 相册上传
        </button>
        {imageDataUrl && (
          <button
            className="rounded-xl border border-[#9a6b4a] bg-[#fbfaf5] px-3 py-2 text-xs font-semibold text-[#9a6b4a] hover:bg-[#f5ede1] disabled:opacity-60 shrink-0"
            type="button"
            disabled={disabled}
            onClick={() => onChange('')}
          >
            清除
          </button>
        )}
      </div>

      <input
        ref={cameraRef}
        className="hidden"
        type="file"
        accept={ACCEPT}
        capture="environment"
        onChange={(event) => {
          void handleFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />
      <input
        ref={fileRef}
        className="hidden"
        type="file"
        accept={ACCEPT}
        onChange={(event) => {
          void handleFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      {imageDataUrl ? (
        <div className="overflow-hidden rounded-xl border border-[#d9d2c3] bg-[#fbfaf5]">
          <img
            src={imageDataUrl}
            alt="作业预览"
            className={`${compact ? 'max-h-[160px]' : 'max-h-[220px] sm:max-h-[380px]'} w-full object-contain p-1`}
          />
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-[#c8c0ae] bg-[#fbfaf5] px-3 py-6 text-center text-xs text-[#66756c]">
          请拍照或选择一张清晰的作业图片（支持整页多题）
        </div>
      )}
    </div>
  )
}

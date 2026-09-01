import { useRef } from 'react'
import type { AppNotice } from '../types'
import { fileToCompressedDataUrl, formatFileSize } from '../utils/image'

const ACCEPT = 'image/jpeg,image/png,image/heic,image/heif,.jpg,.jpeg,.png,.heic,.heif'

export default function ImageUploader({
  imageDataUrl,
  onChange,
  onNotice,
  disabled,
}: {
  imageDataUrl: string
  onChange: (dataUrl: string) => void
  onNotice: (notice: AppNotice) => void
  disabled?: boolean
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
          message: `图片已压缩：${formatFileSize(result.originalBytes)} → ${formatFileSize(result.resultBytes)}。请确认预览是否清晰。`,
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
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
        <button
          className="w-full rounded-xl bg-[#2f5d50] px-5 py-3 text-white disabled:opacity-60 sm:w-auto"
          type="button"
          disabled={disabled}
          onClick={() => cameraRef.current?.click()}
        >
          拍照
        </button>
        <button
          className="w-full rounded-xl border border-[#2f5d50] px-5 py-3 text-[#2f5d50] disabled:opacity-60 sm:w-auto"
          type="button"
          disabled={disabled}
          onClick={() => fileRef.current?.click()}
        >
          从相册上传
        </button>
        {imageDataUrl ? (
          <button
            className="col-span-2 rounded-xl border border-[#9a6b4a] px-5 py-3 text-[#9a6b4a] disabled:opacity-60 sm:col-span-1"
            type="button"
            disabled={disabled}
            onClick={() => onChange('')}
          >
            清除图片
          </button>
        ) : null}
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
        <div className="overflow-hidden rounded-2xl border border-[#d9d2c3] bg-[#fbfaf5]">
          <img src={imageDataUrl} alt="作业预览" className="max-h-[420px] w-full object-contain" />
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-[#c8c0ae] bg-[#fbfaf5] px-4 py-10 text-center text-[#66756c]">
          还没有图片。请拍照或上传一张 jpg / png。
        </div>
      )}
    </div>
  )
}

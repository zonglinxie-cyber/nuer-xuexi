import { useState } from 'react'

export default function PrivacyNotice() {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-[#e5ded0] bg-white/70 px-3 py-1.5 text-xs text-[#66756c] flex items-center justify-between">
      <div className="flex items-center gap-1.5 truncate">
        <span>🔒</span>
        <span className="truncate">图片仅发送给 AI 识别，不保存敏感信息</span>
      </div>
      <button
        type="button"
        className="text-[#2f5d50] underline shrink-0 ml-2 text-[11px]"
        onClick={() => setOpen(!open)}
      >
        {open ? '收起' : '详情'}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setOpen(false)}>
          <div className="rounded-2xl bg-white p-5 max-w-sm text-xs leading-5 text-[#4a5850]" onClick={(e) => e.stopPropagation()}>
            <h4 className="font-bold text-sm text-[#243026] mb-2">🔒 隐私与数据安全声明</h4>
            <p>1. 作业图片将发送给您配置的 AI 服务进行图文识别，请不要上传包含姓名、家庭住址、身份证等敏感信息的照片。</p>
            <p className="mt-2">2. 识别后的错题与做题记录只保存在当前手机/电脑浏览器的本地存储（IndexedDB）中，不会上传到任何未经授权的第三方服务器。</p>
            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-[#2f5d50] py-2 text-white font-semibold"
              onClick={() => setOpen(false)}
            >
              我知道了
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

import type { AppNotice } from '../types'

export default function NoticeBanner({ notice }: { notice: AppNotice | null }) {
  if (!notice) return null
  const colors = {
    info: 'bg-[#e8eef2] text-[#1f3b4d]',
    success: 'bg-[#e5efe8] text-[#21543c]',
    warning: 'bg-[#f4ead4] text-[#6b4b16]',
    error: 'bg-[#f8e4e1] text-[#7a2e24]',
  }
  return <div className={`rounded-xl px-4 py-3 text-base leading-6 ${colors[notice.type]}`}>{notice.message}</div>
}

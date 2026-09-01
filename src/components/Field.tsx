import type { ReactNode } from 'react'

export default function Field({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-bold text-[#4a5850]">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] leading-4 text-[#66756c]">{hint}</span> : null}
    </label>
  )
}

export const inputClass =
  'w-full min-w-0 max-w-full rounded-xl border border-[#d9d2c3] bg-white px-3 py-2 text-sm sm:px-3.5 sm:py-2.5 outline-none focus:border-[#2f5d50] transition-colors'

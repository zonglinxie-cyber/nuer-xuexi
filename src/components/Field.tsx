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
      <span className="mb-2 block text-base font-medium">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-sm leading-6 text-[#66756c]">{hint}</span> : null}
    </label>
  )
}

export const inputClass =
  'w-full min-w-0 max-w-full rounded-xl border border-[#d9d2c3] bg-white px-4 py-3 text-base outline-none focus:border-[#2f5d50]'

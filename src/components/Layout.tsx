import { useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { preloadSpeechVoices } from '../utils/speech'

const links = [
  { to: '/', label: '首页', short: '首页', icon: '🏠' },
  { to: '/homework', label: '拍照/上传', short: '拍照', icon: '📸' },
  { to: '/wrong-book', label: '错题本', short: '错题', icon: '📕' },
  { to: '/records', label: '学习记录', short: '记录', icon: '📊' },
  { to: '/settings', label: '设置', short: '设置', icon: '⚙️' },
]

export default function Layout() {
  useEffect(() => {
    preloadSpeechVoices()
  }, [])

  return (
    <div className="min-h-dvh bg-[#f4f1e8] text-[#243026]">
      <header className="sticky top-0 z-20 border-b border-[#d9d2c3] bg-[#fbfaf5]/95 backdrop-blur-xs pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-3 py-2 sm:px-4 sm:py-3.5">
          <div className="min-w-0">
            <h1 className="truncate text-base font-bold sm:text-xl text-[#243026]">
              四年级学习助手 <span className="hidden sm:inline text-xs font-normal text-[#5d6b61]">· 数语英全科</span>
            </h1>
          </div>
          <p className="hidden max-w-xs rounded-xl bg-[#efe8d8] px-3 py-1.5 text-xs text-[#5d4a28] sm:block">
            支持整页拍照 · A4 错题卷打印
          </p>
        </div>
        <nav className="mx-auto hidden max-w-5xl gap-2 px-4 pb-3 sm:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `rounded-xl px-4 py-2 text-sm font-semibold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-[#2f5d50] text-white shadow-xs'
                    : 'border border-[#d9d2c3] bg-white text-[#2f5d50] hover:bg-[#fbfaf5]'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-2.5 py-2.5 pb-28 sm:px-4 sm:py-5 sm:pb-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#d9d2c3] bg-[#fbfaf5]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] sm:hidden shadow-lg">
        <div className="grid grid-cols-5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex min-h-[50px] flex-col items-center justify-center py-1 text-[11px] font-medium transition-colors ${
                  isActive ? 'text-[#2f5d50] font-bold' : 'text-[#66756c]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="text-base leading-none mb-0.5">{link.icon}</span>
                  <span>{link.short}</span>
                  {isActive && <span className="h-0.5 w-4 rounded-full bg-[#2f5d50] mt-0.5" />}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

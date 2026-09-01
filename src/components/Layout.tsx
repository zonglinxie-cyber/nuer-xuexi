import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: '首页', short: '首页' },
  { to: '/homework', label: '拍照/上传', short: '拍照' },
  { to: '/wrong-book', label: '错题本', short: '错题' },
  { to: '/records', label: '学习记录', short: '记录' },
  { to: '/settings', label: '设置', short: '设置' },
]

export default function Layout() {
  return (
    <div className="min-h-dvh bg-[#f4f1e8] text-[#243026]">
      <header className="sticky top-0 z-20 border-b border-[#d9d2c3] bg-[#fbfaf5] pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:py-4">
          <div className="min-w-0">
            <p className="hidden text-sm text-[#5d6b61] sm:block">家庭学习辅助 · 人教版四年级上册数学</p>
            <h1 className="truncate text-lg font-semibold sm:text-2xl">四年级数学学习助手</h1>
          </div>
          <p className="hidden max-w-xs rounded-xl bg-[#efe8d8] px-3 py-2 text-xs leading-5 text-[#5d4a28] sm:block">
            家长陪同辅导 · 支持整页拍照 · A4 错题卷打印
          </p>
        </div>
        <nav className="mx-auto hidden max-w-5xl gap-2 px-4 pb-4 sm:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `rounded-xl px-4 py-3 text-base font-medium whitespace-nowrap ${
                  isActive ? 'bg-[#2f5d50] text-white' : 'border border-[#d9d2c3] bg-white text-[#2f5d50]'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-3 py-4 pb-24 sm:px-4 sm:py-6 sm:pb-6">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#d9d2c3] bg-[#fbfaf5] pb-[env(safe-area-inset-bottom)] sm:hidden">
        <div className="grid grid-cols-5">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `flex min-h-14 flex-col items-center justify-center px-1 py-2 text-xs font-medium ${
                  isActive ? 'text-[#2f5d50]' : 'text-[#66756c]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`mb-0.5 h-1 w-5 rounded-full ${isActive ? 'bg-[#2f5d50]' : 'bg-transparent'}`} />
                  {link.short}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}

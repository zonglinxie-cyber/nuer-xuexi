import { NavLink, Outlet } from 'react-router-dom'

const links = [
  { to: '/', label: '首页' },
  { to: '/homework', label: '拍照/上传' },
  { to: '/wrong-book', label: '错题本' },
  { to: '/records', label: '学习记录' },
  { to: '/settings', label: '设置' },
]

export default function Layout() {
  return (
    <div className="min-h-screen bg-[#f4f1e8] text-[#243026]">
      <header className="border-b border-[#d9d2c3] bg-[#fbfaf5]">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-[#5d6b61]">家庭学习辅助 · 人教版四年级上册数学</p>
            <h1 className="text-2xl font-semibold">四年级数学学习助手</h1>
          </div>
          <p className="rounded-xl bg-[#efe8d8] px-3 py-2 text-sm text-[#5d4a28]">
            请家长陪同使用。数据保存在本机浏览器，清除缓存可能丢失。
          </p>
        </div>
        <nav className="mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 pb-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/'}
              className={({ isActive }) =>
                `rounded-xl px-4 py-3 text-base font-medium whitespace-nowrap ${
                  isActive ? 'bg-[#2f5d50] text-white' : 'bg-white text-[#2f5d50] border border-[#d9d2c3]'
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

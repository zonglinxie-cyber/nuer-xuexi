import { Link } from 'react-router-dom'
import { hasApiKey, loadSettings } from '../services/settingsService'

const cards = [
  {
    to: '/homework',
    title: '拍照 / 上传作业',
    desc: '拍一张数学题，识别、讲解、辅助批改。',
  },
  {
    to: '/wrong-book',
    title: '错题本',
    desc: '保存错题，按知识点和复习状态查找。',
  },
  {
    to: '/records',
    title: '学习记录',
    desc: '查看做题数量、正确率和最近错题。',
  },
]

export default function HomePage() {
  const ready = hasApiKey(loadSettings())

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">给四年级孩子用的数学小助手</h2>
        <p className="mt-3 text-base leading-7 text-[#4a5850]">
          请家长陪同使用。先拍照识别题目，再由家长核对、讲解、确认对错，最后决定要不要放进错题本。
        </p>
        <p className="mt-2 text-base leading-7 text-[#4a5850]">
          第一期只覆盖人教版四年级上册数学，用来验证“拍题 → 讲解 → 批改 → 错题本”这条流程。
        </p>
      </section>

      {!ready ? (
        <div className="rounded-2xl bg-[#f4ead4] px-5 py-4 text-[#6b4b16]">
          还没有填写 API Key。现在可以先熟悉页面，识别题目前请先到
          <Link to="/settings" className="mx-1 font-semibold underline">
            设置
          </Link>
          填写。
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="rounded-2xl bg-[#2f5d50] px-5 py-8 text-white shadow-sm"
          >
            <h3 className="text-2xl font-semibold">{card.title}</h3>
            <p className="mt-3 text-base leading-6 text-[#d7ebe3]">{card.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import RewardBadge from '../components/RewardBadge'
import { hasApiKey, loadSettings } from '../services/settingsService'
import { loadRecords, loadWrongQuestions } from '../services/storageService'

export default function HomePage() {
  const ready = hasApiKey(loadSettings())
  const wrongQuestions = loadWrongQuestions()
  const unmasteredWrong = wrongQuestions.filter((q) => q.reviewStatus !== '已掌握').length
  const records = loadRecords()

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 孩子奖励与打卡状态 */}
      <RewardBadge />

      {/* 欢迎与数据概览 */}
      <section className="rounded-2xl bg-white p-3.5 sm:p-5 shadow-xs border border-[#ece6d8]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#243026]">
              四年级学习助手
            </h2>
            <p className="mt-0.5 text-xs text-[#66756c]">
              数语英全科辅导 · 整页拍照 · 错题打印与举一反三
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="rounded-xl bg-[#fbfaf5] px-2.5 py-1.5 text-center border border-[#eee7d8]">
              <span className="text-[10px] text-[#66756c] block">待复习</span>
              <span className="text-xs sm:text-sm font-bold text-[#b45309]">{unmasteredWrong} 题</span>
            </div>
            <div className="rounded-xl bg-[#fbfaf5] px-2.5 py-1.5 text-center border border-[#eee7d8]">
              <span className="text-[10px] text-[#66756c] block">已批改</span>
              <span className="text-xs sm:text-sm font-bold text-[#2f5d50]">{records.length} 题</span>
            </div>
          </div>
        </div>
      </section>

      {!ready && (
        <div className="rounded-2xl bg-[#fef3c7] p-3 text-xs text-[#92400e] border border-[#f59e0b]/30 flex items-center justify-between">
          <span>⚠️ 尚未填写 API Key</span>
          <Link to="/settings" className="font-bold underline text-[#b45309] ml-2 shrink-0">
            去设置 →
          </Link>
        </div>
      )}

      {/* 三大学科快捷入口 */}
      <div className="grid grid-cols-3 gap-2">
        <Link
          to="/homework?subject=math"
          className="group rounded-2xl bg-[#2f5d50] p-3 text-white shadow-xs transition-all hover:bg-[#254b40] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xl">📐</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">人教版</span>
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-bold">数学作业</h3>
            <p className="text-[10px] text-[#d7ebe3] truncate">计算/应用/图形</p>
          </div>
        </Link>

        <Link
          to="/homework?subject=chinese"
          className="group rounded-2xl bg-[#8c5e3c] p-3 text-white shadow-xs transition-all hover:bg-[#784e30] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xl">📖</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">统编版</span>
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-bold">语文作业</h3>
            <p className="text-[10px] text-[#f3e5db] truncate">字词/阅读/默写</p>
          </div>
        </Link>

        <Link
          to="/homework?subject=english"
          className="group rounded-2xl bg-[#3f5f8a] p-3 text-white shadow-xs transition-all hover:bg-[#334e72] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-xl">🔤</span>
            <span className="text-[10px] bg-white/20 px-1.5 py-0.5 rounded-md">四年级</span>
          </div>
          <div className="mt-2">
            <h3 className="text-sm font-bold">英语作业</h3>
            <p className="text-[10px] text-[#d7e3f3] truncate">拼写/句型/时态</p>
          </div>
        </Link>
      </div>

      {/* 功能卡片 2x2 网格 */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <Link
          to="/wrong-book"
          className="group rounded-2xl bg-[#5b4a3a] p-3.5 text-white shadow-xs transition-all hover:bg-[#4a3c2f] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">🖨️</span>
            <span className="rounded-lg bg-white/20 px-2 py-0.5 text-[10px] font-semibold">
              周末复习
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-xs sm:text-sm font-bold">A4 错题重做打印</h3>
            <p className="mt-0.5 text-[11px] text-[#f3e5db]">生成空白试卷，纸上重做</p>
          </div>
        </Link>

        <Link
          to="/wrong-book"
          className="group rounded-2xl bg-white p-3.5 shadow-xs border border-[#ece6d8] transition-all hover:border-[#2f5d50] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">🎯</span>
            <span className="rounded-lg bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold text-[#b45309]">
              举一反三
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#243026]">AI 变式题练习</h3>
            <p className="mt-0.5 text-[11px] text-[#66756c]">生成 3 道同考点同类题</p>
          </div>
        </Link>

        <Link
          to="/homework"
          className="group rounded-2xl bg-white p-3.5 shadow-xs border border-[#ece6d8] transition-all hover:border-[#2f5d50] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">📸</span>
            <span className="rounded-lg bg-[#2f5d50]/10 px-2 py-0.5 text-[10px] font-bold text-[#2f5d50]">
              整页拍照
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#243026]">拍照/上传批改</h3>
            <p className="mt-0.5 text-[11px] text-[#66756c]">多题自动切分与智能点拨</p>
          </div>
        </Link>

        <Link
          to="/records"
          className="group rounded-2xl bg-white p-3.5 shadow-xs border border-[#ece6d8] transition-all hover:border-[#2f5d50] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-2xl">📊</span>
            <span className="rounded-lg bg-[#2f5d50]/10 px-2 py-0.5 text-[10px] font-bold text-[#2f5d50]">
              薄弱点
            </span>
          </div>
          <div className="mt-2">
            <h3 className="text-xs sm:text-sm font-bold text-[#243026]">学习记录与诊断</h3>
            <p className="mt-0.5 text-[11px] text-[#66756c]">正确率分析与考点分布</p>
          </div>
        </Link>
      </div>
    </div>
  )
}

import { Link } from 'react-router-dom'
import KnowledgeHandbook from '../components/KnowledgeHandbook'
import RewardBadge from '../components/RewardBadge'
import { hasApiKey, loadSettings } from '../services/settingsService'
import { loadRecords, loadWrongQuestions } from '../services/storageService'
import { getEbbinghausStatus } from '../utils/ebbinghaus'

export default function HomePage() {
  const ready = hasApiKey(loadSettings())
  const wrongQuestions = loadWrongQuestions()
  const unmasteredWrong = wrongQuestions.filter((q) => q.reviewStatus !== '已掌握').length
  const ebbinghausDueCount = wrongQuestions.filter(q => getEbbinghausStatus(q).isDue).length
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

      {/* 艾宾浩斯复习提醒 */}
      {ebbinghausDueCount > 0 && (
        <div className="rounded-2xl bg-amber-50 p-3 sm:p-4 text-xs shadow-xs border border-amber-200/60 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-amber-800">
              <span className="text-base">🧠</span>
              <span>艾宾浩斯复习提醒</span>
            </div>
            <p className="mt-0.5 text-[11px] text-amber-700">
              今日有 <strong className="text-rose-600 text-sm mx-0.5">{ebbinghausDueCount}</strong> 道错题处于遗忘临界点，请及时巩固！
            </p>
          </div>
          <Link to="/wrong-book?filter=ebbinghaus" className="shrink-0 rounded-xl bg-amber-600 px-3 py-1.5 font-bold text-white shadow-xs hover:bg-amber-700 transition-colors">
            去复习 →
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

      {/* 四年级全科考点速查手册 */}
      <KnowledgeHandbook />

      {/* 科学辅导三步法 */}
      <section className="rounded-2xl bg-linear-to-r from-[#2f5d50]/10 to-[#8c5e3c]/10 p-3.5 sm:p-4 border border-[#2f5d50]/20">
        <h3 className="text-xs font-bold text-[#243026] mb-1.5 flex items-center gap-1">
          <span>🌟</span> 家长高效辅导三步法
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="rounded-xl bg-white/80 p-2 border border-white/60">
            <span className="text-sm block">1️⃣</span>
            <span className="text-[11px] font-bold text-[#243026] block mt-0.5">先肯定态度</span>
            <span className="text-[10px] text-[#66756c] block mt-0.5">多夸思考过程</span>
          </div>
          <div className="rounded-xl bg-white/80 p-2 border border-white/60">
            <span className="text-sm block">2️⃣</span>
            <span className="text-[11px] font-bold text-[#243026] block mt-0.5">引导说思路</span>
            <span className="text-[10px] text-[#66756c] block mt-0.5">不急于给答案</span>
          </div>
          <div className="rounded-xl bg-white/80 p-2 border border-white/60">
            <span className="text-sm block">3️⃣</span>
            <span className="text-[11px] font-bold text-[#243026] block mt-0.5">重做同类题</span>
            <span className="text-[10px] text-[#66756c] block mt-0.5">举一反三巩固</span>
          </div>
        </div>
      </section>
    </div>
  )
}

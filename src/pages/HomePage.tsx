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
    <div className="space-y-6">
      {/* 孩子奖励与打卡状态 */}
      <RewardBadge />

      {/* 欢迎与定位 */}
      <section className="rounded-3xl bg-white p-6 shadow-sm border border-[#ece6d8]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#243026] sm:text-2xl">
              四年级学习助手
            </h2>
            <p className="mt-2 text-sm leading-6 text-[#4a5850]">
              数学、语文、英语都能拍照整理。先选学科，再整页识别；错题可打印重做，数学和字词句还能举一反三。
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <div className="rounded-2xl bg-[#fbfaf5] p-3 text-center border border-[#eee7d8]">
              <span className="text-xs text-[#66756c] block">待复习错题</span>
              <span className="text-lg font-bold text-[#b45309]">{unmasteredWrong} 道</span>
            </div>
            <div className="rounded-2xl bg-[#fbfaf5] p-3 text-center border border-[#eee7d8]">
              <span className="text-xs text-[#66756c] block">累计批改</span>
              <span className="text-lg font-bold text-[#2f5d50]">{records.length} 题</span>
            </div>
          </div>
        </div>
      </section>

      {!ready && (
        <div className="rounded-3xl bg-[#fef3c7] p-5 text-sm text-[#92400e] border border-[#f59e0b]/30">
          ⚠️ 还没有填写 AI API Key。现在可以先熟悉系统，使用拍照识别前请先前往
          <Link to="/settings" className="mx-1 font-bold underline text-[#b45309]">
            设置页面
          </Link>
          填写。
        </div>
      )}

      {/* 核心功能卡片网格 */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          to="/homework?subject=math"
          className="group rounded-3xl bg-[#2f5d50] p-5 text-white shadow-sm transition-all hover:bg-[#254b40] hover:shadow-md"
        >
          <span className="text-2xl">📐</span>
          <h3 className="mt-3 text-lg font-bold">数学作业</h3>
          <p className="mt-1.5 text-xs leading-5 text-[#d7ebe3]">计算、应用题、图形。先引导再给答案。</p>
        </Link>
        <Link
          to="/homework?subject=chinese"
          className="group rounded-3xl bg-[#8c5e3c] p-5 text-white shadow-sm transition-all hover:bg-[#784e30] hover:shadow-md"
        >
          <span className="text-2xl">📖</span>
          <h3 className="mt-3 text-lg font-bold">语文作业</h3>
          <p className="mt-1.5 text-xs leading-5 text-[#f3e5db]">字词句先对，阅读开放题请家长点确认。</p>
        </Link>
        <Link
          to="/homework?subject=english"
          className="group rounded-3xl bg-[#3f5f8a] p-5 text-white shadow-sm transition-all hover:bg-[#334e72] hover:shadow-md"
        >
          <span className="text-2xl">🔤</span>
          <h3 className="mt-3 text-lg font-bold">英语作业</h3>
          <p className="mt-1.5 text-xs leading-5 text-[#d7e3f3]">拼写和句型可批；听力题会直接跳过。</p>
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          to="/homework"
          className="group rounded-3xl bg-white p-6 shadow-sm border border-[#ece6d8] transition-all hover:border-[#2f5d50] hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xl">📸</span>
            <span className="rounded-xl bg-[#2f5d50]/10 px-3 py-1 text-xs font-bold text-[#2f5d50]">
              支持整页多题
            </span>
          </div>
          <h3 className="mt-4 text-lg font-bold text-[#243026]">拍照 / 上传作业</h3>
          <p className="mt-2 text-xs leading-5 text-[#66756c]">
            用上次选择的学科识别。也可从上面三张卡片直接进入对应学科。
          </p>
        </Link>

        <Link
          to="/wrong-book"
          className="group rounded-3xl bg-[#5b4a3a] p-6 text-white shadow-sm transition-all hover:bg-[#4a3c2f] hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xl">🖨️</span>
            <span className="rounded-xl bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-xs">
              周末复习神器
            </span>
          </div>
          <h3 className="mt-4 text-xl font-bold">A4 错题本 & 打印重做</h3>
          <p className="mt-2 text-xs leading-5 text-[#f3e5db]">
            一键生成留白错题卷，支持直接打印或导出 PDF，让孩子周末在纸上重新做。
          </p>
        </Link>

        <Link
          to="/wrong-book"
          className="group rounded-3xl bg-white p-6 shadow-sm border border-[#ece6d8] transition-all hover:border-[#2f5d50] hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xl">🎯</span>
            <span className="rounded-xl bg-[#fef3c7] px-3 py-1 text-xs font-bold text-[#b45309]">
              考点变式
            </span>
          </div>
          <h3 className="mt-4 text-lg font-bold text-[#243026]">AI 举一反三练习</h3>
          <p className="mt-2 text-xs leading-5 text-[#66756c]">
            针对错题一键生成 3 道难度递进的同类题，现场作答检验是否真正弄懂。
          </p>
        </Link>

        <Link
          to="/records"
          className="group rounded-3xl bg-white p-6 shadow-sm border border-[#ece6d8] transition-all hover:border-[#2f5d50] hover:shadow-md"
        >
          <div className="flex items-center justify-between">
            <span className="text-3xl">📊</span>
            <span className="rounded-xl bg-[#2f5d50]/10 px-3 py-1 text-xs font-bold text-[#2f5d50]">
              提分诊断
            </span>
          </div>
          <h3 className="mt-4 text-lg font-bold text-[#243026]">学习记录与薄弱点</h3>
          <p className="mt-2 text-xs leading-5 text-[#66756c]">
            查看正确率走势、各单元错题分布与 7 天复习动态。
          </p>
        </Link>
      </div>
    </div>
  )
}

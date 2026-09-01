import { useEffect, useState } from 'react'
import { loadRewardStats, recordDailyActivity } from '../services/storageService'
import type { UserRewardStats } from '../types'

export default function RewardBadge({ className = '' }: { className?: string }) {
  const [stats, setStats] = useState<UserRewardStats>(() => loadRewardStats())
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    // 自动记录今日打卡
    const updated = recordDailyActivity()
    setStats(updated)
  }, [])

  return (
    <>
      <div
        className={`flex cursor-pointer items-center justify-between gap-3 rounded-2xl bg-linear-to-r from-[#fef7ee] to-[#f0f7f4] p-3.5 shadow-xs border border-[#e8dfcf] transition-all hover:shadow-sm ${className}`}
        onClick={() => setShowModal(true)}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#fef3c7] text-2xl shadow-inner">
            ⭐
          </div>
          <div>
            <div className="flex items-center gap-1.5 font-bold text-[#2f5d50]">
              <span>{stats.stars}</span>
              <span className="text-xs font-normal text-[#66756c]">颗星</span>
              <span className="text-[#c8c0ae]">·</span>
              <span className="text-[#b45309]">连续 {stats.streakDays} 天</span>
            </div>
            <p className="text-xs text-[#66756c]">
              已攻克 {stats.masteredCount} 道错题 · 点击查看成就
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {stats.badges.slice(-2).map((badge) => (
            <span
              key={badge}
              className="rounded-lg bg-[#efe8d8] px-2 py-0.5 text-xs font-medium text-[#5d4a28]"
            >
              {badge}
            </span>
          ))}
        </div>
      </div>

      {/* 成就与规则说明弹窗 */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0ece1] pb-3">
              <h3 className="text-xl font-bold text-[#243026]">🏆 我的学习荣誉馆</h3>
              <button
                type="button"
                className="text-[#8c9c93] hover:text-[#243026] text-xl"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3 text-center">
              <div className="rounded-2xl bg-[#fef3c7]/60 p-3">
                <span className="text-2xl">🌟</span>
                <p className="mt-1 text-xs text-[#854d0e]">星星总数</p>
                <p className="text-lg font-bold text-[#b45309]">{stats.stars}</p>
              </div>
              <div className="rounded-2xl bg-[#fee2e2]/60 p-3">
                <span className="text-2xl">🔥</span>
                <p className="mt-1 text-xs text-[#991b1b]">连续打卡</p>
                <p className="text-lg font-bold text-[#b91c1c]">{stats.streakDays} 天</p>
              </div>
              <div className="rounded-2xl bg-[#dcfce7]/60 p-3">
                <span className="text-2xl">🛡️</span>
                <p className="mt-1 text-xs text-[#166534]">已掌握错题</p>
                <p className="text-lg font-bold text-[#15803d]">{stats.masteredCount} 道</p>
              </div>
            </div>

            <div className="mt-4">
              <h4 className="text-sm font-semibold text-[#4a5850]">已解锁徽章：</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {stats.badges.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center gap-1 rounded-xl bg-[#2f5d50]/10 px-3 py-1.5 text-xs font-semibold text-[#2f5d50]"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl bg-[#fbfaf5] p-3.5 text-xs leading-5 text-[#66756c]">
              <strong className="text-[#243026]">💡 怎么获得更多小星星？</strong>
              <ul className="mt-1 list-disc pl-4 space-y-0.5">
                <li>每日打开助手打卡：+1 🌟</li>
                <li>把错题复习并标记为“已掌握”：+2 🌟</li>
                <li>在错题详情里完成“举一反三”练习：+2 🌟</li>
              </ul>
            </div>

            <button
              type="button"
              className="mt-5 w-full rounded-2xl bg-[#2f5d50] py-3 text-white font-semibold"
              onClick={() => setShowModal(false)}
            >
              我知道啦，继续努力！
            </button>
          </div>
        </div>
      )}
    </>
  )
}

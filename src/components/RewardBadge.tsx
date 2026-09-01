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
        className={`flex cursor-pointer items-center justify-between gap-2 rounded-2xl bg-linear-to-r from-[#fef7ee] to-[#f0f7f4] p-2.5 sm:p-3.5 shadow-2xs border border-[#e8dfcf] transition-all hover:shadow-xs ${className}`}
        onClick={() => setShowModal(true)}
      >
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-xl bg-[#fef3c7] text-lg sm:text-xl shadow-inner">
            ⭐
          </div>
          <div>
            <div className="flex items-center gap-1 font-bold text-xs sm:text-sm text-[#2f5d50]">
              <span>{stats.stars}</span>
              <span className="text-[10px] font-normal text-[#66756c]">星</span>
              <span className="text-[#c8c0ae]">·</span>
              <span className="text-[#b45309]">连续 {stats.streakDays} 天</span>
              <span className="text-[#c8c0ae]">·</span>
              <span className="text-[#166534]">掌握 {stats.masteredCount} 题</span>
            </div>
            <p className="text-[11px] text-[#8c9c93]">点击查看荣誉馆与徽章 →</p>
          </div>
        </div>

        <div className="hidden sm:flex shrink-0 items-center gap-1">
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
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#f0ece1] pb-2.5">
              <h3 className="text-base sm:text-lg font-bold text-[#243026]">🏆 我的学习荣誉馆</h3>
              <button
                type="button"
                className="text-[#8c9c93] hover:text-[#243026] text-lg px-1"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="mt-3.5 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-xl bg-[#fef3c7]/70 p-2">
                <span className="text-xl">🌟</span>
                <p className="mt-0.5 text-[11px] text-[#854d0e]">星星总数</p>
                <p className="text-base font-bold text-[#b45309]">{stats.stars}</p>
              </div>
              <div className="rounded-xl bg-[#fee2e2]/70 p-2">
                <span className="text-xl">🔥</span>
                <p className="mt-0.5 text-[11px] text-[#991b1b]">连续打卡</p>
                <p className="text-base font-bold text-[#b91c1c]">{stats.streakDays} 天</p>
              </div>
              <div className="rounded-xl bg-[#dcfce7]/70 p-2">
                <span className="text-xl">🛡️</span>
                <p className="mt-0.5 text-[11px] text-[#166534]">已掌握错题</p>
                <p className="text-base font-bold text-[#15803d]">{stats.masteredCount} 道</p>
              </div>
            </div>

            <div className="mt-3">
              <h4 className="text-xs font-bold text-[#4a5850]">已解锁徽章：</h4>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {stats.badges.map((b) => (
                  <span
                    key={b}
                    className="inline-flex items-center rounded-lg bg-[#2f5d50]/10 px-2 py-1 text-[11px] font-semibold text-[#2f5d50]"
                  >
                    {b}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-[#fbfaf5] p-3 text-xs leading-relaxed text-[#66756c] border border-[#eee7d8]">
              <strong className="text-[#243026]">💡 怎么获得更多小星星？</strong>
              <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px]">
                <li>每日打开助手打卡：+1 🌟</li>
                <li>把错题复习并标记为“已掌握”：+2 🌟</li>
                <li>完成“举一反三”变式题练习：+2 🌟</li>
              </ul>
            </div>

            <button
              type="button"
              className="mt-4 w-full rounded-xl bg-[#2f5d50] py-2.5 text-xs sm:text-sm text-white font-bold"
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

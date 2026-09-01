import { useEffect, useState } from 'react'
import { generateVariantQuestions } from '../services/aiService'
import { upsertWrongQuestion } from '../services/storageService'
import type { VariantQuestion, WrongQuestion } from '../types'
import { isSpeechSupported, speakText, stopSpeech } from '../utils/speech'
import ConfettiEffect from './ConfettiEffect'
import MathView from './MathView'

interface VariantPracticeModalProps {
  wrongQuestion: WrongQuestion
  onClose: () => void
  onMastered?: () => void
}

export default function VariantPracticeModal({
  wrongQuestion,
  onClose,
  onMastered,
}: VariantPracticeModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [variants, setVariants] = useState<VariantQuestion[]>([])
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({})
  const [revealed, setRevealed] = useState<Record<string, boolean>>({})
  const [speakingId, setSpeakingId] = useState<string | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)
  const [alreadyMastered, setAlreadyMastered] = useState(wrongQuestion.reviewStatus === '已掌握')

  useEffect(() => {
    void handleGenerate()
    return () => {
      stopSpeech()
    }
  }, [])

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const list = await generateVariantQuestions(wrongQuestion, 3)
      setVariants(list)
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成变式题失败，请检查网络或 API Key。')
    } finally {
      setLoading(false)
    }
  }

  function handleCheck(id: string) {
    setRevealed((prev) => ({ ...prev, [id]: true }))
  }

  function handleSpeech(id: string, text: string) {
    if (speakingId === id) {
      stopSpeech()
      setSpeakingId(null)
      return
    }
    const ok = speakText(text, {
      onEnd: () => setSpeakingId(null),
      onError: (err) => {
        setSpeakingId(null)
        setError(typeof err === 'string' ? err : '朗读失败，请检查手机是否静音。')
      },
    })
    if (ok) setSpeakingId(id)
  }

  function handleMarkMastered() {
    if (alreadyMastered) return
    upsertWrongQuestion({
      ...wrongQuestion,
      reviewStatus: '已掌握',
      lastReviewedAt: new Date().toISOString(),
    })
    setAlreadyMastered(true)
    setShowCelebration(true)
    onMastered?.()
  }

  return (
    <>
      <ConfettiEffect
        active={showCelebration}
        title="🎉 举一反三通关！"
        subTitle="原题已标记为已掌握，获得星星奖励"
        onFinish={() => setShowCelebration(false)}
      />

      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4"
        onClick={onClose}
      >
        <div
          className="flex max-h-[92vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-[#ece6d8] bg-[#fbfaf5] px-3.5 py-2.5 sm:px-5 sm:py-3.5">
            <div className="flex items-center gap-1.5">
              <span className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-xl bg-[#fef3c7] text-base sm:text-lg">
                🎯
              </span>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-[#243026]">举一反三 · 练同类题</h3>
                <p className="text-[11px] text-[#66756c]">
                  针对【{wrongQuestion.knowledgePoint}】生成 3 道变式题
                </p>
              </div>
            </div>
            <button
              type="button"
              className="text-[#66756c] hover:text-[#243026] text-base px-2"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {/* 错题原题速览 */}
          <div className="bg-[#f5ede1] px-3.5 py-2 border-b border-[#e5ded0] text-xs leading-5 text-[#5d4a28]">
            <strong>原题回顾：</strong>
            <MathView text={wrongQuestion.correctedText || wrongQuestion.originalText} as="span" />
            {wrongQuestion.errorCause && (
              <span className="ml-1 text-[#9a6b4a]">（易错点：{wrongQuestion.errorCause}）</span>
            )}
          </div>

          {/* 内容主体 */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-[#66756c] space-y-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2f5d50] border-t-transparent" />
                <p className="text-xs font-medium">AI 正在精心生成变式练习题，请稍候…</p>
              </div>
            ) : error ? (
              <div className="rounded-xl bg-[#fee2e2] p-3 text-xs text-[#991b1b]">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="mt-2 rounded-lg bg-[#b91c1c] px-3 py-1 text-xs font-semibold text-white"
                >
                  重新生成
                </button>
              </div>
            ) : variants.length === 0 ? (
              <div className="text-center py-8 text-xs text-[#66756c]">
                <p>点击下方按钮开始生成变式题</p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="mt-2 rounded-xl bg-[#2f5d50] px-4 py-2 text-xs font-bold text-white"
                >
                  生成 3 道同类题
                </button>
              </div>
            ) : (
              variants.map((variant, index) => {
                const isRevealed = Boolean(revealed[variant.id])
                const userAns = userAnswers[variant.id] || ''

                return (
                  <div
                    key={variant.id}
                    className="rounded-xl border border-[#e5ded0] bg-[#fbfaf5] p-3 sm:p-4 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center rounded-md bg-[#2f5d50]/10 px-2 py-0.5 text-[11px] font-bold text-[#2f5d50]">
                        第 {index + 1} 题 · {index === 0 ? '基础同型题' : index === 1 ? '情境变式题' : '微拓展题'}
                      </span>
                      {isSpeechSupported() && (
                        <button
                          type="button"
                          className="flex items-center gap-0.5 text-[11px] text-[#2f5d50] hover:underline"
                          onClick={() => handleSpeech(variant.id, `${variant.questionText}。${variant.hints.join('。')}`)}
                        >
                          {speakingId === variant.id ? '⏹️ 停止' : '🔊 读题'}
                        </button>
                      )}
                    </div>

                    <div className="text-xs sm:text-sm font-medium leading-relaxed text-[#243026]">
                      <MathView text={variant.questionText} />
                    </div>

                    {/* 答题区 */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <input
                        type="text"
                        placeholder="输入作答结果…"
                        value={userAns}
                        onChange={(e) =>
                          setUserAnswers((prev) => ({ ...prev, [variant.id]: e.target.value }))
                        }
                        className="flex-1 rounded-lg border border-[#d9d2c3] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#2f5d50]"
                      />
                      <button
                        type="button"
                        onClick={() => handleCheck(variant.id)}
                        className="rounded-lg bg-[#2f5d50] px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#254b40] shrink-0"
                      >
                        {isRevealed ? '已核对' : '核对答案'}
                      </button>
                    </div>

                    {/* 解析展开区 */}
                    {isRevealed && (
                      <div className="mt-2 rounded-lg bg-white p-2.5 border border-[#86efac] text-xs space-y-1.5">
                        <div className="flex items-center justify-between text-[#166534] font-bold">
                          <span>参考答案：</span>
                          <MathView text={variant.answer} as="span" className="text-xs" />
                        </div>
                        <div className="text-[#14532d] text-[11px]">
                          <strong>解题点拨：</strong>
                          <MathView text={variant.explanation} as="span" />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* 底部操作条 */}
          <div className="flex items-center justify-between border-t border-[#ece6d8] bg-[#fbfaf5] px-3.5 py-2.5 sm:px-5">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="text-xs text-[#66756c] hover:text-[#243026] hover:underline"
            >
              🔄 换一组题目
            </button>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleMarkMastered}
                className={`rounded-xl px-3.5 py-2 text-xs font-bold text-white shadow-2xs transition-all ${
                  alreadyMastered
                    ? 'bg-emerald-600'
                    : 'bg-[#2f5d50] hover:bg-[#254b40]'
                }`}
              >
                {alreadyMastered ? '✓ 原题已标记为掌握' : '🎉 全做对了！标记为已掌握'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

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
    stopSpeech()
    setSpeakingId(id)
    speakText(text, {
      onEnd: () => setSpeakingId(null),
      onError: () => setSpeakingId(null),
    })
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
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-3 sm:p-4"
        onClick={onClose}
      >
        <div
          className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between border-b border-[#ece6d8] bg-[#fbfaf5] px-6 py-4">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fef3c7] text-xl">
                🎯
              </span>
              <div>
                <h3 className="text-lg font-bold text-[#243026]">举一反三 · 练同类题</h3>
                <p className="text-xs text-[#66756c]">
                  针对【{wrongQuestion.knowledgePoint}】智能生成 3 道变式题
                </p>
              </div>
            </div>
            <button
              type="button"
              className="text-[#66756c] hover:text-[#243026] text-xl px-2"
              onClick={onClose}
            >
              ✕
            </button>
          </div>

          {/* 错题原题速览 */}
          <div className="bg-[#f5ede1] px-6 py-3 border-b border-[#e5ded0] text-xs leading-5 text-[#5d4a28]">
            <strong>原题回顾：</strong>
            <MathView text={wrongQuestion.correctedText || wrongQuestion.originalText} as="span" />
            {wrongQuestion.errorCause && (
              <span className="ml-2 text-[#9a6b4a]">（易错点：{wrongQuestion.errorCause}）</span>
            )}
          </div>

          {/* 内容主体 */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 text-[#66756c] space-y-3">
                <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#2f5d50] border-t-transparent" />
                <p className="text-sm font-medium">AI 正在精心生成同考点变式练习题，请稍候…</p>
              </div>
            ) : error ? (
              <div className="rounded-2xl bg-[#fee2e2] p-4 text-sm text-[#991b1b]">
                <p>{error}</p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="mt-3 rounded-xl bg-[#b91c1c] px-4 py-2 text-xs font-semibold text-white"
                >
                  重新生成
                </button>
              </div>
            ) : variants.length === 0 ? (
              <div className="text-center py-10 text-[#66756c]">
                <p>点击下方按钮开始生成变式题</p>
                <button
                  type="button"
                  onClick={handleGenerate}
                  className="mt-3 rounded-xl bg-[#2f5d50] px-5 py-2.5 text-sm font-semibold text-white"
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
                    className="rounded-2xl border border-[#e5ded0] bg-[#fbfaf5] p-4 sm:p-5 space-y-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center rounded-lg bg-[#2f5d50]/10 px-2.5 py-1 text-xs font-bold text-[#2f5d50]">
                        第 {index + 1} 题 · {index === 0 ? '基础同型题' : index === 1 ? '情境变式题' : '微拓展题'}
                      </span>
                      {isSpeechSupported() && (
                        <button
                          type="button"
                          className="flex items-center gap-1 text-xs text-[#2f5d50] hover:underline"
                          onClick={() => handleSpeech(variant.id, `${variant.questionText}。${variant.hints.join('。')}`)}
                        >
                          {speakingId === variant.id ? '⏹️ 停止朗读' : '🔊 语音读题'}
                        </button>
                      )}
                    </div>

                    <div className="text-base font-medium leading-relaxed text-[#243026]">
                      <MathView text={variant.questionText} />
                    </div>

                    {/* 答题区 */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <input
                        type="text"
                        placeholder="孩子在此输入作答结果…"
                        value={userAns}
                        onChange={(e) =>
                          setUserAnswers((prev) => ({ ...prev, [variant.id]: e.target.value }))
                        }
                        className="flex-1 rounded-xl border border-[#d9d2c3] bg-white px-3 py-2 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleCheck(variant.id)}
                        className="rounded-xl bg-[#2f5d50] px-4 py-2 text-sm font-semibold text-white hover:bg-[#23483e]"
                      >
                        {isRevealed ? '重新查看解析' : '核对答案'}
                      </button>
                    </div>

                    {/* 答案与解析展开 */}
                    {isRevealed && (
                      <div className="mt-3 rounded-xl bg-[#efe8d8]/60 p-3.5 text-xs leading-6 text-[#5d4a28] space-y-2 border border-[#ded5c2] animate-in fade-in-50 duration-200">
                        <div className="flex items-center gap-2 text-sm font-bold text-[#2f5d50]">
                          <span>参考答案：</span>
                          <MathView text={variant.answer} as="span" />
                        </div>
                        {variant.hints.length > 0 && (
                          <div>
                            <strong>思考引导：</strong>
                            <ul className="list-disc pl-4 space-y-0.5 mt-0.5">
                              {variant.hints.map((hint, i) => (
                                <li key={i}>
                                  <MathView text={hint} as="span" />
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {variant.explanation && (
                          <div>
                            <strong>解析与易错点：</strong>
                            <MathView text={variant.explanation} />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </div>

          {/* 底部操作栏 */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#ece6d8] bg-[#fbfaf5] px-6 py-4">
            <p className="text-xs text-[#66756c]">
              孩子练习搞懂后，可一键把错题标记为已掌握！
            </p>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                className="flex-1 sm:flex-initial rounded-xl bg-linear-to-r from-[#d97706] to-[#b45309] px-5 py-2.5 text-sm font-bold text-white shadow-sm hover:opacity-95"
                onClick={handleMarkMastered}
                disabled={alreadyMastered}
              >
                {alreadyMastered ? '已掌握 🌟' : '🎉 孩子全搞懂了，标记已掌握！'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

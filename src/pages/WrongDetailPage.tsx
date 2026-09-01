import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ConfettiEffect from '../components/ConfettiEffect'
import MathView from '../components/MathView'
import NoticeBanner from '../components/NoticeBanner'
import PrintSheetModal from '../components/PrintSheetModal'
import VariantPracticeModal from '../components/VariantPracticeModal'
import {
  deleteWrongQuestion,
  loadWrongQuestions,
  upsertWrongQuestion,
} from '../services/storageService'
import { parseSubjectId, SUBJECT_LABELS } from '../data/subjects'
import type { AppNotice, ReviewStatus } from '../types'
import { formatDateTime } from '../utils/format'
import { isSpeechSupported, speakText, stopSpeech } from '../utils/speech'

const statuses: ReviewStatus[] = ['未复习', '已复习', '已掌握']

export default function WrongDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const initial = useMemo(() => loadWrongQuestions().find((item) => item.id === id), [id])
  const [item, setItem] = useState(initial)
  const [notice, setNotice] = useState<AppNotice | null>(null)
  const [showVariantModal, setShowVariantModal] = useState(false)
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [showCelebration, setShowCelebration] = useState(false)

  if (!item) {
    return (
      <div className="rounded-3xl bg-white p-6 shadow-sm border border-[#ece6d8]">
        <p className="text-base text-[#4a5850]">没有找到这道错题。</p>
        <Link className="mt-4 inline-block font-semibold text-[#2f5d50] underline" to="/wrong-book">
          返回错题本
        </Link>
      </div>
    )
  }

  function handleStatus(status: ReviewStatus) {
    if (!item) return
    const next = {
      ...item,
      reviewStatus: status,
      lastReviewedAt: new Date().toISOString(),
    }
    try {
      upsertWrongQuestion(next)
      setItem(next)
      setNotice({ type: 'success', message: `复习状态已更新为“${status}”。` })
      if (status === '已掌握') {
        setShowCelebration(true)
      }
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : '更新复习状态失败。',
      })
    }
  }

  function handleSpeech() {
    if (speaking) {
      stopSpeech()
      setSpeaking(false)
      return
    }
    setSpeaking(true)
    const speechContent = `题目：${item?.correctedText || item?.originalText}。解析思路：${item?.explanation}。解题步骤：${item?.stepByStep.join('。')}`
    speakText(speechContent, {
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    })
  }

  function handleDelete() {
    if (!item) return
    if (!window.confirm('确定从错题本删除这道题吗？')) {
      return
    }
    try {
      deleteWrongQuestion(item.id)
      navigate('/wrong-book')
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : '删除失败。',
      })
    }
  }

  return (
    <div className="space-y-6">
      <ConfettiEffect
        active={showCelebration}
        title="🌟 恭喜完全掌握这道错题！"
        subTitle="获得 +2 颗智慧之星 🌟🌟"
        onFinish={() => setShowCelebration(false)}
      />

      {showVariantModal && (
        <VariantPracticeModal
          wrongQuestion={item}
          onClose={() => setShowVariantModal(false)}
          onMastered={() => {
            setItem({ ...item, reviewStatus: '已掌握' })
            setShowVariantModal(false)
          }}
        />
      )}

      {showPrintModal && (
        <PrintSheetModal questions={[item]} onClose={() => setShowPrintModal(false)} />
      )}

      <div className="flex items-center justify-between">
        <button
          className="text-sm font-semibold text-[#2f5d50] hover:underline"
          type="button"
          onClick={() => navigate('/wrong-book')}
        >
          ← 返回错题本
        </button>
        <div className="flex items-center gap-2">
          {isSpeechSupported() && (
            <button
              type="button"
              onClick={handleSpeech}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold ${
                speaking
                  ? 'bg-rose-100 text-rose-700 animate-pulse'
                  : 'bg-[#2f5d50]/10 text-[#2f5d50]'
              }`}
            >
              {speaking ? '⏹️ 停止朗读' : '🔊 朗读题目与讲解'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="rounded-xl border border-[#d9d2c3] bg-white px-3 py-1.5 text-xs font-semibold text-[#4a5850] hover:bg-[#fbfaf5]"
          >
            🖨️ 打印单题
          </button>
        </div>
      </div>

      <NoticeBanner notice={notice} />

      {/* 核心功能强调：举一反三横幅 */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-3xl bg-linear-to-r from-[#fef3c7] to-[#fde68a] p-5 shadow-xs border border-[#f59e0b]/30">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            <h3 className="text-lg font-bold text-[#92400e]">做会原题还不够？AI 举一反三练同类题！</h3>
          </div>
          <p className="mt-1 text-xs leading-5 text-[#b45309]">
            针对此题易错考点，AI 即时生成 3 道变式题，检验孩子是否真正搞懂。
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowVariantModal(true)}
          className="w-full sm:w-auto shrink-0 rounded-2xl bg-[#b45309] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#92400e]"
        >
          🚀 立即出 3 道相似题
        </button>
      </div>

      {/* 错题详情主卡片 */}
      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 border border-[#ece6d8]">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f0ece1] pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-lg bg-[#2f5d50]/10 px-2.5 py-1 text-xs font-bold text-[#2f5d50]">
              {SUBJECT_LABELS[parseSubjectId(item.subject)]} · {item.knowledgePoint}
            </span>
            <span className="text-xs text-[#66756c]">{item.textbookUnit}</span>
          </div>
          <span className="text-xs text-[#66756c]">保存于 {formatDateTime(item.savedAt)}</span>
        </div>

        {item.imageDataUrl && (
          <div className="mt-4 overflow-hidden rounded-2xl border border-[#e5ded0] bg-[#fbfaf5]">
            <img
              src={item.imageDataUrl}
              alt="错题原图"
              className="max-h-80 w-full object-contain p-2"
            />
          </div>
        )}

        <div className="mt-5 space-y-4 text-base leading-7 text-[#243026]">
          <div className="rounded-2xl bg-[#fbfaf5] p-4 border border-[#eee7d8]">
            <strong className="text-[#2f5d50] block mb-1">📝 题目：</strong>
            <MathView text={item.correctedText || item.originalText} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-rose-50/70 p-3.5 border border-rose-200/80">
              <strong className="text-rose-800 text-sm block">❌ 学生作答：</strong>
              <div className="mt-1 text-rose-900 font-medium">
                <MathView text={item.studentAnswer || '未填写'} />
              </div>
            </div>

            <div className="rounded-2xl bg-emerald-50/70 p-3.5 border border-emerald-200/80">
              <strong className="text-emerald-800 text-sm block">✅ 正确答案：</strong>
              <div className="mt-1 text-emerald-900 font-medium">
                <MathView text={item.correctAnswer || '未填写'} />
              </div>
            </div>
          </div>

          {item.errorCause && (
            <div className="rounded-2xl bg-[#fef7ee] p-3.5 border border-[#fae8c8] text-sm text-[#78350f]">
              <strong>🔍 错因剖析：</strong>
              <span>{item.errorCause}</span>
              {item.errorCauseNote && <span>（{item.errorCauseNote}）</span>}
            </div>
          )}

          {item.explanation && (
            <div className="rounded-2xl bg-[#fbfaf5] p-4 border border-[#eee7d8]">
              <strong className="text-[#2f5d50] block mb-1">💡 解题思路与易错点：</strong>
              <MathView text={item.explanation} />
            </div>
          )}

          {item.stepByStep.length > 0 && (
            <div className="rounded-2xl bg-[#fbfaf5] p-4 border border-[#eee7d8]">
              <strong className="text-[#2f5d50] block mb-1.5">📋 分步演算过程：</strong>
              <ol className="list-decimal pl-5 space-y-1 text-sm">
                {item.stepByStep.map((step) => (
                  <li key={step}>
                    <MathView text={step} as="span" />
                  </li>
                ))}
              </ol>
            </div>
          )}

          {item.notes && (
            <p className="text-sm text-[#66756c]">
              <strong>家长备忘：</strong>
              {item.notes}
            </p>
          )}
        </div>
      </section>

      {/* 复习状态与删除操作 */}
      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 border border-[#ece6d8]">
        <h3 className="text-base font-bold text-[#243026] mb-3">当前复习掌握进度</h3>
        <div className="grid grid-cols-3 gap-2">
          {statuses.map((status) => {
            const isCurrent = item.reviewStatus === status
            return (
              <button
                key={status}
                type="button"
                className={`rounded-2xl py-3 text-sm font-bold transition-all ${
                  isCurrent
                    ? status === '已掌握'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : status === '已复习'
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-[#2f5d50] text-white shadow-sm'
                    : 'border border-[#d9d2c3] bg-[#fbfaf5] text-[#66756c] hover:bg-[#f2eee4]'
                }`}
                onClick={() => handleStatus(status)}
              >
                {status} {isCurrent ? '✓' : ''}
              </button>
            )
          })}
        </div>

        {item.lastReviewedAt ? (
          <p className="mt-3 text-xs text-[#66756c]">
            最近复习时间：{formatDateTime(item.lastReviewedAt)}
          </p>
        ) : (
          <p className="mt-3 text-xs text-[#66756c]">还没有复习记录。</p>
        )}

        <div className="mt-6 pt-4 border-t border-[#f0ece1]">
          <button
            className="text-xs text-[#9a6b4a] hover:underline"
            type="button"
            onClick={handleDelete}
          >
            🗑️ 从错题本彻底删除这道题
          </button>
        </div>
      </section>
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
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

  useEffect(() => {
    return () => {
      stopSpeech()
    }
  }, [])

  if (!item) {
    return (
      <div className="rounded-2xl bg-white p-5 shadow-xs border border-[#ece6d8]">
        <p className="text-sm text-[#4a5850]">没有找到这道错题。</p>
        <Link className="mt-2 inline-block text-xs font-semibold text-[#2f5d50] underline" to="/wrong-book">
          ← 返回错题本
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
      setNotice({ type: 'success', message: `状态已更新为“${status}”。` })
      if (status === '已掌握') {
        setShowCelebration(true)
      }
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : '更新状态失败。',
      })
    }
  }

  function handleSpeech() {
    if (speaking) {
      stopSpeech()
      setSpeaking(false)
      return
    }
    if (!item) return
    const speechContent = `题目：${item.correctedText || item.originalText}。解析思路：${item.explanation}。解题步骤：${item.stepByStep.join('。')}`
    const ok = speakText(speechContent, {
      subject: item.subject,
      onEnd: () => setSpeaking(false),
      onError: (err) => {
        setSpeaking(false)
        setNotice({
          type: 'error',
          message: typeof err === 'string' ? err : '朗读失败，请检查手机是否静音。',
        })
      },
    })
    if (ok) setSpeaking(true)
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
    <div className="space-y-3 sm:space-y-4">
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

      {/* 顶部操作条 */}
      <div className="flex items-center justify-between gap-2">
        <button
          className="text-xs sm:text-sm font-bold text-[#2f5d50] hover:underline"
          type="button"
          onClick={() => navigate('/wrong-book')}
        >
          ← 返回错题本
        </button>
        <div className="flex items-center gap-1.5">
          {isSpeechSupported() && (
            <button
              type="button"
              onClick={handleSpeech}
              className={`rounded-xl px-2.5 py-1.5 text-xs font-bold ${
                speaking
                  ? 'bg-rose-100 text-rose-700 animate-pulse'
                  : 'bg-[#2f5d50]/10 text-[#2f5d50]'
              }`}
            >
              {speaking ? '⏹️ 停止' : '🔊 朗读讲解'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            className="rounded-xl border border-[#d9d2c3] bg-white px-2.5 py-1.5 text-xs font-bold text-[#4a5850]"
          >
            🖨️ 打印单题
          </button>
        </div>
      </div>

      <NoticeBanner notice={notice} />

      {/* 举一反三横幅 */}
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-linear-to-r from-[#fef3c7] to-[#fde68a] p-3 sm:p-4 shadow-xs border border-[#f59e0b]/30">
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xl">🎯</span>
            <h3 className="text-xs sm:text-sm font-bold text-[#92400e]">AI 举一反三 · 练同类题</h3>
          </div>
          <p className="mt-0.5 text-[11px] text-[#b45309]">
            生成 3 道同考点同类题，检验是否真正掌握
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowVariantModal(true)}
          className="shrink-0 rounded-xl bg-[#b45309] px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#92400e]"
        >
          🚀 立即出题
        </button>
      </div>

      {/* 错题详情主卡片 */}
      <section className="rounded-2xl bg-white p-3.5 sm:p-5 shadow-xs border border-[#ece6d8]">
        <div className="flex items-center justify-between gap-2 border-b border-[#f0ece1] pb-2">
          <div className="flex items-center gap-1.5 truncate">
            <span className="rounded-md bg-[#2f5d50]/10 px-1.5 py-0.5 text-[11px] font-bold text-[#2f5d50] shrink-0">
              {SUBJECT_LABELS[parseSubjectId(item.subject)]}
            </span>
            <span className="text-xs font-bold text-[#243026] truncate">{item.knowledgePoint}</span>
          </div>
          <span className="text-[11px] text-[#8c9c93] shrink-0">{formatDateTime(item.savedAt)}</span>
        </div>

        {item.imageDataUrl && (
          <div className="mt-2.5 overflow-hidden rounded-xl border border-[#e5ded0] bg-[#fbfaf5]">
            <img
              src={item.imageDataUrl}
              alt="错题原图"
              className="max-h-48 sm:max-h-64 w-full object-contain p-1"
            />
          </div>
        )}

        <div className="mt-3 space-y-2.5 text-xs sm:text-sm leading-relaxed text-[#243026]">
          <div className="rounded-xl bg-[#fbfaf5] p-3 border border-[#eee7d8]">
            <strong className="text-[#2f5d50] block mb-0.5 text-xs">📝 题目：</strong>
            <MathView text={item.correctedText || item.originalText} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl bg-rose-50/70 p-2.5 border border-rose-200/80">
              <strong className="text-rose-800 text-[11px] block">❌ 当时作答：</strong>
              <div className="mt-0.5 text-rose-900 font-medium">
                <MathView text={item.studentAnswer || '未填写'} />
              </div>
            </div>

            <div className="rounded-xl bg-emerald-50/70 p-2.5 border border-emerald-200/80">
              <strong className="text-emerald-800 text-[11px] block">✅ 参考答案：</strong>
              <div className="mt-0.5 text-emerald-900 font-medium">
                <MathView text={item.correctAnswer || '未填写'} />
              </div>
            </div>
          </div>

          {item.errorCause && (
            <div className="rounded-xl bg-[#fef7ee] p-2.5 border border-[#fae8c8] text-xs text-[#78350f]">
              <strong>🔍 错因分析：</strong>
              <span>{item.errorCause}</span>
              {item.errorCauseNote && <span>（{item.errorCauseNote}）</span>}
            </div>
          )}

          {item.explanation && (
            <div className="rounded-xl bg-[#fbfaf5] p-3 border border-[#eee7d8]">
              <strong className="text-[#2f5d50] block mb-0.5 text-xs">💡 考点与思路：</strong>
              <MathView text={item.explanation} />
            </div>
          )}

          {item.stepByStep.length > 0 && (
            <div className="rounded-xl bg-[#fbfaf5] p-3 border border-[#eee7d8]">
              <strong className="text-[#2f5d50] block mb-1 text-xs">📋 详细解题步骤：</strong>
              <ol className="list-decimal pl-4 space-y-0.5 text-xs">
                {item.stepByStep.map((step) => (
                  <li key={step}>
                    <MathView text={step} as="span" />
                  </li>
                ))}
              </ol>
            </div>
          )}

          {item.notes && (
            <p className="text-xs text-[#66756c]">
              <strong>家长备忘：</strong>
              {item.notes}
            </p>
          )}
        </div>
      </section>

      {/* 复习状态切换 */}
      <section className="rounded-2xl bg-white p-3.5 sm:p-5 shadow-xs border border-[#ece6d8]">
        <h3 className="text-xs sm:text-sm font-bold text-[#243026] mb-2">当前掌握状态</h3>
        <div className="grid grid-cols-3 gap-1.5">
          {statuses.map((status) => {
            const isCurrent = item.reviewStatus === status
            return (
              <button
                key={status}
                type="button"
                className={`rounded-xl py-2 text-xs sm:text-sm font-bold transition-all ${
                  isCurrent
                    ? status === '已掌握'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : status === '已复习'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-[#2f5d50] text-white shadow-xs'
                    : 'border border-[#d9d2c3] bg-[#fbfaf5] text-[#66756c]'
                }`}
                onClick={() => handleStatus(status)}
              >
                {status} {isCurrent ? '✓' : ''}
              </button>
            )
          })}
        </div>

        <div className="mt-3 pt-2.5 border-t border-[#f0ece1] flex items-center justify-between">
          <span className="text-[11px] text-[#8c9c93]">
            {item.lastReviewedAt ? `最近复习：${formatDateTime(item.lastReviewedAt)}` : '未复习'}
          </span>
          <button
            className="text-[11px] text-[#9a6b4a] hover:underline"
            type="button"
            onClick={handleDelete}
          >
            🗑️ 删除此错题
          </button>
        </div>
      </section>
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import MathView from '../components/MathView'
import PrintSheetModal from '../components/PrintSheetModal'
import VariantPracticeModal from '../components/VariantPracticeModal'
import { getKnowledgePointNames } from '../data/knowledge'
import { parseSubjectId, SUBJECT_IDS, SUBJECT_LABELS } from '../data/subjects'
import { loadWrongQuestions } from '../services/storageService'
import type { ReviewStatus, SubjectId, WrongQuestion } from '../types'
import { formatDateTime } from '../utils/format'

const statuses: Array<ReviewStatus | '全部'> = ['全部', '未复习', '已复习', '已掌握']

export default function WrongBookPage() {
  const [keyword, setKeyword] = useState('')
  const [subjectFilter, setSubjectFilter] = useState<SubjectId | '全部'>('全部')
  const [knowledge, setKnowledge] = useState('全部')
  const [status, setStatus] = useState<ReviewStatus | '全部'>('全部')
  const [showPrintModal, setShowPrintModal] = useState(false)
  const [selectedVariantQuestion, setSelectedVariantQuestion] = useState<WrongQuestion | null>(null)

  const items = loadWrongQuestions()
  const scopedItems = useMemo(
    () => items.filter((item) => (subjectFilter === '全部' ? true : parseSubjectId(item.subject) === subjectFilter)),
    [items, subjectFilter],
  )

  const unmasteredCount = useMemo(() => {
    return items.filter((item) => item.reviewStatus !== '已掌握').length
  }, [items])

  const knowledgeNames = useMemo(() => {
    if (subjectFilter === '全部') {
      return Array.from(new Set(items.flatMap((item) => [item.knowledgePoint, ...item.knowledgePoints]))).filter(Boolean)
    }
    return getKnowledgePointNames(subjectFilter)
  }, [items, subjectFilter])

  const filtered = useMemo(() => {
    return items
      .slice()
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      .filter((item) => (subjectFilter === '全部' ? true : parseSubjectId(item.subject) === subjectFilter))
      .filter((item) =>
        knowledge === '全部'
          ? true
          : item.knowledgePoint === knowledge || item.knowledgePoints.includes(knowledge),
      )
      .filter((item) => (status === '全部' ? true : item.reviewStatus === status))
      .filter((item) => {
        const hay = `${item.correctedText} ${item.originalText} ${item.studentAnswer} ${item.correctAnswer} ${item.notes}`
        return hay.toLowerCase().includes(keyword.trim().toLowerCase())
      })
  }, [items, keyword, knowledge, status, subjectFilter])

  return (
    <div className="space-y-3 sm:space-y-4">
      {showPrintModal && (
        <PrintSheetModal
          questions={filtered.length > 0 ? filtered : items}
          onClose={() => setShowPrintModal(false)}
        />
      )}

      {selectedVariantQuestion && (
        <VariantPracticeModal
          wrongQuestion={selectedVariantQuestion}
          onClose={() => setSelectedVariantQuestion(null)}
          onMastered={() => setSelectedVariantQuestion(null)}
        />
      )}

      {/* 头部与工具栏 */}
      <section className="rounded-2xl bg-white p-3.5 sm:p-5 shadow-xs border border-[#ece6d8]">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#243026]">📕 错题本</h2>
            <p className="mt-0.5 text-xs text-[#66756c]">
              共 {items.length} 题 · 待复习 {unmasteredCount} 题
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            disabled={items.length === 0}
            className="flex items-center gap-1 rounded-xl bg-[#2f5d50] px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#254b40] disabled:opacity-50 shrink-0"
          >
            <span>🖨️ A4 打印卷</span>
          </button>
        </div>

        {/* 学科切换水平滚动条 */}
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-[#f0ece1] pt-2.5">
          {(['全部', ...SUBJECT_IDS] as const).map((id) => {
            const count =
              id === '全部' ? items.length : items.filter((item) => parseSubjectId(item.subject) === id).length
            const isActive = subjectFilter === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSubjectFilter(id)
                  setKnowledge('全部')
                }}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#2f5d50] text-white shadow-xs'
                    : 'bg-[#fbfaf5] border border-[#e0d9cb] text-[#66756c]'
                }`}
              >
                {id === '全部' ? '全部' : SUBJECT_LABELS[id]} ({count})
              </button>
            )
          })}
        </div>

        {/* 状态切换水平滚动条 */}
        <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {statuses.map((s) => {
            const count =
              s === '全部' ? scopedItems.length : scopedItems.filter((i) => i.reviewStatus === s).length
            const isActive = status === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-[#2f5d50] text-white shadow-xs'
                    : 'bg-[#fbfaf5] border border-[#e0d9cb] text-[#66756c]'
                }`}
              >
                {s} ({count})
              </button>
            )
          })}
        </div>

        {/* 紧凑搜索与知识点下拉 */}
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <input
            className="w-full rounded-xl border border-[#d9d2c3] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#2f5d50]"
            placeholder="搜索关键词/题目…"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <select
            className="w-full rounded-xl border border-[#d9d2c3] bg-white px-2 py-1.5 text-xs outline-none focus:border-[#2f5d50]"
            value={knowledge}
            onChange={(event) => setKnowledge(event.target.value)}
          >
            <option value="全部">全部考点 ({scopedItems.length})</option>
            {knowledgeNames.map((name) => {
              const count = items.filter(
                (i) => i.knowledgePoint === name || i.knowledgePoints.includes(name),
              ).length
              return (
                <option key={name} value={name}>
                  {name} ({count})
                </option>
              )
            })}
          </select>
        </div>
      </section>

      {/* 错题卡片列表 */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-[#66756c] shadow-xs border border-[#ece6d8]">
          <span className="text-3xl">🎉</span>
          <p className="mt-2 text-sm font-semibold">还没有符合条件的错题</p>
          <p className="mt-0.5 text-xs text-[#8c9c93]">拍照识别错题后会自动收录到这里。</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl bg-white p-3.5 sm:p-4 shadow-xs border border-[#ece6d8] transition-all hover:shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 border-b border-[#f5f1e8] pb-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="rounded-md bg-[#2f5d50]/10 px-1.5 py-0.5 text-[11px] font-bold text-[#2f5d50] shrink-0">
                    {SUBJECT_LABELS[parseSubjectId(item.subject)]}
                  </span>
                  <span className="text-xs font-bold text-[#243026] truncate">
                    {item.knowledgePoint}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-xs shrink-0">
                  <span
                    className={`rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                      item.reviewStatus === '已掌握'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.reviewStatus === '已复习'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.reviewStatus}
                  </span>
                  <span className="text-[10px] text-[#a8a29e] hidden sm:inline">{formatDateTime(item.savedAt)}</span>
                </div>
              </div>

              {/* 题目内容 */}
              <div className="mt-2 text-xs sm:text-sm leading-relaxed text-[#243026]">
                <MathView text={item.correctedText || item.originalText} />
              </div>

              {/* 作答与答案对比 */}
              <div className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-[#fbfaf5] p-2 text-xs border border-[#eee7d8]">
                <div>
                  <span className="text-[#991b1b] font-medium block text-[11px]">当时作答：</span>
                  <MathView text={item.studentAnswer || '未填写'} as="span" />
                </div>
                <div>
                  <span className="text-[#166534] font-medium block text-[11px]">参考答案：</span>
                  <MathView text={item.correctAnswer || '无'} as="span" />
                </div>
              </div>

              {item.errorCause && (
                <p className="mt-1.5 text-[11px] text-[#9a6b4a]">
                  <strong>错因分析：</strong>
                  {item.errorCause} {item.errorCauseNote ? `(${item.errorCauseNote})` : ''}
                </p>
              )}

              {/* 卡片底部操作按钮 */}
              <div className="mt-2.5 flex items-center justify-between border-t border-[#f5f1e8] pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedVariantQuestion(item)}
                  className="inline-flex items-center gap-1 rounded-xl bg-[#fef3c7] px-2.5 py-1 text-xs font-bold text-[#b45309] hover:bg-[#fde68a]"
                >
                  🎯 练同类题
                </button>
                <Link
                  to={`/wrong-book/${item.id}`}
                  className="rounded-xl border border-[#d9d2c3] px-3 py-1 text-xs font-semibold text-[#2f5d50] hover:bg-[#fbfaf5]"
                >
                  查看详情 & 讲解 →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Field, { inputClass } from '../components/Field'
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
    <div className="space-y-6">
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

      {/* 头部与核心工具栏 */}
      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 border border-[#ece6d8]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-[#243026]">📕 错题本</h2>
            <p className="mt-1 text-xs text-[#66756c]">
              共收集 {items.length} 道错题 · 其中 {unmasteredCount} 道待巩固复习
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowPrintModal(true)}
            disabled={items.length === 0}
            className="flex items-center justify-center gap-2 rounded-2xl bg-[#2f5d50] px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-[#254b40] disabled:opacity-50"
          >
            <span>🖨️ 生成 A4 错题重做卷</span>
          </button>
        </div>

        {/* 快速状态筛选 Chips */}
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-[#f0ece1] pt-4">
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
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#2f5d50] text-white shadow-xs'
                    : 'bg-[#fbfaf5] border border-[#e0d9cb] text-[#66756c] hover:bg-[#f5ede1]'
                }`}
              >
                {id === '全部' ? '全部学科' : SUBJECT_LABELS[id]} ({count})
              </button>
            )
          })}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {statuses.map((s) => {
            const count =
              s === '全部' ? scopedItems.length : scopedItems.filter((i) => i.reviewStatus === s).length
            const isActive = status === s
            return (
              <button
                key={s}
                type="button"
                onClick={() => setStatus(s)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-[#2f5d50] text-white shadow-xs'
                    : 'bg-[#fbfaf5] border border-[#e0d9cb] text-[#66756c] hover:bg-[#f5ede1]'
                }`}
              >
                {s} ({count})
              </button>
            )
          })}
        </div>

        {/* 搜索与知识点过滤 */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Field label="搜索题目">
            <input
              className={inputClass}
              placeholder="输入关键词、题目或知识点…"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
            />
          </Field>
          <Field label="知识点筛选">
            <select
              className={inputClass}
              value={knowledge}
              onChange={(event) => setKnowledge(event.target.value)}
            >
              <option value="全部">全部知识点 ({scopedItems.length})</option>
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
          </Field>
        </div>
      </section>

      {/* 错题卡片列表 */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white p-12 text-center text-[#66756c] shadow-sm border border-[#ece6d8]">
          <span className="text-4xl">🎉</span>
          <p className="mt-3 text-base font-medium">还没有符合条件的错题</p>
          <p className="mt-1 text-xs text-[#8c9c93]">拍照识别错题后会自动收录到这里。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="rounded-3xl bg-white p-5 shadow-sm border border-[#ece6d8] transition-all hover:shadow-md"
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#f5f1e8] pb-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-[#2f5d50]/10 px-2.5 py-1 text-xs font-bold text-[#2f5d50]">
                    {SUBJECT_LABELS[parseSubjectId(item.subject)]} · {item.knowledgePoint}
                  </span>
                  <span className="text-xs text-[#8c9c93]">{item.textbookUnit}</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span
                    className={`rounded-lg px-2.5 py-0.5 font-bold ${
                      item.reviewStatus === '已掌握'
                        ? 'bg-emerald-100 text-emerald-800'
                        : item.reviewStatus === '已复习'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {item.reviewStatus}
                  </span>
                  <span className="text-[#8c9c93]">{formatDateTime(item.savedAt)}</span>
                </div>
              </div>

              {/* 题目内容 */}
              <Link to={`/wrong-book/${item.id}`} className="block mt-3 group">
                <div className="text-base font-normal leading-relaxed text-[#243026] group-hover:text-[#2f5d50]">
                  <MathView text={item.correctedText || item.originalText} />
                </div>
              </Link>

              {/* 错因与快捷操作 */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-[#f5f1e8] pt-3">
                <div className="text-xs text-[#9a6b4a]">
                  {item.errorCause ? (
                    <span>
                      错因：<strong>{item.errorCause}</strong>
                      {item.errorCauseNote ? ` (${item.errorCauseNote})` : ''}
                    </span>
                  ) : (
                    <span className="text-[#8c9c93]">未标记错因</span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedVariantQuestion(item)}
                    className="rounded-xl bg-[#fef3c7] px-3 py-1.5 text-xs font-bold text-[#b45309] hover:bg-[#fde68a]"
                  >
                    🎯 练同类题
                  </button>
                  <Link
                    to={`/wrong-book/${item.id}`}
                    className="rounded-xl border border-[#d9d2c3] bg-white px-3 py-1.5 text-xs font-semibold text-[#4a5850] hover:bg-[#fbfaf5]"
                  >
                    查看详情 →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

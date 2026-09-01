import { useMemo, useState } from 'react'
import MathView from '../components/MathView'
import { parseSubjectId, SUBJECT_IDS, SUBJECT_LABELS } from '../data/subjects'
import { deleteRecord, loadRecords, loadWrongQuestions } from '../services/storageService'
import type { SubjectId } from '../types'
import { daysAgo, formatDateTime, formatPercent } from '../utils/format'

const DECIDED = new Set(['正确', '错误', '部分正确'])

export default function RecordsPage() {
  const [subjectFilter, setSubjectFilter] = useState<SubjectId | '全部'>('全部')
  const [records, setRecords] = useState(() =>
    loadRecords().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
  )
  const allWrong = loadWrongQuestions().slice().sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  const visibleRecords = useMemo(
    () => records.filter((item) => (subjectFilter === '全部' ? true : parseSubjectId(item.subject) === subjectFilter)),
    [records, subjectFilter],
  )
  const wrongQuestions = useMemo(
    () => allWrong.filter((item) => (subjectFilter === '全部' ? true : parseSubjectId(item.subject) === subjectFilter)),
    [allWrong, subjectFilter],
  )
  const total = visibleRecords.length
  const decided = visibleRecords.filter((item) => DECIDED.has(item.judgement))
  const correct = visibleRecords.filter((item) => item.judgement === '正确').length
  const rate = decided.length === 0 ? 0 : correct / decided.length
  const recent7 = visibleRecords.filter((item) => new Date(item.createdAt) >= daysAgo(7)).length
  const pendingReview = wrongQuestions.filter((item) => item.reviewStatus !== '已掌握').length

  const knowledgeWrong = new Map<string, number>()
  for (const item of wrongQuestions) {
    knowledgeWrong.set(item.knowledgePoint, (knowledgeWrong.get(item.knowledgePoint) ?? 0) + 1)
  }

  function handleDelete(id: string) {
    if (!window.confirm('确定删除这条学习记录吗？')) return
    deleteRecord(id)
    setRecords(loadRecords().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(['全部', ...SUBJECT_IDS] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubjectFilter(id)}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              subjectFilter === id
                ? 'bg-[#2f5d50] text-white shadow-xs'
                : 'bg-white border border-[#e0d9cb] text-[#66756c] hover:bg-[#f5ede1]'
            }`}
          >
            {id === '全部' ? '全部学科' : SUBJECT_LABELS[id]}
          </button>
        ))}
      </div>

      {/* 核心指标看板 */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 [&>*]:min-w-0">
        <Stat label="总做题数" value={String(total)} sub="累计批改" />
        <Stat label="正确率" value={formatPercent(rate)} color="text-emerald-700" sub={`正确 ${correct} / 已判 ${decided.length}`} />
        <Stat label="待复习错题" value={String(pendingReview)} color="text-amber-700" sub="未掌握" />
        <Stat label="近 7 天做题" value={String(recent7)} color="text-[#2f5d50]" sub="本周学习热度" />
      </section>

      {/* 错题分布薄弱点诊断 */}
      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 border border-[#ece6d8]">
        <h2 className="text-lg font-bold text-[#243026]">🎯 单元知识点薄弱分布</h2>
        <p className="mt-1 text-xs text-[#66756c]">根据错题归类，直观查看孩子的薄弱考点：</p>
        {knowledgeWrong.size === 0 ? (
          <p className="mt-4 text-sm text-[#8c9c93]">太棒了！目前错题本中没有错题堆积。</p>
        ) : (
          <div className="mt-4 space-y-2.5">
            {[...knowledgeWrong.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([name, count]) => {
                const percent = Math.min(100, (count / wrongQuestions.length) * 100)
                return (
                  <div key={name} className="rounded-2xl bg-[#fbfaf5] p-3.5 border border-[#eee7d8]">
                    <div className="flex justify-between text-sm font-semibold text-[#243026]">
                      <span>{name}</span>
                      <span className="text-[#b45309]">{count} 道错题</span>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[#e8e2d4]">
                      <div
                        className="h-full bg-linear-to-r from-[#d97706] to-[#b45309] rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                )
              })}
          </div>
        )}
      </section>

      {/* 全部历史记录列表 */}
      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 border border-[#ece6d8]">
        <h2 className="text-lg font-bold text-[#243026]">📋 全部批改记录</h2>
        {visibleRecords.length === 0 ? (
          <p className="mt-4 text-sm text-[#8c9c93]">还没有处理过题目。</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {visibleRecords.map((item) => {
              const isCorrect = item.judgement === '正确'
              const isWrong = item.judgement === '错误' || item.judgement === '部分正确'

              return (
                <li
                  key={item.id}
                  className="rounded-2xl bg-[#fbfaf5] p-4 border border-[#eee7d8] transition-all hover:border-[#d9d2c3]"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2 text-xs text-[#66756c]">
                    <span>{formatDateTime(item.createdAt)}</span>
                    <span
                      className={`font-bold px-2 py-0.5 rounded-md ${
                        isCorrect
                          ? 'bg-emerald-100 text-emerald-800'
                          : isWrong
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.judgement}
                      {item.savedAsWrong ? ' · 已入错题本' : ''}
                    </span>
                  </div>
                  <div className="mt-2 text-sm leading-relaxed text-[#243026]">
                    <span className="font-semibold text-[#2f5d50] mr-1">
                      [{SUBJECT_LABELS[parseSubjectId(item.subject)]} · {item.questionType} · {item.knowledgePoint}]
                    </span>
                    <MathView text={item.questionText} as="span" />
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      className="text-xs text-[#9a6b4a] hover:underline"
                      type="button"
                      onClick={() => handleDelete(item.id)}
                    >
                      删除记录
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  color = 'text-[#243026]',
  sub,
}: {
  label: string
  value: string
  color?: string
  sub?: string
}) {
  return (
    <div className="rounded-3xl bg-white p-4 shadow-sm sm:p-5 border border-[#ece6d8]">
      <p className="text-xs font-semibold text-[#66756c]">{label}</p>
      <p className={`mt-2 text-2xl font-bold sm:text-3xl ${color}`}>{value}</p>
      {sub ? <p className="mt-1 text-xs text-[#8c9c93]">{sub}</p> : null}
    </div>
  )
}

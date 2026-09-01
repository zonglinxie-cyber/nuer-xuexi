import { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import MathView from '../components/MathView'
import { parseSubjectId, SUBJECT_IDS, SUBJECT_LABELS } from '../data/subjects'
import { deleteRecord, loadRecords, loadWrongQuestions } from '../services/storageService'
import type { SubjectId } from '../types'
import { daysAgo, formatDateTime, formatPercent } from '../utils/format'

const DECIDED = new Set(['正确', '错误', '部分正确'])
const COLORS = ['#e63946', '#f4a261', '#e9c46a', '#2a9d8f', '#264653', '#8b5cf6', '#d946ef', '#0ea5e9']

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
  const errorCauses = new Map<string, number>()
  for (const item of wrongQuestions) {
    knowledgeWrong.set(item.knowledgePoint, (knowledgeWrong.get(item.knowledgePoint) ?? 0) + 1)
    if (item.errorCause) {
      errorCauses.set(item.errorCause, (errorCauses.get(item.errorCause) ?? 0) + 1)
    }
  }

  const errorCauseData = [...errorCauses.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => ({ name, value }))

  function handleDelete(id: string) {
    if (!window.confirm('确定删除这条学习记录吗？')) return
    deleteRecord(id)
    setRecords(loadRecords().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 学科切换水平滚动条 */}
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {(['全部', ...SUBJECT_IDS] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setSubjectFilter(id)}
            className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
              subjectFilter === id
                ? 'bg-[#2f5d50] text-white shadow-xs'
                : 'bg-white border border-[#e0d9cb] text-[#66756c]'
            }`}
          >
            {id === '全部' ? '全部学科' : SUBJECT_LABELS[id]}
          </button>
        ))}
      </div>

      {/* 核心指标看板 2x2 网格 */}
      <section className="grid grid-cols-2 gap-2 sm:grid-cols-4 [&>*]:min-w-0">
        <Stat label="总批改数" value={String(total)} sub="累计题目" />
        <Stat label="正确率" value={formatPercent(rate)} color="text-emerald-700" sub={`正确 ${correct} / ${decided.length}`} />
        <Stat label="待复习错题" value={String(pendingReview)} color="text-amber-700" sub="未掌握" />
        <Stat label="近 7 天做题" value={String(recent7)} color="text-[#2f5d50]" sub="本周热度" />
      </section>

      {/* 错题分布薄弱点诊断 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        {/* 薄弱点分布 (进度条) */}
        <section className="rounded-2xl bg-white p-3.5 sm:p-5 shadow-xs border border-[#ece6d8]">
          <h2 className="text-xs sm:text-sm font-bold text-[#243026]">🎯 知识点薄弱分布</h2>
          <p className="mt-0.5 text-[11px] text-[#66756c]">根据错题归类直观查看薄弱考点：</p>
          {knowledgeWrong.size === 0 ? (
            <p className="mt-2 text-xs text-[#8c9c93]">太棒了！目前错题本中没有错题堆积。</p>
          ) : (
            <div className="mt-2 space-y-2">
              {[...knowledgeWrong.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => {
                  const percent = Math.min(100, (count / wrongQuestions.length) * 100)
                  return (
                    <div key={name} className="rounded-xl bg-[#fbfaf5] p-2.5 border border-[#eee7d8]">
                      <div className="flex justify-between text-xs font-semibold text-[#243026]">
                        <span>{name}</span>
                        <span className="text-[#b45309]">{count} 道错题</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#e8e2d4]">
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

        {/* 错因分析饼图 */}
        <section className="rounded-2xl bg-white p-3.5 sm:p-5 shadow-xs border border-[#ece6d8] flex flex-col">
          <h2 className="text-xs sm:text-sm font-bold text-[#243026]">🔍 错因归类分析</h2>
          <p className="mt-0.5 text-[11px] text-[#66756c]">统计为什么会做错，对症下药：</p>
          <div className="mt-2 flex-1 min-h-[200px] flex items-center justify-center">
            {errorCauseData.length === 0 ? (
              <p className="text-xs text-[#8c9c93]">暂无错因数据</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={errorCauseData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {errorCauseData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    itemStyle={{ color: '#243026', fontWeight: 'bold' }}
                  />
                  <Legend 
                    layout="horizontal" 
                    verticalAlign="bottom" 
                    align="center"
                    wrapperStyle={{ fontSize: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>
      </div>

      {/* 全部历史记录列表 */}
      <section className="rounded-2xl bg-white p-3.5 sm:p-5 shadow-xs border border-[#ece6d8]">
        <h2 className="text-xs sm:text-sm font-bold text-[#243026] mb-2">📋 批改明细（{visibleRecords.length}）</h2>
        {visibleRecords.length === 0 ? (
          <p className="text-xs text-[#66756c] py-4 text-center">还没有学习记录。请到拍照页开始批改。</p>
        ) : (
          <div className="space-y-2">
            {visibleRecords.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-[#ece6d8] bg-[#fbfaf5] p-2.5 text-xs text-[#243026] transition-all hover:bg-white"
              >
                <div className="flex items-center justify-between gap-1.5 border-b border-[#eee7d8] pb-1.5">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="rounded bg-[#2f5d50]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#2f5d50] shrink-0">
                      {SUBJECT_LABELS[parseSubjectId(item.subject)]}
                    </span>
                    <span className="font-bold truncate">{item.knowledgePoint}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        item.judgement === '正确'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.judgement === '错误'
                            ? 'bg-rose-100 text-rose-800'
                            : item.judgement === '部分正确'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {item.judgement}
                    </span>
                    {item.savedAsWrong && (
                      <span className="rounded bg-[#efe8d8] px-1 py-0.5 text-[10px] text-[#5d4a28]">
                        错题本
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-[#4a5850]">
                  <MathView text={item.questionText} />
                </div>

                <div className="mt-1.5 flex items-center justify-between border-t border-[#eee7d8] pt-1.5 text-[11px] text-[#8c9c93]">
                  <span>{formatDateTime(item.createdAt)}</span>
                  <button
                    className="text-[#9a6b4a] hover:underline"
                    type="button"
                    onClick={() => handleDelete(item.id)}
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  color = 'text-[#243026]',
}: {
  label: string
  value: string
  sub?: string
  color?: string
}) {
  return (
    <div className="rounded-xl border border-[#ece6d8] bg-white p-2.5 sm:p-3.5 shadow-2xs">
      <p className="text-[11px] text-[#66756c] truncate">{label}</p>
      <p className={`mt-0.5 text-base sm:text-xl font-bold truncate ${color}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-[#8c9c93] truncate">{sub}</p>}
    </div>
  )
}

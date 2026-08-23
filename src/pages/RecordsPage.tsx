import { useState } from 'react'
import { Link } from 'react-router-dom'
import { deleteRecord, loadRecords, loadWrongQuestions } from '../services/storageService'
import { daysAgo, formatDateTime, formatPercent } from '../utils/format'

const DECIDED = new Set(['正确', '错误', '部分正确'])

export default function RecordsPage() {
  const [records, setRecords] = useState(() => loadRecords().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  const wrongQuestions = loadWrongQuestions().slice().sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  const total = records.length
  const decided = records.filter((item) => DECIDED.has(item.judgement))
  const correct = records.filter((item) => item.judgement === '正确').length
  const wrong = records.filter((item) => item.judgement === '错误' || item.judgement === '部分正确').length
  const pending = records.filter((item) => item.judgement === '无法判断' || item.judgement === '需家长确认').length
  const rate = decided.length === 0 ? 0 : correct / decided.length
  const recent7 = records.filter((item) => new Date(item.createdAt) >= daysAgo(7)).length
  const knowledgeWrong = new Map<string, number>()
  for (const item of wrongQuestions) {
    knowledgeWrong.set(item.knowledgePoint, (knowledgeWrong.get(item.knowledgePoint) ?? 0) + 1)
  }

  function handleDelete(id: string) {
    if (!window.confirm('确定删除这条学习记录吗？不会删除错题本里的对应题目。')) return
    deleteRecord(id)
    setRecords(loadRecords().slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)))
  }

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-3">
        <Stat label="总做题数" value={String(total)} />
        <Stat label="正确数" value={String(correct)} />
        <Stat label="错误数" value={String(wrong)} />
        <Stat label="正确率" value={formatPercent(rate)} hint="只统计正确、错误、部分正确" />
        <Stat label="待确认" value={String(pending)} />
        <Stat label="最近 7 天做题" value={String(recent7)} />
        <Stat label="错题本数量" value={String(wrongQuestions.length)} />
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">各知识点错题数量</h2>
        {knowledgeWrong.size === 0 ? (
          <p className="mt-3 text-[#66756c]">还没有错题统计。</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {[...knowledgeWrong.entries()].map(([name, count]) => (
              <li key={name} className="flex justify-between rounded-xl bg-[#fbfaf5] px-4 py-3">
                <span>{name}</span>
                <strong>{count}</strong>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">最近保存的错题</h2>
        {wrongQuestions.length === 0 ? (
          <p className="mt-3 text-[#66756c]">还没有保存错题。</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {wrongQuestions.slice(0, 5).map((item) => (
              <li key={item.id}>
                <Link to={`/wrong-book/${item.id}`} className="block rounded-xl bg-[#fbfaf5] px-4 py-3">
                  <div className="flex justify-between gap-3 text-sm text-[#66756c]">
                    <span>{item.knowledgePoint}</span>
                    <span>{formatDateTime(item.savedAt)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2">{item.correctedText}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">全部学习记录</h2>
        {records.length === 0 ? (
          <p className="mt-3 text-[#66756c]">还没有处理过题目。</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {records.map((item) => (
              <li key={item.id} className="rounded-xl bg-[#fbfaf5] px-4 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2 text-sm text-[#66756c]">
                  <span>{formatDateTime(item.createdAt)}</span>
                  <span>
                    {item.judgement}
                    {item.parentConfirmed ? ' · 家长已确认' : ' · 未确认'}
                    {item.savedAsWrong ? ' · 已入错题本' : ''}
                  </span>
                </div>
                <p className="mt-1">
                  [{item.questionType} · {item.knowledgePoint}] {item.questionText}
                </p>
                <button
                  className="mt-2 text-sm text-[#9a6b4a] underline"
                  type="button"
                  onClick={() => handleDelete(item.id)}
                >
                  删除这条记录
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl bg-white px-5 py-6 shadow-sm">
      <p className="text-[#66756c]">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      {hint ? <p className="mt-2 text-sm text-[#66756c]">{hint}</p> : null}
    </div>
  )
}

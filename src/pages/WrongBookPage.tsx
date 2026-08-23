import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { KNOWLEDGE_POINT_NAMES } from '../data/knowledgePoints'
import { loadWrongQuestions } from '../services/storageService'
import type { ReviewStatus } from '../types'
import { formatDateTime } from '../utils/format'
import Field, { inputClass } from '../components/Field'

const statuses: Array<ReviewStatus | '全部'> = ['全部', '未复习', '已复习', '已掌握']

export default function WrongBookPage() {
  const [keyword, setKeyword] = useState('')
  const [knowledge, setKnowledge] = useState('全部')
  const [status, setStatus] = useState<ReviewStatus | '全部'>('全部')
  const items = loadWrongQuestions()

  const filtered = useMemo(() => {
    return items
      .slice()
      .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
      .filter((item) =>
        knowledge === '全部' ? true : item.knowledgePoint === knowledge || item.knowledgePoints.includes(knowledge),
      )
      .filter((item) => (status === '全部' ? true : item.reviewStatus === status))
      .filter((item) => {
        const hay = `${item.correctedText} ${item.originalText} ${item.studentAnswer} ${item.correctAnswer} ${item.notes}`
        return hay.toLowerCase().includes(keyword.trim().toLowerCase())
      })
  }, [items, keyword, knowledge, status])

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">错题本</h2>
        <p className="mt-2 text-base text-[#4a5850]">按保存时间倒序显示。可按知识点、复习状态筛选，也可搜索题目关键词。</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="搜索题目">
            <input className={inputClass} value={keyword} onChange={(event) => setKeyword(event.target.value)} />
          </Field>
          <Field label="知识点">
            <select className={inputClass} value={knowledge} onChange={(event) => setKnowledge(event.target.value)}>
              <option value="全部">全部</option>
              {KNOWLEDGE_POINT_NAMES.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="复习状态">
            <select
              className={inputClass}
              value={status}
              onChange={(event) => setStatus(event.target.value as ReviewStatus | '全部')}
            >
              {statuses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-6 text-[#66756c] shadow-sm">还没有符合条件的错题。</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <Link
              key={item.id}
              to={`/wrong-book/${item.id}`}
              className="block rounded-2xl bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong className="text-lg">{item.knowledgePoint}</strong>
                <span className="text-sm text-[#66756c]">
                  {item.reviewStatus} · {formatDateTime(item.savedAt)}
                </span>
              </div>
              <p className="mt-2 line-clamp-2 text-base leading-7 text-[#4a5850]">{item.correctedText}</p>
              {item.errorCause ? <p className="mt-2 text-sm text-[#9a6b4a]">错因：{item.errorCause}</p> : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

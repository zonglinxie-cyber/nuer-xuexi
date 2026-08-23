import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import NoticeBanner from '../components/NoticeBanner'
import Field, { inputClass } from '../components/Field'
import { deleteWrongQuestion, loadWrongQuestions, upsertWrongQuestion } from '../services/storageService'
import type { AppNotice, ReviewStatus } from '../types'
import { formatDateTime } from '../utils/format'

const statuses: ReviewStatus[] = ['未复习', '已复习', '已掌握']

export default function WrongDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const initial = useMemo(() => loadWrongQuestions().find((item) => item.id === id), [id])
  const [item, setItem] = useState(initial)
  const [notice, setNotice] = useState<AppNotice | null>(null)

  if (!item) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p>没有找到这道错题。</p>
        <Link className="mt-4 inline-block text-[#2f5d50] underline" to="/wrong-book">
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
      setNotice({ type: 'success', message: `复习状态已改为“${status}”。` })
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : '更新复习状态失败。',
      })
    }
  }

  function handleDelete() {
    if (!item) return
    if (!window.confirm('确定从错题本删除这道题吗？删除后可以腾出本地空间。建议先到设置页导出备份。')) {
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
      <button className="text-[#2f5d50] underline" type="button" onClick={() => navigate('/wrong-book')}>
        返回错题本
      </button>
      <NoticeBanner notice={notice} />
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">错题详情</h2>
        <p className="mt-2 text-[#4a5850]">
          {item.knowledgePoint} · {item.textbookUnit} · 保存于 {formatDateTime(item.savedAt)}
        </p>
        {item.imageDataUrl ? (
          <img src={item.imageDataUrl} alt="错题原图" className="mt-4 max-h-80 w-full rounded-xl object-contain" />
        ) : null}
        <div className="mt-4 space-y-3 text-base leading-7">
          <p>
            <strong>题目：</strong>
            {item.correctedText}
          </p>
          <p>
            <strong>学生答案：</strong>
            {item.studentAnswer || '未填写'}
          </p>
          <p>
            <strong>正确答案：</strong>
            {item.correctAnswer || '未填写'}
          </p>
          <p>
            <strong>错因：</strong>
            {item.errorCause || '未填写'}
            {item.errorCauseNote ? `（${item.errorCauseNote}）` : ''}
          </p>
          <p>
            <strong>讲解：</strong>
            {item.explanation}
          </p>
          {item.stepByStep.length > 0 ? (
            <ol className="list-decimal pl-6">
              {item.stepByStep.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ol>
          ) : null}
          {item.notes ? (
            <p>
              <strong>备注：</strong>
              {item.notes}
            </p>
          ) : null}
        </div>
      </section>
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <Field label="复习状态">
          <select
            className={inputClass}
            value={item.reviewStatus}
            onChange={(event) => handleStatus(event.target.value as ReviewStatus)}
          >
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </Field>
        {item.lastReviewedAt ? (
          <p className="mt-3 text-sm text-[#66756c]">最近复习：{formatDateTime(item.lastReviewedAt)}</p>
        ) : (
          <p className="mt-3 text-sm text-[#66756c]">还没有复习记录。</p>
        )}
        <button
          className="mt-5 rounded-xl border border-[#9a6b4a] px-5 py-3 text-[#9a6b4a]"
          type="button"
          onClick={handleDelete}
        >
          删除这道错题
        </button>
      </section>
    </div>
  )
}

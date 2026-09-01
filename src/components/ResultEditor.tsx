import { getKnowledgePoints } from '../data/knowledge'
import { getErrorCauses } from '../data/subjects'
import type { ErrorCause, RecognitionResult, SubjectId } from '../types'
import Field, { inputClass } from './Field'
import MathView from './MathView'

const judgements: { label: RecognitionResult['is_correct']; color: string }[] = [
  { label: '正确', color: 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' },
  { label: '错误', color: 'bg-rose-50 text-rose-700 border-rose-300 hover:bg-rose-100' },
  { label: '部分正确', color: 'bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100' },
  { label: '需家长确认', color: 'bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100' },
]

export default function ResultEditor({
  result,
  onChange,
  errorCause,
  errorCauseNote,
  notes,
  needReview,
  onMetaChange,
  subject,
}: {
  result: RecognitionResult
  onChange: (next: RecognitionResult) => void
  errorCause: ErrorCause | ''
  errorCauseNote: string
  notes: string
  needReview: boolean
  onMetaChange: (patch: {
    errorCause?: ErrorCause | ''
    errorCauseNote?: string
    notes?: string
    needReview?: boolean
  }) => void
  subject: SubjectId
}) {
  const isWrongOrPartial =
    result.is_correct === '错误' || result.is_correct === '部分正确' || needReview
  const knowledgePoints = getKnowledgePoints(subject)
  const errorCauses = getErrorCauses(subject)
  const showLatex = subject === 'math'

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-[#4a5850] mb-1.5">
          对错判断（点击快速切换）
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {judgements.map((item) => {
            const isSelected = result.is_correct === item.label
            return (
              <button
                key={item.label}
                type="button"
                className={`rounded-xl border py-2.5 px-3 text-sm font-bold transition-all ${item.color} ${
                  isSelected
                    ? 'ring-2 ring-offset-1 ring-[#2f5d50] shadow-xs'
                    : 'opacity-70 border-dashed'
                }`}
                onClick={() => onChange({ ...result, is_correct: item.label })}
              >
                {isSelected ? '✓ ' : ''}
                {item.label}
              </button>
            )
          })}
        </div>
      </div>

      <Field label={showLatex ? '识别出的题目（支持 LaTeX 公式 $...$）' : '识别出的题目（请先核对文字）'}>
        <textarea
          className={`${inputClass} min-h-24 font-mono text-sm`}
          value={result.recognized_text}
          onChange={(event) => onChange({ ...result, recognized_text: event.target.value })}
        />
        {result.recognized_text && (
          <div className="mt-2 rounded-xl bg-[#fbfaf5] p-3 text-sm border border-[#e8dfcf]">
            <span className="text-xs font-bold text-[#2f5d50] block mb-1">
              {showLatex ? '公式排版预览：' : '题目预览：'}
            </span>
            <MathView text={result.recognized_text} />
          </div>
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="学生答案（可修改）">
          <input
            className={inputClass}
            value={result.student_answer}
            onChange={(event) => onChange({ ...result, student_answer: event.target.value })}
          />
        </Field>
        <Field label="参考答案（可修改）">
          <input
            className={inputClass}
            value={result.ai_answer}
            onChange={(event) => onChange({ ...result, ai_answer: event.target.value })}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="知识点归类">
          <select
            className={inputClass}
            value={result.knowledge_point}
            onChange={(event) =>
              onChange({
                ...result,
                knowledge_point: event.target.value,
                knowledge_points: [event.target.value],
                textbook_unit:
                  knowledgePoints.find((item) => item.name === event.target.value)?.unit ||
                  result.textbook_unit,
              })
            }
          >
            {knowledgePoints.some((item) => item.name === result.knowledge_point) ? null : (
              <option value={result.knowledge_point}>{result.knowledge_point}（待确认）</option>
            )}
            {knowledgePoints.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}（{item.unit}）
              </option>
            ))}
          </select>
        </Field>

        <div className="flex items-center pt-6">
          <label className="flex items-center gap-2.5 text-sm font-medium text-[#4a5850] cursor-pointer">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-[#2f5d50]"
              checked={needReview}
              onChange={(event) => onMetaChange({ needReview: event.target.checked })}
            />
            <span>标记为“需重点复习”</span>
          </label>
        </div>
      </div>

      {isWrongOrPartial && (
        <div className="rounded-2xl bg-[#fef7ee] p-4 border border-[#fae8c8] space-y-3">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="错因分类（用于生成举一反三变式题）">
              <select
                className={inputClass}
                value={errorCause}
                onChange={(event) =>
                  onMetaChange({ errorCause: event.target.value as ErrorCause | '' })
                }
              >
                <option value="">请选择错因</option>
                {errorCause && !errorCauses.includes(errorCause) ? (
                  <option value={errorCause}>{errorCause}</option>
                ) : null}
                {errorCauses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="错因补充说明">
              <input
                className={inputClass}
                value={errorCauseNote}
                placeholder="例如：哪个字写错了，或哪一句没看懂"
                onChange={(event) => onMetaChange({ errorCauseNote: event.target.value })}
              />
            </Field>
          </div>
        </div>
      )}

      <Field label="家长备注">
        <input
          className={inputClass}
          value={notes}
          placeholder="可写鼓励的话或复习提示"
          onChange={(event) => onMetaChange({ notes: event.target.value })}
        />
      </Field>
    </div>
  )
}

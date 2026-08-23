import { KNOWLEDGE_POINTS } from '../data/knowledgePoints'
import type { ErrorCause, Judgement, RecognitionResult } from '../types'
import Field, { inputClass } from './Field'

const judgements: Judgement[] = ['正确', '错误', '部分正确', '无法判断', '需家长确认']
const errorCauses: ErrorCause[] = ['题意没读懂', '计算错误', '单位错误', '公式/方法不会', '粗心漏写', '概念不清', '其他']

export default function ResultEditor({
  result,
  onChange,
  errorCause,
  errorCauseNote,
  notes,
  needReview,
  onMetaChange,
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
}) {
  const showErrorCause = result.is_correct === '错误' || result.is_correct === '部分正确' || needReview

  return (
    <div className="space-y-4">
      <Field label="识别出的题目（可修改）">
        <textarea
          className={`${inputClass} min-h-28`}
          value={result.recognized_text}
          onChange={(event) => onChange({ ...result, recognized_text: event.target.value })}
        />
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
        <Field label="知识点（家长确认后保存）">
          <select
            className={inputClass}
            value={result.knowledge_point}
            onChange={(event) =>
              onChange({
                ...result,
                knowledge_point: event.target.value,
                knowledge_points: [event.target.value],
                textbook_unit:
                  KNOWLEDGE_POINTS.find((item) => item.name === event.target.value)?.unit || result.textbook_unit,
              })
            }
          >
            {KNOWLEDGE_POINTS.some((item) => item.name === result.knowledge_point) ? null : (
              <option value={result.knowledge_point}>{result.knowledge_point}（待确认）</option>
            )}
            {KNOWLEDGE_POINTS.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="对错判断（最终以家长确认为准）">
          <select
            className={inputClass}
            value={result.is_correct}
            onChange={(event) => onChange({ ...result, is_correct: event.target.value as Judgement })}
          >
            {judgements.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <label className="flex items-center gap-3 text-base">
        <input
          type="checkbox"
          checked={needReview}
          onChange={(event) => onMetaChange({ needReview: event.target.checked })}
        />
        标记为需复习
      </label>
      {showErrorCause ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="错因">
            <select
              className={inputClass}
              value={errorCause}
              onChange={(event) => onMetaChange({ errorCause: event.target.value as ErrorCause | '' })}
            >
              <option value="">请选择</option>
              {errorCauses.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </Field>
          <Field label="错因补充">
            <input
              className={inputClass}
              value={errorCauseNote}
              onChange={(event) => onMetaChange({ errorCauseNote: event.target.value })}
            />
          </Field>
        </div>
      ) : null}
      <Field label="备注">
        <input className={inputClass} value={notes} onChange={(event) => onMetaChange({ notes: event.target.value })} />
      </Field>
    </div>
  )
}

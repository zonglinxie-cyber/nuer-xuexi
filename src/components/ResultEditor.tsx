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
  onRecheck,
  rechecking,
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
  onRecheck?: () => void
  rechecking?: boolean
}) {
  const isWrongOrPartial =
    result.is_correct === '错误' || result.is_correct === '部分正确' || needReview
  const knowledgePoints = getKnowledgePoints(subject)
  const errorCauses = getErrorCauses(subject)
  const showLatex = subject === 'math'

  return (
    <div className="space-y-3">
      {/* 快捷对错打分栏 */}
      <div>
        <label className="block text-xs font-bold text-[#4a5850] mb-1">
          对错判断（点击快速切换）
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {judgements.map((item) => {
            const isSelected = result.is_correct === item.label
            return (
              <button
                key={item.label}
                type="button"
                className={`rounded-xl border py-1.5 px-1 sm:py-2 sm:px-2 text-xs sm:text-sm font-bold transition-all text-center ${item.color} ${
                  isSelected
                    ? 'ring-2 ring-offset-1 ring-[#2f5d50] shadow-xs'
                    : 'opacity-70 border-dashed'
                }`}
                onClick={() => onChange({ ...result, is_correct: item.label })}
              >
                {isSelected ? '✓' : ''} {item.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* 题目输入与预览 */}
      <Field label={showLatex ? '识别题目（支持 LaTeX 公式 $...$）' : '识别题目（请核对文字）'}>
        <textarea
          className={`${inputClass} min-h-16 sm:min-h-20 font-mono text-xs sm:text-sm leading-snug`}
          value={result.recognized_text}
          onChange={(event) => onChange({ ...result, recognized_text: event.target.value })}
        />
        {result.recognized_text && (
          <div className="mt-1.5 rounded-xl bg-[#fbfaf5] p-2 sm:p-2.5 text-xs border border-[#e8dfcf]">
            <span className="text-[11px] font-bold text-[#2f5d50] block mb-0.5">
              {showLatex ? '公式印刷体预览：' : '排版预览：'}
            </span>
            <MathView text={result.recognized_text} />
          </div>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-2">
        <Field label="学生作答">
          <input
            className={inputClass}
            value={result.student_answer}
            placeholder="图片中的作答"
            onChange={(event) => onChange({ ...result, student_answer: event.target.value })}
          />
        </Field>
        <Field label="参考答案">
          <input
            className={inputClass}
            value={result.ai_answer}
            placeholder="标准参考答案"
            onChange={(event) => onChange({ ...result, ai_answer: event.target.value })}
          />
        </Field>
      </div>

      {/* 手动修改题目/作答后的重新批改与同步按钮 */}
      {onRecheck && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50/90 border border-amber-200/90 text-xs">
          <div className="text-[11px] text-amber-900 leading-snug">
            ✏️ <strong>手动校对提示</strong>：若 OCR 识别题目或作答有误，修改上方文字后点击右侧按钮，AI 将根据修改内容<strong>重新批改并同步更新思路讲解</strong>。
          </div>
          <button
            type="button"
            disabled={rechecking || !result.recognized_text.trim()}
            onClick={onRecheck}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#2f5d50] hover:bg-[#254b40] text-white px-3.5 py-2 text-xs font-bold shadow-xs disabled:opacity-50 transition-colors"
          >
            {rechecking ? '🔄 正在同步更新…' : '✨ 重新批改并同步解析'}
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
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
                {item.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="flex items-center pt-4 sm:pt-5">
          <label className="flex items-center gap-1.5 text-xs font-semibold text-[#4a5850] cursor-pointer">
            <input
              type="checkbox"
              className="h-3.5 w-3.5 rounded border-gray-300 text-[#2f5d50]"
              checked={needReview}
              onChange={(event) => onMetaChange({ needReview: event.target.checked })}
            />
            <span>标记为“需复习”</span>
          </label>
        </div>
      </div>

      {isWrongOrPartial && (
        <div className="rounded-xl bg-[#fef7ee] p-2.5 sm:p-3 border border-[#fae8c8] space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <Field label="错因分类">
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
            <Field label="错因补充">
              <input
                className={inputClass}
                value={errorCauseNote}
                placeholder="例如：看错数字/未写单位"
                onChange={(event) => onMetaChange({ errorCauseNote: event.target.value })}
              />
            </Field>
          </div>
        </div>
      )}

      <Field label="家长备注（可选）">
        <input
          className={inputClass}
          value={notes}
          placeholder="可写鼓励或复习提示"
          onChange={(event) => onMetaChange({ notes: event.target.value })}
        />
      </Field>
    </div>
  )
}

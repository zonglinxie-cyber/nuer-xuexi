import type { ExplanationMode, RecognitionResult } from '../types'

export default function ExplanationPanel({
  result,
  mode,
  onModeChange,
}: {
  result: RecognitionResult
  mode: ExplanationMode
  onModeChange: (mode: ExplanationMode) => void
}) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-xl font-semibold">讲解</h3>
        <div className="flex gap-2">
          <button
            type="button"
            className={`rounded-xl px-4 py-2 ${mode === 'guide' ? 'bg-[#2f5d50] text-white' : 'border border-[#d9d2c3] bg-white'}`}
            onClick={() => onModeChange('guide')}
          >
            引导模式
          </button>
          <button
            type="button"
            className={`rounded-xl px-4 py-2 ${mode === 'answer' ? 'bg-[#2f5d50] text-white' : 'border border-[#d9d2c3] bg-white'}`}
            onClick={() => onModeChange('answer')}
          >
            答案模式
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4 text-base leading-7">
        <p>
          <strong>这道题在考什么：</strong>
          {result.explanation || '请先核对题目，再看讲解。'}
        </p>
        {result.question_type === '应用题' || result.known_conditions.length > 0 ? (
          <div>
            <p>
              <strong>已知条件：</strong>
            </p>
            <ul className="list-disc pl-6">
              {(result.known_conditions.length > 0 ? result.known_conditions : ['请家长帮助孩子从题目里找已知条件。']).map(
                (item) => (
                  <li key={item}>{item}</li>
                ),
              )}
            </ul>
            {result.asked_question ? (
              <p className="mt-2">
                <strong>要求什么：</strong>
                {result.asked_question}
              </p>
            ) : null}
          </div>
        ) : null}

        {mode === 'guide' ? (
          <div>
            <p>
              <strong>先想一想：</strong>
            </p>
            <ol className="list-decimal space-y-2 pl-6">
              {(result.hints.length > 0
                ? result.hints
                : ['先读题，圈出数字和单位。', '想一想用加法、减法、乘法还是除法。', '算完后估一估答案像不像。']
              ).map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
            <p className="mt-3 rounded-xl bg-[#efe8d8] px-4 py-3 text-[#5d4a28]">
              引导模式先不直接给最终答案。孩子想过之后，再切换到答案模式。
            </p>
          </div>
        ) : (
          <div>
            <p>
              <strong>解题步骤：</strong>
            </p>
            <ol className="list-decimal space-y-2 pl-6">
              {(result.step_by_step.length > 0 ? result.step_by_step : ['请家长根据题目，和孩子一起写出步骤。']).map(
                (item) => (
                  <li key={item}>{item}</li>
                ),
              )}
            </ol>
            <p className="mt-3 rounded-xl bg-[#e5efe8] px-4 py-3">
              <strong>参考答案：</strong>
              {result.ai_answer || '暂无确定答案，请家长确认。'}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

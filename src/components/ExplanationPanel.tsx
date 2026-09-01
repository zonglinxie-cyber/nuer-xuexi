import { useEffect, useState } from 'react'
import { askedQuestionLabel, knownConditionsLabel } from '../data/subjects'
import type { ExplanationMode, RecognitionResult } from '../types'
import { isSpeechSupported, speakText, stopSpeech } from '../utils/speech'
import MathView from './MathView'

export default function ExplanationPanel({
  result,
  mode,
  onModeChange,
}: {
  result: RecognitionResult
  mode: ExplanationMode
  onModeChange: (mode: ExplanationMode) => void
}) {
  const [speaking, setSpeaking] = useState(false)

  useEffect(() => {
    return () => {
      stopSpeech()
    }
  }, [])

  function handleToggleSpeech() {
    if (speaking) {
      stopSpeech()
      setSpeaking(false)
      return
    }

    const textToRead =
      mode === 'guide'
        ? `考点分析：${result.explanation}。启发思考：${result.hints.join('。')}`
        : `解题步骤：${result.step_by_step.join('。')}。参考答案：${result.ai_answer}`

    setSpeaking(true)
    speakText(textToRead, {
      onEnd: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    })
  }

  return (
    <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 border border-[#ece6d8]">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-bold text-[#243026] sm:text-xl">💡 启发式讲解</h3>
          {isSpeechSupported() && (
            <button
              type="button"
              onClick={handleToggleSpeech}
              className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all ${
                speaking
                  ? 'bg-[#fee2e2] text-[#991b1b] animate-pulse'
                  : 'bg-[#2f5d50]/10 text-[#2f5d50] hover:bg-[#2f5d50]/20'
              }`}
            >
              {speaking ? '⏹️ 停止朗读' : '🔊 语音听讲解'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <button
            type="button"
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              mode === 'guide'
                ? 'bg-[#2f5d50] text-white shadow-xs'
                : 'border border-[#d9d2c3] bg-white text-[#4a5850] hover:bg-[#fbfaf5]'
            }`}
            onClick={() => onModeChange('guide')}
          >
            🌱 引导模式（不给答案）
          </button>
          <button
            type="button"
            className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
              mode === 'answer'
                ? 'bg-[#2f5d50] text-white shadow-xs'
                : 'border border-[#d9d2c3] bg-white text-[#4a5850] hover:bg-[#fbfaf5]'
            }`}
            onClick={() => onModeChange('answer')}
          >
            📖 完整答案模式
          </button>
        </div>
      </div>

      <div className="mt-5 space-y-4 text-base leading-7 text-[#243026]">
        <div className="rounded-2xl bg-[#fbfaf5] p-4 border border-[#eee7d8]">
          <strong className="text-[#2f5d50]">🎯 考点与思路：</strong>
          <div className="mt-1">
            <MathView text={result.explanation || '请先核对题目，再看讲解。'} />
          </div>
        </div>

        {(result.question_type === '应用题' || result.known_conditions.length > 0) && (
          <div className="rounded-2xl bg-[#fbfaf5] p-4 border border-[#eee7d8]">
            <p className="font-semibold text-[#2f5d50]">📋 {knownConditionsLabel(result.subject)}：</p>
            <ul className="mt-1.5 list-disc pl-5 space-y-1">
              {(result.known_conditions.length > 0
                ? result.known_conditions
                : ['请和孩子一起圈出题目中的已知数字和单位。']
              ).map((item) => (
                <li key={item}>
                  <MathView text={item} as="span" />
                </li>
              ))}
            </ul>
            {result.asked_question && (
              <p className="mt-2 text-sm text-[#9a6b4a]">
                <strong>{askedQuestionLabel(result.subject)}</strong>
                <MathView text={result.asked_question} as="span" />
              </p>
            )}
          </div>
        )}

        {mode === 'guide' ? (
          <div className="rounded-2xl bg-[#fef9ee] p-4 border border-[#fae8c8]">
            <p className="font-bold text-[#b45309]">🤔 引导孩子想一想：</p>
            <ol className="mt-2 list-decimal space-y-2 pl-5 text-[#78350f]">
              {(result.hints.length > 0
                ? result.hints
                : result.subject === 'chinese'
                  ? ['先读题，圈出要写的字或要找的句子。', '想一想这题在问什么，到课文或词语里哪里找。', '写完后自己读一遍，看看通不通。']
                  : result.subject === 'english'
                    ? ['先看图和题干，圈出认识的单词。', '想一想这句是在问还是在答。', '写完后检查拼写和句首大写。']
                    : ['先读题，圈出已知数字和单位。', '想一想用加法、减法、乘法还是除法。', '算完后估算一下答案是否合理。']
              ).map((item) => (
                <li key={item}>
                  <MathView text={item} as="span" />
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs text-[#92400e]">
              💡 引导模式鼓励孩子自己动脑，想过之后再点右上角“完整答案模式”对照。
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-[#f0fdf4] p-4 border border-[#bbf7d0] space-y-3">
            <p className="font-bold text-[#166534]">
              {result.subject === 'math' ? '📝 详细解题步骤：' : '📝 对照讲解：'}
            </p>
            <ol className="list-decimal space-y-2 pl-5 text-[#14532d]">
              {(result.step_by_step.length > 0
                ? result.step_by_step
                : ['请家长先和孩子一起看题目，再对照参考说法。']
              ).map((item) => (
                <li key={item}>
                  <MathView text={item} as="span" />
                </li>
              ))}
            </ol>
            <div className="rounded-xl bg-white p-3.5 border border-[#86efac] text-[#166534]">
              <strong>参考正确答案：</strong>
              <MathView text={result.ai_answer || '暂无确定答案'} as="span" className="font-bold ml-1" />
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

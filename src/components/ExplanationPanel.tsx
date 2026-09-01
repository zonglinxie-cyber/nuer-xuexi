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
  const [speechError, setSpeechError] = useState('')

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

    setSpeechError('')
    const ok = speakText(textToRead, {
      onEnd: () => setSpeaking(false),
      onError: (err) => {
        setSpeaking(false)
        setSpeechError(typeof err === 'string' ? err : '朗读失败，请检查手机是否静音。')
      },
    })
    if (ok) setSpeaking(true)
  }

  return (
    <div className="space-y-2.5">
      {/* 顶部模式切换与语音 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1.5">
          <button
            type="button"
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              mode === 'guide'
                ? 'bg-[#2f5d50] text-white shadow-xs'
                : 'border border-[#d9d2c3] bg-white text-[#4a5850] hover:bg-[#fbfaf5]'
            }`}
            onClick={() => onModeChange('guide')}
          >
            🌱 引导模式
          </button>
          <button
            type="button"
            className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
              mode === 'answer'
                ? 'bg-[#2f5d50] text-white shadow-xs'
                : 'border border-[#d9d2c3] bg-white text-[#4a5850] hover:bg-[#fbfaf5]'
            }`}
            onClick={() => onModeChange('answer')}
          >
            📖 完整答案
          </button>
        </div>

        {isSpeechSupported() && (
          <button
            type="button"
            onClick={handleToggleSpeech}
            className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-xs font-bold transition-all ${
              speaking
                ? 'bg-rose-100 text-rose-700 animate-pulse'
                : 'bg-[#2f5d50]/10 text-[#2f5d50] hover:bg-[#2f5d50]/20'
            }`}
          >
            {speaking ? '⏹️ 停止' : '🔊 语音讲解'}
          </button>
        )}
      </div>

      {speechError && <p className="text-xs text-[#92400e]">{speechError}</p>}

      {/* 讲解主体卡片 */}
      <div className="space-y-2.5 text-xs sm:text-sm leading-relaxed text-[#243026]">
        <div className="rounded-xl bg-[#fbfaf5] p-3 border border-[#eee7d8]">
          <strong className="text-[#2f5d50] block mb-0.5">🎯 考点与点拨：</strong>
          <MathView text={result.explanation || '请先核对题目，再看讲解。'} />
        </div>

        {(result.question_type === '应用题' || result.known_conditions.length > 0) && (
          <div className="rounded-xl bg-[#fbfaf5] p-3 border border-[#eee7d8]">
            <p className="font-semibold text-[#2f5d50] mb-0.5">📋 {knownConditionsLabel(result.subject)}：</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {(result.known_conditions.length > 0
                ? result.known_conditions
                : ['请和孩子一起圈出题目中的已知信息。']
              ).map((item) => (
                <li key={item}>
                  <MathView text={item} as="span" />
                </li>
              ))}
            </ul>
            {result.asked_question && (
              <p className="mt-1.5 text-[#9a6b4a]">
                <strong>{askedQuestionLabel(result.subject)}</strong>
                <MathView text={result.asked_question} as="span" />
              </p>
            )}
          </div>
        )}

        {mode === 'guide' ? (
          <div className="rounded-xl bg-[#fef9ee] p-3 border border-[#fae8c8]">
            <p className="font-bold text-[#b45309] mb-1">🤔 启发思考问题：</p>
            <ol className="list-decimal space-y-1 pl-4 text-[#78350f]">
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
          </div>
        ) : (
          <div className="rounded-xl bg-[#f0fdf4] p-3 border border-[#bbf7d0] space-y-2">
            <p className="font-bold text-[#166534]">
              {result.subject === 'math' ? '📝 详细解题步骤：' : '📝 对照讲解：'}
            </p>
            <ol className="list-decimal space-y-1 pl-4 text-[#14532d]">
              {(result.step_by_step.length > 0
                ? result.step_by_step
                : ['请家长先和孩子一起看题目，再对照参考说法。']
              ).map((item) => (
                <li key={item}>
                  <MathView text={item} as="span" />
                </li>
              ))}
            </ol>
            <div className="rounded-lg bg-white p-2.5 border border-[#86efac] text-[#166534] font-medium">
              <strong>参考答案：</strong>
              <MathView text={result.ai_answer || '暂无确定答案'} as="span" className="font-bold ml-1" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

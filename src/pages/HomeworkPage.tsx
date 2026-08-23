import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import ExplanationPanel from '../components/ExplanationPanel'
import ImageUploader from '../components/ImageUploader'
import NoticeBanner from '../components/NoticeBanner'
import PrivacyNotice from '../components/PrivacyNotice'
import ResultEditor from '../components/ResultEditor'
import { AiServiceError, recognizeMathQuestion } from '../services/aiService'
import { hasApiKey, loadSettings } from '../services/settingsService'
import { upsertRecord, upsertWrongQuestion } from '../services/storageService'
import type { AppNotice, DraftQuestion, ErrorCause, ExplanationMode, RecognitionResult } from '../types'
import { createId } from '../utils/id'

function emptyDraft(imageDataUrl = ''): DraftQuestion {
  return {
    id: createId('q'),
    imageDataUrl,
    createdAt: new Date().toISOString(),
    parentConfirmed: false,
    savedAsWrong: false,
    needReview: false,
    errorCause: '',
    errorCauseNote: '',
    notes: '',
    originalText: '',
    result: {
      recognized_text: '',
      confidence_level: '低',
      question_type: '其他',
      knowledge_point: '综合与实践',
      knowledge_points: ['综合与实践'],
      textbook_unit: '综合与实践',
      student_answer: '',
      ai_answer: '',
      is_correct: '无法判断',
      explanation: '',
      step_by_step: [],
      hints: [],
      known_conditions: [],
      asked_question: '',
      need_human_check: true,
      warning: '',
    },
  }
}

function toRecord(draft: DraftQuestion, parentConfirmed: boolean, savedAsWrong: boolean) {
  return {
    id: draft.id,
    createdAt: draft.createdAt,
    questionText: draft.result.recognized_text,
    questionType: draft.result.question_type,
    knowledgePoint: draft.result.knowledge_point,
    knowledgePoints: draft.result.knowledge_points,
    judgement: draft.result.is_correct,
    savedAsWrong,
    parentConfirmed,
    imageDataUrl: '',
  }
}

export default function HomeworkPage() {
  const [draft, setDraft] = useState<DraftQuestion>(() => emptyDraft())
  const [hasResult, setHasResult] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ExplanationMode>('guide')
  const [notice, setNotice] = useState<AppNotice | null>(() =>
    hasApiKey(loadSettings())
      ? null
      : { type: 'warning', message: '还没有填写 API Key。可以先上传图片预览，但识别前请先到设置页填写。' },
  )
  const abortRef = useRef<AbortController | null>(null)

  const dirty = Boolean(draft.imageDataUrl || hasResult)
  const shouldBlock = (dirty && !draft.parentConfirmed) || loading
  const blocker = useBlocker(shouldBlock)

  useEffect(() => {
    if (blocker.state !== 'blocked') return
    const ok = window.confirm(
      loading ? '正在识别，离开会取消这次识别。确定要离开吗？' : '当前识别结果还没有保存。确定要离开吗？',
    )
    if (ok) {
      abortRef.current?.abort()
      blocker.proceed()
    } else {
      blocker.reset()
    }
  }, [blocker, loading])

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!shouldBlock) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [shouldBlock])

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  function confirmReplace(): boolean {
    if (!dirty || draft.parentConfirmed) return true
    return window.confirm('当前识别结果还没有保存。确定要放弃并换一张图片吗？')
  }

  function updateResult(result: RecognitionResult) {
    setDraft((current) => ({ ...current, result, parentConfirmed: false }))
  }

  function handleCancelRecognize() {
    abortRef.current?.abort()
  }

  async function handleRecognize() {
    if (!draft.imageDataUrl) {
      setNotice({ type: 'warning', message: '请先拍照或上传一张作业图片。' })
      return
    }
    if (!hasApiKey()) {
      setNotice({ type: 'warning', message: '还没有填写 API Key。请先到设置页填写后再识别。' })
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setNotice({ type: 'info', message: '正在识别，请稍候。作业图片会发送给 AI 服务。' })
    try {
      const result = await recognizeMathQuestion(draft.imageDataUrl, undefined, controller.signal)
      setDraft((current) => ({
        ...current,
        result,
        originalText: result.recognized_text,
        parentConfirmed: false,
        savedAsWrong: false,
      }))
      setHasResult(true)
      setMode('guide')
      if (result.warning) {
        setNotice({
          type: 'warning',
          message: `${result.warning} 如果图片模糊、过暗或题目不完整，请重新拍摄。AI 结果只是建议，请家长核对。`,
        })
      } else if (result.need_human_check) {
        setNotice({ type: 'warning', message: 'AI 无法完全确定，请家长核对题目、答案和对错后再保存。' })
      } else {
        setNotice({ type: 'success', message: '识别完成。请家长核对题目和学生答案，再决定是否保存。' })
      }
    } catch (error) {
      const message =
        error instanceof AiServiceError
          ? error.message
          : '识别失败。如果图片模糊、过暗或倾斜，请重新拍摄后再试。'
      setNotice({ type: error instanceof AiServiceError && error.code === 'cancelled' ? 'info' : 'error', message })
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setLoading(false)
    }
  }

  function handleSaveRecord() {
    if (!hasResult) {
      setNotice({ type: 'warning', message: '请先完成识别，再保存学习记录。' })
      return
    }
    const next = { ...draft, parentConfirmed: true }
    try {
      upsertRecord(toRecord(next, true, next.savedAsWrong))
      setDraft(next)
      setNotice({ type: 'success', message: '已按家长确认的结果保存到学习记录。AI 建议不会覆盖你的修改。' })
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : '保存学习记录失败。',
      })
    }
  }

  function handleSaveWrong() {
    if (!hasResult) {
      setNotice({ type: 'warning', message: '请先完成识别。' })
      return
    }
    const shouldSave =
      draft.result.is_correct === '错误' ||
      draft.result.is_correct === '部分正确' ||
      draft.needReview ||
      draft.result.is_correct === '需家长确认'
    if (!shouldSave) {
      setNotice({ type: 'warning', message: '当前判断不是错误/部分正确/需复习。如需保存，请先改判断或勾选“需复习”。' })
      return
    }
    if ((draft.result.is_correct === '错误' || draft.result.is_correct === '部分正确') && !draft.errorCause) {
      setNotice({ type: 'warning', message: '请先选择错因，再保存到错题本。' })
      return
    }
    const confirmed = { ...draft, parentConfirmed: true, savedAsWrong: true }
    try {
      upsertWrongQuestion({
        id: confirmed.id,
        imageDataUrl: confirmed.imageDataUrl,
        originalText: confirmed.originalText || confirmed.result.recognized_text,
        correctedText: confirmed.result.recognized_text,
        studentAnswer: confirmed.result.student_answer,
        correctAnswer: confirmed.result.ai_answer,
        explanation: confirmed.result.explanation,
        stepByStep: confirmed.result.step_by_step,
        knowledgePoint: confirmed.result.knowledge_point,
        knowledgePoints: confirmed.result.knowledge_points,
        textbookUnit: confirmed.result.textbook_unit,
        errorCause: confirmed.errorCause,
        errorCauseNote: confirmed.errorCauseNote,
        savedAt: new Date().toISOString(),
        reviewStatus: '未复习',
        lastReviewedAt: '',
        notes: confirmed.notes,
        sourceRecordId: confirmed.id,
      })
      upsertRecord(toRecord(confirmed, true, true))
      setDraft(confirmed)
      setNotice({ type: 'success', message: '已保存到错题本，并写入学习记录。' })
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : '保存错题失败。',
      })
    }
  }

  const statusText = useMemo(() => {
    if (!hasResult) return '尚未识别'
    if (draft.parentConfirmed) return draft.savedAsWrong ? '家长已确认，并已入错题本' : '家长已确认'
    return '待家长确认'
  }, [draft.parentConfirmed, draft.savedAsWrong, hasResult])

  return (
    <div className="space-y-6">
      <NoticeBanner notice={notice} />
      <PrivacyNotice />

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="text-xl font-semibold">上传作业</h2>
        <p className="mt-2 text-base leading-7 text-[#4a5850]">
          支持 jpg、png。手机可直接拍照，电脑可上传图片。图片过大会自动压缩。iPhone 相册若是 HEIC，请先转成 JPEG。
        </p>
        <div className="mt-4">
          <ImageUploader
            imageDataUrl={draft.imageDataUrl}
            disabled={loading}
            onNotice={setNotice}
            onChange={(dataUrl) => {
              if (dataUrl && !confirmReplace()) return
              if (!dataUrl && dirty && !confirmReplace()) return
              setDraft(emptyDraft(dataUrl))
              setHasResult(false)
              setMode('guide')
            }}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            className="rounded-xl bg-[#2f5d50] px-5 py-3 text-white disabled:opacity-60"
            type="button"
            disabled={loading}
            onClick={() => void handleRecognize()}
          >
            {loading ? '正在识别…' : '开始识别'}
          </button>
          {loading ? (
            <button
              className="rounded-xl border border-[#9a6b4a] px-5 py-3 text-[#9a6b4a]"
              type="button"
              onClick={handleCancelRecognize}
            >
              取消识别
            </button>
          ) : (
            <button
              className="rounded-xl border border-[#2f5d50] px-5 py-3 text-[#2f5d50]"
              type="button"
              onClick={() => {
                if (!confirmReplace()) return
                setDraft(emptyDraft())
                setHasResult(false)
                setMode('guide')
                setNotice({ type: 'info', message: '已清空当前题目，可以重新上传。' })
              }}
            >
              重新上传
            </button>
          )}
        </div>
      </section>

      {hasResult ? (
        <>
          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold">识别结果</h2>
                <p className="mt-2 text-base text-[#4a5850]">
                  置信度：{draft.result.confidence_level}　题型：{draft.result.question_type}　章节：
                  {draft.result.textbook_unit}
                </p>
              </div>
              <span className="rounded-xl bg-[#efe8d8] px-3 py-2 text-sm text-[#5d4a28]">{statusText}</span>
            </div>
            {draft.result.warning ? (
              <p className="mt-3 rounded-xl bg-[#f4ead4] px-4 py-3 text-[#6b4b16]">{draft.result.warning}</p>
            ) : null}
            {draft.result.need_human_check ? (
              <p className="mt-3 rounded-xl bg-[#e8eef2] px-4 py-3 text-[#1f3b4d]">
                AI 不能把未确认结果当成最终结果。请家长修改后再保存。
              </p>
            ) : null}
            <div className="mt-4">
              <ResultEditor
                result={draft.result}
                onChange={updateResult}
                errorCause={draft.errorCause}
                errorCauseNote={draft.errorCauseNote}
                notes={draft.notes}
                needReview={draft.needReview}
                onMetaChange={(patch) =>
                  setDraft((current) => ({
                    ...current,
                    ...patch,
                    parentConfirmed: false,
                    errorCause: (patch.errorCause ?? current.errorCause) as ErrorCause | '',
                  }))
                }
              />
            </div>
          </section>

          <ExplanationPanel result={draft.result} mode={mode} onModeChange={setMode} />

          <section className="rounded-2xl bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold">家长确认后保存</h3>
            <p className="mt-2 text-base leading-7 text-[#4a5850]">
              保存学习记录或错题本时，以你修改后的内容为准。系统不会把结果自动改回 AI 的判断。
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="rounded-xl bg-[#2f5d50] px-5 py-3 text-white" type="button" onClick={handleSaveRecord}>
                保存到学习记录
              </button>
              <button
                className="rounded-xl border border-[#9a6b4a] px-5 py-3 text-[#9a6b4a]"
                type="button"
                onClick={handleSaveWrong}
              >
                保存到错题本
              </button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}

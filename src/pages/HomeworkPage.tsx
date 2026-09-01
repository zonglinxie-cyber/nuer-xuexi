import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import ExplanationPanel from '../components/ExplanationPanel'
import ImageUploader from '../components/ImageUploader'
import NoticeBanner from '../components/NoticeBanner'
import PrivacyNotice from '../components/PrivacyNotice'
import ResultEditor from '../components/ResultEditor'
import { AiServiceError, recognizeMathQuestions } from '../services/aiService'
import { hasApiKey, loadSettings } from '../services/settingsService'
import { upsertRecord, upsertWrongQuestion } from '../services/storageService'
import type { AppNotice, DraftQuestion, ExplanationMode, RecognitionResult } from '../types'
import { createId } from '../utils/id'

function emptyDraft(imageDataUrl = '', initialResult?: RecognitionResult): DraftQuestion {
  const result: RecognitionResult = initialResult || {
    recognized_text: '',
    confidence_level: '低',
    question_type: '其他',
    knowledge_point: '综合与实践',
    knowledge_points: ['综合与实践'],
    textbook_unit: '人教版四年级上册',
    student_answer: '',
    ai_answer: '',
    is_correct: '需家长确认',
    explanation: '',
    step_by_step: [],
    hints: [],
    known_conditions: [],
    asked_question: '',
    need_human_check: false,
    warning: '',
  }

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
    originalText: result.recognized_text,
    result,
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
    imageDataUrl: draft.imageDataUrl,
  }
}

export default function HomeworkPage() {
  const [drafts, setDrafts] = useState<DraftQuestion[]>([emptyDraft()])
  const [activeIndex, setActiveIndex] = useState(0)
  const [hasResult, setHasResult] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ExplanationMode>('guide')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [notice, setNotice] = useState<AppNotice | null>(() =>
    hasApiKey(loadSettings())
      ? null
      : { type: 'warning', message: '还没有填写 API Key。可以先上传图片预览，但识别前请先到设置页填写。' },
  )
  const abortRef = useRef<AbortController | null>(null)

  const currentDraft = drafts[activeIndex] || drafts[0]
  const dirty = Boolean(imageDataUrl || hasResult)
  const hasUnsaved = hasResult && drafts.some((draft) => !draft.parentConfirmed)
  const shouldBlock = hasUnsaved || loading
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
    if (!dirty || drafts.every((d) => d.parentConfirmed)) return true
    return window.confirm('当前识别结果还没有保存。确定要放弃并换一张图片吗？')
  }

  function updateActiveResult(result: RecognitionResult) {
    setDrafts((prev) => {
      const next = [...prev]
      next[activeIndex] = { ...next[activeIndex], result, parentConfirmed: false }
      return next
    })
  }

  function updateActiveMeta(patch: Partial<DraftQuestion>) {
    setDrafts((prev) => {
      const next = [...prev]
      next[activeIndex] = { ...next[activeIndex], ...patch, parentConfirmed: false }
      return next
    })
  }

  function handleCancelRecognize() {
    abortRef.current?.abort()
  }

  async function handleRecognize() {
    if (!imageDataUrl) {
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
    setNotice({ type: 'info', message: '正在智能识别整页题目，请稍候…' })

    try {
      const multi = await recognizeMathQuestions(imageDataUrl, undefined, controller.signal)
      const newDrafts = multi.questions.map((q) => emptyDraft(imageDataUrl, q))
      setDrafts(newDrafts)
      setActiveIndex(0)
      setHasResult(true)
      setMode('guide')

      if (multi.questions.length > 1) {
        setNotice({
          type: 'success',
          message: `识别到整页包含 ${multi.questions.length} 道题目，已为您全部批改！可点击上方切换核对。`,
        })
      } else {
        setNotice({ type: 'success', message: '识别与批改完成，请核对解题思路并确认。' })
      }
    } catch (error) {
      const message =
        error instanceof AiServiceError
          ? error.message
          : '识别失败。如果图片模糊、过暗或倾斜，请重新拍摄后再试。'
      setNotice({
        type: error instanceof AiServiceError && error.code === 'cancelled' ? 'info' : 'error',
        message,
      })
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      setLoading(false)
    }
  }

  function handleSaveSingle(saveToWrong = false) {
    if (!hasResult) return
    if (saveToWrong) {
      const shouldSave =
        currentDraft.result.is_correct === '错误' ||
        currentDraft.result.is_correct === '部分正确' ||
        currentDraft.needReview ||
        currentDraft.result.is_correct === '需家长确认'
      if (!shouldSave) {
        setNotice({
          type: 'warning',
          message: '当前判断不是错误/部分正确/需复习。如需保存到错题本，请先改判断或勾选“需复习”。',
        })
        return
      }
      if (
        (currentDraft.result.is_correct === '错误' || currentDraft.result.is_correct === '部分正确') &&
        !currentDraft.errorCause
      ) {
        setNotice({ type: 'warning', message: '请先选择错因，再保存到错题本。' })
        return
      }
    }
    const nextDraft = { ...currentDraft, parentConfirmed: true, savedAsWrong: saveToWrong }
    try {
      if (saveToWrong) {
        upsertWrongQuestion({
          id: nextDraft.id,
          imageDataUrl: nextDraft.imageDataUrl,
          originalText: nextDraft.originalText || nextDraft.result.recognized_text,
          correctedText: nextDraft.result.recognized_text,
          studentAnswer: nextDraft.result.student_answer,
          correctAnswer: nextDraft.result.ai_answer,
          explanation: nextDraft.result.explanation,
          stepByStep: nextDraft.result.step_by_step,
          knowledgePoint: nextDraft.result.knowledge_point,
          knowledgePoints: nextDraft.result.knowledge_points,
          textbookUnit: nextDraft.result.textbook_unit,
          errorCause: nextDraft.errorCause,
          errorCauseNote: nextDraft.errorCauseNote,
          savedAt: new Date().toISOString(),
          reviewStatus: '未复习',
          lastReviewedAt: '',
          notes: nextDraft.notes,
          sourceRecordId: nextDraft.id,
        })
      }
      upsertRecord(toRecord(nextDraft, true, saveToWrong))
      setDrafts((prev) => {
        const copy = [...prev]
        copy[activeIndex] = nextDraft
        return copy
      })
      setNotice({
        type: 'success',
        message: saveToWrong
          ? '已保存到错题本，并记录至学习记录！'
          : '已按家长确认的结果保存到学习记录。',
      })
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : '保存失败。',
      })
    }
  }

  function handleBatchSave() {
    let savedWrongCount = 0
    let savedRecordCount = 0
    let skippedCauseCount = 0

    const updated = drafts.map((draft) => {
      const isWrong =
        draft.result.is_correct === '错误' ||
        draft.result.is_correct === '部分正确' ||
        draft.needReview
      const needsCause =
        draft.result.is_correct === '错误' || draft.result.is_correct === '部分正确'
      const canArchiveWrong = isWrong && (!needsCause || Boolean(draft.errorCause))
      const confirmed = { ...draft, parentConfirmed: true, savedAsWrong: canArchiveWrong }

      if (isWrong && !canArchiveWrong) {
        skippedCauseCount += 1
      }

      if (canArchiveWrong) {
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
        savedWrongCount += 1
      }

      upsertRecord(toRecord(confirmed, true, canArchiveWrong))
      savedRecordCount += 1
      return confirmed
    })

    setDrafts(updated)
    const extra =
      skippedCauseCount > 0 ? ` 另有 ${skippedCauseCount} 道错题未选错因，已只写入学习记录，请补选错因后再归档。` : ''
    setNotice({
      type: skippedCauseCount > 0 ? 'warning' : 'success',
      message: `整页处理完毕：已保存 ${savedRecordCount} 条记录，其中 ${savedWrongCount} 道错题已归档。${extra}`,
    })
  }

  const statusText = useMemo(() => {
    if (!hasResult) return '尚未识别'
    if (currentDraft.parentConfirmed) {
      return currentDraft.savedAsWrong ? '已确认 · 已入错题本' : '家长已确认'
    }
    return '待确认'
  }, [currentDraft.parentConfirmed, currentDraft.savedAsWrong, hasResult])

  return (
    <div className="space-y-6">
      <NoticeBanner notice={notice} />
      <PrivacyNotice />

      {/* 上传拍照区域 */}
      <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 border border-[#ece6d8]">
        <h2 className="text-lg font-bold text-[#243026] sm:text-xl">📸 拍照 / 上传整页作业</h2>
        <p className="mt-1.5 text-sm leading-6 text-[#4a5850]">
          支持单题或整页多题识别。手机拍照请尽量光线充足、竖直平拍。
        </p>

        <div className="mt-4">
          <ImageUploader
            imageDataUrl={imageDataUrl}
            disabled={loading}
            onNotice={setNotice}
            onChange={(dataUrl) => {
              if (dataUrl && !confirmReplace()) return
              if (!dataUrl && dirty && !confirmReplace()) return
              setImageDataUrl(dataUrl)
              setDrafts([emptyDraft(dataUrl)])
              setActiveIndex(0)
              setHasResult(false)
              setMode('guide')
            }}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <button
            className="w-full rounded-2xl bg-[#2f5d50] px-6 py-3.5 text-base font-bold text-white shadow-md hover:bg-[#254b40] disabled:opacity-60 sm:w-auto"
            type="button"
            disabled={loading}
            onClick={() => void handleRecognize()}
          >
            {loading ? '🔍 正在智能识别与批改…' : '🚀 开始识别与批改'}
          </button>
          {loading ? (
            <button
              className="w-full rounded-2xl border border-[#9a6b4a] px-5 py-3 text-sm text-[#9a6b4a] sm:w-auto"
              type="button"
              onClick={handleCancelRecognize}
            >
              取消识别
            </button>
          ) : (
            <button
              className="w-full rounded-2xl border border-[#2f5d50] px-5 py-3 text-sm font-semibold text-[#2f5d50] hover:bg-[#fbfaf5] sm:w-auto"
              type="button"
              onClick={() => {
                if (!confirmReplace()) return
                setImageDataUrl('')
                setDrafts([emptyDraft()])
                setActiveIndex(0)
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

      {/* 识别与批改结果 */}
      {hasResult && (
        <>
          {/* 多题 Tab 切换栏（当整页识别出多题时显示） */}
          {drafts.length > 1 && (
            <section className="rounded-3xl bg-white p-4 shadow-sm border border-[#ece6d8]">
              <div className="flex items-center justify-between pb-3 border-b border-[#f0ece1]">
                <h3 className="font-bold text-[#243026]">
                  整页共识别出 {drafts.length} 道题：
                </h3>
                <button
                  type="button"
                  onClick={handleBatchSave}
                  className="rounded-xl bg-[#2f5d50] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#254b40]"
                >
                  ⚡ 一键全部确认并归档
                </button>
              </div>

              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {drafts.map((d, index) => {
                  const isWrong =
                    d.result.is_correct === '错误' || d.result.is_correct === '部分正确'
                  const isCorrect = d.result.is_correct === '正确'
                  const isSelected = activeIndex === index

                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className={`flex shrink-0 items-center gap-1.5 rounded-2xl px-4 py-2.5 text-sm font-bold transition-all ${
                        isSelected
                          ? 'bg-[#2f5d50] text-white shadow-sm'
                          : 'border border-[#e0d9cb] bg-[#fbfaf5] text-[#4a5850] hover:bg-[#f2eee4]'
                      }`}
                    >
                      <span>第 {index + 1} 题</span>
                      <span className="text-xs">
                        {isCorrect ? '✅' : isWrong ? '❌' : '❓'}
                      </span>
                    </button>
                  )
                })}
              </div>
            </section>
          )}

          {/* 单题详情与编辑 */}
          <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 border border-[#ece6d8]">
            <div className="flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-[#2f5d50]/10 px-2.5 py-1 text-xs font-bold text-[#2f5d50]">
                    第 {activeIndex + 1} / {drafts.length} 题
                  </span>
                  <h2 className="text-lg font-bold text-[#243026]">
                    【{currentDraft.result.knowledge_point}】{currentDraft.result.question_type}
                  </h2>
                </div>
                <p className="mt-1 text-xs text-[#66756c]">
                  章节：{currentDraft.result.textbook_unit} · 置信度：{currentDraft.result.confidence_level}
                </p>
              </div>
              <span className="rounded-xl bg-[#efe8d8] px-3.5 py-1.5 text-xs font-semibold text-[#5d4a28]">
                {statusText}
              </span>
            </div>

            {currentDraft.result.warning && (
              <p className="mt-3 rounded-xl bg-[#fef3c7] px-4 py-3 text-xs text-[#92400e]">
                ⚠️ {currentDraft.result.warning}
              </p>
            )}

            <div className="mt-4">
              <ResultEditor
                result={currentDraft.result}
                onChange={updateActiveResult}
                errorCause={currentDraft.errorCause}
                errorCauseNote={currentDraft.errorCauseNote}
                notes={currentDraft.notes}
                needReview={currentDraft.needReview}
                onMetaChange={updateActiveMeta}
              />
            </div>
          </section>

          {/* 启发式讲解面板 */}
          <ExplanationPanel
            result={currentDraft.result}
            mode={mode}
            onModeChange={setMode}
          />

          {/* 底部保存操作 */}
          <section className="rounded-3xl bg-white p-5 shadow-sm sm:p-6 border border-[#ece6d8]">
            <h3 className="text-lg font-bold text-[#243026]">💾 确认并保存</h3>
            <p className="mt-1 text-sm text-[#4a5850]">
              以家长当前确认的修改为准。如果是错题，保存到错题本后可在周末一键导出 A4 打印卷或在线举一反三练习。
            </p>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <button
                className="w-full rounded-2xl bg-[#2f5d50] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-[#254b40] sm:w-auto"
                type="button"
                onClick={() => handleSaveSingle(false)}
              >
                ✓ 保存到学习记录
              </button>
              <button
                className="w-full rounded-2xl border border-[#9a6b4a] bg-[#fbfaf5] px-6 py-3.5 text-sm font-bold text-[#9a6b4a] hover:bg-[#f5ede1] sm:w-auto"
                type="button"
                onClick={() => handleSaveSingle(true)}
              >
                📕 保存到错题本并归档
              </button>
              {drafts.length > 1 && (
                <button
                  className="w-full rounded-2xl bg-linear-to-r from-[#d97706] to-[#b45309] px-6 py-3.5 text-sm font-bold text-white shadow-md hover:opacity-95 sm:w-auto"
                  type="button"
                  onClick={handleBatchSave}
                >
                  ⚡ 一键全部确认并归档整页
                </button>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

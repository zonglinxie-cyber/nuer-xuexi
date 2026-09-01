import { useEffect, useMemo, useRef, useState } from 'react'
import { useBlocker, useSearchParams } from 'react-router-dom'
import ExplanationPanel from '../components/ExplanationPanel'
import ImageUploader from '../components/ImageUploader'
import NoticeBanner from '../components/NoticeBanner'
import PrivacyNotice from '../components/PrivacyNotice'
import ResultEditor from '../components/ResultEditor'
import { defaultKnowledgeName, defaultTextbookUnit, parseSubjectId, SUBJECT_IDS, SUBJECT_LABELS } from '../data/subjects'
import { AiServiceError, recognizeQuestions } from '../services/aiService'
import { hasApiKey, loadLastSubject, loadSettings, saveLastSubject } from '../services/settingsService'
import { upsertRecord, upsertWrongQuestion } from '../services/storageService'
import type { AppNotice, DraftQuestion, ExplanationMode, RecognitionResult, SubjectId } from '../types'
import { createId } from '../utils/id'

function emptyDraft(imageDataUrl = '', initialResult?: RecognitionResult, subject: SubjectId = 'math'): DraftQuestion {
  const result: RecognitionResult = initialResult || {
    subject,
    recognized_text: '',
    confidence_level: '低',
    question_type: '其他',
    knowledge_point: defaultKnowledgeName(subject),
    knowledge_points: [defaultKnowledgeName(subject)],
    textbook_unit: defaultTextbookUnit(subject),
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
    subject: initialResult?.subject || subject,
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
    subject: draft.subject,
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
  const [searchParams, setSearchParams] = useSearchParams()
  const [subject, setSubject] = useState<SubjectId>(() => parseSubjectId(searchParams.get('subject'), loadLastSubject()))
  const [drafts, setDrafts] = useState<DraftQuestion[]>(() => [emptyDraft('', undefined, subject)])
  const [activeIndex, setActiveIndex] = useState(0)
  const [hasResult, setHasResult] = useState(false)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<ExplanationMode>('guide')
  const [imageDataUrl, setImageDataUrl] = useState('')
  const [viewTab, setViewTab] = useState<'editor' | 'explanation'>('editor')
  const [showImageModal, setShowImageModal] = useState(false)
  const [notice, setNotice] = useState<AppNotice | null>(() =>
    hasApiKey(loadSettings())
      ? null
      : { type: 'warning', message: '还没有填写 API Key。可以先上传图片预览，但识别前请先到设置页填写。' },
  )
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    const fromQuery = searchParams.get('subject')
    if (!fromQuery) return
    const next = parseSubjectId(fromQuery, subject)
    if (next === subject) return
    setSubject(next)
    saveLastSubject(next)
  }, [searchParams, subject])

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

  function changeSubject(next: SubjectId) {
    if (next === subject) return
    if (hasResult && !confirmReplace()) return
    setSubject(next)
    saveLastSubject(next)
    setSearchParams(next === 'math' ? {} : { subject: next }, { replace: true })
    setDrafts([emptyDraft(imageDataUrl, undefined, next)])
    setActiveIndex(0)
    setHasResult(false)
    setMode('guide')
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
      const multi = await recognizeQuestions(imageDataUrl, subject, undefined, controller.signal)
      const newDrafts = multi.questions.map((q) => emptyDraft(imageDataUrl, q, subject))
      setDrafts(newDrafts)
      setActiveIndex(0)
      setHasResult(true)
      setViewTab('editor')
      setMode('guide')

      if (multi.questions.length > 1) {
        setNotice({
          type: 'success',
          message: `识别到整页共 ${multi.questions.length} 道题，已为您完成全部批改！`,
        })
      } else {
        setNotice({ type: 'success', message: '识别批改完成，请核对解题思路。' })
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
          message: '当前判断不是错误/部分正确/需复习。如需入错题本，请先改判断或勾选“需复习”。',
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
          subject: nextDraft.subject,
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
          ? '✓ 已入错题本并写入记录！'
          : '✓ 已保存到学习记录！',
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
          subject: confirmed.subject,
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
      skippedCauseCount > 0 ? ` 另有 ${skippedCauseCount} 道错题未选错因，已写入记录。` : ''
    setNotice({
      type: skippedCauseCount > 0 ? 'warning' : 'success',
      message: `🎉 已保存 ${savedRecordCount} 条记录，其中 ${savedWrongCount} 道错题已归档。${extra}`,
    })
  }

  const statusText = useMemo(() => {
    if (!hasResult) return '尚未识别'
    if (currentDraft.parentConfirmed) {
      return currentDraft.savedAsWrong ? '已入错题本' : '已确认'
    }
    return '待确认'
  }, [currentDraft.parentConfirmed, currentDraft.savedAsWrong, hasResult])

  return (
    <div className="space-y-3 sm:space-y-4">
      <NoticeBanner notice={notice} />
      <PrivacyNotice />

      {/* 拍照上传与学科选择卡片 */}
      {!hasResult ? (
        <section className="rounded-2xl bg-white p-3.5 sm:p-5 shadow-xs border border-[#ece6d8]">
          <div className="flex items-center justify-between gap-2 mb-3">
            <h2 className="text-sm sm:text-base font-bold text-[#243026]">📸 上传作业</h2>
            {/* 学科切换 Pills */}
            <div className="flex gap-1.5 bg-[#fbfaf5] p-1 rounded-xl border border-[#e8e2d4]">
              {SUBJECT_IDS.map((id) => (
                <button
                  key={id}
                  type="button"
                  disabled={loading}
                  onClick={() => changeSubject(id)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    subject === id
                      ? 'bg-[#2f5d50] text-white shadow-xs'
                      : 'text-[#66756c] hover:text-[#243026]'
                  }`}
                >
                  {SUBJECT_LABELS[id]}
                </button>
              ))}
            </div>
          </div>

          <ImageUploader
            imageDataUrl={imageDataUrl}
            disabled={loading}
            onNotice={setNotice}
            onChange={(dataUrl) => {
              if (dataUrl && !confirmReplace()) return
              if (!dataUrl && dirty && !confirmReplace()) return
              setImageDataUrl(dataUrl)
              setDrafts([emptyDraft(dataUrl, undefined, subject)])
              setActiveIndex(0)
              setHasResult(false)
              setMode('guide')
            }}
          />

          <div className="mt-3 flex gap-2">
            <button
              className="flex-1 rounded-xl bg-[#2f5d50] py-3 px-4 text-sm font-bold text-white shadow-sm hover:bg-[#254b40] disabled:opacity-60 transition-colors"
              type="button"
              disabled={loading}
              onClick={() => void handleRecognize()}
            >
              {loading ? '🔍 正在智能批改中…' : `🚀 开始批改${SUBJECT_LABELS[subject]}作业`}
            </button>
            {loading && (
              <button
                className="rounded-xl border border-[#9a6b4a] px-4 py-3 text-xs font-semibold text-[#9a6b4a]"
                type="button"
                onClick={handleCancelRecognize}
              >
                取消
              </button>
            )}
          </div>
        </section>
      ) : (
        /* 识别完成后：图片折叠为紧凑状态条 */
        <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2 border border-[#ece6d8] shadow-2xs text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="rounded bg-[#2f5d50]/10 px-1.5 py-0.5 text-[11px] font-bold text-[#2f5d50]">
              {SUBJECT_LABELS[subject]}
            </span>
            <span className="text-[#66756c] truncate">
              {drafts.length > 1 ? `整页共 ${drafts.length} 题` : '单题作业'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {imageDataUrl && (
              <button
                type="button"
                onClick={() => setShowImageModal(true)}
                className="rounded-lg border border-[#d9d2c3] px-2 py-1 text-xs text-[#2f5d50] bg-[#fbfaf5]"
              >
                🖼️ 看原图
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (!confirmReplace()) return
                setImageDataUrl('')
                setDrafts([emptyDraft('', undefined, subject)])
                setActiveIndex(0)
                setHasResult(false)
                setMode('guide')
              }}
              className="rounded-lg border border-[#e0d9cb] px-2 py-1 text-xs text-[#66756c] hover:bg-[#fbfaf5]"
            >
              重新拍照
            </button>
          </div>
        </div>
      )}

      {/* 原图弹窗查看 */}
      {showImageModal && imageDataUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3"
          onClick={() => setShowImageModal(false)}
        >
          <div className="relative max-h-[90vh] max-w-lg rounded-2xl bg-white p-2" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/50 text-white text-xs"
              onClick={() => setShowImageModal(false)}
            >
              ✕
            </button>
            <img src={imageDataUrl} alt="作业原图" className="max-h-[85vh] w-full object-contain rounded-xl" />
          </div>
        </div>
      )}

      {/* 识别与批改结果主区域 */}
      {hasResult && (
        <>
          {/* 多题滑动切换 Tab（多题时显示） */}
          {drafts.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {drafts.map((d, index) => {
                const isWrong = d.result.is_correct === '错误' || d.result.is_correct === '部分正确'
                const isCorrect = d.result.is_correct === '正确'
                const isSelected = activeIndex === index

                return (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition-all ${
                      isSelected
                        ? 'bg-[#2f5d50] text-white shadow-xs'
                        : 'border border-[#e0d9cb] bg-white text-[#66756c]'
                    }`}
                  >
                    <span>第 {index + 1} 题</span>
                    <span className="text-[10px]">
                      {isCorrect ? '✅' : isWrong ? '❌' : '❓'}
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {/* 题目内容卡片 */}
          <section className="rounded-2xl bg-white p-3.5 sm:p-5 shadow-xs border border-[#ece6d8]">
            {/* 卡片头部信息 */}
            <div className="flex items-center justify-between border-b border-[#f5f1e8] pb-2.5 mb-3">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="rounded bg-[#2f5d50]/10 px-1.5 py-0.5 text-[11px] font-bold text-[#2f5d50]">
                  第 {activeIndex + 1} 题
                </span>
                <h2 className="text-xs sm:text-sm font-bold text-[#243026] truncate">
                  【{currentDraft.result.knowledge_point}】
                </h2>
              </div>
              <span
                className={`shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-bold ${
                  currentDraft.parentConfirmed
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-[#efe8d8] text-[#5d4a28]'
                }`}
              >
                {statusText}
              </span>
            </div>

            {/* 手机端分段切换 Tabs：[ 📝 题目与批改 ] vs [ 💡 启发讲解 ] */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#fbfaf5] rounded-xl border border-[#eee7d8] mb-3">
              <button
                type="button"
                onClick={() => setViewTab('editor')}
                className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                  viewTab === 'editor'
                    ? 'bg-white text-[#2f5d50] shadow-xs border border-[#e0d9cb]'
                    : 'text-[#66756c] hover:text-[#243026]'
                }`}
              >
                📝 题目与批改
              </button>
              <button
                type="button"
                onClick={() => setViewTab('explanation')}
                className={`rounded-lg py-1.5 text-xs font-bold transition-all ${
                  viewTab === 'explanation'
                    ? 'bg-white text-[#2f5d50] shadow-xs border border-[#e0d9cb]'
                    : 'text-[#66756c] hover:text-[#243026]'
                }`}
              >
                💡 启发讲解 & 步骤
              </button>
            </div>

            {/* 分段内容渲染 */}
            {viewTab === 'editor' ? (
              <ResultEditor
                result={currentDraft.result}
                onChange={updateActiveResult}
                errorCause={currentDraft.errorCause}
                errorCauseNote={currentDraft.errorCauseNote}
                notes={currentDraft.notes}
                needReview={currentDraft.needReview}
                onMetaChange={updateActiveMeta}
                subject={currentDraft.subject}
              />
            ) : (
              <ExplanationPanel
                result={currentDraft.result}
                mode={mode}
                onModeChange={setMode}
              />
            )}
          </section>

          {/* 手机端常驻吸底操作栏（Sticky Action Bar） */}
          <div className="fixed inset-x-0 bottom-12 sm:bottom-0 z-20 bg-white/95 backdrop-blur-md border-t border-[#ece6d8] px-3 py-2 shadow-lg">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-2">
              <button
                className="flex-1 rounded-xl bg-[#2f5d50] py-2.5 px-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#254b40] transition-colors"
                type="button"
                onClick={() => handleSaveSingle(false)}
              >
                ✓ 存记录
              </button>
              <button
                className="flex-1 rounded-xl border border-[#9a6b4a] bg-[#fbfaf5] py-2.5 px-3 text-xs sm:text-sm font-bold text-[#9a6b4a] hover:bg-[#f5ede1] transition-colors"
                type="button"
                onClick={() => handleSaveSingle(true)}
              >
                📕 入错题本
              </button>
              {drafts.length > 1 && (
                <button
                  className="rounded-xl bg-linear-to-r from-[#d97706] to-[#b45309] py-2.5 px-3 text-xs sm:text-sm font-bold text-white shadow-xs hover:opacity-95 transition-opacity shrink-0"
                  type="button"
                  onClick={handleBatchSave}
                >
                  ⚡ 全部归档
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

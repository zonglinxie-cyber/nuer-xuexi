import { useMemo, useState } from 'react'
import { parseSubjectId, printSheetTitle } from '../data/subjects'
import type { WrongQuestion } from '../types'
import MathView from './MathView'

interface PrintSheetModalProps {
  questions: WrongQuestion[]
  onClose: () => void
}

export default function PrintSheetModal({ questions, onClose }: PrintSheetModalProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => questions.map((q) => q.id))
  const [paperTitle, setPaperTitle] = useState(() => {
    const subjects = new Set(questions.map((item) => parseSubjectId(item.subject)))
    return subjects.size === 1 ? printSheetTitle([...subjects][0]) : printSheetTitle('all')
  })
  const [includeImage, setIncludeImage] = useState(false)
  const [showAnswerKey, setShowAnswerKey] = useState(false)

  const selectedQuestions = useMemo(() => {
    return questions.filter((q) => selectedIds.includes(q.id))
  }, [questions, selectedIds])

  function toggleSelectAll() {
    if (selectedIds.length === questions.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(questions.map((q) => q.id))
    }
  }

  function handleSelectUnreviewed() {
    setSelectedIds(questions.filter((q) => q.reviewStatus !== '已掌握').map((q) => q.id))
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-2 sm:p-4 print:p-0 print:static print:bg-white">
      {/* 打印专用 CSS 样式 */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-sheet-area, #print-sheet-area * {
            visibility: visible;
          }
          #print-sheet-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            padding: 20mm !important;
            margin: 0 !important;
            font-size: 15pt !important;
            line-height: 1.8 !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break {
            page-break-before: always;
          }
        }
      `}</style>

      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl overflow-hidden print:max-h-none print:shadow-none print:rounded-none">
        {/* 顶部控制栏 (打印时隐藏) */}
        <div className="no-print flex items-center justify-between border-b border-[#ece6d8] bg-[#fbfaf5] px-3.5 py-2.5 sm:px-6 sm:py-4">
          <div>
            <h3 className="text-xs sm:text-lg font-bold text-[#243026]">🖨️ 生成 A4 错题重做练习单</h3>
            <p className="text-[11px] text-[#66756c] mt-0.5">
              已选 {selectedQuestions.length} / {questions.length} 题 · 导出空白练习单
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded-xl bg-[#2f5d50] px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-xs hover:bg-[#23483e]"
              disabled={selectedQuestions.length === 0}
              onClick={handlePrint}
            >
              打印 / 导出 PDF
            </button>
            <button
              type="button"
              className="text-[#66756c] hover:text-[#243026] text-base px-1"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 中间内容区域 */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 print:p-0">
          {/* 配置工具栏 (打印时隐藏) */}
          <div className="no-print mb-4 rounded-xl bg-[#f8f6f0] p-3 border border-[#e8e2d4] space-y-2.5">
            <div className="grid gap-2 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold text-[#4a5850]">试卷标题</label>
                <input
                  type="text"
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9d2c3] bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[#2f5d50]"
                />
              </div>
              <div className="flex items-end gap-1.5">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="rounded-lg border border-[#2f5d50] px-2.5 py-1.5 text-xs font-bold text-[#2f5d50] bg-white"
                >
                  {selectedIds.length === questions.length ? '取消全选' : '全选'}
                </button>
                <button
                  type="button"
                  onClick={handleSelectUnreviewed}
                  className="rounded-lg border border-[#9a6b4a] px-2.5 py-1.5 text-xs font-bold text-[#9a6b4a] bg-white"
                >
                  只选未掌握
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-xs font-medium text-[#4a5850] pt-0.5">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeImage}
                  onChange={(e) => setIncludeImage(e.target.checked)}
                />
                包含题目原始照片
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAnswerKey}
                  onChange={(e) => setShowAnswerKey(e.target.checked)}
                />
                附带家长参考答案与解析页
              </label>
            </div>
          </div>

          {/* 试卷打印渲染区 */}
          <div
            id="print-sheet-area"
            className="rounded-xl border border-[#ece6d8] bg-white p-6 shadow-xs print:border-none print:p-0 print:shadow-none font-serif text-black"
          >
            {/* 试卷页眉 */}
            <div className="border-b-2 border-black pb-4 text-center">
              <h1 className="text-xl sm:text-2xl font-bold tracking-wide">{paperTitle}</h1>
              <div className="mt-3 flex justify-between text-xs sm:text-sm font-sans">
                <span>班级：___________</span>
                <span>姓名：___________</span>
                <span>日期：___________</span>
                <span>得分：___________</span>
              </div>
            </div>

            {/* 试卷题目列表（抹除原答案，提供练习答题区） */}
            <div className="mt-6 space-y-8">
              {selectedQuestions.length === 0 ? (
                <p className="text-center text-sm text-gray-500 py-8">请至少勾选一道题目以生成试卷。</p>
              ) : (
                selectedQuestions.map((q, idx) => (
                  <div key={q.id} className="space-y-3 break-inside-avoid">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-base">{idx + 1}.</span>
                      <div className="flex-1 text-sm sm:text-base leading-relaxed">
                        <MathView text={q.correctedText || q.originalText} />
                      </div>
                    </div>

                    {includeImage && q.imageDataUrl && (
                      <div className="my-2 max-w-sm pl-6">
                        <img src={q.imageDataUrl} alt="原图" className="max-h-40 object-contain border" />
                      </div>
                    )}

                    {/* 学生作答空白留白区 */}
                    <div className="ml-6 mt-3 rounded-lg border-2 border-dashed border-gray-300 p-4 min-h-24 bg-gray-50/50 print:bg-transparent print:min-h-28 flex flex-col justify-between text-xs text-gray-400">
                      <span className="print:hidden">【答题与演算区域】</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* 答案与解析页（选配） */}
            {showAnswerKey && selectedQuestions.length > 0 && (
              <div className="mt-12 pt-8 border-t-2 border-black page-break space-y-6">
                <div className="text-center border-b pb-3">
                  <h2 className="text-lg font-bold">📖 家长参考答案与解题思路解析</h2>
                  <p className="text-xs text-gray-500 mt-1">（供家长课后批改与讲题参考）</p>
                </div>

                <div className="space-y-5 text-xs sm:text-sm">
                  {selectedQuestions.map((q, idx) => (
                    <div key={`ans-${q.id}`} className="rounded-lg bg-gray-50 p-3 border border-gray-200 space-y-1.5 break-inside-avoid">
                      <div className="font-bold text-gray-800 flex justify-between">
                        <span>第 {idx + 1} 题【{q.knowledgePoint}】</span>
                        {q.errorCause && <span className="text-amber-800 font-normal">错因：{q.errorCause}</span>}
                      </div>
                      <div className="text-emerald-800 font-semibold">
                        <strong>参考答案：</strong>
                        <MathView text={q.correctAnswer || '无'} as="span" />
                      </div>
                      {q.explanation && (
                        <div className="text-gray-700 text-xs">
                          <strong>思路点拨：</strong>
                          <MathView text={q.explanation} as="span" />
                        </div>
                      )}
                      {q.stepByStep.length > 0 && (
                        <div className="text-gray-600 text-xs pl-2 border-l-2 border-gray-300 mt-1">
                          <strong>步骤：</strong> {q.stepByStep.join('；')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

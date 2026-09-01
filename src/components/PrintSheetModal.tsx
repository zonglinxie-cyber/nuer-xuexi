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

      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden print:max-h-none print:shadow-none print:rounded-none">
        {/* 顶部控制栏 (打印时隐藏) */}
        <div className="no-print flex items-center justify-between border-b border-[#ece6d8] bg-[#fbfaf5] px-6 py-4">
          <div>
            <h3 className="text-xl font-bold text-[#243026]">🖨️ 生成 A4 错题重做练习单</h3>
            <p className="text-xs text-[#66756c] mt-0.5">
              已选 {selectedQuestions.length} / {questions.length} 道题 · 支持导出空白卷让孩子重新做
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="rounded-xl bg-[#2f5d50] px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#23483e]"
              disabled={selectedQuestions.length === 0}
              onClick={handlePrint}
            >
              打印 / 导出 PDF
            </button>
            <button
              type="button"
              className="text-[#66756c] hover:text-[#243026] text-xl px-2"
              onClick={onClose}
            >
              ✕
            </button>
          </div>
        </div>

        {/* 中间内容区域 */}
        <div className="flex-1 overflow-y-auto p-6 print:p-0">
          {/* 配置工具栏 (打印时隐藏) */}
          <div className="no-print mb-6 rounded-2xl bg-[#f8f6f0] p-4 border border-[#e8e2d4] space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-[#4a5850]">试卷标题</label>
                <input
                  type="text"
                  value={paperTitle}
                  onChange={(e) => setPaperTitle(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9d2c3] bg-white px-3 py-2 text-sm"
                />
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <button
                  type="button"
                  onClick={toggleSelectAll}
                  className="rounded-xl border border-[#2f5d50] px-3 py-2 text-xs text-[#2f5d50] bg-white"
                >
                  {selectedIds.length === questions.length ? '取消全选' : '全选题目'}
                </button>
                <button
                  type="button"
                  onClick={handleSelectUnreviewed}
                  className="rounded-xl border border-[#9a6b4a] px-3 py-2 text-xs text-[#9a6b4a] bg-white"
                >
                  只选未掌握错题
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs font-medium text-[#4a5850] pt-1">
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

          {/* 实际打印卷区域 (A4 页面样式) */}
          <div id="print-sheet-area" className="mx-auto max-w-2xl bg-white text-black p-4 sm:p-8">
            {/* 试卷抬头 */}
            <div className="text-center border-b-2 border-black pb-4">
              <h1 className="text-2xl font-bold tracking-wider">{paperTitle}</h1>
              <div className="mt-3 flex justify-between text-sm font-medium px-4">
                <span>姓名：__________</span>
                <span>班级：__________</span>
                <span>日期：__________</span>
                <span>得分：__________</span>
              </div>
            </div>

            {/* 试卷说明 */}
            <div className="my-3 text-xs text-gray-500 italic">
              * 温馨提示：认真审题，先自己做一遍，书写整洁规范。
            </div>

            {/* 题目列表 */}
            {selectedQuestions.length === 0 ? (
              <p className="text-center text-gray-400 py-10">还没有选择任何错题</p>
            ) : (
              <div className="space-y-8 mt-6">
                {selectedQuestions.map((q, index) => (
                  <div key={q.id} className="break-inside-avoid">
                    <div className="flex items-start gap-2">
                      <span className="font-bold shrink-0">{index + 1}.</span>
                      <div className="flex-1">
                        <span className="text-xs text-gray-400 no-print ml-1">
                          [{q.knowledgePoint}]
                        </span>
                        <div className="mt-0.5 text-base font-normal leading-relaxed">
                          <MathView text={q.correctedText || q.originalText} />
                        </div>
                        {includeImage && q.imageDataUrl ? (
                          <img
                            src={q.imageDataUrl}
                            alt="题图"
                            className="mt-2 max-h-48 rounded border border-gray-200 object-contain"
                          />
                        ) : null}

                        {/* 学生答题空白留白区 */}
                        <div className="mt-4 h-24 border-b border-dashed border-gray-300 relative">
                          <span className="absolute bottom-1 right-2 text-xs text-gray-300 font-sans">
                            答题区域
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 家长参考答案与解析页 */}
            {showAnswerKey && selectedQuestions.length > 0 && (
              <div className="page-break mt-12 pt-8 border-t-2 border-dashed border-gray-400">
                <div className="text-center pb-4">
                  <h2 className="text-xl font-bold">📖 参考答案与解析</h2>
                  <p className="text-xs text-gray-500 mt-1">（供家长核对辅导使用）</p>
                </div>

                <div className="space-y-6 mt-4">
                  {selectedQuestions.map((q, index) => (
                    <div key={q.id} className="rounded-lg bg-gray-50 p-3.5 text-sm leading-6">
                      <p className="font-bold text-gray-800">
                        第 {index + 1} 题【{q.knowledgePoint}】：
                      </p>
                      <p className="mt-1 text-emerald-800 font-medium">
                        <strong>正确答案：</strong>
                        <MathView text={q.correctAnswer || '暂无'} as="span" />
                      </p>
                      {q.explanation && (
                        <div className="mt-1 text-gray-600">
                          <strong>思路解析：</strong>
                          <MathView text={q.explanation} />
                        </div>
                      )}
                      {q.errorCause && (
                        <p className="mt-1 text-amber-700 text-xs">
                          原题错因回顾：{q.errorCause} {q.errorCauseNote ? `(${q.errorCauseNote})` : ''}
                        </p>
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

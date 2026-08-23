export type ConfidenceLevel = '高' | '中' | '低'
export type QuestionType = '计算题' | '应用题' | '图形题' | '填空题' | '选择题' | '其他'
export type Judgement = '正确' | '错误' | '部分正确' | '无法判断' | '需家长确认'
export type ReviewStatus = '未复习' | '已复习' | '已掌握'
export type ExplanationMode = 'guide' | 'answer'

export type ErrorCause =
  | '题意没读懂'
  | '计算错误'
  | '单位错误'
  | '公式/方法不会'
  | '粗心漏写'
  | '概念不清'
  | '其他'

export interface KnowledgePoint {
  id: string
  name: string
  unit: string
  description: string
}

export interface AiSettings {
  apiKey: string
  model: string
  baseUrl: string
}

export interface RecognitionResult {
  recognized_text: string
  confidence_level: ConfidenceLevel
  question_type: QuestionType
  knowledge_point: string
  knowledge_points: string[]
  textbook_unit: string
  student_answer: string
  ai_answer: string
  is_correct: Judgement
  explanation: string
  step_by_step: string[]
  hints: string[]
  known_conditions: string[]
  asked_question: string
  need_human_check: boolean
  warning: string
}

export interface DraftQuestion {
  id: string
  imageDataUrl: string
  createdAt: string
  originalText: string
  parentConfirmed: boolean
  savedAsWrong: boolean
  needReview: boolean
  errorCause: ErrorCause | ''
  errorCauseNote: string
  notes: string
  result: RecognitionResult
}

export interface WrongQuestion {
  id: string
  imageDataUrl: string
  originalText: string
  correctedText: string
  studentAnswer: string
  correctAnswer: string
  explanation: string
  stepByStep: string[]
  knowledgePoint: string
  knowledgePoints: string[]
  textbookUnit: string
  errorCause: ErrorCause | ''
  errorCauseNote: string
  savedAt: string
  reviewStatus: ReviewStatus
  lastReviewedAt: string
  notes: string
  sourceRecordId: string
}

export interface StudyRecord {
  id: string
  createdAt: string
  questionText: string
  questionType: QuestionType
  knowledgePoint: string
  knowledgePoints: string[]
  judgement: Judgement
  savedAsWrong: boolean
  parentConfirmed: boolean
  imageDataUrl: string
}

export interface AppBackup {
  version: string
  exportedAt: string
  settings: Omit<AiSettings, 'apiKey'>
  records: StudyRecord[]
  wrongQuestions: WrongQuestion[]
}

export type AppNotice = {
  type: 'info' | 'success' | 'warning' | 'error'
  message: string
}

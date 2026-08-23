import type { AppBackup, ErrorCause, Judgement, QuestionType, ReviewStatus, StudyRecord, WrongQuestion } from '../types'
import { loadSettings } from './settingsService'

const RECORDS_KEY = 'grade4-math-helper-records-v1'
const WRONG_KEY = 'grade4-math-helper-wrong-v1'
const APP_VERSION = '0.1.0'

const QUESTION_TYPES: QuestionType[] = ['计算题', '应用题', '图形题', '填空题', '选择题', '其他']
const JUDGEMENTS: Judgement[] = ['正确', '错误', '部分正确', '无法判断', '需家长确认']
const REVIEW_STATUSES: ReviewStatus[] = ['未复习', '已复习', '已掌握']
const ERROR_CAUSES: ErrorCause[] = [
  '题意没读懂',
  '计算错误',
  '单位错误',
  '公式/方法不会',
  '粗心漏写',
  '概念不清',
  '其他',
]

export class StorageQuotaError extends Error {
  constructor(
    message = '本地存储空间不够了。请先到设置页导出备份，再到错题本里删掉一些带原图的旧题。',
  ) {
    super(message)
    this.name = 'StorageQuotaError'
  }
}

export function isQuotaExceeded(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const err = error as { name?: string; code?: number; message?: string }
  return (
    err.name === 'QuotaExceededError' ||
    err.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    err.code === 22 ||
    err.code === 1014 ||
    (typeof err.message === 'string' && err.message.toLowerCase().includes('exceeded the quota'))
  )
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item).trim()).filter(Boolean)
}

function pickEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function estimateBytes(text: string): number {
  return new Blob([text]).size
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (error) {
    if (isQuotaExceeded(error)) {
      throw new StorageQuotaError()
    }
    throw error
  }
}

export function sanitizeRecord(raw: unknown): StudyRecord {
  const item = raw && typeof raw === 'object' ? (raw as Partial<StudyRecord>) : {}
  const knowledgePoint = asString(item.knowledgePoint, '综合与实践')
  const knowledgePoints = asStringArray(item.knowledgePoints)
  return {
    id: asString(item.id) || `q_${Date.now()}`,
    createdAt: asString(item.createdAt) || new Date().toISOString(),
    questionText: asString(item.questionText),
    questionType: pickEnum(item.questionType, QUESTION_TYPES, '其他'),
    knowledgePoint,
    knowledgePoints: knowledgePoints.length > 0 ? knowledgePoints : [knowledgePoint],
    judgement: pickEnum(item.judgement, JUDGEMENTS, '无法判断'),
    savedAsWrong: Boolean(item.savedAsWrong),
    parentConfirmed: Boolean(item.parentConfirmed),
    imageDataUrl: '',
  }
}

export function sanitizeWrongQuestion(raw: unknown): WrongQuestion {
  const item = raw && typeof raw === 'object' ? (raw as Partial<WrongQuestion>) : {}
  const knowledgePoint = asString(item.knowledgePoint, '综合与实践')
  const knowledgePoints = asStringArray(item.knowledgePoints)
  const errorCause = pickEnum(item.errorCause, ERROR_CAUSES, '其他')
  return {
    id: asString(item.id) || `q_${Date.now()}`,
    imageDataUrl: asString(item.imageDataUrl),
    originalText: asString(item.originalText),
    correctedText: asString(item.correctedText),
    studentAnswer: asString(item.studentAnswer),
    correctAnswer: asString(item.correctAnswer),
    explanation: asString(item.explanation),
    stepByStep: asStringArray(item.stepByStep),
    knowledgePoint,
    knowledgePoints: knowledgePoints.length > 0 ? knowledgePoints : [knowledgePoint],
    textbookUnit: asString(item.textbookUnit, '人教版四年级上册'),
    errorCause: asString(item.errorCause) ? errorCause : '',
    errorCauseNote: asString(item.errorCauseNote),
    savedAt: asString(item.savedAt) || new Date().toISOString(),
    reviewStatus: pickEnum(item.reviewStatus, REVIEW_STATUSES, '未复习'),
    lastReviewedAt: asString(item.lastReviewedAt),
    notes: asString(item.notes),
    sourceRecordId: asString(item.sourceRecordId) || asString(item.id),
  }
}

export function parseBackup(payload: unknown): { records: StudyRecord[]; wrongQuestions: WrongQuestion[] } {
  if (!payload || typeof payload !== 'object') {
    throw new Error('备份文件格式不正确。')
  }
  const data = payload as Partial<AppBackup>
  if (!Array.isArray(data.records) || !Array.isArray(data.wrongQuestions)) {
    throw new Error('备份文件缺少学习记录或错题本。')
  }
  return {
    records: data.records.map(sanitizeRecord),
    wrongQuestions: data.wrongQuestions.map(sanitizeWrongQuestion),
  }
}

export function loadRecords(): StudyRecord[] {
  const records = readJson<StudyRecord[]>(RECORDS_KEY, [])
  if (!Array.isArray(records)) return []
  const sanitized = records.map(sanitizeRecord)
  const hadImages = records.some((item) => Boolean(item?.imageDataUrl))
  if (hadImages) {
    try {
      writeJson(RECORDS_KEY, sanitized)
    } catch {
      // 清旧图失败时仍返回不含原图的内存副本，避免统计把幽灵图片算进去。
    }
  }
  return sanitized
}

export function saveRecords(records: StudyRecord[]): void {
  writeJson(RECORDS_KEY, records.map(sanitizeRecord))
}

export function upsertRecord(record: StudyRecord): StudyRecord[] {
  const records = loadRecords()
  const next = sanitizeRecord(record)
  const index = records.findIndex((item) => item.id === next.id)
  if (index >= 0) {
    records[index] = next
  } else {
    records.unshift(next)
  }
  saveRecords(records)
  return records
}

export function deleteRecord(id: string): StudyRecord[] {
  const records = loadRecords().filter((item) => item.id !== id)
  saveRecords(records)
  return records
}

export function loadWrongQuestions(): WrongQuestion[] {
  const items = readJson<WrongQuestion[]>(WRONG_KEY, [])
  if (!Array.isArray(items)) return []
  return items.map(sanitizeWrongQuestion)
}

export function saveWrongQuestions(items: WrongQuestion[]): void {
  writeJson(WRONG_KEY, items.map(sanitizeWrongQuestion))
}

export function upsertWrongQuestion(item: WrongQuestion): WrongQuestion[] {
  const items = loadWrongQuestions()
  const next = sanitizeWrongQuestion(item)
  const index = items.findIndex((current) => current.id === next.id)
  if (index >= 0) {
    items[index] = next
  } else {
    items.unshift(next)
  }
  saveWrongQuestions(items)
  return items
}

export function deleteWrongQuestion(id: string): WrongQuestion[] {
  const items = loadWrongQuestions()
  const removed = items.find((item) => item.id === id)
  const next = items.filter((item) => item.id !== id)
  saveWrongQuestions(next)
  if (removed) {
    const records = loadRecords()
    let changed = false
    const updated = records.map((record) => {
      if (record.id === removed.id || record.id === removed.sourceRecordId) {
        changed = true
        return { ...record, savedAsWrong: false }
      }
      return record
    })
    if (changed) saveRecords(updated)
  }
  return next
}

export function getLocalStorageUsage(): {
  bytes: number
  recordCount: number
  wrongCount: number
  imageCount: number
} {
  let bytes = 0
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (!key) continue
    bytes += estimateBytes(key + (localStorage.getItem(key) ?? ''))
  }
  const records = loadRecords()
  const wrongQuestions = loadWrongQuestions()
  return {
    bytes,
    recordCount: records.length,
    wrongCount: wrongQuestions.length,
    imageCount: wrongQuestions.filter((item) => Boolean(item.imageDataUrl)).length,
  }
}

export function exportBackup(): AppBackup {
  const settings = loadSettings()
  return {
    version: APP_VERSION,
    exportedAt: new Date().toISOString(),
    settings: {
      model: settings.model,
      baseUrl: settings.baseUrl,
    },
    records: loadRecords(),
    wrongQuestions: loadWrongQuestions(),
  }
}

export function getImportSummary(payload: unknown): {
  records: StudyRecord[]
  wrongQuestions: WrongQuestion[]
  incomingRecords: number
  incomingWrong: number
  currentRecords: number
  currentWrong: number
} {
  const parsed = parseBackup(payload)
  return {
    ...parsed,
    incomingRecords: parsed.records.length,
    incomingWrong: parsed.wrongQuestions.length,
    currentRecords: loadRecords().length,
    currentWrong: loadWrongQuestions().length,
  }
}

export function importBackup(payload: unknown): { records: StudyRecord[]; wrongQuestions: WrongQuestion[] } {
  const parsed = parseBackup(payload)
  const previousRecords = loadRecords()
  const previousWrong = loadWrongQuestions()
  try {
    saveWrongQuestions(parsed.wrongQuestions)
    saveRecords(parsed.records)
  } catch (error) {
    try {
      saveRecords(previousRecords)
      saveWrongQuestions(previousWrong)
    } catch {
      // 回滚失败时仍抛出原始错误，让页面提示配额或格式问题。
    }
    throw error
  }
  return parsed
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

import {
  ALL_ERROR_CAUSES,
  ALL_QUESTION_TYPES,
  defaultKnowledgeName,
  defaultTextbookUnit,
  parseSubjectId,
} from '../data/subjects'
import type {
  AppBackup,
  ErrorCause,
  Judgement,
  QuestionType,
  ReviewStatus,
  StudyRecord,
  UserRewardStats,
  WrongQuestion,
} from '../types'
import {
  bulkPutToStore,
  clearStore,
  deleteFromStore,
  getAllFromStore,
  getRewardStatsFromDB,
  getStorageStatsFromDB,
  isIndexedDbAvailable,
  putToStore,
  saveRewardStatsToDB,
  STORES,
} from './dbService'
import { loadSettings } from './settingsService'

const RECORDS_KEY = 'grade4-math-helper-records-v1'
const WRONG_KEY = 'grade4-math-helper-wrong-v1'
const REWARDS_KEY = 'grade4-math-helper-rewards-v1'
const APP_VERSION = '0.3.0'

const QUESTION_TYPES: QuestionType[] = ALL_QUESTION_TYPES
const JUDGEMENTS: Judgement[] = ['正确', '错误', '部分正确', '无法判断', '需家长确认']
const REVIEW_STATUSES: ReviewStatus[] = ['未复习', '已复习', '已掌握']
const ERROR_CAUSES: ErrorCause[] = ALL_ERROR_CAUSES

// 内存单例缓存，保证同步组件渲染毫秒级响应
let cachedRecords: StudyRecord[] | null = null
let cachedWrongQuestions: WrongQuestion[] | null = null
let cachedRewardStats: UserRewardStats | null = null
let initPromise: Promise<void> | null = null

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export class StorageQuotaError extends Error {
  constructor(message = '本地存储空间不足。系统已自动启用 IndexedDB 扩容。') {
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

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // LocalStorage 写满时静默忽略，依赖 IndexedDB 持久化
  }
}

export function sanitizeRecord(raw: unknown): StudyRecord {
  const item = raw && typeof raw === 'object' ? (raw as Partial<StudyRecord>) : {}
  const subject = parseSubjectId(item.subject)
  const knowledgePoint = asString(item.knowledgePoint, defaultKnowledgeName(subject))
  const knowledgePoints = asStringArray(item.knowledgePoints)
  return {
    id: asString(item.id) || `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    subject,
    createdAt: asString(item.createdAt) || new Date().toISOString(),
    questionText: asString(item.questionText),
    questionType: pickEnum(item.questionType, QUESTION_TYPES, '其他'),
    knowledgePoint,
    knowledgePoints: knowledgePoints.length > 0 ? knowledgePoints : [knowledgePoint],
    judgement: pickEnum(item.judgement, JUDGEMENTS, '无法判断'),
    savedAsWrong: Boolean(item.savedAsWrong),
    parentConfirmed: Boolean(item.parentConfirmed),
    // 学习记录不存原图：整页作业图只留在错题本，避免 IndexedDB 膨胀、列表变慢
    imageDataUrl: '',
  }
}

export function sanitizeWrongQuestion(raw: unknown): WrongQuestion {
  const item = raw && typeof raw === 'object' ? (raw as Partial<WrongQuestion>) : {}
  const subject = parseSubjectId(item.subject)
  const knowledgePoint = asString(item.knowledgePoint, defaultKnowledgeName(subject))
  const knowledgePoints = asStringArray(item.knowledgePoints)
  const errorCause = pickEnum(item.errorCause, ERROR_CAUSES, '其他')
  return {
    id: asString(item.id) || `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    subject,
    imageDataUrl: asString(item.imageDataUrl),
    originalText: asString(item.originalText),
    correctedText: asString(item.correctedText),
    studentAnswer: asString(item.studentAnswer),
    correctAnswer: asString(item.correctAnswer),
    explanation: asString(item.explanation),
    stepByStep: asStringArray(item.stepByStep),
    knowledgePoint,
    knowledgePoints: knowledgePoints.length > 0 ? knowledgePoints : [knowledgePoint],
    textbookUnit: asString(item.textbookUnit, defaultTextbookUnit(subject)),
    errorCause: asString(item.errorCause) ? errorCause : '',
    errorCauseNote: asString(item.errorCauseNote),
    savedAt: asString(item.savedAt) || new Date().toISOString(),
    reviewStatus: pickEnum(item.reviewStatus, REVIEW_STATUSES, '未复习'),
    lastReviewedAt: asString(item.lastReviewedAt),
    notes: asString(item.notes),
    sourceRecordId: asString(item.sourceRecordId) || asString(item.id),
  }
}

async function runInit(): Promise<void> {
  try {
    const idbRecords = await getAllFromStore<StudyRecord>(STORES.RECORDS)
    const idbWrong = await getAllFromStore<WrongQuestion>(STORES.WRONG)

    if (idbRecords.length > 0 || idbWrong.length > 0) {
      cachedRecords = idbRecords.map(sanitizeRecord)
      cachedWrongQuestions = idbWrong.map(sanitizeWrongQuestion)
      if (idbRecords.some((item) => Boolean(item.imageDataUrl))) {
        void bulkPutToStore(STORES.RECORDS, cachedRecords)
      }
    } else {
      const localRecords = readJson<StudyRecord[]>(RECORDS_KEY, []).map(sanitizeRecord)
      const localWrong = readJson<WrongQuestion[]>(WRONG_KEY, []).map(sanitizeWrongQuestion)

      if (localRecords.length > 0) {
        await bulkPutToStore(STORES.RECORDS, localRecords)
      }
      if (localWrong.length > 0) {
        await bulkPutToStore(STORES.WRONG, localWrong)
      }

      cachedRecords = localRecords
      cachedWrongQuestions = localWrong
    }

    const rewardStats = await getRewardStatsFromDB()
    if (rewardStats) {
      cachedRewardStats = rewardStats
    } else {
      const localReward = readJson<UserRewardStats | null>(REWARDS_KEY, null)
      if (localReward) {
        cachedRewardStats = localReward
        await saveRewardStatsToDB(localReward)
      }
    }
  } catch (err) {
    console.warn('[Storage] initStorageAsync fallback to localStorage', err)
    if (!cachedRecords) cachedRecords = readJson<StudyRecord[]>(RECORDS_KEY, []).map(sanitizeRecord)
    if (!cachedWrongQuestions) {
      cachedWrongQuestions = readJson<WrongQuestion[]>(WRONG_KEY, []).map(sanitizeWrongQuestion)
    }
  }
}

export function initStorageAsync(): Promise<void> {
  if (!initPromise) initPromise = runInit()
  return initPromise
}

if (typeof window !== 'undefined') {
  void initStorageAsync()
}

function persistRecordsLocal(records: StudyRecord[]): void {
  cachedRecords = records
  writeJson(
    RECORDS_KEY,
    records.map((item) => ({ ...item, imageDataUrl: '' })),
  )
}

function persistWrongLocal(items: WrongQuestion[]): void {
  cachedWrongQuestions = items
  writeJson(
    WRONG_KEY,
    items.map((item) => ({ ...item, imageDataUrl: '' })),
  )
}

export function loadRecords(): StudyRecord[] {
  if (cachedRecords) return cachedRecords
  const records = readJson<StudyRecord[]>(RECORDS_KEY, [])
  const sanitized = Array.isArray(records) ? records.map(sanitizeRecord) : []
  // 初始化未完成时不要写入缓存，避免用无图的 localStorage 覆盖 IndexedDB
  if (!initPromise) cachedRecords = sanitized
  return sanitized
}

export function saveRecords(records: StudyRecord[]): void {
  const sanitized = records.map(sanitizeRecord)
  persistRecordsLocal(sanitized)
  void bulkPutToStore(STORES.RECORDS, sanitized).catch((err) => {
    console.warn('[Storage] saveRecords IndexedDB write failed', err)
  })
}

export async function upsertRecord(record: StudyRecord): Promise<StudyRecord[]> {
  const records = loadRecords().slice()
  const next = sanitizeRecord(record)
  const index = records.findIndex((item) => item.id === next.id)
  if (index >= 0) {
    records[index] = next
  } else {
    records.unshift(next)
  }
  await putToStore(STORES.RECORDS, next)
  persistRecordsLocal(records)
  return records
}

export async function deleteRecord(id: string): Promise<StudyRecord[]> {
  const records = loadRecords().filter((item) => item.id !== id)
  await deleteFromStore(STORES.RECORDS, id)
  persistRecordsLocal(records)
  return records
}

export function loadWrongQuestions(): WrongQuestion[] {
  if (cachedWrongQuestions) return cachedWrongQuestions
  const items = readJson<WrongQuestion[]>(WRONG_KEY, [])
  const sanitized = Array.isArray(items) ? items.map(sanitizeWrongQuestion) : []
  if (!initPromise) cachedWrongQuestions = sanitized
  return sanitized
}

export function saveWrongQuestions(items: WrongQuestion[]): void {
  const sanitized = items.map(sanitizeWrongQuestion)
  persistWrongLocal(sanitized)
  void bulkPutToStore(STORES.WRONG, sanitized).catch((err) => {
    console.warn('[Storage] saveWrongQuestions IndexedDB write failed', err)
  })
}

export async function upsertWrongQuestion(item: WrongQuestion): Promise<WrongQuestion[]> {
  const items = loadWrongQuestions().slice()
  const next = sanitizeWrongQuestion(item)
  const index = items.findIndex((current) => current.id === next.id)
  const previousStatus = index >= 0 ? items[index].reviewStatus : ''
  if (index >= 0) {
    items[index] = next
  } else {
    items.unshift(next)
  }
  await putToStore(STORES.WRONG, next)
  persistWrongLocal(items)

  if (next.reviewStatus === '已掌握' && previousStatus !== '已掌握') {
    awardStars(2, '攻克错题')
  }

  return items
}

export async function deleteWrongQuestion(id: string): Promise<WrongQuestion[]> {
  const items = loadWrongQuestions()
  const removed = items.find((item) => item.id === id)
  const next = items.filter((item) => item.id !== id)
  await deleteFromStore(STORES.WRONG, id)
  persistWrongLocal(next)

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
    if (changed) {
      const touched = updated.filter(
        (record) => record.id === removed.id || record.id === removed.sourceRecordId,
      )
      await Promise.all(touched.map((record) => putToStore(STORES.RECORDS, record)))
      persistRecordsLocal(updated)
    }
  }
  return next
}

/** 测试用：清空内存缓存，避免用例互相污染。 */
export function resetStorageCache(): void {
  cachedRecords = null
  cachedWrongQuestions = null
  cachedRewardStats = null
  initPromise = null
}

// 奖励与打卡统计系统
export const DEFAULT_REWARDS: UserRewardStats = {
  stars: 10, // 初始激励星星
  streakDays: 1,
  lastActiveDate: localDateKey(),
  masteredCount: 0,
  badges: ['新手小当家'],
}

export function loadRewardStats(): UserRewardStats {
  if (cachedRewardStats) return cachedRewardStats
  const saved = readJson<UserRewardStats | null>(REWARDS_KEY, null)
  cachedRewardStats = saved || { ...DEFAULT_REWARDS }
  return cachedRewardStats
}

export function saveRewardStats(stats: UserRewardStats): void {
  cachedRewardStats = stats
  writeJson(REWARDS_KEY, stats)
  void saveRewardStatsToDB(stats).catch((err) => {
    console.warn('[Storage] saveRewardStats IndexedDB write failed', err)
  })
}

export function recordDailyActivity(): UserRewardStats {
  const stats = { ...loadRewardStats() }
  const today = localDateKey()

  if (stats.lastActiveDate !== today) {
    const yesterdayDate = new Date()
    yesterdayDate.setDate(yesterdayDate.getDate() - 1)
    if (stats.lastActiveDate === localDateKey(yesterdayDate)) {
      stats.streakDays += 1
    } else {
      stats.streakDays = 1
    }
    stats.lastActiveDate = today
    stats.stars += 1
    saveRewardStats(stats)
  }
  return stats
}

export function awardStars(count: number, _reason?: string): UserRewardStats {
  const stats = { ...loadRewardStats() }
  stats.stars += count

  // 检查徽章解锁
  const wrongMastered = loadWrongQuestions().filter((q) => q.reviewStatus === '已掌握').length
  stats.masteredCount = wrongMastered

  const newBadges = new Set(stats.badges)
  if (stats.stars >= 20) newBadges.add('🌟 算力小明星')
  if (stats.stars >= 50) newBadges.add('🏆 数学小学霸')
  if (wrongMastered >= 3) newBadges.add('🛡️ 错题克星')
  if (wrongMastered >= 10) newBadges.add('👑 满分大师')
  if (stats.streakDays >= 3) newBadges.add('🔥 持之以恒')
  if (stats.streakDays >= 7) newBadges.add('⚡ 学习达人')

  stats.badges = Array.from(newBadges)
  saveRewardStats(stats)
  return stats
}

export function getLocalStorageUsage(): {
  bytes: number
  recordCount: number
  wrongCount: number
  imageCount: number
} {
  const records = loadRecords()
  const wrongQuestions = loadWrongQuestions()
  let bytes = 0

  if (typeof localStorage !== 'undefined') {
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (!key) continue
      bytes += new Blob([key + (localStorage.getItem(key) ?? '')]).size
    }
  }

  return {
    bytes,
    recordCount: records.length,
    wrongCount: wrongQuestions.length,
    imageCount: wrongQuestions.filter((item) => Boolean(item.imageDataUrl)).length,
  }
}

export async function getDetailedStorageStats(): Promise<{
  recordsCount: number
  wrongCount: number
  imagesCount: number
  estimatedBytes: number
}> {
  return await getStorageStatsFromDB()
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

export async function importBackup(payload: unknown): Promise<{
  records: StudyRecord[]
  wrongQuestions: WrongQuestion[]
}> {
  const parsed = parseBackup(payload)
  const nextRecords = parsed.records.map(sanitizeRecord)
  const nextWrong = parsed.wrongQuestions.map(sanitizeWrongQuestion)
  const previousRecords = loadRecords().slice()
  const previousWrong = loadWrongQuestions().slice()

  persistRecordsLocal(nextRecords)
  persistWrongLocal(nextWrong)

  try {
    if (isIndexedDbAvailable()) {
      await clearStore(STORES.WRONG)
      await clearStore(STORES.RECORDS)
      await bulkPutToStore(STORES.WRONG, nextWrong)
      await bulkPutToStore(STORES.RECORDS, nextRecords)
    }
  } catch (err) {
    console.warn('[Storage] importBackup IndexedDB write failed, rolling back', err)
    persistRecordsLocal(previousRecords)
    persistWrongLocal(previousWrong)
    try {
      if (isIndexedDbAvailable()) {
        await clearStore(STORES.WRONG)
        await clearStore(STORES.RECORDS)
        await bulkPutToStore(STORES.WRONG, previousWrong)
        await bulkPutToStore(STORES.RECORDS, previousRecords)
      }
    } catch (rollbackErr) {
      console.warn('[Storage] importBackup rollback failed', rollbackErr)
    }
    throw new Error('导入失败，已尽量恢复导入前的数据。请先导出备份后再试。')
  }

  return { records: nextRecords, wrongQuestions: nextWrong }
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

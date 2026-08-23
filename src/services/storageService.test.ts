import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  getImportSummary,
  importBackup,
  isQuotaExceeded,
  loadRecords,
  parseBackup,
  sanitizeRecord,
  sanitizeWrongQuestion,
} from './storageService'

function mockLocalStorage() {
  const store = new Map<string, string>()
  const storage = {
    get length() {
      return store.size
    },
    key(index: number) {
      return [...store.keys()][index] ?? null
    },
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null
    },
    setItem(key: string, value: string) {
      store.set(key, value)
    },
    removeItem(key: string) {
      store.delete(key)
    },
    clear() {
      store.clear()
    },
  }
  Object.defineProperty(globalThis, 'localStorage', { value: storage, configurable: true })
}

beforeEach(() => {
  mockLocalStorage()
})

afterEach(() => {
  localStorage.clear()
})

describe('isQuotaExceeded', () => {
  it('recognizes browser quota errors', () => {
    expect(isQuotaExceeded({ name: 'QuotaExceededError', message: 'exceeded the quota' })).toBe(true)
    expect(isQuotaExceeded({ name: 'Error', message: 'other' })).toBe(false)
  })
})

describe('sanitizeRecord', () => {
  it('drops images and fills missing fields', () => {
    const record = sanitizeRecord({
      questionText: '36 × 24 =',
      imageDataUrl: 'data:image/png;base64,abc',
      judgement: '不是合法值',
    })
    expect(record.imageDataUrl).toBe('')
    expect(record.judgement).toBe('无法判断')
    expect(record.questionType).toBe('其他')
    expect(record.knowledgePoints.length).toBeGreaterThan(0)
  })
})

describe('sanitizeWrongQuestion', () => {
  it('defaults stepByStep and review status', () => {
    const item = sanitizeWrongQuestion({
      correctedText: '125 × 32 =',
      knowledgePoint: '三位数乘两位数',
    })
    expect(item.stepByStep).toEqual([])
    expect(item.reviewStatus).toBe('未复习')
    expect(item.imageDataUrl).toBe('')
    expect(item.knowledgePoints).toEqual(['三位数乘两位数'])
  })
})

describe('parseBackup / importBackup', () => {
  it('rejects incomplete files', () => {
    expect(() => parseBackup({ records: [] })).toThrow('备份文件缺少学习记录或错题本')
    expect(() => parseBackup(null)).toThrow('备份文件格式不正确')
  })

  it('imports sanitized data and reports counts', () => {
    const payload = {
      records: [{ id: 'a', questionText: '1', imageDataUrl: 'data:image/png;base64,xx' }],
      wrongQuestions: [{ id: 'b', correctedText: '2' }],
    }
    const summary = getImportSummary(payload)
    expect(summary.incomingRecords).toBe(1)
    expect(summary.incomingWrong).toBe(1)
    expect(summary.currentRecords).toBe(0)

    const imported = importBackup(payload)
    expect(imported.records[0]?.imageDataUrl).toBe('')
    expect(loadRecords()).toHaveLength(1)
  })
})

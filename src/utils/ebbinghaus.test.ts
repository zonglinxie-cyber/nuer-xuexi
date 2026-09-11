import { describe, expect, it } from 'vitest'
import type { WrongQuestion } from '../types'
import { getEbbinghausStatus } from './ebbinghaus'

function sample(overrides: Partial<WrongQuestion> = {}): WrongQuestion {
  return {
    id: 'q1',
    subject: 'math',
    imageDataUrl: '',
    originalText: '1+1',
    correctedText: '1+1',
    studentAnswer: '3',
    correctAnswer: '2',
    explanation: '',
    stepByStep: [],
    knowledgePoint: '计算',
    knowledgePoints: ['计算'],
    textbookUnit: '',
    errorCause: '计算错误',
    errorCauseNote: '',
    savedAt: new Date('2026-09-01T00:00:00.000Z').toISOString(),
    reviewStatus: '未复习',
    lastReviewedAt: '',
    notes: '',
    sourceRecordId: 'q1',
    ...overrides,
  }
}

describe('getEbbinghausStatus', () => {
  it('marks mastered questions as not due', () => {
    expect(getEbbinghausStatus(sample({ reviewStatus: '已掌握' }))).toEqual({
      isDue: false,
      nextDueDays: -1,
    })
  })

  it('treats invalid savedAt as not due', () => {
    expect(getEbbinghausStatus(sample({ savedAt: 'not-a-date' }))).toEqual({
      isDue: false,
      nextDueDays: 0,
    })
  })

  it('is due after the first review node if never reviewed', () => {
    const savedAt = new Date(Date.now() - 36 * 3600 * 1000).toISOString()
    const status = getEbbinghausStatus(sample({ savedAt, lastReviewedAt: '' }))
    expect(status.isDue).toBe(true)
    expect(status.nextDueDays).toBe(0)
  })

  it('is not due before the first review node', () => {
    const savedAt = new Date(Date.now() - 2 * 3600 * 1000).toISOString()
    const status = getEbbinghausStatus(sample({ savedAt, lastReviewedAt: '' }))
    expect(status.isDue).toBe(false)
    expect(status.nextDueDays).toBeGreaterThan(0)
  })
})

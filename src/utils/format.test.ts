import { describe, expect, it } from 'vitest'
import { daysAgo, formatDateTime, formatPercent } from './format'

describe('formatDateTime', () => {
  it('returns a localized timestamp for valid ISO dates', () => {
    expect(formatDateTime('2026-09-01T08:30:00.000Z')).toMatch(/2026/)
  })

  it('returns 未知时间 for invalid dates', () => {
    expect(formatDateTime('not-a-date')).toBe('未知时间')
  })
})

describe('formatPercent', () => {
  it('rounds finite ratios', () => {
    expect(formatPercent(0.8)).toBe('80%')
    expect(formatPercent(0)).toBe('0%')
  })

  it('guards NaN and Infinity', () => {
    expect(formatPercent(Number.NaN)).toBe('0%')
    expect(formatPercent(Number.POSITIVE_INFINITY)).toBe('0%')
  })
})

describe('daysAgo', () => {
  it('shifts the calendar date backwards', () => {
    const now = new Date()
    const past = daysAgo(3)
    expect(past.getDate()).toBe(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3).getDate())
  })
})

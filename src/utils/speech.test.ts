import { describe, expect, it } from 'vitest'
import { cleanTextForSpeech, splitForSpeech } from './speech'

describe('cleanTextForSpeech', () => {
  it('reads common math symbols in Chinese', () => {
    expect(cleanTextForSpeech('$36 \\times 24$')).toContain('乘以')
    expect(cleanTextForSpeech('100m^2')).toContain('平方米')
    expect(cleanTextForSpeech('3km^2')).toContain('平方千米')
  })

  it('strips latex wrappers', () => {
    expect(cleanTextForSpeech('考点分析：先算。')).toBe('考点分析：先算。')
  })
})

describe('splitForSpeech', () => {
  it('keeps short text in one chunk', () => {
    expect(splitForSpeech('先读题再圈数字。', 180)).toEqual(['先读题再圈数字。'])
  })

  it('splits long text on Chinese periods', () => {
    const text = `${'甲。'.repeat(40)}${'乙。'.repeat(40)}`
    const parts = splitForSpeech(text, 80)
    expect(parts.length).toBeGreaterThan(1)
    expect(parts.join('')).toBe(text)
  })
})

import { describe, expect, it } from 'vitest'
import { cleanTextForSpeech, isPureEnglish, splitForSpeech } from './speech'
import { detectSubjectFromText } from '../data/subjects'

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

describe('isPureEnglish', () => {
  it('identifies pure English sentences', () => {
    expect(isPureEnglish("What's your name? I'm Amy.")).toBe(true)
    expect(isPureEnglish('Look and choose the correct answer.')).toBe(true)
  })

  it('identifies mixed or Chinese sentences as not pure English', () => {
    expect(isPureEnglish('题目：Look and choose. 解析：本题考查一般现在时。')).toBe(false)
    expect(isPureEnglish('计算下面各题')).toBe(false)
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

describe('detectSubjectFromText', () => {
  it('detects math expressions', () => {
    expect(detectSubjectFromText('计算 $36 \\times 24$ 并验算')).toBe('math')
    expect(detectSubjectFromText('一块长方形绿地面积是 200 平方米')).toBe('math')
  })

  it('detects English questions', () => {
    expect(detectSubjectFromText('Look at the picture and choose: Is this your school?')).toBe('english')
    expect(detectSubjectFromText('Fill in the blanks with am, is or are.')).toBe('english')
  })

  it('detects Chinese questions', () => {
    expect(detectSubjectFromText('读拼音写词语：kuān kuò')).toBe('chinese')
    expect(detectSubjectFromText('请找出下列句子中的近义词和反义词')).toBe('chinese')
  })
})

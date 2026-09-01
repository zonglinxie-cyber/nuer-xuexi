import { describe, expect, it } from 'vitest'
import {
  extractJson,
  isLikelyNetworkOrCorsError,
  modelSupportsJsonObject,
  normalizeRecognition,
} from './aiService'

describe('extractJson', () => {
  it('parses a raw object', () => {
    expect(extractJson('{"recognized_text":"1+1"}')).toEqual({ recognized_text: '1+1' })
  })

  it('strips markdown fences', () => {
    expect(extractJson('```json\n{"recognized_text":"2+2"}\n```')).toEqual({ recognized_text: '2+2' })
  })

  it('throws when there is no object', () => {
    expect(() => extractJson('没有 JSON')).toThrow('AI 返回的内容不是有效 JSON')
  })
})

describe('normalizeRecognition', () => {
  it('forces parent check when AI claims correct with low confidence', () => {
    const result = normalizeRecognition({
      recognized_text: '36 × 24 =',
      confidence_level: '低',
      is_correct: '需家长确认',
      question_type: '计算题',
      knowledge_point: '三位数乘两位数',
    })
    expect(result.is_correct).toBe('需家长确认')
    expect(result.need_human_check).toBe(true)
    expect(result.knowledge_points).toEqual(['三位数乘两位数'])
  })

  it('maps unknown knowledge points to a fallback', () => {
    const result = normalizeRecognition({
      recognized_text: '题',
      knowledge_point: '微积分',
    })
    expect(result.knowledge_point).toBe('微积分')
    expect(result.knowledge_points).toEqual(['微积分'])
  })

  it('keeps listed knowledge points and default arrays', () => {
    const result = normalizeRecognition({
      recognized_text: '题',
      knowledge_points: ['角的度量', '不存在的点'],
      step_by_step: null,
    })
    expect(result.knowledge_points).toEqual(['角的度量'])
    expect(result.step_by_step).toEqual([])
    expect(result.subject).toBe('math')
  })

  it('keeps chinese knowledge points instead of falling back to math', () => {
    const result = normalizeRecognition(
      {
        recognized_text: '看拼音写词语：huā',
        knowledge_point: '拼音与字音',
        question_type: '看拼音写字',
      },
      'chinese',
    )
    expect(result.subject).toBe('chinese')
    expect(result.knowledge_point).toBe('拼音与字音')
    expect(result.knowledge_points).toEqual(['拼音与字音'])
    expect(result.question_type).toBe('看拼音写字')
  })
})

describe('modelSupportsJsonObject', () => {
  it('detects common OpenAI vision models', () => {
    expect(modelSupportsJsonObject('gpt-4o-mini')).toBe(true)
    expect(modelSupportsJsonObject('claude-3-haiku')).toBe(false)
  })
})

describe('isLikelyNetworkOrCorsError', () => {
  it('detects failed to fetch', () => {
    expect(isLikelyNetworkOrCorsError(new TypeError('Failed to fetch'))).toBe(true)
    expect(isLikelyNetworkOrCorsError(new Error('Failed to fetch'))).toBe(false)
  })
})

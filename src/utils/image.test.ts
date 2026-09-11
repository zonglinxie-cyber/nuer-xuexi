import { describe, expect, it } from 'vitest'
import { dataUrlToBase64, estimateDataUrlBytes, formatFileSize } from './image'

describe('formatFileSize', () => {
  it('formats bytes, KB and MB', () => {
    expect(formatFileSize(512)).toBe('512 B')
    expect(formatFileSize(2048)).toBe('2.0 KB')
    expect(formatFileSize(2 * 1024 * 1024)).toBe('2.0 MB')
  })
})

describe('dataUrlToBase64', () => {
  it('splits mime and payload', () => {
    expect(dataUrlToBase64('data:image/png;base64,abc123')).toEqual({
      mime: 'image/png',
      base64: 'abc123',
    })
  })

  it('rejects non-data URLs', () => {
    expect(() => dataUrlToBase64('https://example.com/a.png')).toThrow('图片数据格式不正确')
  })
})

describe('estimateDataUrlBytes', () => {
  it('approximates decoded size', () => {
    expect(estimateDataUrlBytes('abcd')).toBe(3)
  })
})

import type { SubjectId } from '../types'

export function cleanTextForSpeech(raw: string): string {
  return raw
    .replace(/\\times/g, ' 乘以 ')
    .replace(/\\div/g, ' 除以 ')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, ' $2分之$1 ')
    .replace(/\\angle/g, ' 角 ')
    .replace(/km\^2|km²/gi, '平方千米')
    .replace(/cm\^2|cm²/gi, '平方厘米')
    .replace(/m\^2|m²/gi, '平方米')
    .replace(/\^2/g, '平方')
    .replace(/\^3/g, '立方')
    .replace(/\$/g, '')
    .replace(/\\/g, '')
    .replace(/[\*\_\[\]\{\}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance === 'function'
}

export function isWeChatBrowser(): boolean {
  return typeof navigator !== 'undefined' && /MicroMessenger/i.test(navigator.userAgent)
}

export function stopSpeech(): void {
  speakSession += 1
  clearSpeechTimers()
  queue = []
  activeUtterance = null
  if (isSpeechSupported()) {
    window.speechSynthesis.cancel()
  }
}

let speakSession = 0
let keepAliveTimer = 0
let watchdogTimer = 0
let queue: SpeechSynthesisUtterance[] = []
let activeUtterance: SpeechSynthesisUtterance | null = null

function clearSpeechTimers() {
  window.clearInterval(keepAliveTimer)
  window.clearTimeout(watchdogTimer)
  keepAliveTimer = 0
  watchdogTimer = 0
}

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

function needsKeepAlive(): boolean {
  if (typeof navigator === 'undefined' || isIOS()) return false
  return /Chrome|Chromium|Edg\//.test(navigator.userAgent)
}

export function pickZhVoice(): SpeechSynthesisVoice | undefined {
  if (!isSpeechSupported()) return undefined
  const voices = window.speechSynthesis.getVoices()
  const zh = voices.filter((voice) => /zh|cmn|Chinese|中文|普通话/i.test(`${voice.lang} ${voice.name}`))
  if (zh.length === 0) return undefined
  return (
    zh.find((voice) => /female|女|婷|晓|xiao|yaoyao|huihui|tingting|meijia|sinji/i.test(voice.name)) || zh[0]
  )
}

export function pickEnVoice(): SpeechSynthesisVoice | undefined {
  if (!isSpeechSupported()) return undefined
  const voices = window.speechSynthesis.getVoices()
  const en = voices.filter((voice) => /^en/i.test(voice.lang) || /English/i.test(voice.name))
  if (en.length === 0) return undefined
  return (
    en.find((voice) =>
      /samantha|karen|victoria|daniel|oliver|serena|ava|allison|tom|moira|tessa|fiona|veena|cindy|stephanie|jenny|aria|guy|zira|google us english|natural/i.test(
        voice.name,
      ),
    ) ||
    en.find((voice) => /en[-_]us/i.test(voice.lang)) ||
    en[0]
  )
}

export function isPureEnglish(text: string): boolean {
  const hasEn = /[a-zA-Z]{2,}/.test(text)
  const hasZh = /[\u4e00-\u9fa5]/.test(text)
  return hasEn && !hasZh
}

export function splitForSpeech(text: string, maxLen = 180): string[] {
  if (text.length <= maxLen) return [text]
  const parts: string[] = []
  let remain = text
  while (remain.length > maxLen) {
    let cut = remain.lastIndexOf('。', maxLen)
    if (cut < 30) cut = remain.lastIndexOf('，', maxLen)
    if (cut < 30) cut = remain.lastIndexOf('；', maxLen)
    if (cut < 30) cut = remain.lastIndexOf('. ', maxLen)
    if (cut < 30) cut = remain.lastIndexOf('? ', maxLen)
    if (cut < 30) cut = remain.lastIndexOf('! ', maxLen)
    if (cut < 30) cut = remain.lastIndexOf(' ', maxLen)
    if (cut < 30) cut = maxLen
    const take = cut < maxLen ? cut + 1 : maxLen
    parts.push(remain.slice(0, take).trim())
    remain = remain.slice(take).trim()
  }
  if (remain) parts.push(remain)
  return parts.filter(Boolean)
}

function startKeepAlive() {
  if (!needsKeepAlive()) return
  window.clearInterval(keepAliveTimer)
  keepAliveTimer = window.setInterval(() => {
    if (!window.speechSynthesis.speaking && !window.speechSynthesis.pending) {
      window.clearInterval(keepAliveTimer)
      keepAliveTimer = 0
      return
    }
    window.speechSynthesis.resume()
  }, 4000)
}

export function preloadSpeechVoices(): void {
  if (!isSpeechSupported()) return
  window.speechSynthesis.getVoices()
  window.speechSynthesis.addEventListener('voiceschanged', () => {
    window.speechSynthesis.getVoices()
  })
}

export interface SpeechOptions {
  subject?: SubjectId
  lang?: string
  onStart?: () => void
  onEnd?: () => void
  onError?: (err: unknown) => void
}

export function speakText(
  text: string,
  callbacksOrOptions?: SpeechOptions | {
    onStart?: () => void
    onEnd?: () => void
    onError?: (err: unknown) => void
  },
): boolean {
  if (!isSpeechSupported()) {
    callbacksOrOptions?.onError?.('当前浏览器不支持语音朗读')
    return false
  }
  if (isWeChatBrowser()) {
    callbacksOrOptions?.onError?.('微信里不能朗读。请用 Safari 或 Chrome 打开这个网页。')
    return false
  }

  const clean = cleanTextForSpeech(text)
  if (!clean) {
    callbacksOrOptions?.onError?.('没有可以朗读的文字')
    return false
  }

  const subject = (callbacksOrOptions as SpeechOptions)?.subject
  const session = ++speakSession
  const stillThisSpeak = () => session === speakSession

  clearSpeechTimers()
  queue = []
  activeUtterance = null

  try {
    window.speechSynthesis.resume()
  } catch {
    // ignore
  }

  const hadToCancel = window.speechSynthesis.speaking || window.speechSynthesis.pending
  if (hadToCancel) {
    window.speechSynthesis.cancel()
  }

  const chunks = splitForSpeech(clean, isIOS() ? 160 : 240)
  const zhVoice = pickZhVoice()
  const enVoice = pickEnVoice()
  let started = false

  const finishOk = () => {
    if (!stillThisSpeak()) return
    speakSession += 1
    clearSpeechTimers()
    queue = []
    activeUtterance = null
    callbacksOrOptions?.onEnd?.()
  }

  const fail = (message: string) => {
    if (!stillThisSpeak()) return
    speakSession += 1
    clearSpeechTimers()
    queue = []
    activeUtterance = null
    try {
      window.speechSynthesis.cancel()
    } catch {
      // ignore
    }
    callbacksOrOptions?.onError?.(message)
  }

  const playNext = () => {
    if (!stillThisSpeak()) return
    const next = queue.shift()
    if (!next) {
      finishOk()
      return
    }
    activeUtterance = next
    try {
      window.speechSynthesis.resume()
    } catch {
      // ignore
    }
    window.speechSynthesis.speak(next)
    startKeepAlive()
  }

  queue = chunks.map((chunk) => {
    const utterance = new SpeechSynthesisUtterance(chunk)
    const isEnChunk = isPureEnglish(chunk) || (subject === 'english' && !/[\u4e00-\u9fa5]/.test(chunk))

    if (isEnChunk) {
      utterance.lang = 'en-US'
      utterance.rate = 0.88 // 适合英语启蒙听清发音
      utterance.pitch = 1.0
      if (enVoice) utterance.voice = enVoice
    } else {
      utterance.lang = 'zh-CN'
      utterance.rate = 0.92
      utterance.pitch = 1.05
      if (zhVoice) utterance.voice = zhVoice
    }

    utterance.volume = 1
    utterance.onstart = () => {
      if (!stillThisSpeak()) return
      if (!started) {
        started = true
        callbacksOrOptions?.onStart?.()
      }
    }
    utterance.onend = () => {
      if (!stillThisSpeak() || activeUtterance !== utterance) return
      playNext()
    }
    utterance.onerror = (event) => {
      if (!stillThisSpeak()) return
      if (event.error === 'interrupted' || event.error === 'canceled') {
        if (!started) return
        finishOk()
        return
      }
      fail(
        event.error === 'not-allowed'
          ? '浏览器拦住了朗读，请再点一次，并检查手机是否静音。'
          : '朗读失败，请检查手机是否静音，或用 Safari 打开。',
      )
    }
    return utterance
  })

  const startPlayback = () => {
    if (!stillThisSpeak()) return
    playNext()
    watchdogTimer = window.setTimeout(() => {
      if (!stillThisSpeak() || started) return
      if (window.speechSynthesis.speaking || window.speechSynthesis.pending) return
      fail('没有发出声音。请关掉静音，或用 Safari / Chrome 打开（不要用微信）。')
    }, 900)
  }

  if (hadToCancel && isIOS()) {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(startPlayback)
    })
  } else {
    startPlayback()
  }

  return true
}

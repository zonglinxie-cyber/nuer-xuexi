function cleanTextForSpeech(raw: string): string {
  return raw
    .replace(/\\times/g, ' 乘以 ')
    .replace(/\\div/g, ' 除以 ')
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, ' $2分之$1 ')
    .replace(/\\angle/g, ' 角 ')
    .replace(/\^2/g, '平方')
    .replace(/\^3/g, '立方')
    .replace(/cm\^2|cm²/gi, '平方厘米')
    .replace(/m\^2|m²/gi, '平方米')
    .replace(/km\^2|km²/gi, '平方千米')
    .replace(/\$/g, '')
    .replace(/\\/g, '')
    .replace(/[\*\_\[\]\(\)\{\}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function stopSpeech(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel()
  }
}

function pickZhVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices()
  return (
    voices.find(
      (voice) =>
        (voice.lang.includes('zh') || voice.lang.includes('cmn')) &&
        (voice.name.includes('Female') || voice.name.includes('婷婷') || voice.name.includes('Xiaoxiao')),
    ) || voices.find((voice) => voice.lang.includes('zh') || voice.lang.includes('cmn'))
  )
}

export function speakText(
  text: string,
  callbacks?: {
    onStart?: () => void
    onEnd?: () => void
    onError?: (err: unknown) => void
  },
): boolean {
  if (!isSpeechSupported()) {
    callbacks?.onError?.('当前浏览器不支持语音朗读')
    return false
  }

  const clean = cleanTextForSpeech(text)
  if (!clean) return false

  let started = false

  const start = () => {
    if (started) return
    started = true
    stopSpeech()

    const utterance = new SpeechSynthesisUtterance(clean)
    utterance.lang = 'zh-CN'
    utterance.rate = 0.95
    utterance.pitch = 1.05

    const zhVoice = pickZhVoice()
    if (zhVoice) utterance.voice = zhVoice

    utterance.onstart = () => {
      callbacks?.onStart?.()
    }
    utterance.onend = () => {
      callbacks?.onEnd?.()
    }
    utterance.onerror = (event) => {
      callbacks?.onError?.(event)
    }

    window.speechSynthesis.speak(utterance)
  }

  if (window.speechSynthesis.getVoices().length === 0) {
    window.speechSynthesis.addEventListener('voiceschanged', start, { once: true })
    window.setTimeout(start, 400)
  } else {
    start()
  }

  return true
}

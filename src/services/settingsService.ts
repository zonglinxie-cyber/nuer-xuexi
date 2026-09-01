import { parseSubjectId } from '../data/subjects'
import type { AiSettings, SubjectId } from '../types'

const SETTINGS_KEY = 'grade4-math-helper-settings-v1'
const LAST_SUBJECT_KEY = 'grade4-helper-last-subject-v1'

export const OFFICIAL_OPENAI_BASE = 'https://api.openai.com/v1'
export const LOCAL_OPENAI_PROXY_BASE = '/openai-proxy/v1'
export const PRODUCTION_OPENAI_PROXY_BASE = '/api/openai/v1'

export const DEFAULT_SETTINGS: AiSettings = {
  apiKey: '',
  model: 'deepseek-v4-flash-vision-exp',
  baseUrl: 'https://api.deepseek.com',
}

export function isOfficialOpenAiBase(baseUrl: string): boolean {
  const trimmed = baseUrl.trim().replace(/\/$/, '')
  return trimmed === OFFICIAL_OPENAI_BASE || trimmed === 'https://api.openai.com'
}

export function isVolcengineBase(baseUrl: string): boolean {
  return /volces\.com|volcengine\.com|ark\.cn-|火山/i.test(baseUrl)
}

export function resolveApiBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim().replace(/\/$/, '') || OFFICIAL_OPENAI_BASE
  if (!isOfficialOpenAiBase(trimmed)) return trimmed
  if (import.meta.env.DEV) return LOCAL_OPENAI_PROXY_BASE
  if (import.meta.env.VITE_USE_API_PROXY === '1') return PRODUCTION_OPENAI_PROXY_BASE
  return trimmed
}

export function loadSettings(): AiSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_SETTINGS }
    const parsed = JSON.parse(raw) as Partial<AiSettings>
    return {
      apiKey: typeof parsed.apiKey === 'string' ? parsed.apiKey : '',
      model: typeof parsed.model === 'string' && parsed.model.trim() ? parsed.model.trim() : DEFAULT_SETTINGS.model,
      baseUrl:
        typeof parsed.baseUrl === 'string' && parsed.baseUrl.trim()
          ? parsed.baseUrl.trim().replace(/\/$/, '')
          : DEFAULT_SETTINGS.baseUrl,
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export function saveSettings(settings: AiSettings): void {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      apiKey: settings.apiKey.trim(),
      model: settings.model.trim() || DEFAULT_SETTINGS.model,
      baseUrl: settings.baseUrl.trim().replace(/\/$/, '') || DEFAULT_SETTINGS.baseUrl,
    }),
  )
}

export function hasApiKey(settings = loadSettings()): boolean {
  return settings.apiKey.trim().length > 0
}

export function loadLastSubject(): SubjectId {
  try {
    return parseSubjectId(localStorage.getItem(LAST_SUBJECT_KEY), 'math')
  } catch {
    return 'math'
  }
}

export function saveLastSubject(subject: SubjectId): void {
  try {
    localStorage.setItem(LAST_SUBJECT_KEY, subject)
  } catch {
    // ignore quota
  }
}

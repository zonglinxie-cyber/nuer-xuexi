import { findKnowledgePoint, matchKnowledgePoints } from '../data/knowledge'
import {
  ALL_QUESTION_TYPES,
  defaultKnowledgeName,
  defaultTextbookUnit,
  detectSubjectFromText,
  isSubjectId,
  parseSubjectId,
} from '../data/subjects'
import {
  CHINESE_TUTOR_SYSTEM_PROMPT,
  CHINESE_TUTOR_USER_PROMPT,
  CHINESE_VARIANT_SYSTEM_PROMPT,
} from '../prompts/chineseTutorPrompt'
import {
  ENGLISH_TUTOR_SYSTEM_PROMPT,
  ENGLISH_TUTOR_USER_PROMPT,
  ENGLISH_VARIANT_SYSTEM_PROMPT,
} from '../prompts/englishTutorPrompt'
import {
  MATH_TUTOR_SYSTEM_PROMPT,
  MATH_TUTOR_USER_PROMPT,
  MATH_VARIANT_SYSTEM_PROMPT,
} from '../prompts/mathTutorPrompt'
import type {
  AiSettings,
  ConfidenceLevel,
  Judgement,
  MultiRecognitionResult,
  QuestionType,
  RecognitionResult,
  SubjectId,
  VariantQuestion,
  WrongQuestion,
} from '../types'
import { dataUrlToBase64 } from '../utils/image'
import { hasApiKey, isOfficialOpenAiBase, isVolcengineBase, loadSettings, resolveApiBaseUrl } from './settingsService'

export class AiServiceError extends Error {
  readonly code: string

  constructor(message: string, code: string) {
    super(message)
    this.name = 'AiServiceError'
    this.code = code
  }
}

const RECOGNITION_JSON_SCHEMA = {
  name: 'recognition_result',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      is_multi: { type: 'boolean' },
      detected_subject: { type: 'string', enum: ['math', 'chinese', 'english'] },
      overall_notes: { type: 'string' },
      questions: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            subject: { type: 'string', enum: ['math', 'chinese', 'english'] },
            recognized_text: { type: 'string' },
            confidence_level: { type: 'string', enum: ['高', '中', '低'] },
            question_type: { type: 'string' },
            knowledge_point: { type: 'string' },
            knowledge_points: { type: 'array', items: { type: 'string' } },
            textbook_unit: { type: 'string' },
            student_answer: { type: 'string' },
            ai_answer: { type: 'string' },
            is_correct: { type: 'string', enum: ['正确', '错误', '部分正确', '无法判断', '需家长确认'] },
            explanation: { type: 'string' },
            step_by_step: { type: 'array', items: { type: 'string' } },
            hints: { type: 'array', items: { type: 'string' } },
            known_conditions: { type: 'array', items: { type: 'string' } },
            asked_question: { type: 'string' },
            need_human_check: { type: 'boolean' },
            warning: { type: 'string' },
          },
          required: [
            'subject',
            'recognized_text',
            'confidence_level',
            'question_type',
            'knowledge_point',
            'knowledge_points',
            'textbook_unit',
            'student_answer',
            'ai_answer',
            'is_correct',
            'explanation',
            'step_by_step',
            'hints',
            'known_conditions',
            'asked_question',
            'need_human_check',
            'warning',
          ],
          additionalProperties: false,
        },
      },
    },
    required: ['is_multi', 'detected_subject', 'overall_notes', 'questions'],
    additionalProperties: false,
  },
}

const VARIANT_JSON_SCHEMA = {
  name: 'variant_questions',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      variants: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            question_text: { type: 'string' },
            knowledge_point: { type: 'string' },
            hints: { type: 'array', items: { type: 'string' } },
            step_by_step: { type: 'array', items: { type: 'string' } },
            answer: { type: 'string' },
            explanation: { type: 'string' },
          },
          required: ['id', 'question_text', 'knowledge_point', 'hints', 'step_by_step', 'answer', 'explanation'],
          additionalProperties: false,
        },
      },
    },
    required: ['variants'],
    additionalProperties: false,
  },
}

const CONFIDENCE: ConfidenceLevel[] = ['高', '中', '低']
const QUESTION_TYPES: QuestionType[] = ALL_QUESTION_TYPES
const JUDGEMENTS: Judgement[] = ['正确', '错误', '部分正确', '无法判断', '需家长确认']
const RECOGNIZE_TIMEOUT_MS = 75_000
const TEST_TIMEOUT_MS = 15_000
const OPENAI_CORS_MESSAGE =
  '浏览器没能连上这个接口。官方 OpenAI 通常不允许网页直接调用。本地用 npm run dev 时，官方地址会自动走代理；如果是打开打包后的网页，请改用兼容接口。'

export function connectErrorMessage(baseUrl: string): string {
  if (isVolcengineBase(baseUrl)) {
    return '浏览器没能连上火山引擎接口。这类接口通常不允许网页直接调用，服务范围也主要在中国大陆。请换一个允许网页调用的兼容接口。'
  }
  if (isOfficialOpenAiBase(baseUrl)) {
    return OPENAI_CORS_MESSAGE
  }
  return '浏览器没能连上这个接口。可能是网页跨域被拦，或当前网络到该服务不通。请换一个允许网页直接调用的兼容地址。'
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string' && value.trim()) {
    return value
      .split(/\n|；|;|、/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function pickEnum<T extends string>(value: unknown, allowed: T[], fallback: T): T {
  return typeof value === 'string' && allowed.includes(value as T) ? (value as T) : fallback
}

export function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  if (start < 0 || end < start) {
    throw new AiServiceError('AI 返回的内容不是有效 JSON，请重试或换一张更清晰的图片。', 'invalid_json')
  }
  try {
    return JSON.parse(candidate.slice(start, end + 1))
  } catch {
    throw new AiServiceError('AI 返回的内容格式不正确，请重试或换一张更清晰的图片。', 'invalid_json')
  }
}

function tutorPrompts(subject: SubjectId): { system: string; user: string; variant: string } {
  if (subject === 'chinese') {
    return {
      system: CHINESE_TUTOR_SYSTEM_PROMPT,
      user: CHINESE_TUTOR_USER_PROMPT,
      variant: CHINESE_VARIANT_SYSTEM_PROMPT,
    }
  }
  if (subject === 'english') {
    return {
      system: ENGLISH_TUTOR_SYSTEM_PROMPT,
      user: ENGLISH_TUTOR_USER_PROMPT,
      variant: ENGLISH_VARIANT_SYSTEM_PROMPT,
    }
  }
  return {
    system: MATH_TUTOR_SYSTEM_PROMPT,
    user: MATH_TUTOR_USER_PROMPT,
    variant: MATH_VARIANT_SYSTEM_PROMPT,
  }
}

export function normalizeRecognition(raw: unknown, defaultSubject: SubjectId = 'math'): RecognitionResult {
  const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const recognizedText = asString(data.recognized_text)
  const inferred = isSubjectId(data.subject)
    ? (data.subject as SubjectId)
    : isSubjectId(data.detected_subject)
      ? (data.detected_subject as SubjectId)
      : detectSubjectFromText(recognizedText) || defaultSubject

  const subject = inferred
  const knowledgePoints = matchKnowledgePoints(
    asStringArray(data.knowledge_points).concat(
      asString(data.knowledge_point) ? [asString(data.knowledge_point)] : [],
    ),
    subject,
  )
  const knowledgePoint = knowledgePoints[0] || asString(data.knowledge_point) || defaultKnowledgeName(subject)
  const warning = asString(data.warning)
  const confidence = pickEnum(data.confidence_level, CONFIDENCE, warning || !recognizedText ? '低' : '中')
  const judgement = pickEnum(data.is_correct, JUDGEMENTS, '需家长确认')
  const needHumanCheck =
    Boolean(data.need_human_check) ||
    judgement === '无法判断' ||
    judgement === '需家长确认' ||
    confidence === '低' ||
    Boolean(warning)

  const textbookUnit =
    asString(data.textbook_unit) ||
    findKnowledgePoint(knowledgePoint, subject)?.unit ||
    defaultTextbookUnit(subject)

  return {
    subject,
    recognized_text: recognizedText || '未能完整识别题目，请家长核对或重新拍照。',
    confidence_level: confidence,
    question_type: pickEnum(data.question_type, QUESTION_TYPES, '其他'),
    knowledge_point: knowledgePoint,
    knowledge_points: knowledgePoints.length > 0 ? knowledgePoints : [knowledgePoint],
    textbook_unit: textbookUnit,
    student_answer: asString(data.student_answer),
    ai_answer: asString(data.ai_answer) || (needHumanCheck ? '需家长确认' : ''),
    is_correct: judgement,
    explanation: asString(data.explanation) || '请家长先核对题目，再和孩子一起看解题思路。',
    step_by_step: asStringArray(data.step_by_step),
    hints: asStringArray(data.hints),
    known_conditions: asStringArray(data.known_conditions),
    asked_question: asString(data.asked_question),
    need_human_check: needHumanCheck,
    warning,
  }
}

export function normalizeMultiRecognition(raw: unknown, requestedSubject: SubjectId = 'math'): MultiRecognitionResult {
  const data = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const rawDetected = data.detected_subject

  if (Array.isArray(data.questions) && data.questions.length > 0) {
    const list = data.questions.map((item) => normalizeRecognition(item, requestedSubject))
    const firstDetected = list.find((q) => q.subject !== requestedSubject)?.subject
    const detectedSubject = parseSubjectId(rawDetected, firstDetected || requestedSubject)

    return {
      isMulti: list.length > 1,
      overallNotes: asString(data.overall_notes),
      detectedSubject,
      questions: list,
    }
  }

  const single = normalizeRecognition(raw, requestedSubject)
  const detectedSubject = parseSubjectId(rawDetected, single.subject || requestedSubject)

  return {
    isMulti: false,
    overallNotes: '',
    detectedSubject,
    questions: [single],
  }
}

export function modelSupportsJsonObject(model: string): boolean {
  return /gpt-4o|gpt-4\.1|gpt-5|o[1-4]|chatgpt|deepseek|qwen/i.test(model)
}

export function modelSupportsJsonSchema(model: string): boolean {
  return /gpt-4o|gpt-4\.5|o[1-4]/i.test(model)
}

export function isLikelyNetworkOrCorsError(error: unknown): boolean {
  if (!(error instanceof TypeError)) return false
  return /failed to fetch|networkerror|load failed|network request failed/i.test(error.message)
}

function friendlyHttpError(status: number, body: string): AiServiceError {
  if (status === 401 || status === 403) {
    if (/澳门|海外|境外|region|not available in|unsupported region|中国大陆/i.test(body)) {
      return new AiServiceError(
        '这个接口当前地区不可用。部分国内云服务只在中国大陆开放，请换一个你所在地区能访问的兼容接口。',
        'region',
      )
    }
    return new AiServiceError('API Key 无效或没有权限，请到设置页检查。', 'auth')
  }
  if (status === 404) {
    return new AiServiceError('接口地址或模型名称可能写错了，请到设置页检查。', 'not_found')
  }
  if (status === 429) {
    return new AiServiceError('AI 服务请求太频繁或额度不足，请稍后再试。', 'rate_limit')
  }
  if (body.toLowerCase().includes('timeout')) {
    return new AiServiceError('网络超时，请检查网络后重试。', 'timeout')
  }
  return new AiServiceError('AI 请求失败，请检查网络、接口地址和模型名称。', 'request_failed')
}

function chatCompletionsUrl(baseUrl: string): string {
  return `${resolveApiBaseUrl(baseUrl).replace(/\/$/, '')}/chat/completions`
}

function wrapAbort(external: AbortSignal | undefined, timeoutMs: number) {
  const controller = new AbortController()
  let timedOut = false
  const timeout = window.setTimeout(() => {
    timedOut = true
    controller.abort()
  }, timeoutMs)
  const onAbort = () => controller.abort()
  external?.addEventListener('abort', onAbort)
  return {
    signal: controller.signal,
    wasCancelled: () => Boolean(external?.aborted) && !timedOut,
    wasTimedOut: () => timedOut,
    dispose() {
      external?.removeEventListener('abort', onAbort)
      window.clearTimeout(timeout)
    },
  }
}

function mapFetchError(
  error: unknown,
  session: { wasCancelled: () => boolean; wasTimedOut: () => boolean },
  baseUrl: string,
): never {
  if (error instanceof AiServiceError) throw error
  if (session.wasCancelled()) {
    throw new AiServiceError('已取消识别。', 'cancelled')
  }
  if (session.wasTimedOut() || (error instanceof DOMException && error.name === 'AbortError')) {
    throw new AiServiceError('识别超时。图片较大或网络较慢时请再试一次，也可以换一张更小的照片。', 'timeout')
  }
  if (isLikelyNetworkOrCorsError(error)) {
    throw new AiServiceError(connectErrorMessage(baseUrl), 'cors')
  }
  throw new AiServiceError('AI 请求失败，请检查网络、接口地址和模型名称。', 'request_failed')
}

async function readContent(rawText: string): Promise<string> {
  let payload: { choices?: Array<{ message?: { content?: unknown } }> }
  try {
    payload = JSON.parse(rawText) as { choices?: Array<{ message?: { content?: unknown } }> }
  } catch {
    throw new AiServiceError('AI 服务返回了无法解析的内容，请稍后重试。', 'invalid_response')
  }

  const content = payload.choices?.[0]?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part
        if (part && typeof part === 'object' && 'text' in part) {
          return String((part as { text?: string }).text ?? '')
        }
        return ''
      })
      .join('\n')
  }
  return ''
}

export async function recognizeQuestions(
  imageDataUrl: string,
  subject: SubjectId = 'math',
  settings?: AiSettings,
  signal?: AbortSignal,
): Promise<MultiRecognitionResult> {
  const current = settings ?? loadSettings()
  if (!hasApiKey(current)) {
    throw new AiServiceError('还没有填写 API Key。请先到设置页填写后再识别。', 'missing_key')
  }

  const prompts = tutorPrompts(subject)
  const { mime, base64 } = dataUrlToBase64(imageDataUrl)
  const session = wrapAbort(signal, RECOGNIZE_TIMEOUT_MS)
  const useJsonMode = modelSupportsJsonObject(current.model)
  const useJsonSchema = modelSupportsJsonSchema(current.model)

  const makeBody = (withJsonMode: boolean) => {
    const body: Record<string, unknown> = {
      model: current.model.trim(),
      temperature: 0.2,
      messages: [
        { role: 'system', content: prompts.system },
        {
          role: 'user',
          content: [
            { type: 'text', text: prompts.user },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mime};base64,${base64}`,
              },
            },
          ],
        },
      ],
    }
    if (withJsonMode) {
      if (useJsonSchema) {
        body.response_format = { type: 'json_schema', json_schema: RECOGNITION_JSON_SCHEMA }
      } else {
        body.response_format = { type: 'json_object' }
      }
    }
    return body
  }

  const post = (withJsonMode: boolean) =>
    fetch(chatCompletionsUrl(current.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${current.apiKey.trim()}`,
      },
      body: JSON.stringify(makeBody(withJsonMode)),
      signal: session.signal,
    })

  try {
    let response = await post(useJsonMode)
    let rawText = await response.text()
    if (!response.ok && useJsonMode && response.status === 400 && /response_format|json_object/i.test(rawText)) {
      response = await post(false)
      rawText = await response.text()
    }
    if (!response.ok) {
      throw friendlyHttpError(response.status, rawText)
    }

    const text = await readContent(rawText)
    if (!text.trim()) {
      throw new AiServiceError('AI 没有返回识别结果。请换一张更清晰的图片，或稍后重试。', 'empty')
    }

    return normalizeMultiRecognition(extractJson(text), subject)
  } catch (error) {
    mapFetchError(error, session, current.baseUrl)
  } finally {
    session.dispose()
  }
}

export async function recognizeMathQuestions(
  imageDataUrl: string,
  settings?: AiSettings,
  signal?: AbortSignal,
): Promise<MultiRecognitionResult> {
  return recognizeQuestions(imageDataUrl, 'math', settings, signal)
}

export async function recognizeMathQuestion(
  imageDataUrl: string,
  settings?: AiSettings,
  signal?: AbortSignal,
): Promise<RecognitionResult> {
  const multi = await recognizeQuestions(imageDataUrl, 'math', settings, signal)
  return multi.questions[0] || normalizeRecognition({}, 'math')
}

export async function generateVariantQuestions(
  wrongQuestion: WrongQuestion,
  count = 3,
  settings?: AiSettings,
  signal?: AbortSignal,
): Promise<VariantQuestion[]> {
  const current = settings ?? loadSettings()
  if (!hasApiKey(current)) {
    throw new AiServiceError('还没有填写 API Key。请先到设置页填写。', 'missing_key')
  }

  const session = wrapAbort(signal, RECOGNIZE_TIMEOUT_MS)
  const useJsonMode = modelSupportsJsonObject(current.model)
  const useJsonSchema = modelSupportsJsonSchema(current.model)

  const subject = wrongQuestion.subject || 'math'
  const subjectLabel = subject === 'chinese' ? '语文' : subject === 'english' ? '英语' : '数学'
  const defaultCause = subject === 'chinese' ? '错别字' : subject === 'english' ? '单词拼错' : '计算错误'
  const prompt = `请针对以下四年级${subjectLabel}错题，生成 ${count} 道举一反三的同类变式题：
【错题原题】：${wrongQuestion.correctedText || wrongQuestion.originalText}
【考查知识点】：${wrongQuestion.knowledgePoint}
【孩子错因】：${wrongQuestion.errorCause || defaultCause} ${wrongQuestion.errorCauseNote ? `(${wrongQuestion.errorCauseNote})` : ''}
【正确解法与参考答案】：${wrongQuestion.correctAnswer || ''}

请按系统要求返回 JSON 格式，包含 3 道变式题。`

  const body: Record<string, unknown> = {
    model: current.model.trim(),
    temperature: 0.3,
    messages: [
      { role: 'system', content: tutorPrompts(subject).variant },
      { role: 'user', content: prompt },
    ],
  }
  if (useJsonMode) {
    if (useJsonSchema) {
      body.response_format = { type: 'json_schema', json_schema: VARIANT_JSON_SCHEMA }
    } else {
      body.response_format = { type: 'json_object' }
    }
  }

  try {
    const response = await fetch(chatCompletionsUrl(current.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${current.apiKey.trim()}`,
      },
      body: JSON.stringify(body),
      signal: session.signal,
    })
    const rawText = await response.text()
    if (!response.ok) {
      throw friendlyHttpError(response.status, rawText)
    }

    const text = await readContent(rawText)
    const parsed = extractJson(text) as { variants?: unknown[] }
    const variantsRaw = Array.isArray(parsed?.variants) ? parsed.variants : []

    return variantsRaw.map((v: any, index: number): VariantQuestion => ({
      id: `var_${Date.now()}_${index + 1}`,
      subject,
      originalQuestionId: wrongQuestion.id,
      questionText: asString(v.question_text || v.questionText || `变式题 ${index + 1}`),
      knowledgePoint: asString(v.knowledge_point || wrongQuestion.knowledgePoint),
      hints: asStringArray(v.hints),
      stepByStep: asStringArray(v.step_by_step || v.stepByStep),
      answer: asString(v.answer),
      explanation: asString(v.explanation),
    }))
  } catch (error) {
    mapFetchError(error, session, current.baseUrl)
  } finally {
    session.dispose()
  }
}

export async function testAiConnection(settings?: AiSettings, signal?: AbortSignal): Promise<void> {
  const current = settings ?? loadSettings()
  if (!hasApiKey(current)) {
    throw new AiServiceError('还没有填写 API Key。请先填写后再测试。', 'missing_key')
  }

  const session = wrapAbort(signal, TEST_TIMEOUT_MS)
  try {
    const response = await fetch(chatCompletionsUrl(current.baseUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${current.apiKey.trim()}`,
      },
      body: JSON.stringify({
        model: current.model.trim(),
        temperature: 0,
        max_tokens: 8,
        messages: [{ role: 'user', content: '只回复：ok' }],
      }),
      signal: session.signal,
    })
    const rawText = await response.text()
    if (!response.ok) {
      throw friendlyHttpError(response.status, rawText)
    }
  } catch (error) {
    mapFetchError(error, session, current.baseUrl)
  } finally {
    session.dispose()
  }
}

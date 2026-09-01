import type { KnowledgePoint, SubjectId } from '../../types'
import { defaultKnowledgeName } from '../subjects'
import { CHINESE_KNOWLEDGE_POINTS } from './chinese'
import { ENGLISH_KNOWLEDGE_POINTS } from './english'
import { MATH_KNOWLEDGE_POINTS } from './math'

export { CHINESE_KNOWLEDGE_POINTS } from './chinese'
export { ENGLISH_KNOWLEDGE_POINTS } from './english'
export { MATH_KNOWLEDGE_POINTS } from './math'

export const KNOWLEDGE_POINTS = MATH_KNOWLEDGE_POINTS
export const KNOWLEDGE_POINT_NAMES = MATH_KNOWLEDGE_POINTS.map((item) => item.name)

export function getKnowledgePoints(subject: SubjectId): KnowledgePoint[] {
  if (subject === 'chinese') return CHINESE_KNOWLEDGE_POINTS
  if (subject === 'english') return ENGLISH_KNOWLEDGE_POINTS
  return MATH_KNOWLEDGE_POINTS
}

export function getKnowledgePointNames(subject: SubjectId): string[] {
  return getKnowledgePoints(subject).map((item) => item.name)
}

export function findKnowledgePoint(name: string, subject?: SubjectId): KnowledgePoint | undefined {
  const pools = subject
    ? getKnowledgePoints(subject)
    : [...MATH_KNOWLEDGE_POINTS, ...CHINESE_KNOWLEDGE_POINTS, ...ENGLISH_KNOWLEDGE_POINTS]
  return pools.find((item) => item.name === name)
}

export function matchKnowledgePoints(
  names: string[] | string | undefined,
  subject: SubjectId = 'math',
): string[] {
  const allowed = getKnowledgePointNames(subject)
  const list = Array.isArray(names) ? names : names ? [names] : []
  const matched = list.map((name) => name.trim()).filter((name) => allowed.includes(name))
  return matched.length > 0 ? Array.from(new Set(matched)) : []
}

export function fallbackKnowledgeName(subject: SubjectId, raw?: string): string {
  return raw?.trim() || defaultKnowledgeName(subject)
}

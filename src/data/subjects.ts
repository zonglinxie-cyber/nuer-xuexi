import type { ErrorCause, QuestionType, SubjectId } from '../types'

export const SUBJECT_IDS: SubjectId[] = ['math', 'chinese', 'english']

export const SUBJECT_LABELS: Record<SubjectId, string> = {
  math: '数学',
  chinese: '语文',
  english: '英语',
}

export const ALL_QUESTION_TYPES: QuestionType[] = [
  '计算题',
  '应用题',
  '图形题',
  '填空题',
  '选择题',
  '看拼音写字',
  '组词造句',
  '课文/默写',
  '阅读理解',
  '写话',
  '单词拼写',
  '句型',
  '抄写',
  '其他',
]

export const ALL_ERROR_CAUSES: ErrorCause[] = [
  '题意没读懂',
  '计算错误',
  '单位错误',
  '公式/方法不会',
  '粗心漏写',
  '概念不清',
  '错别字',
  '拼音错误',
  '不会表达',
  '搭配不当',
  '没抓住关键',
  '单词拼错',
  '语法/句型',
  '大小写',
  '其他',
]

const QUESTION_TYPES_BY_SUBJECT: Record<SubjectId, QuestionType[]> = {
  math: ['计算题', '应用题', '图形题', '填空题', '选择题', '其他'],
  chinese: ['看拼音写字', '组词造句', '课文/默写', '阅读理解', '写话', '填空题', '选择题', '其他'],
  english: ['单词拼写', '句型', '阅读理解', '抄写', '填空题', '选择题', '其他'],
}

const ERROR_CAUSES_BY_SUBJECT: Record<SubjectId, ErrorCause[]> = {
  math: ['计算错误', '题意没读懂', '单位错误', '公式/方法不会', '粗心漏写', '概念不清', '其他'],
  chinese: ['错别字', '拼音错误', '搭配不当', '不会表达', '没抓住关键', '题意没读懂', '粗心漏写', '其他'],
  english: ['单词拼错', '语法/句型', '大小写', '题意没读懂', '粗心漏写', '概念不清', '其他'],
}

export function isSubjectId(value: unknown): value is SubjectId {
  return value === 'math' || value === 'chinese' || value === 'english'
}

export function parseSubjectId(value: unknown, fallback: SubjectId = 'math'): SubjectId {
  return isSubjectId(value) ? value : fallback
}

export function getQuestionTypes(subject: SubjectId): QuestionType[] {
  return QUESTION_TYPES_BY_SUBJECT[subject]
}

export function getErrorCauses(subject: SubjectId): ErrorCause[] {
  return ERROR_CAUSES_BY_SUBJECT[subject]
}

export function defaultKnowledgeName(subject: SubjectId): string {
  if (subject === 'chinese') return '词语理解与搭配'
  if (subject === 'english') return '核心句型'
  return '综合与实践'
}

export function defaultTextbookUnit(subject: SubjectId): string {
  if (subject === 'chinese') return '统编四年级上册语文'
  if (subject === 'english') return '四年级英语'
  return '人教版四年级上册'
}

export function knownConditionsLabel(subject: SubjectId): string {
  if (subject === 'chinese') return '材料 / 原句'
  if (subject === 'english') return '题目要求'
  return '已知条件与问题'
}

export function askedQuestionLabel(subject: SubjectId): string {
  if (subject === 'chinese') return '这道题在问：'
  if (subject === 'english') return '需要完成的是：'
  return '要求解的是：'
}

export function printSheetTitle(subject?: SubjectId | 'all'): string {
  if (subject === 'chinese') return '四年级语文错题专项重做练习单'
  if (subject === 'english') return '四年级英语错题专项重做练习单'
  if (subject === 'math') return '四年级数学错题专项重做练习单'
  return '四年级错题专项重做练习单'
}

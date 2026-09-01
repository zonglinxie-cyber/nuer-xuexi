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

export function detectSubjectFromText(text: string): SubjectId | undefined {
  if (!text || typeof text !== 'string') return undefined
  const clean = text.trim()
  if (!clean) return undefined

  // 英语特征词汇与规则
  const englishPatterns = [
    /\b(listen|read|choose|write|fill|match|circle|complete|look|what|where|when|who|how|is|are|am|do|does|can|have|has|this|that|these|those)\b/i,
    /\b(my|your|his|her|its|our|their|name|school|classroom|teacher|student|friend|apple|banana|book|pen|bag|desk|chair)\b/i,
  ]
  const englishWordMatches = clean.match(/[a-zA-Z]{2,}/g) || []
  const chineseCharMatches = clean.match(/[\u4e00-\u9fa5]/g) || []

  // 如果英文字符数占主导（或有经典英语指令词且中文很少）
  if (
    englishPatterns.some((p) => p.test(clean)) &&
    (englishWordMatches.length >= 3 || englishWordMatches.length > chineseCharMatches.length * 0.4)
  ) {
    return 'english'
  }

  // 数学特征词汇与公式
  const mathPatterns = [
    /\\times|\\div|\\frac|\\angle|\$|km²|cm²|m²|平方千米|公顷|平方米|平方厘米/,
    /\b(\d+\s*[\+\-\*\/×÷＝=]\s*\d+)\b/,
    /(计算|算式|脱式|竖式|商是|余数|积是|求和|解方程|大数的认识|亿|万|射线|直线|角|平行|梯形|周长|面积|单价|数量|总价|速度|时间|路程)/,
  ]
  if (mathPatterns.some((p) => p.test(clean))) {
    return 'math'
  }

  // 语文特征词汇
  const chinesePatterns = [
    /(拼音|看拼音|组词|造句|成语|近义词|反义词|多音字|修改病句|病句|标点符号|修辞|比喻|拟人|排比|课文|默写|背诵|古诗|文言文|现代文|短文|阅读短文|中心思想|段落大意|习作|写话)/,
  ]
  if (chinesePatterns.some((p) => p.test(clean))) {
    return 'chinese'
  }

  return undefined
}


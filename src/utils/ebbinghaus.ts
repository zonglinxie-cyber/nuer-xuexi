import type { WrongQuestion } from '../types'

/**
 * 艾宾浩斯复习状态
 */
export interface EbbinghausStatus {
  isDue: boolean       // 今天是否需要复习
  nextDueDays: number  // 距离下一次复习还有多少天 (如果是 -1 则表示已掌握，不再需要复习)
}

/**
 * 计算错题是否符合艾宾浩斯记忆曲线的复习节点。
 * 复习周期：1天、2天、4天、7天、15天
 */
export function getEbbinghausStatus(question: WrongQuestion): EbbinghausStatus {
  if (question.reviewStatus === '已掌握') {
    return { isDue: false, nextDueDays: -1 }
  }

  const now = Date.now()
  const saved = new Date(question.savedAt).getTime()
  const lastReviewed = question.lastReviewedAt ? new Date(question.lastReviewedAt).getTime() : 0
  
  const curveDays = [1, 2, 4, 7, 15]
  
  let isDue = false
  let nextDueTime = saved + 30 * 24 * 3600 * 1000 // 兜底

  for (const days of curveDays) {
    const dueTime = saved + days * 24 * 3600 * 1000
    // 如果当前时间已超过此复习节点，且该节点后还没有复习过
    if (now >= dueTime && lastReviewed < dueTime) {
      isDue = true
      break
    }
    // 找到下一个未来的复习节点
    if (now < dueTime) {
      nextDueTime = dueTime
      break
    }
  }

  // 即使现在不 due，也计算出距离下一次由于多少天
  let nextDueDays = Math.ceil((nextDueTime - now) / (1000 * 3600 * 24))
  if (nextDueDays < 0) nextDueDays = 0

  return {
    isDue,
    nextDueDays: isDue ? 0 : nextDueDays,
  }
}

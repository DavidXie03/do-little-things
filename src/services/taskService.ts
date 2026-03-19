import type { Task, DailyConfig, CustomAction, DailyTodoItem, RecurrenceType } from '../types'
import { TaskType, RecurrenceType as RT } from '../types'
import { toLocalDateStr } from '../composables/storageCore'

export const DEFAULT_ACTIONS: { content: string; repeatCount: number; recurrence: RecurrenceType }[] = [
  { content: '喝一杯水', repeatCount: 3, recurrence: RT.Daily },
  { content: '站起来活动一会', repeatCount: 3, recurrence: RT.Daily },
  { content: '去眺望远方', repeatCount: 3, recurrence: RT.Daily },
]

/**
 * 判断某个 CustomAction 在给定日期是否应该触发
 */
export function shouldTriggerOnDate(ca: CustomAction, dateStr: string): boolean {
  // 如果设置了 startDate，在 startDate 之前不触发
  if (ca.startDate && dateStr < ca.startDate) {
    return false
  }

  const date = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = date.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  const dayOfMonth = date.getDate()

  // 使用 startDate 或 createdAt 作为锚点日期
  const anchorDate = ca.startDate
    ? new Date(ca.startDate + 'T00:00:00')
    : new Date(ca.createdAt)

  switch (ca.recurrence) {
    case RT.Daily:
      return true
    case RT.Weekday:
      return dayOfWeek >= 1 && dayOfWeek <= 5
    case RT.Weekly: {
      return dayOfWeek === anchorDate.getDay()
    }
    case RT.Monthly: {
      return dayOfMonth === anchorDate.getDate()
    }
    case RT.Yearly: {
      return date.getMonth() === anchorDate.getMonth() && dayOfMonth === anchorDate.getDate()
    }
    default:
      return true
  }
}

/**
 * 获取某个 CustomAction 在指定日期之后（含）的下一个触发日期
 * 最多查找 366 天
 */
export function getNextTriggerDate(ca: CustomAction, fromDateStr: string): string | null {
  const from = new Date(fromDateStr + 'T00:00:00')
  for (let i = 0; i <= 366; i++) {
    const checkDate = new Date(from)
    checkDate.setDate(checkDate.getDate() + i)
    const checkStr = toLocalDateStr(checkDate)
    if (shouldTriggerOnDate(ca, checkStr)) {
      return checkStr
    }
  }
  return null
}

/**
 * 为指定日期生成当天的待办项
 */
export function generateDailyTodoItems(
  _config: DailyConfig,
  customActions: CustomAction[],
  dateStr?: string
): DailyTodoItem[] {
  const today = dateStr ?? toLocalDateStr(new Date())
  const items: DailyTodoItem[] = []
  let todoId = 0

  for (const ca of customActions) {
    if (!shouldTriggerOnDate(ca, today)) continue

    const task: Task = {
      id: `custom_${ca.id}`,
      type: TaskType.Action as TaskType,
      content: ca.content,
      repeatCount: ca.repeatCount,
      recurrence: ca.recurrence,
    }
    items.push({
      id: `todo_${++todoId}`,
      task,
      completed: false,
      totalCount: ca.repeatCount,
      completedCount: 0,
      scheduledDate: today,
    })
  }

  return items.sort(() => Math.random() - 0.5)
}

export function generateFutureTodoItems(
  customActions: CustomAction[],
  todayStr: string
): DailyTodoItem[] {
  const items: DailyTodoItem[] = []
  let todoId = 1000 // 避免和当天的 id 冲突

  // 明天开始算起
  const tomorrow = new Date(todayStr + 'T00:00:00')
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = toLocalDateStr(tomorrow)

  for (const ca of customActions) {
    // 今天已经会显示的 daily 类型不需要在未来列表中再显示
    // 但对于非每天循环的任务，需要找到下一个触发日
    const nextDate = getNextTriggerDate(ca, tomorrowStr)
    if (!nextDate) continue

    const task: Task = {
      id: `custom_${ca.id}`,
      type: TaskType.Action as TaskType,
      content: ca.content,
      repeatCount: ca.repeatCount,
      recurrence: ca.recurrence,
    }
    items.push({
      id: `future_${++todoId}`,
      task,
      completed: false,
      totalCount: ca.repeatCount,
      completedCount: 0,
      scheduledDate: nextDate,
    })
  }

  items.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))

  return items
}

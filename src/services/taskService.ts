import type { Task, DailyConfig, CustomAction, DailyTodoItem, RecurrenceType } from '../types'
import { TaskType, RecurrenceType as RT } from '../types'

export const DEFAULT_ACTIONS: { content: string; repeatCount: number; recurrence: RecurrenceType }[] = [
  { content: '喝一杯水', repeatCount: 3, recurrence: RT.Daily },
  { content: '站起来活动一会', repeatCount: 3, recurrence: RT.Daily },
  { content: '去眺望远方', repeatCount: 3, recurrence: RT.Daily },
]

/**
 * 判断某个 CustomAction 在给定日期是否应该触发
 */
export function shouldTriggerOnDate(ca: CustomAction, dateStr: string): boolean {
  const date = new Date(dateStr + 'T00:00:00')
  const dayOfWeek = date.getDay() // 0=Sunday, 1=Monday, ..., 6=Saturday
  const dayOfMonth = date.getDate()

  switch (ca.recurrence) {
    case RT.Daily:
      return true
    case RT.Weekday:
      return dayOfWeek >= 1 && dayOfWeek <= 5
    case RT.Weekly: {
      // 每周：以创建日期的星期几为锚点
      const createdDate = new Date(ca.createdAt)
      return dayOfWeek === createdDate.getDay()
    }
    case RT.Monthly: {
      // 每月：以创建日期的日为锚点
      const createdDate = new Date(ca.createdAt)
      return dayOfMonth === createdDate.getDate()
    }
    case RT.Yearly: {
      // 每年：以创建日期的月和日为锚点
      const createdDate = new Date(ca.createdAt)
      return date.getMonth() === createdDate.getMonth() && dayOfMonth === createdDate.getDate()
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
    const checkStr = checkDate.toISOString().split('T')[0] ?? ''
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
  const today = dateStr ?? new Date().toISOString().split('T')[0] ?? ''
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

/**
 * 生成未来待办预览列表
 * 对于每个循环任务，只展示下一个最近的触发日期
 * 排除今天已经显示的项
 */
export function generateFutureTodoItems(
  customActions: CustomAction[],
  todayStr: string
): DailyTodoItem[] {
  const items: DailyTodoItem[] = []
  let todoId = 1000 // 避免和当天的 id 冲突

  // 明天开始算起
  const tomorrow = new Date(todayStr + 'T00:00:00')
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0] ?? ''

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

  // 按日期排序
  items.sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))

  return items
}

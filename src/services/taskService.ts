import type { Task, DailyConfig, CustomAction, DailyTodoItem } from '../types'
import { TaskType } from '../types'

export const DEFAULT_ACTIONS: { content: string; repeatCount: number }[] = [
  { content: '喝一杯水', repeatCount: 3 },
  { content: '站起来活动一会', repeatCount: 3 },
  { content: '去眺望远方', repeatCount: 3 },
]

export function generateDailyTodoItems(
  _config: DailyConfig,
  customActions: CustomAction[]
): DailyTodoItem[] {
  const items: DailyTodoItem[] = []
  let todoId = 0

  for (const ca of customActions) {
    const task: Task = {
      id: `custom_${ca.id}`,
      type: TaskType.Action as TaskType,
      content: ca.content,
      repeatCount: ca.repeatCount,
    }
    items.push({
      id: `todo_${++todoId}`,
      task,
      completed: false,
      totalCount: ca.repeatCount,
      completedCount: 0,
    })
  }

  return items.sort(() => Math.random() - 0.5)
}

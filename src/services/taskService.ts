import type { Task, DailyConfig, CustomAction, DailyTodoItem } from '../types'
import { TaskType } from '../types'
import mockData from '../data/mockTasks.json'

const allTasks: Task[] = mockData as Task[]

/** 已展示过的任务ID集合（避免短期内重复） */
const shownTaskIds: Set<string> = new Set()

/** 获取随机一条小事 */
export function getRandomTask(excludeType?: TaskType): Task {
  let pool = allTasks.filter(t => !shownTaskIds.has(t.id))

  if (excludeType) {
    pool = pool.filter(t => t.type !== excludeType)
  }

  if (pool.length === 0) {
    shownTaskIds.clear()
    pool = excludeType
      ? allTasks.filter(t => t.type !== excludeType)
      : [...allTasks]
  }

  const idx = Math.floor(Math.random() * pool.length)
  const task = pool[idx]!
  shownTaskIds.add(task.id)
  return task
}

/** 获取指定类型的随机小事 */
export function getTaskByType(type: TaskType): Task {
  const pool = allTasks.filter(t => t.type === type && !shownTaskIds.has(t.id))
  if (pool.length === 0) {
    const typePool = allTasks.filter(t => t.type === type)
    typePool.forEach(t => shownTaskIds.delete(t.id))
    const picked = typePool[Math.floor(Math.random() * typePool.length)]!
    return picked
  }
  const task = pool[Math.floor(Math.random() * pool.length)]!
  shownTaskIds.add(task.id)
  return task
}

/** 从指定类型中随机抽取N条不重复的任务 */
function pickRandomTasks(type: TaskType, count: number): Task[] {
  const typePool = allTasks.filter(t => t.type === type)
  const shuffled = [...typePool].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(count, shuffled.length))
}

/** 将自定义微行动转换为Task */
function customActionsToTasks(customActions: CustomAction[], count: number): Task[] {
  if (customActions.length === 0) return []
  const shuffled = [...customActions].sort(() => Math.random() - 0.5)
  const picked = shuffled.slice(0, Math.min(count, shuffled.length))
  return picked.map(ca => ({
    id: `custom_${ca.id}`,
    type: TaskType.Action as TaskType,
    content: ca.content,
  }))
}

/** 根据每日配置生成待办列表 */
export function generateDailyTodoItems(
  config: DailyConfig,
  customActions: CustomAction[]
): DailyTodoItem[] {
  const items: DailyTodoItem[] = []
  let todoId = 0

  // 冷知识
  const knowledgeTasks = pickRandomTasks(TaskType.Knowledge, config.knowledge)
  knowledgeTasks.forEach(task => {
    items.push({ id: `todo_${++todoId}`, task, completed: false })
  })

  // 微行动：优先从自定义事项中抽取，不足的从预设中补充
  const customCount = Math.min(config.action, customActions.length)
  const presetCount = config.action - customCount
  const customTasks = customActionsToTasks(customActions, customCount)
  const presetActionTasks = pickRandomTasks(TaskType.Action, presetCount)
  ;[...customTasks, ...presetActionTasks].forEach(task => {
    items.push({ id: `todo_${++todoId}`, task, completed: false })
  })

  // 轻探索
  const exploreTasks = pickRandomTasks(TaskType.Explore, config.explore)
  exploreTasks.forEach(task => {
    items.push({ id: `todo_${++todoId}`, task, completed: false })
  })

  // 短新闻
  const newsTasks = pickRandomTasks(TaskType.News, config.news)
  newsTasks.forEach(task => {
    items.push({ id: `todo_${++todoId}`, task, completed: false })
  })

  // 打乱顺序
  return items.sort(() => Math.random() - 0.5)
}

/** 获取所有类型 */
export function getAllTypes(): TaskType[] {
  return [TaskType.Knowledge, TaskType.Action, TaskType.Explore, TaskType.News]
}

/** 重置展示记录 */
export function resetShownTasks(): void {
  shownTaskIds.clear()
}

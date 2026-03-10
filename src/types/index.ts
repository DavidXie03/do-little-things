/** 小事类型 */
export const TaskType = {
  Knowledge: 'knowledge',
  Action: 'action',
  Explore: 'explore',
  News: 'news',
} as const

export type TaskType = (typeof TaskType)[keyof typeof TaskType]

/** 小事类型中文映射 */
export const TaskTypeLabel: Record<TaskType, string> = {
  [TaskType.Knowledge]: '冷知识',
  [TaskType.Action]: '微行动',
  [TaskType.Explore]: '轻探索',
  [TaskType.News]: '短新闻',
}

/** 小事类型颜色映射 */
export const TaskTypeColor: Record<TaskType, string> = {
  [TaskType.Knowledge]: '#6C63FF',
  [TaskType.Action]: '#FF6B6B',
  [TaskType.Explore]: '#4ECDC4',
  [TaskType.News]: '#FFE66D',
}

/** 所有类型列表 */
export const ALL_TASK_TYPES: TaskType[] = [
  TaskType.Knowledge,
  TaskType.Action,
  TaskType.Explore,
  TaskType.News,
]

/** 只读类型（只能完成，不能稍后/丢弃） */
export const READ_ONLY_TYPES: TaskType[] = [
  TaskType.Knowledge,
  TaskType.News,
]

/** 判断是否为只读类型 */
export function isReadOnlyType(type: TaskType): boolean {
  return READ_ONLY_TYPES.includes(type)
}

/** 小事数据结构 */
export interface Task {
  id: string
  type: TaskType
  content: string
  icon?: string
}

/** 滑动操作类型 */
export type SwipeAction = 'complete' | 'pending' | 'discard'

/** 滑动方向 */
export type SwipeDirection = 'left' | 'right' | 'down' | 'none'

/** 完成记录 */
export interface TaskRecord {
  taskId: string
  type: TaskType
  action: SwipeAction
  timestamp: number
  date: string // YYYY-MM-DD
}

/** 待办项 */
export interface PendingTask {
  task: Task
  addedAt: number
}

/** 雷达图统计数据 */
export interface StatsData {
  knowledge: number
  action: number
  explore: number
  news: number
}

/** 每日配置：用户设定各类型的每日数量 */
export interface DailyConfig {
  knowledge: number
  action: number
  explore: number
  news: number
}

/** 用户自定义微行动事项 */
export interface CustomAction {
  id: string
  content: string
  createdAt: number
}

/** 每日待办项 */
export interface DailyTodoItem {
  id: string
  task: Task
  completed: boolean
  completedAt?: number
}

/** 每日待办列表 */
export interface DailyTodoList {
  date: string // YYYY-MM-DD
  items: DailyTodoItem[]
  generatedAt: number
}

/** 存储数据版本 */
export interface StorageData {
  version: number
  records: TaskRecord[]
  pendingTasks: PendingTask[]
  dailyConfig: DailyConfig
  customActions: CustomAction[]
  dailyTodos: DailyTodoList | null
}

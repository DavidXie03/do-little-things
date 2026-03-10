/** 小事类型 - 简化为仅待办事项 */
export const TaskType = {
  Action: 'action',
} as const

export type TaskType = (typeof TaskType)[keyof typeof TaskType]

/** 小事类型中文映射 */
export const TaskTypeLabel: Record<TaskType, string> = {
  [TaskType.Action]: '待办',
}

/** 小事类型颜色映射 */
export const TaskTypeColor: Record<TaskType, string> = {
  [TaskType.Action]: '#6C63FF',
}

/** 所有类型列表 */
export const ALL_TASK_TYPES: TaskType[] = [
  TaskType.Action,
]

/** 小事数据结构 */
export interface Task {
  id: string
  type: TaskType
  content: string
  icon?: string
  /** 需要重复执行的次数，默认1 */
  repeatCount?: number
}

/** 滑动操作类型 */
export type SwipeAction = 'complete' | 'pending'

/** 滑动方向 */
export type SwipeDirection = 'left' | 'right' | 'none'

/** 完成记录 */
export interface TaskRecord {
  taskId: string
  type: TaskType
  action: SwipeAction
  timestamp: number
  date: string // YYYY-MM-DD
}

/** 待办项（稍后处理） */
export interface PendingTask {
  task: Task
  addedAt: number
}

/** 用户自定义待办事项 */
export interface CustomAction {
  id: string
  content: string
  createdAt: number
  /** 每日需要重复执行的次数，默认1 */
  repeatCount: number
}

/** 每日待办项 */
export interface DailyTodoItem {
  id: string
  task: Task
  completed: boolean
  completedAt?: number
  /** 需要完成的总次数 */
  totalCount: number
  /** 已完成的次数 */
  completedCount: number
}

/** 每日待办列表 */
export interface DailyTodoList {
  date: string // YYYY-MM-DD
  items: DailyTodoItem[]
  generatedAt: number
}

/** 每日配置 */
export interface DailyConfig {
  action: number
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

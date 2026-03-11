export const TaskType = {
  Action: 'action',
} as const

export type TaskType = (typeof TaskType)[keyof typeof TaskType]

export const TaskTypeLabel: Record<TaskType, string> = {
  [TaskType.Action]: '待办',
}

export const TaskTypeColor: Record<TaskType, string> = {
  [TaskType.Action]: '#6C63FF',
}

export const ALL_TASK_TYPES: TaskType[] = [
  TaskType.Action,
]

// 循环类型
export const RecurrenceType = {
  Daily: 'daily',       // 每一天
  Weekly: 'weekly',     // 每一周
  Monthly: 'monthly',   // 每一月
  Yearly: 'yearly',     // 每一年
  Weekday: 'weekday',   // 工作日（周一到周五）
} as const

export type RecurrenceType = (typeof RecurrenceType)[keyof typeof RecurrenceType]

export const RecurrenceTypeLabel: Record<RecurrenceType, string> = {
  [RecurrenceType.Daily]: '每天',
  [RecurrenceType.Weekly]: '每周',
  [RecurrenceType.Monthly]: '每月',
  [RecurrenceType.Yearly]: '每年',
  [RecurrenceType.Weekday]: '工作日',
}

export const ALL_RECURRENCE_TYPES: RecurrenceType[] = [
  RecurrenceType.Daily,
  RecurrenceType.Weekday,
  RecurrenceType.Weekly,
  RecurrenceType.Monthly,
  RecurrenceType.Yearly,
]

export interface Task {
  id: string
  type: TaskType
  content: string
  icon?: string
  repeatCount?: number
  recurrence?: RecurrenceType
}

export type SwipeAction = 'complete' | 'pending'

export type SwipeDirection = 'left' | 'right' | 'none'

export interface TaskRecord {
  taskId: string
  type: TaskType
  action: SwipeAction
  timestamp: number
  date: string // YYYY-MM-DD
}

export interface PendingTask {
  task: Task
  addedAt: number
}

export interface CustomAction {
  id: string
  content: string
  createdAt: number
  repeatCount: number
  recurrence: RecurrenceType
}

export interface DailyTodoItem {
  id: string
  task: Task
  completed: boolean
  completedAt?: number
  totalCount: number
  completedCount: number
  scheduledDate: string // YYYY-MM-DD，该待办属于哪天
}

export interface DailyTodoList {
  date: string // YYYY-MM-DD，生成日期
  items: DailyTodoItem[]
  generatedAt: number
}

export interface DailyConfig {
  action: number
}

export interface StorageData {
  version: number
  records: TaskRecord[]
  pendingTasks: PendingTask[]
  dailyConfig: DailyConfig
  customActions: CustomAction[]
  dailyTodos: DailyTodoList | null
}

export const TaskType = {
  Action: 'action',
} as const

export type TaskType = (typeof TaskType)[keyof typeof TaskType]

export const RecurrenceType = {
  Daily: 'daily',
  Weekly: 'weekly',
  Monthly: 'monthly',
  Yearly: 'yearly',
  Weekday: 'weekday',
} as const

export type RecurrenceType = (typeof RecurrenceType)[keyof typeof RecurrenceType]

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
  startDate?: string // YYYY-MM-DD，任务开始日期，默认为创建当天
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
  slogan?: string
  showSlogan?: boolean
}

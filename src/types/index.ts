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

export interface Task {
  id: string
  type: TaskType
  content: string
  icon?: string
  repeatCount?: number
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
}

export interface DailyTodoItem {
  id: string
  task: Task
  completed: boolean
  completedAt?: number
  totalCount: number
  completedCount: number
}

export interface DailyTodoList {
  date: string // YYYY-MM-DD
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

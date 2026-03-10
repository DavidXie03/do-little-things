import { ref, computed } from 'vue'
import type { TaskRecord, StorageData, StatsData, DailyConfig, CustomAction, DailyTodoList } from '../types'
import { TaskType } from '../types'
import type { Task } from '../types'
import { generateDailyTodoItems } from '../services/taskService'

const STORAGE_KEY = 'do-little-things-data'
const CURRENT_VERSION = 2

function getDefaultDailyConfig(): DailyConfig {
  return {
    knowledge: 3,
    action: 3,
    explore: 2,
    news: 2,
  }
}

function getDefaultData(): StorageData {
  return {
    version: CURRENT_VERSION,
    records: [],
    pendingTasks: [],
    dailyConfig: getDefaultDailyConfig(),
    customActions: [],
    dailyTodos: null,
  }
}

function migrateData(data: any): StorageData {
  // v1 -> v2: 添加 dailyConfig, customActions, dailyTodos
  if (!data.dailyConfig) {
    data.dailyConfig = getDefaultDailyConfig()
  }
  if (!data.customActions) {
    data.customActions = []
  }
  if (!data.dailyTodos) {
    data.dailyTodos = null
  }
  data.version = CURRENT_VERSION
  return data as StorageData
}

function loadData(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultData()
    const data = JSON.parse(raw)
    if (data.version !== CURRENT_VERSION) {
      return migrateData(data)
    }
    return data as StorageData
  } catch {
    return getDefaultData()
  }
}

function saveData(data: StorageData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0] ?? ''
}

// 响应式存储状态
const storageData = ref<StorageData>(loadData())

export function useStorage() {
  /** 添加完成记录 */
  function addRecord(record: TaskRecord): void {
    storageData.value.records.push(record)
    saveData(storageData.value)
  }

  /** 添加待办任务 */
  function addPendingTask(task: Task): void {
    const exists = storageData.value.pendingTasks.find(p => p.task.id === task.id)
    if (!exists) {
      storageData.value.pendingTasks.push({
        task,
        addedAt: Date.now(),
      })
      saveData(storageData.value)
    }
  }

  /** 从待办中移除 */
  function removePendingTask(taskId: string): void {
    storageData.value.pendingTasks = storageData.value.pendingTasks.filter(
      p => p.task.id !== taskId
    )
    saveData(storageData.value)
  }

  /** 完成待办任务 */
  function completePendingTask(taskId: string): void {
    const pending = storageData.value.pendingTasks.find(p => p.task.id === taskId)
    if (pending) {
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0] ?? ''
      addRecord({
        taskId: pending.task.id,
        type: pending.task.type,
        action: 'complete',
        timestamp: now.getTime(),
        date: dateStr,
      })
      removePendingTask(taskId)
    }
  }

  /** 获取所有待办 */
  const pendingTasks = computed(() => {
    return [...storageData.value.pendingTasks].sort((a, b) => b.addedAt - a.addedAt)
  })

  /** 获取所有记录 */
  const records = computed(() => storageData.value.records)

  /** 今日完成数 */
  const todayCompleteCount = computed(() => {
    const today = getTodayStr()
    return storageData.value.records.filter(
      r => r.date === today && r.action === 'complete'
    ).length
  })

  /** 按月获取统计 */
  function getMonthStats(year: number, month: number): StatsData {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    const monthRecords = storageData.value.records.filter(
      r => r.date.startsWith(prefix) && r.action === 'complete'
    )

    const stats: StatsData = {
      knowledge: 0,
      action: 0,
      explore: 0,
      news: 0,
    }

    monthRecords.forEach(r => {
      if (r.type in stats) {
        stats[r.type as keyof StatsData]++
      }
    })

    return stats
  }

  /** 获取月度总完成数 */
  function getMonthTotal(year: number, month: number): number {
    const stats = getMonthStats(year, month)
    return Object.values(stats).reduce((sum, v) => sum + v, 0)
  }

  /** 获取最活跃类型 */
  function getMostActiveType(year: number, month: number): TaskType | null {
    const stats = getMonthStats(year, month)
    let max = 0
    let maxType: TaskType | null = null
    for (const [type, count] of Object.entries(stats)) {
      if (count > max) {
        max = count
        maxType = type as TaskType
      }
    }
    return maxType
  }

  /** 获取连续打卡天数 */
  function getStreakDays(): number {
    const dates = new Set(
      storageData.value.records
        .filter(r => r.action === 'complete')
        .map(r => r.date)
    )

    let streak = 0
    const current = new Date()

    while (true) {
      const dateStr = current.toISOString().split('T')[0] ?? ''
      if (dates.has(dateStr)) {
        streak++
        current.setDate(current.getDate() - 1)
      } else {
        break
      }
    }

    return streak
  }

  // ========= 每日配置相关 =========

  /** 获取每日配置 */
  const dailyConfig = computed(() => storageData.value.dailyConfig)

  /** 更新每日配置 */
  function updateDailyConfig(config: DailyConfig): void {
    storageData.value.dailyConfig = config
    saveData(storageData.value)
  }

  /** 获取自定义微行动列表 */
  const customActions = computed(() => storageData.value.customActions)

  /** 添加自定义微行动 */
  function addCustomAction(content: string): void {
    storageData.value.customActions.push({
      id: `ca_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      content,
      createdAt: Date.now(),
    })
    saveData(storageData.value)
  }

  /** 删除自定义微行动 */
  function removeCustomAction(id: string): void {
    storageData.value.customActions = storageData.value.customActions.filter(
      ca => ca.id !== id
    )
    saveData(storageData.value)
  }

  // ========= 每日待办相关 =========

  /** 获取当日待办列表 */
  const dailyTodos = computed(() => storageData.value.dailyTodos)

  /** 检查并生成当日待办（如果还没有） */
  function ensureDailyTodos(): DailyTodoList {
    const today = getTodayStr()
    if (storageData.value.dailyTodos && storageData.value.dailyTodos.date === today) {
      return storageData.value.dailyTodos
    }
    // 生成新的每日待办
    return regenerateDailyTodos()
  }

  /** 强制重新生成当日待办 */
  function regenerateDailyTodos(): DailyTodoList {
    const today = getTodayStr()
    const items = generateDailyTodoItems(
      storageData.value.dailyConfig,
      storageData.value.customActions
    )
    const todoList: DailyTodoList = {
      date: today,
      items,
      generatedAt: Date.now(),
    }
    storageData.value.dailyTodos = todoList
    saveData(storageData.value)
    return todoList
  }

  /** 标记待办完成 */
  function markTodoComplete(todoId: string): void {
    if (!storageData.value.dailyTodos) return
    const item = storageData.value.dailyTodos.items.find(i => i.id === todoId)
    if (item && !item.completed) {
      item.completed = true
      item.completedAt = Date.now()

      // 同时记录到 records
      const now = new Date()
      const dateStr = now.toISOString().split('T')[0] ?? ''
      addRecord({
        taskId: item.task.id,
        type: item.task.type,
        action: 'complete',
        timestamp: now.getTime(),
        date: dateStr,
      })

      saveData(storageData.value)
    }
  }

  /** 获取今日待办进度 */
  const dailyProgress = computed(() => {
    const todos = storageData.value.dailyTodos
    if (!todos || todos.date !== getTodayStr()) {
      return { completed: 0, total: 0 }
    }
    const total = todos.items.length
    const completed = todos.items.filter(i => i.completed).length
    return { completed, total }
  })

  /** 获取下一个未完成的待办 */
  function getNextUncompletedTodo() {
    const today = getTodayStr()
    const todos = storageData.value.dailyTodos
    if (!todos || todos.date !== today) return null
    return todos.items.find(i => !i.completed) || null
  }

  return {
    addRecord,
    addPendingTask,
    removePendingTask,
    completePendingTask,
    pendingTasks,
    records,
    todayCompleteCount,
    getMonthStats,
    getMonthTotal,
    getMostActiveType,
    getStreakDays,
    // 每日配置
    dailyConfig,
    updateDailyConfig,
    customActions,
    addCustomAction,
    removeCustomAction,
    // 每日待办
    dailyTodos,
    ensureDailyTodos,
    regenerateDailyTodos,
    markTodoComplete,
    dailyProgress,
    getNextUncompletedTodo,
  }
}

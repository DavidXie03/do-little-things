import { ref, computed } from 'vue'
import type { TaskRecord, StorageData, DailyConfig, DailyTodoList } from '../types'
import type { Task } from '../types'
import { generateDailyTodoItems, DEFAULT_ACTIONS } from '../services/taskService'

const STORAGE_KEY = 'do-little-things-data'
const CURRENT_VERSION = 4

function getDefaultDailyConfig(): DailyConfig {
  return {
    action: 5,
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
  // 迁移配置
  if (!data.dailyConfig || typeof data.dailyConfig.action === 'undefined') {
    const oldAction = data.dailyConfig?.action ?? 5
    data.dailyConfig = { action: oldAction }
  }
  // 移除多余字段
  if (data.dailyConfig.knowledge !== undefined) delete data.dailyConfig.knowledge
  if (data.dailyConfig.explore !== undefined) delete data.dailyConfig.explore
  if (data.dailyConfig.news !== undefined) delete data.dailyConfig.news

  if (!data.customActions) data.customActions = []
  if (!data.dailyTodos) data.dailyTodos = null
  if (!data.pendingTasks) data.pendingTasks = []
  if (!data.records) data.records = []

  // v4: 为自定义待办添加 repeatCount
  for (const ca of data.customActions) {
    if (ca.repeatCount === undefined) ca.repeatCount = 1
  }

  // v4: 为每日待办添加 totalCount/completedCount
  if (data.dailyTodos && data.dailyTodos.items) {
    for (const item of data.dailyTodos.items) {
      if (item.totalCount === undefined) item.totalCount = 1
      if (item.completedCount === undefined) item.completedCount = item.completed ? 1 : 0
    }
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

function initializeDefaultActions(data: StorageData): StorageData {
  // 如果还没有任何自定义待办，添加默认的3个
  if (data.customActions.length === 0) {
    for (const action of DEFAULT_ACTIONS) {
      data.customActions.push({
        id: `ca_default_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        content: action.content,
        createdAt: Date.now(),
        repeatCount: action.repeatCount,
      })
    }
    saveData(data)
  }
  return data
}

// 响应式存储状态
const storageData = ref<StorageData>(initializeDefaultActions(loadData()))

export function useStorage() {
  /** 添加完成记录 */
  function addRecord(record: TaskRecord): void {
    storageData.value.records.push(record)
    saveData(storageData.value)
  }

  /** 添加待办任务（稍后处理） */
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

  /** 获取所有稍后待办 */
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

  /** 获取自定义待办列表 */
  const customActions = computed(() => storageData.value.customActions)

  /** 添加自定义待办 */
  function addCustomAction(content: string, repeatCount: number = 1): void {
    storageData.value.customActions.push({
      id: `ca_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      content,
      createdAt: Date.now(),
      repeatCount,
    })
    saveData(storageData.value)
  }

  /** 删除自定义待办 */
  function removeCustomAction(id: string): void {
    storageData.value.customActions = storageData.value.customActions.filter(
      ca => ca.id !== id
    )
    saveData(storageData.value)
  }

  /** 更新自定义待办的重复次数 */
  function updateCustomActionRepeatCount(id: string, repeatCount: number): void {
    const ca = storageData.value.customActions.find(c => c.id === id)
    if (ca) {
      ca.repeatCount = Math.max(1, repeatCount)
      saveData(storageData.value)
    }
  }

  /** 更新自定义待办的内容和重复次数 */
  function updateCustomAction(id: string, content: string, repeatCount: number): void {
    const ca = storageData.value.customActions.find(c => c.id === id)
    if (ca) {
      ca.content = content
      ca.repeatCount = Math.max(1, repeatCount)
      // 同步更新今日待办中对应的项
      if (storageData.value.dailyTodos) {
        const todoItem = storageData.value.dailyTodos.items.find(
          i => i.task.id === `custom_${id}`
        )
        if (todoItem) {
          todoItem.task.content = content
          todoItem.task.repeatCount = Math.max(1, repeatCount)
          todoItem.totalCount = Math.max(1, repeatCount)
        }
      }
      saveData(storageData.value)
    }
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

  /** 标记待办完成一次（支持多次重复） */
  function markTodoComplete(todoId: string): void {
    if (!storageData.value.dailyTodos) return
    const item = storageData.value.dailyTodos.items.find(i => i.id === todoId)
    if (item && !item.completed) {
      item.completedCount = (item.completedCount || 0) + 1

      // 只有当完成次数达到总次数时才标记为已完成
      if (item.completedCount >= item.totalCount) {
        item.completed = true
        item.completedAt = Date.now()
      }

      // 记录到 records
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

  /** 删除今日待办项 */
  function removeTodoItem(todoId: string): void {
    if (!storageData.value.dailyTodos) return
    storageData.value.dailyTodos.items = storageData.value.dailyTodos.items.filter(
      i => i.id !== todoId
    )
    saveData(storageData.value)
  }

  /** 获取今日待办进度（按总次数计算） */
  const dailyProgress = computed(() => {
    const todos = storageData.value.dailyTodos
    if (!todos || todos.date !== getTodayStr()) {
      return { completed: 0, total: 0 }
    }
    let total = 0
    let completed = 0
    for (const item of todos.items) {
      total += item.totalCount
      completed += item.completedCount || 0
    }
    return { completed, total }
  })

  /** 获取下一个未完成的待办（随机排序） */
  function getNextUncompletedTodo() {
    const today = getTodayStr()
    const todos = storageData.value.dailyTodos
    if (!todos || todos.date !== today) return null
    const uncompleted = todos.items.filter(i => !i.completed)
    if (uncompleted.length === 0) return null
    // 随机选取一个未完成的待办
    const randomIndex = Math.floor(Math.random() * uncompleted.length)
    return uncompleted[randomIndex] || null
  }

  return {
    addRecord,
    addPendingTask,
    removePendingTask,
    completePendingTask,
    pendingTasks,
    records,
    todayCompleteCount,
    getStreakDays,
    // 每日配置
    dailyConfig,
    updateDailyConfig,
    customActions,
    addCustomAction,
    removeCustomAction,
    updateCustomActionRepeatCount,
    updateCustomAction,
    // 每日待办
    dailyTodos,
    ensureDailyTodos,
    regenerateDailyTodos,
    markTodoComplete,
    removeTodoItem,
    dailyProgress,
    getNextUncompletedTodo,
  }
}

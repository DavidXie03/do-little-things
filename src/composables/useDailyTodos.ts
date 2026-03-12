import { computed } from 'vue'
import type { DailyTodoList, DailyTodoItem } from '../types'
import { generateDailyTodoItems, generateFutureTodoItems } from '../services/taskService'
import { storageData, saveData, getTodayStr } from './storageCore'
import { useRecords } from './useRecords'

export function useDailyTodos() {
  const { addRecord } = useRecords()

  const dailyTodos = computed(() => storageData.value.dailyTodos)

  function ensureDailyTodos(): DailyTodoList {
    const today = getTodayStr()
    if (storageData.value.dailyTodos && storageData.value.dailyTodos.date === today) {
      return storageData.value.dailyTodos
    }
    return regenerateDailyTodos()
  }

  function regenerateDailyTodos(): DailyTodoList {
    const today = getTodayStr()
    const items = generateDailyTodoItems(
      storageData.value.dailyConfig,
      storageData.value.customActions,
      today
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

  function markTodoComplete(todoId: string): void {
    if (!storageData.value.dailyTodos) return
    const item = storageData.value.dailyTodos.items.find(i => i.id === todoId)
    if (!item) return

    if (item.completed) {
      // 已完成 → 重置为完全未完成
      item.completed = false
      item.completedCount = 0
      delete item.completedAt
    } else {
      // 未完成 → 增加完成次数
      item.completedCount = (item.completedCount || 0) + 1

      if (item.completedCount >= item.totalCount) {
        item.completed = true
        item.completedAt = Date.now()
      }

      const now = new Date()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
      addRecord({
        taskId: item.task.id,
        type: item.task.type,
        action: 'complete',
        timestamp: now.getTime(),
        date: dateStr,
      })
    }

    saveData(storageData.value)
  }

  function removeTodoItem(todoId: string): void {
    if (!storageData.value.dailyTodos) return
    const item = storageData.value.dailyTodos.items.find(i => i.id === todoId)
    if (item) {
      const taskId = item.task.id
      if (taskId.startsWith('custom_')) {
        const caId = taskId.slice(7)
        storageData.value.customActions = storageData.value.customActions.filter(
          ca => ca.id !== caId
        )
      }
    }
    storageData.value.dailyTodos.items = storageData.value.dailyTodos.items.filter(
      i => i.id !== todoId
    )
    saveData(storageData.value)
  }

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

  function getNextUncompletedTodo() {
    const today = getTodayStr()
    const todos = storageData.value.dailyTodos
    if (!todos || todos.date !== today) return null
    const uncompleted = todos.items.filter(i => !i.completed)
    if (uncompleted.length === 0) return null
    const randomIndex = Math.floor(Math.random() * uncompleted.length)
    return uncompleted[randomIndex] || null
  }

  /** 获取所有未完成的待办列表（用于卡片堆叠） */
  function getUncompletedTodos(): DailyTodoItem[] {
    const today = getTodayStr()
    const todos = storageData.value.dailyTodos
    if (!todos || todos.date !== today) return []
    return todos.items.filter(i => !i.completed)
  }

  /**
   * 获取未来待办预览列表
   * 对于每个循环任务，最多只显示一个最近的未来待办
   * 只排除今天未完成的任务；已完成的任务需要显示下次循环日期
   */
  const futureTodos = computed((): DailyTodoItem[] => {
    const today = getTodayStr()
    const todayItems = storageData.value.dailyTodos?.items ?? []

    // 获取今天未完成任务的 task id 集合（已完成的不排除，让下次循环显示在未来列表）
    const todayPendingTaskIds = new Set(
      todayItems.filter(i => !i.completed).map(i => i.task.id)
    )

    const futureItems = generateFutureTodoItems(
      storageData.value.customActions,
      today
    )

    // 去重：每个 customAction 只保留一条
    // 今天未完成的任务不在未来列表显示（避免重复）
    const seen = new Set<string>()
    return futureItems.filter(item => {
      if (seen.has(item.task.id)) return false
      // 今天还未完成的任务，跳过
      if (todayPendingTaskIds.has(item.task.id)) return false
      seen.add(item.task.id)
      return true
    })
  })

  return {
    dailyTodos,
    ensureDailyTodos,
    regenerateDailyTodos,
    markTodoComplete,
    removeTodoItem,
    dailyProgress,
    getNextUncompletedTodo,
    getUncompletedTodos,
    futureTodos,
  }
}

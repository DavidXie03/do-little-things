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
    if (item && !item.completed) {
      item.completedCount = (item.completedCount || 0) + 1

      if (item.completedCount >= item.totalCount) {
        item.completed = true
        item.completedAt = Date.now()
      }

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

  function removeTodoItem(todoId: string): void {
    if (!storageData.value.dailyTodos) return
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

  /**
   * 获取未来待办预览列表
   * 对于每个循环任务，最多只显示一个最近的未来待办
   * 排除今天已显示的任务
   */
  const futureTodos = computed((): DailyTodoItem[] => {
    const today = getTodayStr()
    const todayItems = storageData.value.dailyTodos?.items ?? []

    // 获取今天已经有的任务的 customAction id 集合
    const todayTaskIds = new Set(todayItems.map(i => i.task.id))

    const futureItems = generateFutureTodoItems(
      storageData.value.customActions,
      today
    )

    // 对于"每天"循环类型，今天已经显示了，所以未来列表不需要再显示
    // 但其他循环类型的任务可能今天没触发，需要显示下一个触发日
    // 去重：每个 customAction 只保留一条
    const seen = new Set<string>()
    return futureItems.filter(item => {
      if (seen.has(item.task.id)) return false
      // 对于今天已有的每天任务，跳过（因为它每天都在）
      if (todayTaskIds.has(item.task.id) && item.task.recurrence === 'daily') return false
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
    futureTodos,
  }
}

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

  function markTodoComplete(todoId: string): boolean {
    if (!storageData.value.dailyTodos) return false
    const item = storageData.value.dailyTodos.items.find(i => i.id === todoId)
    if (!item) return false

    if (item.completed) {
      item.completed = false
      item.completedCount = 0
      delete item.completedAt
      saveData(storageData.value)
      return false
    }

    item.completedCount = (item.completedCount || 0) + 1

    const fullyDone = item.completedCount >= item.totalCount
    if (fullyDone) {
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

    saveData(storageData.value)
    return fullyDone
  }

  function removeTodoItem(todoId: string): void {
    const todayItem = storageData.value.dailyTodos?.items.find(i => i.id === todoId)

    if (todayItem) {
      const taskId = todayItem.task.id
      if (taskId.startsWith('custom_')) {
        const caId = taskId.slice(7)
        storageData.value.customActions = storageData.value.customActions.filter(
          ca => ca.id !== caId
        )
      }
      storageData.value.dailyTodos!.items = storageData.value.dailyTodos!.items.filter(
        i => i.id !== todoId
      )
      saveData(storageData.value)
      return
    }

    const futureItems = generateFutureTodoItems(
      storageData.value.customActions,
      getTodayStr()
    )
    const futureItem = futureItems.find(i => i.id === todoId)
    if (futureItem) {
      const taskId = futureItem.task.id
      if (taskId.startsWith('custom_')) {
        const caId = taskId.slice(7)
        storageData.value.customActions = storageData.value.customActions.filter(
          ca => ca.id !== caId
        )
        if (storageData.value.dailyTodos) {
          storageData.value.dailyTodos.items = storageData.value.dailyTodos.items.filter(
            i => i.task.id !== taskId
          )
        }
        saveData(storageData.value)
      }
    }
  }

  function getUncompletedTodos(): DailyTodoItem[] {
    const today = getTodayStr()
    const todos = storageData.value.dailyTodos
    if (!todos || todos.date !== today) return []
    return todos.items.filter(i => !i.completed)
  }

  const futureTodos = computed((): DailyTodoItem[] => {
    const today = getTodayStr()
    const todayItems = storageData.value.dailyTodos?.items ?? []

    const todayPendingTaskIds = new Set(
      todayItems.filter(i => !i.completed).map(i => i.task.id)
    )

    const futureItems = generateFutureTodoItems(
      storageData.value.customActions,
      today
    )

    const seen = new Set<string>()
    return futureItems.filter(item => {
      if (seen.has(item.task.id)) return false
      if (todayPendingTaskIds.has(item.task.id)) return false
      seen.add(item.task.id)
      return true
    })
  })

  return {
    dailyTodos,
    ensureDailyTodos,
    markTodoComplete,
    removeTodoItem,
    getUncompletedTodos,
    futureTodos,
  }
}

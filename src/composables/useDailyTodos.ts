import { computed } from 'vue'
import type { DailyTodoList } from '../types'
import { generateDailyTodoItems } from '../services/taskService'
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

  return {
    dailyTodos,
    ensureDailyTodos,
    regenerateDailyTodos,
    markTodoComplete,
    removeTodoItem,
    dailyProgress,
    getNextUncompletedTodo,
  }
}

import { computed } from 'vue'
import type { DailyTodoList, DailyTodoItem, PastDailyTodos } from '../types'
import { generateDailyTodoItems, generateFutureTodoItems } from '../services/taskService'
import { storageData, saveData, getTodayStr } from './storageCore'
import { useRecords } from './useRecords'

const MAX_PAST_DAYS = 7 // 最多保留7天的过期任务

export function useDailyTodos() {
  const { addRecord } = useRecords()

  const dailyTodos = computed(() => storageData.value.dailyTodos)
  const pastTodos = computed(() => storageData.value.pastTodos ?? [])
  const completedTodos = computed(() => storageData.value.completedTodos ?? [])

  function ensureDailyTodos(): DailyTodoList {
    const today = getTodayStr()
    if (storageData.value.dailyTodos && storageData.value.dailyTodos.date === today) {
      return storageData.value.dailyTodos
    }
    return regenerateDailyTodos()
  }

  function archiveOldTodos(): void {
    const oldTodos = storageData.value.dailyTodos
    if (!oldTodos || !oldTodos.items.length) return

    const uncompletedItems = oldTodos.items.filter(i => !i.completed)
    const completedItems = oldTodos.items.filter(i => i.completed)

    // 将未完成任务归档到 pastTodos
    if (uncompletedItems.length > 0) {
      if (!storageData.value.pastTodos) storageData.value.pastTodos = []

      const existingIdx = storageData.value.pastTodos.findIndex(p => p.date === oldTodos.date)
      if (existingIdx >= 0) {
        storageData.value.pastTodos[existingIdx].items = uncompletedItems
      } else {
        storageData.value.pastTodos.push({
          date: oldTodos.date,
          items: uncompletedItems,
        })
      }
    }

    // 将还留在 dailyTodos 中的已完成任务归档到 completedTodos
    // (大部分已在实时完成时移入，这里处理边缘情况)
    if (completedItems.length > 0) {
      if (!storageData.value.completedTodos) storageData.value.completedTodos = []
      const existingIds = new Set(storageData.value.completedTodos.map(i => i.id))
      for (const item of completedItems) {
        if (!existingIds.has(item.id)) {
          storageData.value.completedTodos.push(item)
        }
      }
    }

    // 清理超过 MAX_PAST_DAYS 天的过期任务
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - MAX_PAST_DAYS)
    const cutoffStr = `${cutoffDate.getFullYear()}-${String(cutoffDate.getMonth() + 1).padStart(2, '0')}-${String(cutoffDate.getDate()).padStart(2, '0')}`
    storageData.value.pastTodos = storageData.value.pastTodos.filter(p => p.date >= cutoffStr)

    // 限制已完成任务总量（最多保留100条）
    if (storageData.value.completedTodos.length > 100) {
      storageData.value.completedTodos = storageData.value.completedTodos.slice(-100)
    }
  }

  function regenerateDailyTodos(): DailyTodoList {
    const today = getTodayStr()

    // 归档旧任务
    archiveOldTodos()

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
    if (!item) {
      // Check if it's in completedTodos (user wants to undo completion)
      if (!storageData.value.completedTodos) return false
      const completedIdx = storageData.value.completedTodos.findIndex(i => i.id === todoId)
      if (completedIdx < 0) return false

      const completedItem = storageData.value.completedTodos[completedIdx]
      // Only allow restoring today's items back to dailyTodos
      const today = getTodayStr()
      if (completedItem.scheduledDate === today) {
        storageData.value.completedTodos.splice(completedIdx, 1)
        completedItem.completed = false
        completedItem.completedCount = 0
        delete completedItem.completedAt
        storageData.value.dailyTodos.items.push(completedItem)
        saveData(storageData.value)
      }
      return false
    }

    item.completedCount = (item.completedCount || 0) + 1

    const fullyDone = item.completedCount >= item.totalCount
    if (fullyDone) {
      item.completed = true
      item.completedAt = Date.now()

      // Move to completedTodos
      if (!storageData.value.completedTodos) storageData.value.completedTodos = []
      storageData.value.completedTodos.push({ ...item })

      // Remove from dailyTodos
      storageData.value.dailyTodos.items = storageData.value.dailyTodos.items.filter(
        i => i.id !== todoId
      )
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

  /** 将已完成的任务恢复为未完成（从 completedTodos 归档中） */
  function restoreCompletedTodo(todoId: string): boolean {
    if (!storageData.value.completedTodos) return false
    const idx = storageData.value.completedTodos.findIndex(i => i.id === todoId)
    if (idx < 0) return false

    const item = storageData.value.completedTodos[idx]
    // 从已完成列表中移除
    storageData.value.completedTodos.splice(idx, 1)

    // 恢复为未完成状态
    item.completed = false
    item.completedCount = 0
    delete item.completedAt

    const today = getTodayStr()
    if (item.scheduledDate === today && storageData.value.dailyTodos && storageData.value.dailyTodos.date === today) {
      // 今天的任务放回 dailyTodos
      storageData.value.dailyTodos.items.push(item)
    } else {
      // 过去日期的任务归档到 pastTodos
      if (!storageData.value.pastTodos) storageData.value.pastTodos = []
      const pastGroup = storageData.value.pastTodos.find(p => p.date === item.scheduledDate)
      if (pastGroup) {
        pastGroup.items.push(item)
      } else {
        storageData.value.pastTodos.push({
          date: item.scheduledDate,
          items: [item],
        })
        storageData.value.pastTodos.sort((a, b) => b.date.localeCompare(a.date))
      }
    }

    saveData(storageData.value)
    return true
  }

  /** 将过期未完成任务标记为完成 */
  function markPastTodoComplete(todoId: string, dateStr: string): boolean {
    if (!storageData.value.pastTodos) return false
    const pastGroup = storageData.value.pastTodos.find(p => p.date === dateStr)
    if (!pastGroup) return false

    const idx = pastGroup.items.findIndex(i => i.id === todoId)
    if (idx < 0) return false

    const item = pastGroup.items[idx]
    // 从 pastTodos 中移除
    pastGroup.items.splice(idx, 1)
    // 如果该日期组为空，则删除
    if (pastGroup.items.length === 0) {
      storageData.value.pastTodos = storageData.value.pastTodos.filter(p => p.date !== dateStr)
    }

    // 标记为完成并加入 completedTodos
    item.completed = true
    item.completedAt = Date.now()
    item.completedCount = item.totalCount
    if (!storageData.value.completedTodos) storageData.value.completedTodos = []
    storageData.value.completedTodos.push(item)

    saveData(storageData.value)
    return true
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
    pastTodos,
    completedTodos,
    ensureDailyTodos,
    markTodoComplete,
    markPastTodoComplete,
    restoreCompletedTodo,
    removeTodoItem,
    getUncompletedTodos,
    futureTodos,
  }
}

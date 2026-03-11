import { computed } from 'vue'
import type { DailyConfig, RecurrenceType } from '../types'
import { RecurrenceType as RT, TaskType } from '../types'
import { storageData, saveData, getTodayStr } from './storageCore'
import { shouldTriggerOnDate } from '../services/taskService'

export function useCustomActions() {
  const dailyConfig = computed(() => storageData.value.dailyConfig)

  function updateDailyConfig(config: DailyConfig): void {
    storageData.value.dailyConfig = config
    saveData(storageData.value)
  }

  const customActions = computed(() => storageData.value.customActions)

  function addCustomAction(content: string, repeatCount: number = 1, recurrence: RecurrenceType = RT.Daily, startDate?: string): void {
    const newCa = {
      id: `ca_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      content,
      createdAt: Date.now(),
      repeatCount,
      recurrence,
      startDate,
    }
    storageData.value.customActions.push(newCa)

    // 如果今天的待办已生成，且新任务今天应该触发，则追加到今天的待办列表
    const today = getTodayStr()
    if (
      storageData.value.dailyTodos &&
      storageData.value.dailyTodos.date === today &&
      shouldTriggerOnDate(newCa, today)
    ) {
      const nextId = storageData.value.dailyTodos.items.length + 1
      storageData.value.dailyTodos.items.push({
        id: `todo_${nextId}_${Date.now()}`,
        task: {
          id: `custom_${newCa.id}`,
          type: TaskType.Action as any,
          content: newCa.content,
          repeatCount: newCa.repeatCount,
          recurrence: newCa.recurrence,
        },
        completed: false,
        totalCount: newCa.repeatCount,
        completedCount: 0,
        scheduledDate: today,
      })
    }

    saveData(storageData.value)
  }

  function removeCustomAction(id: string): void {
    storageData.value.customActions = storageData.value.customActions.filter(
      ca => ca.id !== id
    )
    saveData(storageData.value)
  }

  function updateCustomActionRepeatCount(id: string, repeatCount: number): void {
    const ca = storageData.value.customActions.find(c => c.id === id)
    if (ca) {
      ca.repeatCount = Math.max(1, repeatCount)
      saveData(storageData.value)
    }
  }

  function updateCustomAction(id: string, content: string, repeatCount: number, recurrence: RecurrenceType = RT.Daily): void {
    const ca = storageData.value.customActions.find(c => c.id === id)
    if (ca) {
      ca.content = content
      ca.repeatCount = Math.max(1, repeatCount)
      ca.recurrence = recurrence
      if (storageData.value.dailyTodos) {
        const todoItem = storageData.value.dailyTodos.items.find(
          i => i.task.id === `custom_${id}`
        )
        if (todoItem) {
          todoItem.task.content = content
          todoItem.task.repeatCount = Math.max(1, repeatCount)
          todoItem.task.recurrence = recurrence
          todoItem.totalCount = Math.max(1, repeatCount)
        }
      }
      saveData(storageData.value)
    }
  }

  return {
    dailyConfig,
    updateDailyConfig,
    customActions,
    addCustomAction,
    removeCustomAction,
    updateCustomActionRepeatCount,
    updateCustomAction,
  }
}

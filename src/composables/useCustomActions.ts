import { computed } from 'vue'
import type { DailyConfig, RecurrenceType } from '../types'
import { RecurrenceType as RT } from '../types'
import { storageData, saveData } from './storageCore'

export function useCustomActions() {
  const dailyConfig = computed(() => storageData.value.dailyConfig)

  function updateDailyConfig(config: DailyConfig): void {
    storageData.value.dailyConfig = config
    saveData(storageData.value)
  }

  const customActions = computed(() => storageData.value.customActions)

  function addCustomAction(content: string, repeatCount: number = 1, recurrence: RecurrenceType = RT.Daily): void {
    storageData.value.customActions.push({
      id: `ca_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      content,
      createdAt: Date.now(),
      repeatCount,
      recurrence,
    })
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

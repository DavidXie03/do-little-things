import { computed } from 'vue'
import type { RecurrenceType } from '../types'
import { RecurrenceType as RT, TaskType } from '../types'
import { storageData, saveData, getTodayStr, toLocalDateStr } from './storageCore'
import { shouldTriggerOnDate } from '../services/taskService'

export function useCustomActions() {
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

    const today = getTodayStr()

    // If startDate is before today, generate pastTodos for missed dates
    if (startDate && startDate < today) {
      if (!storageData.value.pastTodos) storageData.value.pastTodos = []

      const start = new Date(startDate + 'T00:00:00')
      const todayDate = new Date(today + 'T00:00:00')

      for (let d = new Date(start); d < todayDate; d.setDate(d.getDate() + 1)) {
        const dateStr = toLocalDateStr(d)
        if (!shouldTriggerOnDate(newCa, dateStr)) continue

        const todoItem = {
          id: `todo_past_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
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
          scheduledDate: dateStr,
        }

        const existingGroup = storageData.value.pastTodos.find(p => p.date === dateStr)
        if (existingGroup) {
          existingGroup.items.push(todoItem)
        } else {
          storageData.value.pastTodos.push({
            date: dateStr,
            items: [todoItem],
          })
        }
      }

      // Sort pastTodos by date (newest first)
      storageData.value.pastTodos.sort((a, b) => b.date.localeCompare(a.date))
    }

    // Add to today's dailyTodos if applicable
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

  function updateCustomAction(id: string, content: string, repeatCount: number, recurrence: RecurrenceType = RT.Daily): void {
    const ca = storageData.value.customActions.find(c => c.id === id)
    if (ca) {
      ca.content = content
      ca.repeatCount = Math.max(1, repeatCount)
      ca.recurrence = recurrence

      const taskId = `custom_${id}`

      if (storageData.value.dailyTodos) {
        const todoItem = storageData.value.dailyTodos.items.find(
          i => i.task.id === taskId
        )
        if (todoItem) {
          todoItem.task.content = content
          todoItem.task.repeatCount = Math.max(1, repeatCount)
          todoItem.task.recurrence = recurrence
          todoItem.totalCount = Math.max(1, repeatCount)
        }
      }

      if (storageData.value.pastTodos) {
        for (const group of storageData.value.pastTodos) {
          for (const item of group.items) {
            if (item.task.id === taskId) {
              item.task.content = content
              item.task.repeatCount = Math.max(1, repeatCount)
              item.task.recurrence = recurrence
              item.totalCount = Math.max(1, repeatCount)
            }
          }
        }
      }

      if (storageData.value.completedTodos) {
        for (const item of storageData.value.completedTodos) {
          if (item.task.id === taskId) {
            item.task.content = content
            item.task.repeatCount = Math.max(1, repeatCount)
            item.task.recurrence = recurrence
            item.totalCount = Math.max(1, repeatCount)
          }
        }
      }

      saveData(storageData.value)
    }
  }

  return {
    customActions,
    addCustomAction,
    updateCustomAction,
  }
}

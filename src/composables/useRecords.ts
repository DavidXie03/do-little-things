import { computed } from 'vue'
import type { TaskRecord } from '../types'
import type { Task } from '../types'
import { storageData, saveData, getTodayStr } from './storageCore'

export function useRecords() {
  function addRecord(record: TaskRecord): void {
    storageData.value.records.push(record)
    saveData(storageData.value)
  }

  function addPendingTask(task: Task): void {
    const exists = storageData.value.pendingTasks.find(p => p.task.id === task.id)
    if (!exists) {
      storageData.value.pendingTasks.push({ task, addedAt: Date.now() })
      saveData(storageData.value)
    }
  }

  function removePendingTask(taskId: string): void {
    storageData.value.pendingTasks = storageData.value.pendingTasks.filter(
      p => p.task.id !== taskId
    )
    saveData(storageData.value)
  }

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

  const pendingTasks = computed(() => {
    return [...storageData.value.pendingTasks].sort((a, b) => b.addedAt - a.addedAt)
  })

  const records = computed(() => storageData.value.records)

  const todayCompleteCount = computed(() => {
    const today = getTodayStr()
    return storageData.value.records.filter(
      r => r.date === today && r.action === 'complete'
    ).length
  })

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

  return {
    addRecord,
    addPendingTask,
    removePendingTask,
    completePendingTask,
    pendingTasks,
    records,
    todayCompleteCount,
    getStreakDays,
  }
}

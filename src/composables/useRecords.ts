import type { TaskRecord } from '../types'
import type { Task } from '../types'
import { storageData, saveData } from './storageCore'

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

  return {
    addRecord,
    addPendingTask,
  }
}

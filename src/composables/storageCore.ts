import { ref } from 'vue'
import type { StorageData, DailyConfig } from '../types'
import { DEFAULT_ACTIONS } from '../services/taskService'

const STORAGE_KEY = 'do-little-things-data'
const CURRENT_VERSION = 4

function getDefaultDailyConfig(): DailyConfig {
  return { action: 5 }
}

function getDefaultData(): StorageData {
  return {
    version: CURRENT_VERSION,
    records: [],
    pendingTasks: [],
    dailyConfig: getDefaultDailyConfig(),
    customActions: [],
    dailyTodos: null,
  }
}

function migrateData(data: any): StorageData {
  if (!data.dailyConfig || typeof data.dailyConfig.action === 'undefined') {
    const oldAction = data.dailyConfig?.action ?? 5
    data.dailyConfig = { action: oldAction }
  }

  if (data.dailyConfig.knowledge !== undefined) delete data.dailyConfig.knowledge
  if (data.dailyConfig.explore !== undefined) delete data.dailyConfig.explore
  if (data.dailyConfig.news !== undefined) delete data.dailyConfig.news

  if (!data.customActions) data.customActions = []
  if (!data.dailyTodos) data.dailyTodos = null
  if (!data.pendingTasks) data.pendingTasks = []
  if (!data.records) data.records = []

  for (const ca of data.customActions) {
    if (ca.repeatCount === undefined) ca.repeatCount = 1
  }

  if (data.dailyTodos && data.dailyTodos.items) {
    for (const item of data.dailyTodos.items) {
      if (item.totalCount === undefined) item.totalCount = 1
      if (item.completedCount === undefined) item.completedCount = item.completed ? 1 : 0
    }
  }

  data.version = CURRENT_VERSION
  return data as StorageData
}

function loadData(): StorageData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return getDefaultData()
    const data = JSON.parse(raw)
    if (data.version !== CURRENT_VERSION) {
      return migrateData(data)
    }
    return data as StorageData
  } catch {
    return getDefaultData()
  }
}

export function saveData(data: StorageData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function getTodayStr(): string {
  return new Date().toISOString().split('T')[0] ?? ''
}

function initializeDefaultActions(data: StorageData): StorageData {
  if (data.customActions.length === 0) {
    for (const action of DEFAULT_ACTIONS) {
      data.customActions.push({
        id: `ca_default_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        content: action.content,
        createdAt: Date.now(),
        repeatCount: action.repeatCount,
      })
    }
    saveData(data)
  }
  return data
}

export const storageData = ref<StorageData>(initializeDefaultActions(loadData()))

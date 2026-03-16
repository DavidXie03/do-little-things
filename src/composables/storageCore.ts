import { ref } from 'vue'
import type { StorageData, DailyConfig } from '../types'
import { DEFAULT_ACTIONS } from '../services/taskService'

const STORAGE_KEY = 'flip-a-little-data'
const CURRENT_VERSION = 6

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
    showSlogan: false,
    typingEffect: true,
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
  if (!data.pastTodos) data.pastTodos = []
  if (!data.completedTodos) data.completedTodos = []

  for (const ca of data.customActions) {
    if (ca.repeatCount === undefined) ca.repeatCount = 1
    if (!ca.recurrence) ca.recurrence = 'daily'
  }

  if (data.showSlogan === undefined) data.showSlogan = false
  if (data.typingEffect === undefined) data.typingEffect = true

  if (data.dailyTodos && data.dailyTodos.items) {
    const today = toLocalDateStr(new Date())
    for (const item of data.dailyTodos.items) {
      if (item.totalCount === undefined) item.totalCount = 1
      if (item.completedCount === undefined) item.completedCount = item.completed ? 1 : 0
      if (!item.scheduledDate) item.scheduledDate = data.dailyTodos.date || today
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

export function toLocalDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function getTodayStr(): string {
  return toLocalDateStr(new Date())
}

function initializeDefaultActions(data: StorageData): StorageData {
  if (data.customActions.length === 0) {
    for (const action of DEFAULT_ACTIONS) {
      data.customActions.push({
        id: `ca_default_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        content: action.content,
        createdAt: Date.now(),
        repeatCount: action.repeatCount,
        recurrence: action.recurrence,
      })
    }
    saveData(data)
  }
  return data
}

export const storageData = ref<StorageData>(initializeDefaultActions(loadData()))

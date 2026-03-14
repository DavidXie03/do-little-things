import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { storageData, saveData } from './storageCore'
import { useToast } from './useToast'
import { useDailyTodos } from './useDailyTodos'
import { isNativePlatform, ensureFilePermission, nativeExportJson, webExportJson, pickAndReadJsonFile } from '../utils/fileHelper'
import type { CustomAction } from '../types'

export function useImportExport() {
  const { t } = useI18n()
  const { showToast } = useToast()
  const { ensureDailyTodos } = useDailyTodos()

  const showImportExportModal = ref(false)

  async function exportConfig() {
    const actions = storageData.value.customActions
    const filename = `do-little-things-config-${new Date().toISOString().slice(0, 10)}.json`
    const exportData = { version: 1, customActions: actions }

    try {
      if (isNativePlatform()) {
        await ensureFilePermission()
        await nativeExportJson(filename, exportData)
        showImportExportModal.value = false
        showToast(t('toast.exportSaved'), 'success')
      } else {
        webExportJson(filename, exportData)
        showImportExportModal.value = false
        showToast(t('settings.exportSuccess'), 'success')
      }
    } catch (err: any) {
      if (err?.message === 'PERMISSION_DENIED') {
        showToast(t('toast.permissionDenied'), 'error')
      } else {
        showToast(t('settings.exportSuccess'), 'success')
      }
    }
  }

  async function importConfig() {
    try {
      if (isNativePlatform()) {
        await ensureFilePermission()
      }

      const content = await pickAndReadJsonFile()
      const data = JSON.parse(content)

      if (!data.customActions || !Array.isArray(data.customActions)) {
        showToast(t('settings.importFail'), 'error')
        return
      }

      const actions = data.customActions as CustomAction[]
      const existingIds = new Set(storageData.value.customActions.map((a: CustomAction) => a.content))
      let count = 0
      for (const action of actions) {
        if (!existingIds.has(action.content)) {
          storageData.value.customActions.push({
            ...action,
            id: `ca_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            createdAt: Date.now(),
          })
          existingIds.add(action.content)
          count++
        }
      }
      saveData(storageData.value)
      storageData.value.dailyTodos = null
      ensureDailyTodos()
      showImportExportModal.value = false
      showToast(t('settings.importSuccess', { count }), 'success')
    } catch (err: any) {
      if (err?.message === 'PERMISSION_DENIED') {
        showToast(t('toast.permissionDenied'), 'error')
      } else if (err?.message !== 'NO_FILE_SELECTED') {
        showToast(t('settings.importFail'), 'error')
      }
    }
  }

  return {
    showImportExportModal,
    exportConfig,
    importConfig,
  }
}

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Languages, Archive, Info } from 'lucide-vue-next'
import { saveLanguage } from '../i18n'
import { useTheme } from '../composables/useTheme'
import { storageData, saveData } from '../composables/storageCore'
import { useToast } from '../composables/useToast'
import { useDailyTodos } from '../composables/useDailyTodos'
import { isNativePlatform, ensureFilePermission, nativeExportJson, webExportJson, pickAndReadJsonFile } from '../utils/fileHelper'
import type { CustomAction } from '../types'
import BaseModal from '../components/BaseModal.vue'

const { t, locale } = useI18n()
const { isDark, toggleDark } = useTheme()
const { showToast } = useToast()
const { ensureDailyTodos } = useDailyTodos()

const APP_VERSION = '1.0.0'
const GITHUB_URL = 'https://github.com/DavidXie03/do-little-things'

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
]

const showLangModal = ref(false)
const showImportExportModal = ref(false)
const showAboutModal = ref(false)

const currentLangLabel = computed(() => {
  const lang = languages.find(l => l.code === locale.value)
  return lang ? lang.label : locale.value
})

function openLangModal() {
  showLangModal.value = true
}

function closeLangModal() {
  showLangModal.value = false
}

function switchLanguage(langCode: string) {
  locale.value = langCode
  saveLanguage(langCode)
  document.title = langCode === 'zh' ? '做件小事' : 'Do Little Things'
  document.documentElement.lang = langCode === 'zh' ? 'zh-CN' : 'en'
  showLangModal.value = false
}

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
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden" style="background-color: var(--bg-primary); transition: background-color 0.3s ease;">
    <header class="u-page-header">
      <h1
        class="text-2xl font-bold"
        style="color: var(--text-primary);"
      >
        {{ t('settings.title') }}
      </h1>
    </header>

    <div class="flex-1 overflow-y-auto u-section-x pb-4" style="-webkit-overflow-scrolling: touch;">
      <div
        class="w-full flex items-center gap-3 u-item rounded-2xl transition-all duration-300"
        style="background: var(--item-bg); box-shadow: var(--card-shadow);"
      >
        <svg v-if="isDark" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0">
          <circle cx="12" cy="12" r="5" stroke="var(--primary)" stroke-width="2"/>
          <line x1="12" y1="1" x2="12" y2="3" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
          <line x1="12" y1="21" x2="12" y2="23" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
          <line x1="1" y1="12" x2="3" y2="12" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
          <line x1="21" y1="12" x2="23" y2="12" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="var(--primary)" stroke-width="2" stroke-linecap="round"/>
        </svg>

        <span class="text-sm font-medium flex-1 text-left" style="color: var(--text-primary);">
          {{ t('settings.darkMode') }}
        </span>

        <button
          @click="toggleDark()"
          class="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0"
          :style="{
            background: isDark ? 'var(--primary)' : 'var(--text-muted)',
          }"
        >
          <div
            class="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-all duration-300"
            :style="{
              left: isDark ? '22px' : '2px',
            }"
          ></div>
        </button>
      </div>

      <div class="h-3"></div>

      <button
        @click="openLangModal"
        class="w-full flex items-center gap-3 u-item rounded-2xl transition-all duration-300 active:scale-[0.98]"
        style="background: var(--item-bg); box-shadow: var(--card-shadow);"
      >
        <Languages :size="20" color="var(--primary)" class="flex-shrink-0" />

        <span class="text-sm font-medium flex-1 text-left" style="color: var(--text-primary);">
          {{ t('settings.language') }}
        </span>

        <span class="text-sm" style="color: var(--text-muted);">
          {{ currentLangLabel }}
        </span>

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0">
          <path d="M9 18L15 12L9 6" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div class="h-3"></div>

      <!-- 导入 / 导出 -->
      <button
        @click="showImportExportModal = true"
        class="w-full flex items-center gap-3 u-item rounded-2xl transition-all duration-300 active:scale-[0.98]"
        style="background: var(--item-bg); box-shadow: var(--card-shadow);"
      >
        <Archive :size="20" color="var(--primary)" class="flex-shrink-0" />

        <span class="text-sm font-medium flex-1 text-left" style="color: var(--text-primary);">
          {{ t('settings.importExport') }}
        </span>

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0">
          <path d="M9 18L15 12L9 6" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div class="h-3"></div>

      <!-- 关于 -->
      <button
        @click="showAboutModal = true"
        class="w-full flex items-center gap-3 u-item rounded-2xl transition-all duration-300 active:scale-[0.98]"
        style="background: var(--item-bg); box-shadow: var(--card-shadow);"
      >
        <Info :size="20" color="var(--primary)" class="flex-shrink-0" />

        <span class="text-sm font-medium flex-1 text-left" style="color: var(--text-primary);">
          {{ t('settings.about') }}
        </span>

        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0">
          <path d="M9 18L15 12L9 6" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div class="h-8"></div>
    </div>

    <!-- 语言选择弹窗 -->
    <BaseModal
      :visible="showLangModal"
      :title="t('settings.language')"
      @close="closeLangModal"
    >
      <div class="u-gap-sm">
        <button
          v-for="lang in languages"
          :key="lang.code"
          @click="switchLanguage(lang.code)"
          class="w-full flex items-center justify-between u-item rounded-2xl transition-all duration-300 active:scale-[0.98]"
          :style="{
            background: locale === lang.code ? 'rgba(108, 99, 255, 0.08)' : 'rgba(108,99,255,0.04)',
            border: locale === lang.code ? '2px solid var(--primary)' : '2px solid transparent',
          }"
        >
          <span
            class="text-sm font-medium"
            :style="{
              color: locale === lang.code ? 'var(--primary)' : 'var(--text-primary)',
            }"
          >
            {{ lang.label }}
          </span>

          <div
            v-if="locale === lang.code"
            class="w-6 h-6 rounded-full flex items-center justify-center"
            style="background: var(--primary);"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M20 6L9 17L4 12" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
          <div
            v-else
            class="w-6 h-6 rounded-full"
            style="border: 2px solid var(--text-muted);"
          ></div>
        </button>
      </div>

      <div class="pt-2">
        <button
          @click="closeLangModal"
          class="w-full u-item-sm rounded-xl text-sm font-semibold transition-all active:scale-95"
          style="background: var(--divider); color: var(--text-secondary);"
        >
          {{ t('modal.cancel') }}
        </button>
      </div>
    </BaseModal>

    <!-- 导入/导出弹窗 -->
    <BaseModal
      :visible="showImportExportModal"
      :title="t('settings.importExport')"
      @close="showImportExportModal = false"
    >
      <div class="u-gap-sm">
        <button
          @click="exportConfig"
          class="w-full flex items-center gap-3 u-item rounded-2xl transition-all duration-300 active:scale-[0.98]"
          style="background: rgba(108,99,255,0.04);"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
            <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M7 10L12 15L17 10" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 15V3" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="text-sm font-medium" style="color: var(--text-primary);">
            {{ t('settings.exportConfig') }}
          </span>
        </button>

        <button
          @click="importConfig"
          class="w-full flex items-center gap-3 u-item rounded-2xl transition-all duration-300 active:scale-[0.98]"
          style="background: rgba(108,99,255,0.04);"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
            <path d="M21 15V19C21 20.1046 20.1046 21 19 21H5C3.89543 21 3 20.1046 3 19V15" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M17 8L12 3L7 8" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 3V15" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="text-sm font-medium" style="color: var(--text-primary);">
            {{ t('settings.importConfig') }}
          </span>
        </button>
      </div>

      <div class="pt-2">
        <button
          @click="showImportExportModal = false"
          class="w-full u-item-sm rounded-xl text-sm font-semibold transition-all active:scale-95"
          style="background: var(--divider); color: var(--text-secondary);"
        >
          {{ t('modal.cancel') }}
        </button>
      </div>
    </BaseModal>

    <!-- 关于弹窗 -->
    <BaseModal
      :visible="showAboutModal"
      :title="t('settings.about')"
      @close="showAboutModal = false"
    >
      <div class="flex flex-col items-center gap-3 pb-2">
        <svg width="56" height="56" viewBox="0 0 56 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="card-grad" x1="0" y1="0" x2="56" y2="56" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stop-color="var(--primary)"/>
              <stop offset="100%" stop-color="var(--primary-light)"/>
            </linearGradient>
          </defs>
          <!-- 底部卡片（右下偏移露出边缘） -->
          <rect x="16" y="10" width="36" height="44" rx="6" fill="var(--primary)" opacity="0.35"/>
          <!-- 顶部卡片（左上） -->
          <rect x="4" y="2" width="36" height="44" rx="6" fill="url(#card-grad)"/>
          <!-- 白色对勾 -->
          <polyline points="14,26 20,32 30,20" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <div class="text-center">
          <h3 class="text-base font-bold" style="color: var(--text-primary);">
            {{ t('settings.aboutAppName') }}
          </h3>
          <span class="text-xs" style="color: var(--text-muted);">v{{ APP_VERSION }}</span>
        </div>
        <p class="text-xs text-center leading-relaxed" style="color: var(--text-secondary);">
          {{ t('settings.aboutDescription') }}
        </p>
      </div>

      <div class="u-gap-sm">
        <div
          class="flex items-center justify-between u-item-sm rounded-xl"
          style="background: rgba(108,99,255,0.04);"
        >
          <span class="text-sm" style="color: var(--text-secondary);">{{ t('settings.aboutAuthor') }}</span>
          <span class="text-sm font-medium" style="color: var(--text-primary);">{{ t('settings.aboutAuthorName') }}</span>
        </div>

        <a
          :href="GITHUB_URL"
          target="_blank"
          class="flex items-center justify-between u-item-sm rounded-xl transition-all active:scale-[0.98]"
          style="background: rgba(108,99,255,0.04); text-decoration: none;"
        >
          <span class="text-sm" style="color: var(--text-secondary);">{{ t('settings.aboutOpenSource') }}</span>
          <div class="flex items-center gap-1">
            <span class="text-sm font-medium" style="color: var(--primary);">GitHub</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" class="flex-shrink-0">
              <path d="M18 13V19C18 20.1046 17.1046 21 16 21H5C3.89543 21 3 20.1046 3 19V8C3 6.89543 3.89543 6 5 6H11" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M15 3H21V9" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path d="M10 14L21 3" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        </a>
      </div>

      <div class="pt-2">
        <button
          @click="showAboutModal = false"
          class="w-full u-item-sm rounded-xl text-sm font-semibold transition-all active:scale-95"
          style="background: var(--divider); color: var(--text-secondary);"
        >
          {{ t('modal.cancel') }}
        </button>
      </div>
    </BaseModal>

  </div>
</template>

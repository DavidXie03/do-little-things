<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { Languages } from 'lucide-vue-next'
import { saveLanguage } from '../i18n'
import { useTheme } from '../composables/useTheme'
import BaseModal from '../components/BaseModal.vue'

const { t, locale } = useI18n()
const { isDark, toggleDark } = useTheme()

const languages = [
  { code: 'zh', label: '中文' },
  { code: 'en', label: 'English' },
]

const showLangModal = ref(false)

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

      <div class="h-8"></div>
    </div>

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
  </div>
</template>

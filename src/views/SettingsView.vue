<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { saveLanguage } from '../i18n'
import BaseModal from '../components/BaseModal.vue'

const { t, locale } = useI18n()

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
  <div class="h-full flex flex-col overflow-hidden">
    <header class="px-8 pb-6" style="padding-top: calc(var(--safe-area-top, 0px) + 24px);">
      <h1
        class="text-2xl font-bold"
        style="color: var(--text-primary);"
      >
        {{ t('settings.title') }}
      </h1>
    </header>

    <div class="flex-1 overflow-y-auto px-6 pb-4" style="-webkit-overflow-scrolling: touch;">
      <!-- 语言设置：图标 + "语言" 标签 + 当前语言 + 箭头，全部在同一行 -->
      <button
        @click="openLangModal"
        class="w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all duration-300 active:scale-[0.98]"
        style="background: #FFFFFF; box-shadow: 0 2px 12px -4px rgba(0, 0, 0, 0.06);"
      >
        <!-- 地球图标 -->
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0">
          <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2 12H22" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>

        <!-- "语言"文字 -->
        <span class="text-sm font-medium flex-1 text-left" style="color: var(--text-primary);">
          {{ t('settings.language') }}
        </span>

        <!-- 当前语言 -->
        <span class="text-sm" style="color: var(--text-muted);">
          {{ currentLangLabel }}
        </span>

        <!-- 右箭头 -->
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="flex-shrink-0">
          <path d="M9 18L15 12L9 6" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div class="h-8"></div>
    </div>

    <!-- 语言选择弹窗，复用 BaseModal -->
    <BaseModal
      :visible="showLangModal"
      :title="t('settings.language')"
      @close="closeLangModal"
    >
      <div class="space-y-3">
        <button
          v-for="lang in languages"
          :key="lang.code"
          @click="switchLanguage(lang.code)"
          class="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 active:scale-[0.98]"
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

          <!-- 选中指示器 -->
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
          class="w-full py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
          style="background: rgba(0,0,0,0.04); color: var(--text-secondary);"
        >
          {{ t('modal.cancel') }}
        </button>
      </div>
    </BaseModal>
  </div>
</template>

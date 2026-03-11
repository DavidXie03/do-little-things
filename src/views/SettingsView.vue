<script setup lang="ts">
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { saveLanguage } from '../i18n'

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
  // 更新页面标题
  document.title = langCode === 'zh' ? '做件小事' : 'Do Little Things'
  // 更新 html lang 属性
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
      <!-- 语言设置区域 -->
      <div class="mb-6">
        <div class="flex items-center gap-2 mb-4">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M2 12H22" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 2C14.5013 4.73835 15.9228 8.29203 16 12C15.9228 15.708 14.5013 19.2616 12 22C9.49872 19.2616 8.07725 15.708 8 12C8.07725 8.29203 9.49872 4.73835 12 2Z" stroke="var(--primary)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          <span class="text-base font-semibold" style="color: var(--text-primary);">
            {{ t('settings.language') }}
          </span>
        </div>

        <!-- 当前语言显示按钮，点击打开弹窗 -->
        <button
          @click="openLangModal"
          class="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 active:scale-[0.98]"
          style="background: #FFFFFF; box-shadow: 0 2px 12px -4px rgba(0, 0, 0, 0.06);"
        >
          <span class="text-sm font-medium" style="color: var(--text-primary);">
            {{ currentLangLabel }}
          </span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 18L15 12L9 6" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>

      <div class="h-8"></div>
    </div>

    <!-- 语言选择弹窗 -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="showLangModal"
          class="fixed inset-0 z-[9999] flex items-end justify-center"
          @click.self="closeLangModal"
        >
          <!-- 遮罩层 -->
          <div class="absolute inset-0 bg-black/30 backdrop-blur-sm" @click="closeLangModal"></div>

          <!-- 弹窗内容 -->
          <transition name="modal-slide">
            <div
              v-if="showLangModal"
              class="relative w-full max-w-lg bg-white rounded-t-3xl overflow-hidden"
              style="padding-bottom: max(env(safe-area-inset-bottom, 0px), 20px);"
            >
              <!-- 拖动指示条 -->
              <div class="flex justify-center pt-3 pb-2">
                <div class="w-10 h-1 rounded-full bg-gray-300"></div>
              </div>

              <!-- 标题 -->
              <div class="px-6 pb-4">
                <h3 class="text-lg font-bold" style="color: var(--text-primary);">
                  {{ t('settings.language') }}
                </h3>
              </div>

              <!-- 语言选项列表 -->
              <div class="px-6 pb-4 space-y-3">
                <button
                  v-for="lang in languages"
                  :key="lang.code"
                  @click="switchLanguage(lang.code)"
                  class="w-full flex items-center justify-between px-5 py-4 rounded-2xl transition-all duration-300 active:scale-[0.98]"
                  :style="{
                    background: locale === lang.code ? 'rgba(108, 99, 255, 0.08)' : '#F8F9FA',
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

              <!-- 取消按钮 -->
              <div class="px-6 pb-2">
                <button
                  @click="closeLangModal"
                  class="w-full py-3 rounded-2xl text-sm font-medium transition-all duration-300 active:scale-[0.98]"
                  style="background: #F0F0F0; color: var(--text-secondary);"
                >
                  {{ t('modal.cancel') }}
                </button>
              </div>
            </div>
          </transition>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-slide-enter-active {
  transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.modal-slide-leave-active {
  transition: transform 0.25s ease-in;
}
.modal-slide-enter-from {
  transform: translateY(100%);
}
.modal-slide-leave-to {
  transform: translateY(100%);
}
</style>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import TabBar from './components/TabBar.vue'
import AppToast from './components/AppToast.vue'
import HomeView from './views/HomeView.vue'
import PendingView from './views/PendingView.vue'
import SettingsView from './views/SettingsView.vue'
import CompletedView from './views/CompletedView.vue'
import IconSettings from './components/icons/IconSettings.vue'
import { usePageSwipe } from './composables/usePageSwipe'

const { t } = useI18n()
const {
  translateX,
  containerWidth,
  settingsOpen,
  verticalIndex,
  verticalTranslateY,
  scrollAreaHeight,
  headerHeight,
  goToVerticalPage,
} = usePageSwipe()

const pendingHeaderRef = ref<HTMLElement | null>(null)

const showSettings = ref(false)
const settingsPanelOffset = ref(0)
const settingsIsDragging = ref(false)
let settingsStartX = 0
let settingsStartY = 0
let settingsDirectionLocked: 'horizontal' | 'vertical' | null = null
let settingsClosing = false

function openSettings() {
  showSettings.value = true
  settingsOpen.value = true
  settingsClosing = false
  settingsPanelOffset.value = window.innerWidth
  const start = window.innerWidth
  const duration = 300
  const startTime = performance.now()

  function tick(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
    settingsPanelOffset.value = start * (1 - eased)
    if (progress < 1) {
      requestAnimationFrame(tick)
    }
  }
  requestAnimationFrame(tick)
}

function closeSettings() {
  if (settingsClosing) return
  settingsClosing = true
  settingsIsDragging.value = false
  const start = settingsPanelOffset.value
  const target = window.innerWidth
  const duration = 250
  const startTime = performance.now()

  function tick(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    settingsPanelOffset.value = start + (target - start) * eased

    if (progress < 1) {
      requestAnimationFrame(tick)
    } else {
      showSettings.value = false
      settingsPanelOffset.value = 0
      settingsOpen.value = false
      settingsClosing = false
    }
  }
  requestAnimationFrame(tick)
}

onMounted(async () => {
  await nextTick()
  if (pendingHeaderRef.value) {
    headerHeight.value = pendingHeaderRef.value.offsetHeight
  }

  if (Capacitor.isNativePlatform()) {
    CapApp.addListener('backButton', () => {
      if (showSettings.value) {
        closeSettings()
      } else if (verticalIndex.value === 0) {
        goToVerticalPage(1)
      } else {
        CapApp.exitApp()
      }
    })
  }
})

function onSettingsTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  settingsStartX = touch.clientX
  settingsStartY = touch.clientY
  settingsIsDragging.value = false
  settingsDirectionLocked = null
}

function onSettingsTouchMove(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  const dx = touch.clientX - settingsStartX
  const dy = touch.clientY - settingsStartY

  if (!settingsDirectionLocked) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
    settingsDirectionLocked = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical'
  }

  if (settingsDirectionLocked !== 'horizontal') return

  if (dx > 0) {
    settingsIsDragging.value = true
    settingsPanelOffset.value = dx
  }
}

function onSettingsTouchEnd() {
  if (!settingsIsDragging.value) {
    settingsDirectionLocked = null
    return
  }
  settingsIsDragging.value = false
  settingsDirectionLocked = null

  const width = window.innerWidth
  if (settingsPanelOffset.value > width * 0.25) {
    closeSettings()
  } else {
    const start = settingsPanelOffset.value
    const duration = 200
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      settingsPanelOffset.value = start * (1 - eased)
      if (progress < 1) {
        requestAnimationFrame(tick)
      }
    }
    requestAnimationFrame(tick)
  }
}
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden" style="background-color: var(--bg-primary); transition: background-color 0.3s ease;">
    <main class="flex-1 overflow-hidden" style="padding-bottom: calc(52px + var(--safe-area-bottom));">
      <div
        class="h-full flex"
        :style="{
          width: containerWidth * 2 + 'px',
          transform: `translateX(${translateX}px)`,
          willChange: 'transform',
        }"
      >
        <!-- Horizontal page 0: HomeView -->
        <div :style="{ width: containerWidth + 'px', flexShrink: 0 }" class="h-full">
          <HomeView />
        </div>

        <!-- Horizontal page 1: Fixed header + Vertical swipe container -->
        <div :style="{ width: containerWidth + 'px', flexShrink: 0 }" class="h-full flex flex-col overflow-hidden">
          <!-- Fixed header (does not scroll with vertical swipe) -->
          <header ref="pendingHeaderRef" class="u-page-header flex items-center justify-between" style="flex-shrink: 0;">
            <h1
              class="text-2xl font-bold"
              style="color: var(--text-primary);"
            >
              {{ t('todos.title') }}
            </h1>
            <button
              @click="openSettings"
              class="settings-btn"
            >
              <IconSettings :size="26" color="var(--text-muted)" />
            </button>
          </header>

          <!-- Vertical swipe area -->
          <div class="flex-1 overflow-hidden relative">
            <div
              class="flex flex-col"
              :style="{
                height: scrollAreaHeight * 2 + 'px',
                transform: `translateY(${verticalTranslateY}px)`,
                willChange: 'transform',
              }"
            >
              <!-- Vertical page 0: CompletedView (top) -->
              <div :style="{ height: scrollAreaHeight + 'px', flexShrink: 0 }" class="overflow-hidden">
                <CompletedView />
              </div>
              <!-- Vertical page 1: PendingView content (bottom, default) -->
              <div :style="{ height: scrollAreaHeight + 'px', flexShrink: 0 }" class="overflow-hidden">
                <PendingView />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <TabBar />
    <AppToast />

    <!-- Settings panel (slide from right) -->
    <div
      v-show="showSettings"
      class="fixed inset-0 z-[200]"
      @touchstart.passive="onSettingsTouchStart"
      @touchmove="onSettingsTouchMove"
      @touchend.passive="onSettingsTouchEnd"
    >
      <div
        class="settings-mask"
        :style="{ opacity: Math.max(0, 1 - settingsPanelOffset / (containerWidth || 1)) }"
        @click="closeSettings"
      ></div>
      <div
        class="settings-slide-panel"
        :style="{
          transform: `translateX(${settingsPanelOffset}px)`,
        }"
      >
        <SettingsView @close="closeSettings" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
}
.settings-btn:active {
  transform: scale(0.92);
}

.settings-slide-panel {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 100%;
  z-index: 1;
  background-color: var(--bg-primary);
}

.settings-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
}
</style>

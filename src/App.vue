<script setup lang="ts">
import { ref } from 'vue'
import TabBar from './components/TabBar.vue'
import AppToast from './components/AppToast.vue'
import HomeView from './views/HomeView.vue'
import PendingView from './views/PendingView.vue'
import SettingsView from './views/SettingsView.vue'
import { usePageSwipe } from './composables/usePageSwipe'

const { translateX, containerWidth, settingsOpen } = usePageSwipe()

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
        <div :style="{ width: containerWidth + 'px', flexShrink: 0 }" class="h-full">
          <HomeView />
        </div>
        <div :style="{ width: containerWidth + 'px', flexShrink: 0 }" class="h-full">
          <PendingView @open-settings="openSettings" />
        </div>
      </div>
    </main>

    <TabBar />
    <AppToast />

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

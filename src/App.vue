<script setup lang="ts">
import { ref } from 'vue'
import TabBar from './components/TabBar.vue'
import AppToast from './components/AppToast.vue'
import HomeView from './views/HomeView.vue'
import PendingView from './views/PendingView.vue'
import SettingsView from './views/SettingsView.vue'
import { usePageSwipe } from './composables/usePageSwipe'

const { translateX, containerWidth } = usePageSwipe()

const showSettings = ref(false)
const settingsPanelOffset = ref(0)
const settingsIsDragging = ref(false)
let settingsStartX = 0
let settingsStartY = 0
let settingsDirectionLocked: 'horizontal' | 'vertical' | null = null

function openSettings() { showSettings.value = true; settingsPanelOffset.value = 0 }
function closeSettings() { showSettings.value = false; settingsPanelOffset.value = 0 }

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

  // 只允许向右滑（关闭方向）
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
    settingsPanelOffset.value = 0
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

    <!-- 设置面板（从右侧滑入，支持左滑退出） -->
    <Transition name="settings-panel">
      <div
        v-if="showSettings"
        class="fixed inset-0 z-[200]"
        @touchstart.passive="onSettingsTouchStart"
        @touchmove="onSettingsTouchMove"
        @touchend.passive="onSettingsTouchEnd"
      >
        <!-- 遮罩 -->
        <div
          class="absolute inset-0 bg-black/30"
          @click="closeSettings"
        ></div>
        <!-- 面板 -->
        <div
          class="settings-slide-panel"
          :style="{
            transform: `translateX(${settingsPanelOffset}px)`,
            transition: settingsIsDragging ? 'none' : undefined,
          }"
        >
          <SettingsView @close="closeSettings" />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.settings-slide-panel {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  max-width: 100%;
  z-index: 1;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.settings-panel-enter-active .settings-slide-panel,
.settings-panel-leave-active .settings-slide-panel {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.settings-panel-enter-active .bg-black\/30,
.settings-panel-leave-active .bg-black\/30 {
  transition: opacity 0.3s ease;
}

.settings-panel-enter-from .settings-slide-panel {
  transform: translateX(100%);
}
.settings-panel-leave-to .settings-slide-panel {
  transform: translateX(100%);
}
.settings-panel-enter-from .bg-black\/30 {
  opacity: 0;
}
.settings-panel-leave-to .bg-black\/30 {
  opacity: 0;
}
</style>

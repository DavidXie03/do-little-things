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
function openSettings() { showSettings.value = true }
function closeSettings() { showSettings.value = false }
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
          <HomeView @open-settings="openSettings" />
        </div>
        <div :style="{ width: containerWidth + 'px', flexShrink: 0 }" class="h-full">
          <PendingView />
        </div>
      </div>
    </main>

    <TabBar />
    <AppToast />

    <!-- 设置面板（从右侧滑入） -->
    <Transition name="settings-panel">
      <div
        v-if="showSettings"
        class="fixed inset-0 z-[200]"
      >
        <!-- 遮罩 -->
        <div
          class="absolute inset-0 bg-black/30"
          @click="closeSettings"
        ></div>
        <!-- 面板 -->
        <div class="settings-slide-panel">
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

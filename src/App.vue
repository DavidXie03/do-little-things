<script setup lang="ts">
import TabBar from './components/TabBar.vue'
import HomeView from './views/HomeView.vue'
import PendingView from './views/PendingView.vue'
import SettingsView from './views/SettingsView.vue'
import { usePageSwipe } from './composables/usePageSwipe'

const { translateX, containerWidth } = usePageSwipe()
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden" style="background-color: var(--bg-primary); transition: background-color 0.3s ease;">
    <main class="flex-1 overflow-hidden" style="padding-bottom: calc(52px + var(--safe-area-bottom));">
      <div
        class="h-full flex"
        :style="{
          width: containerWidth * 3 + 'px',
          transform: `translateX(${translateX}px)`,
          willChange: 'transform',
        }"
      >
        <div :style="{ width: containerWidth + 'px', flexShrink: 0 }" class="h-full">
          <HomeView />
        </div>
        <div :style="{ width: containerWidth + 'px', flexShrink: 0 }" class="h-full">
          <PendingView />
        </div>
        <div :style="{ width: containerWidth + 'px', flexShrink: 0 }" class="h-full">
          <SettingsView />
        </div>
      </div>
    </main>

    <TabBar />
  </div>
</template>

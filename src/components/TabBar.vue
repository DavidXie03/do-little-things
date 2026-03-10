<script setup lang="ts">
import { computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useStorage } from '../composables/useStorage'
import IconHome from './icons/IconHome.vue'
import IconChart from './icons/IconChart.vue'
import IconList from './icons/IconList.vue'
import IconSettings from './icons/IconSettings.vue'

const route = useRoute()
const router = useRouter()
const { dailyProgress } = useStorage()

const uncompletedCount = computed(() => {
  return dailyProgress.value.total - dailyProgress.value.completed
})

const tabs = [
  { name: 'home', icon: IconHome, path: '/' },
  { name: 'stats', icon: IconChart, path: '/stats' },
  { name: 'pending', icon: IconList, path: '/pending' },
  { name: 'settings', icon: IconSettings, path: '/settings' },
]

function isActive(tab: typeof tabs[0]): boolean {
  return route.path === tab.path
}

function navigate(tab: typeof tabs[0]): void {
  router.push(tab.path)
}

function getIconColor(tab: typeof tabs[0]): string {
  return isActive(tab) ? '#6C63FF' : '#B2BEC3'
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50"
    :style="{
      paddingBottom: 'var(--safe-area-bottom)',
    }"
  >
    <!-- 毛玻璃背景 -->
    <div class="absolute inset-0 bg-white/80 backdrop-blur-xl border-t border-gray-100/50"></div>

    <div class="relative flex items-center justify-around h-[52px] max-w-md mx-auto">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        @click="navigate(tab)"
        class="relative flex items-center justify-center flex-1 h-full transition-all duration-300 active:scale-90"
      >
        <!-- 活跃指示器 -->
        <div
          v-if="isActive(tab)"
          class="absolute -top-0.5 w-8 h-1 rounded-full"
          style="background: linear-gradient(135deg, #6C63FF, #4ECDC4);"
        ></div>

        <!-- 图标 -->
        <div
          class="transition-all duration-300"
          :class="isActive(tab) ? 'scale-110 -translate-y-0.5' : 'opacity-60'"
        >
          <component :is="tab.icon" :size="28" :color="getIconColor(tab)" />
        </div>

        <!-- 待办数量角标 -->
        <span
          v-if="tab.name === 'pending' && uncompletedCount > 0"
          class="absolute top-1 right-1/4 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] text-white font-bold"
          style="background: linear-gradient(135deg, #FF6B6B, #E17055);"
        >
          {{ uncompletedCount > 99 ? '99+' : uncompletedCount }}
        </span>
      </button>
    </div>
  </nav>
</template>

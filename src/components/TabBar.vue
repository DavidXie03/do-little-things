<script setup lang="ts">
import { useRoute, useRouter } from 'vue-router'
import IconHome from './icons/IconHome.vue'
import IconList from './icons/IconList.vue'

const route = useRoute()
const router = useRouter()

const tabs = [
  { name: 'home', icon: IconHome, path: '/' },
  { name: 'todos', icon: IconList, path: '/todos' },
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
    <div class="absolute inset-0 bg-white/90 backdrop-blur-xl border-t border-gray-100/50"></div>

    <div class="relative flex items-center justify-around h-[52px] w-full">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        @click="navigate(tab)"
        class="relative flex items-center justify-center flex-1 h-full transition-all duration-300 active:scale-90"
      >
        <div
          v-if="isActive(tab)"
          class="absolute -top-0.5 w-8 h-1 rounded-full"
          style="background: var(--primary);"
        ></div>

        <div
          class="transition-all duration-300"
          :class="isActive(tab) ? 'scale-110 -translate-y-0.5' : 'opacity-60'"
        >
          <component :is="tab.icon" :size="28" :color="getIconColor(tab)" />
        </div>
      </button>
    </div>
  </nav>
</template>

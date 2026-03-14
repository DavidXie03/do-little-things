<script setup lang="ts">
import { usePageSwipe } from '../composables/usePageSwipe'
import IconCards from './icons/IconCards.vue'
import IconList from './icons/IconList.vue'

const { currentIndex, goToPage } = usePageSwipe()

const tabs = [
  { name: 'home', icon: IconCards, index: 0 },
  { name: 'todos', icon: IconList, index: 1 },
]

function isActive(tab: typeof tabs[0]): boolean {
  return currentIndex.value === tab.index
}

function navigate(tab: typeof tabs[0]): void {
  goToPage(tab.index)
}

function getIconColor(tab: typeof tabs[0]): string {
  return isActive(tab) ? 'var(--primary)' : 'var(--text-muted)'
}
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 z-50"
    :style="{
      paddingBottom: 'var(--safe-area-bottom)',
    }"
  >
    <div class="absolute inset-0 backdrop-blur-xl border-t" style="background: var(--nav-bg); border-color: var(--nav-border);"></div>

    <div class="relative flex items-center justify-around h-[52px] w-full">
      <button
        v-for="tab in tabs"
        :key="tab.name"
        @click="navigate(tab)"
        class="relative flex items-center justify-center flex-1 h-full"
      >
        <div
          v-if="isActive(tab)"
          class="absolute -top-0.5 w-8 h-1 rounded-full"
          style="background: var(--primary);"
        ></div>

        <div :class="isActive(tab) ? '' : 'opacity-60'">
          <component :is="tab.icon" :size="28" :color="getIconColor(tab)" />
        </div>
      </button>
    </div>
  </nav>
</template>

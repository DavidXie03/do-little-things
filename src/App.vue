<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'
import { useTabSwipe } from './composables/useTabSwipe'

useTabSwipe()

const route = useRoute()
const TAB_PATHS = ['/', '/todos', '/settings']
const transitionName = ref('fade')
let prevIndex = 0

watch(() => route.path, (newPath, oldPath) => {
  const newIdx = TAB_PATHS.indexOf(newPath)
  const oldIdx = TAB_PATHS.indexOf(oldPath ?? '/')
  if (newIdx >= 0 && oldIdx >= 0) {
    transitionName.value = newIdx > oldIdx ? 'slide-left' : 'slide-right'
  } else {
    transitionName.value = 'fade'
  }
  if (newIdx >= 0) prevIndex = newIdx
})
</script>

<template>
  <div class="h-full flex flex-col bg-[var(--bg-primary)] overflow-hidden">
    <main class="flex-1 overflow-hidden" style="padding-bottom: calc(52px + var(--safe-area-bottom));">
      <RouterView v-slot="{ Component }">
        <transition :name="transitionName" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <TabBar />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 左滑切换 (切到右边的 tab) */
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-left-enter-from {
  transform: translateX(30px);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-30px);
  opacity: 0;
}

/* 右滑切换 (切到左边的 tab) */
.slide-right-enter-active,
.slide-right-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.slide-right-enter-from {
  transform: translateX(-30px);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(30px);
  opacity: 0;
}
</style>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterView, useRoute } from 'vue-router'
import TabBar from './components/TabBar.vue'
import { useTabSwipe } from './composables/useTabSwipe'

useTabSwipe()

const route = useRoute()
const TAB_PATHS = ['/', '/todos', '/settings']
const transitionName = ref('fade')

watch(() => route.path, (newPath, oldPath) => {
  const newIdx = TAB_PATHS.indexOf(newPath)
  const oldIdx = TAB_PATHS.indexOf(oldPath ?? '/')
  if (newIdx >= 0 && oldIdx >= 0) {
    transitionName.value = newIdx > oldIdx ? 'slide-left' : 'slide-right'
  } else {
    transitionName.value = 'fade'
  }
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden" style="background-color: var(--bg-primary); transition: background-color 0.3s ease;">
    <main class="flex-1 overflow-hidden relative" style="padding-bottom: calc(52px + var(--safe-area-bottom));">
      <RouterView v-slot="{ Component }">
        <transition :name="transitionName">
          <component :is="Component" :key="route.path" />
        </transition>
      </RouterView>
    </main>

    <TabBar />
  </div>
</template>

<style scoped>
main > :deep(*) {
  width: 100%;
  height: 100%;
}
</style>

<style>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-left-enter-active,
.slide-left-leave-active,
.slide-right-enter-active,
.slide-right-leave-active {
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1),
              opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: absolute !important;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  will-change: transform, opacity;
}

.slide-left-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.slide-left-leave-to {
  transform: translateX(-30%);
  opacity: 0;
}

.slide-right-enter-from {
  transform: translateX(-100%);
  opacity: 0;
}

.slide-right-leave-to {
  transform: translateX(30%);
  opacity: 0;
}
</style>

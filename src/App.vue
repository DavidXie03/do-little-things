<script setup lang="ts">
import { RouterView } from 'vue-router'
import TabBar from './components/TabBar.vue'
</script>

<template>
  <div class="h-full flex flex-col bg-[var(--bg-primary)] overflow-hidden">
    <main class="flex-1 overflow-hidden" style="padding-bottom: calc(52px + var(--safe-area-bottom));">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
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
</style>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import TabBar from './components/TabBar.vue'
import { useTabSwipe } from './composables/useTabSwipe'

useTabSwipe()
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden" style="background-color: var(--bg-primary); transition: background-color 0.3s ease;">
    <main class="flex-1 overflow-hidden" style="padding-bottom: calc(52px + var(--safe-area-bottom));">
      <RouterView />
    </main>

    <TabBar />
  </div>
</template>

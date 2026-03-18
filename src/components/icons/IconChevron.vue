<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" :style="{ color }">
    <polyline v-if="direction === 'up'" points="6 15 12 9 18 15" />
    <polyline v-else points="6 9 12 15 18 9" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; color?: string; direction?: 'up' | 'down' }>(), {
  size: 24,
  color: 'currentColor',
  direction: 'up',
})
</script>

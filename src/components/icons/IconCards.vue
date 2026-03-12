<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="{ color }">
    <!-- 底部卡片（稍微偏移） -->
    <rect x="5" y="4" width="14" height="18" rx="2" ry="2" opacity="0.5" />
    <!-- 顶部卡片 -->
    <rect x="3" y="2" width="14" height="18" rx="2" ry="2" fill="currentColor" fill-opacity="0.08" />
    <!-- 顶部卡片上的星号装饰 -->
    <path d="M10 11L10.5 9.5L11 11L12.5 11.5L11 12L10.5 13.5L10 12L8.5 11.5Z" fill="currentColor" stroke="none" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; color?: string }>(), {
  size: 24,
  color: 'currentColor',
})
</script>

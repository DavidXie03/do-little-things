<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="{ color }">
    <!-- 底部卡片 -->
    <rect x="4" y="6" width="14" height="16" rx="2" ry="2" opacity="0.4" />
    <!-- 中间卡片 -->
    <rect x="6" y="4" width="14" height="16" rx="2" ry="2" opacity="0.7" />
    <!-- 顶部卡片 -->
    <rect x="2" y="2" width="14" height="16" rx="2" ry="2" fill="currentColor" fill-opacity="0.1" />
    <!-- 顶部卡片上的星号装饰 -->
    <path d="M9 10L9.5 8.5L10 10L11.5 10.5L10 11L9.5 12.5L9 11L7.5 10.5Z" fill="currentColor" stroke="none" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; color?: string }>(), {
  size: 24,
  color: 'currentColor',
})
</script>

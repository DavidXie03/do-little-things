<template>
  <svg :width="size" :height="size" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" :style="{ color }">
    <!-- 底部卡片（偏移更大，拉开距离） -->
    <rect x="7" y="6" width="14" height="17" rx="2" ry="2" opacity="0.4" />
    <!-- 顶部卡片 -->
    <rect x="3" y="1" width="14" height="17" rx="2" ry="2" fill="currentColor" fill-opacity="0.08" />
    <!-- 顶部卡片上的星号装饰 -->
    <path d="M10 9.5L10.5 8L11 9.5L12.5 10L11 10.5L10.5 12L10 10.5L8.5 10Z" fill="currentColor" stroke="none" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; color?: string }>(), {
  size: 24,
  color: 'currentColor',
})
</script>

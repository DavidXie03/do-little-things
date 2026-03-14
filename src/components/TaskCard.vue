<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SwipeDirection, Task } from '../types'
import { useSwipeGesture } from '../composables/useSwipeGesture'
import IconCheck from './icons/IconCheck.vue'
import IconClock from './icons/IconClock.vue'

const { t } = useI18n()

const props = defineProps<{
  task: Task
  remainingCount?: number
  totalCount?: number
  disableLeft?: boolean
}>()

const emit = defineEmits<{
  (e: 'swipe', direction: SwipeDirection): void
}>()

const cardRef = ref<HTMLElement | null>(null)

const {
  cardStyle,
  isDragging,
  isAnimatingOut,
  leftZoneProgress,
  rightZoneProgress,
  onTouchStart,
  onTouchMove,
  onTouchEnd,
  onMouseDown,
} = useSwipeGesture(
  cardRef,
  (direction) => emit('swipe', direction),
  { canSwipeLeft: () => !props.disableLeft },
)
</script>

<template>
  <Teleport to="body">
    <transition name="zone-fade">
      <div
        v-if="(isDragging || isAnimatingOut) && leftZoneProgress > 0"
        class="fixed left-0 top-1/2 z-[9999] flex items-center pointer-events-none"
        :style="{
          width: `${40 + leftZoneProgress * 80}px`,
          height: '420px',
          marginTop: '-210px',
          transition: 'width 0.15s ease-out',
        }"
      >
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            :d="`M0,0 L0,100 C${20 + leftZoneProgress * 30},100 ${40 + leftZoneProgress * 40},85 ${50 + leftZoneProgress * 35},50 C${40 + leftZoneProgress * 40},15 ${20 + leftZoneProgress * 30},0 0,0 Z`"
            :fill="leftZoneProgress >= 1 ? 'var(--warning-zone)' : `rgba(245,216,144,${0.3 + leftZoneProgress * 0.5})`"
            :style="{ transition: 'fill 0.15s ease-out' }"
          />
        </svg>
        <div
          class="relative flex items-center justify-center"
          :style="{
            opacity: 0.5 + leftZoneProgress * 0.5,
            transform: `scale(${0.7 + leftZoneProgress * 0.3}) translateX(-${4 + (1 - leftZoneProgress) * 6}px)`,
            transition: 'all 0.15s ease-out',
            width: '60px',
          }"
        >
          <IconClock :size="leftZoneProgress >= 1 ? 28 : 22" :color="leftZoneProgress >= 1 ? '#2D3436' : '#8B7028'" />
        </div>
      </div>
    </transition>

    <transition name="zone-fade">
      <div
        v-if="(isDragging || isAnimatingOut) && rightZoneProgress > 0"
        class="fixed right-0 top-1/2 z-[9999] flex items-center justify-end pointer-events-none"
        :style="{
          width: `${40 + rightZoneProgress * 80}px`,
          height: '420px',
          marginTop: '-210px',
          transition: 'width 0.15s ease-out',
        }"
      >
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <path
            :d="`M100,0 L100,100 C${80 - rightZoneProgress * 30},100 ${60 - rightZoneProgress * 40},85 ${50 - rightZoneProgress * 35},50 C${60 - rightZoneProgress * 40},15 ${80 - rightZoneProgress * 30},0 100,0 Z`"
            :fill="rightZoneProgress >= 1 ? 'var(--success)' : `rgba(94,207,176,${0.3 + rightZoneProgress * 0.5})`"
            :style="{ transition: 'fill 0.15s ease-out' }"
          />
        </svg>
        <div
          class="relative flex items-center justify-center"
          :style="{
            opacity: 0.5 + rightZoneProgress * 0.5,
            transform: `scale(${0.7 + rightZoneProgress * 0.3}) translateX(${4 + (1 - rightZoneProgress) * 6}px)`,
            transition: 'all 0.15s ease-out',
            width: '60px',
          }"
        >
          <IconCheck :size="rightZoneProgress >= 1 ? 28 : 22" :color="rightZoneProgress >= 1 ? 'white' : 'rgba(255,255,255,0.8)'" />
        </div>
      </div>
    </transition>
  </Teleport>

  <div class="relative w-full">
    <div
      ref="cardRef"
      class="relative w-full select-none touch-none cursor-grab active:cursor-grabbing"
      :style="cardStyle"
      @touchstart.passive="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
      @mousedown="onMouseDown"
    >
      <div
        class="relative rounded-3xl p-6 mx-4 overflow-hidden"
        style="
          background: var(--card-bg);
          box-shadow: var(--card-shadow);
          min-height: 340px;
        "
      >
        <div class="relative flex items-center justify-center" style="min-height: 260px;">
          <p
            class="text-center leading-relaxed font-medium"
            :style="{
              fontSize: task.content.length > 20 ? '20px' : '24px',
              color: 'var(--text-primary)',
              lineHeight: '1.8',
            }"
          >
            {{ task.content }}
          </p>
        </div>

        <div
          v-if="totalCount && totalCount > 1"
          class="flex justify-center"
        >
          <span
            class="text-xs u-badge rounded-full"
            style="background: rgba(108,99,255,0.08); color: var(--primary);"
          >
            {{ t('home.remaining', { remaining: remainingCount }) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
.zone-fade-enter-active,
.zone-fade-leave-active {
  transition: opacity 0.2s ease;
}
.zone-fade-enter-from,
.zone-fade-leave-to {
  opacity: 0;
}
</style>

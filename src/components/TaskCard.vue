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
} = useSwipeGesture(cardRef, (direction) => emit('swipe', direction))
</script>

<template>
  <Teleport to="body">
    <transition name="zone-fade">
      <div
        v-if="(isDragging || isAnimatingOut) && leftZoneProgress > 0"
        class="fixed left-0 top-1/2 -translate-y-1/2 z-[9999] flex items-center justify-end pointer-events-none"
        :style="{
          width: `${50 + leftZoneProgress * 30}px`,
          height: `${200 + leftZoneProgress * 80}px`,
          borderRadius: '0 100% 100% 0 / 0 50% 50% 0',
          background: leftZoneProgress >= 1 ? '#FDCB6E' : `rgba(253,203,110,${0.3 + leftZoneProgress * 0.5})`,
          transition: 'all 0.15s ease-out',
        }"
      >
        <div
          class="flex items-center justify-center pr-3"
          :style="{
            opacity: 0.5 + leftZoneProgress * 0.5,
            transform: `scale(${0.7 + leftZoneProgress * 0.3})`,
            transition: 'all 0.15s ease-out',
          }"
        >
          <IconClock :size="leftZoneProgress >= 1 ? 28 : 22" :color="leftZoneProgress >= 1 ? '#2D3436' : '#8B7028'" />
        </div>
      </div>
    </transition>

    <transition name="zone-fade">
      <div
        v-if="(isDragging || isAnimatingOut) && rightZoneProgress > 0"
        class="fixed right-0 top-1/2 -translate-y-1/2 z-[9999] flex items-center justify-start pointer-events-none"
        :style="{
          width: `${50 + rightZoneProgress * 30}px`,
          height: `${200 + rightZoneProgress * 80}px`,
          borderRadius: '100% 0 0 100% / 50% 0 0 50%',
          background: rightZoneProgress >= 1 ? '#00B894' : `rgba(0,184,148,${0.3 + rightZoneProgress * 0.5})`,
          transition: 'all 0.15s ease-out',
        }"
      >
        <div
          class="flex items-center justify-center pl-3"
          :style="{
            opacity: 0.5 + rightZoneProgress * 0.5,
            transform: `scale(${0.7 + rightZoneProgress * 0.3})`,
            transition: 'all 0.15s ease-out',
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
        class="relative rounded-3xl p-6 mx-8 overflow-hidden"
        style="
          background: #FFFFFF;
          box-shadow: 0 8px 32px -8px rgba(0, 0, 0, 0.1);
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
            {{ t('home.remaining', { remaining: remainingCount, total: totalCount }) }}
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

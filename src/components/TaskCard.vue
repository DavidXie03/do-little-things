<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import type { SwipeDirection } from '../types'
import type { Task } from '../types'
import IconCheck from './icons/IconCheck.vue'
import IconClock from './icons/IconClock.vue'

const props = defineProps<{
  task: Task
  /** 剩余需要完成的次数 */
  remainingCount?: number
  /** 总次数 */
  totalCount?: number
}>()

const emit = defineEmits<{
  (e: 'swipe', direction: SwipeDirection): void
}>()

// 拖拽状态
const offsetX = ref(0)
const isDragging = ref(false)
const isAnimatingOut = ref(false)
const startX = ref(0)
const startY = ref(0)
const cardRef = ref<HTMLElement | null>(null)

// 阈值
const SWIPE_THRESHOLD_X = 100

// 计算旋转角度
const rotation = computed(() => {
  return offsetX.value * 0.06
})

// 计算透明度
const opacity = computed(() => {
  const absX = Math.abs(offsetX.value)
  return Math.max(0.5, 1 - absX / 500)
})

// 飞出方向（用于保持半圆在飞出动画时可见）
const animatingDirection = ref<SwipeDirection | null>(null)

// 左右半圆的激活程度（0-1）
const leftZoneProgress = computed(() => {
  // 飞出动画中保持满激活
  if (isAnimatingOut.value && animatingDirection.value === 'left') return 1
  if (offsetX.value >= 0) return 0
  return Math.min(1, Math.abs(offsetX.value) / SWIPE_THRESHOLD_X)
})

const rightZoneProgress = computed(() => {
  // 飞出动画中保持满激活
  if (isAnimatingOut.value && animatingDirection.value === 'right') return 1
  if (offsetX.value <= 0) return 0
  return Math.min(1, offsetX.value / SWIPE_THRESHOLD_X)
})

// 卡片样式
const cardStyle = computed(() => {
  if (isAnimatingOut.value) return {}
  return {
    transform: `translateX(${offsetX.value}px) rotate(${rotation.value}deg)`,
    opacity: opacity.value,
    transition: isDragging.value ? 'none' : 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  }
})

// 手势处理
function onTouchStart(e: TouchEvent) {
  if (isAnimatingOut.value) return
  const touch = e.touches[0]
  if (!touch) return
  isDragging.value = true
  startX.value = touch.clientX
  startY.value = touch.clientY
  offsetX.value = 0
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value || isAnimatingOut.value) return
  e.preventDefault()
  const touch = e.touches[0]
  if (!touch) return
  offsetX.value = touch.clientX - startX.value
}

function onTouchEnd() {
  if (!isDragging.value || isAnimatingOut.value) return
  isDragging.value = false

  const absX = Math.abs(offsetX.value)

  if (absX > SWIPE_THRESHOLD_X) {
    const direction: SwipeDirection = offsetX.value > 0 ? 'right' : 'left'
    animateOut(direction)
  } else {
    offsetX.value = 0
  }
}

// 鼠标事件（开发调试用）
function onMouseDown(e: MouseEvent) {
  if (isAnimatingOut.value) return
  isDragging.value = true
  startX.value = e.clientX
  startY.value = e.clientY
  offsetX.value = 0
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value || isAnimatingOut.value) return
  offsetX.value = e.clientX - startX.value
}

function onMouseUp() {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  onTouchEnd()
}

function animateOut(direction: SwipeDirection) {
  isAnimatingOut.value = true
  animatingDirection.value = direction
  const el = cardRef.value
  if (!el) return

  let animClass = ''
  if (direction === 'right') animClass = 'animate-slide-right'
  else if (direction === 'left') animClass = 'animate-slide-left'

  // 先从当前拖拽位置作为动画起始点，避免闪回
  const currentX = offsetX.value
  const currentRot = rotation.value
  el.style.transform = `translateX(${currentX}px) rotate(${currentRot}deg)`
  el.style.opacity = String(opacity.value)

  // 强制回流后再添加动画 class
  void el.offsetHeight
  el.style.transform = ''
  el.style.opacity = ''
  el.classList.add(animClass)

  const element = el
  function onAnimEnd() {
    element.removeEventListener('animationend', onAnimEnd)
    element.classList.remove(animClass)
    isAnimatingOut.value = false
    animatingDirection.value = null
    offsetX.value = 0
    emit('swipe', direction)
  }
  element.addEventListener('animationend', onAnimEnd)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <!-- 半圆区域使用 Teleport 到 body，确保贴屏幕边框 -->
  <Teleport to="body">
    <!-- 左侧半圆 - 稍后 -->
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

    <!-- 右侧半圆 - 完成 -->
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

  <!-- 滑动区域容器 -->
  <div class="relative w-full">

    <!-- 卡片本体 -->
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
        <!-- 主文字 -->
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

        <!-- 剩余次数提示 -->
        <div
          v-if="totalCount && totalCount > 1"
          class="flex justify-center"
        >
          <span
            class="text-xs px-3 py-1 rounded-full"
            style="background: rgba(108,99,255,0.08); color: var(--primary);"
          >
            剩余 {{ remainingCount }} / {{ totalCount }} 次
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
/* 不使用 scoped，因为半圆通过 Teleport 渲染到 body */
.zone-fade-enter-active,
.zone-fade-leave-active {
  transition: opacity 0.2s ease;
}
.zone-fade-enter-from,
.zone-fade-leave-to {
  opacity: 0;
}
</style>

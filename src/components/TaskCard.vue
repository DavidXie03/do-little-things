<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import type { SwipeDirection } from '../types'
import { TaskTypeLabel, TaskTypeColor, isReadOnlyType } from '../types'
import type { Task } from '../types'
import IconKnowledge from './icons/IconKnowledge.vue'
import IconAction from './icons/IconAction.vue'
import IconExplore from './icons/IconExplore.vue'
import IconNews from './icons/IconNews.vue'
import IconCheck from './icons/IconCheck.vue'
import IconClock from './icons/IconClock.vue'
import IconDismiss from './icons/IconDismiss.vue'
import IconSwipe from './icons/IconSwipe.vue'
import IconArrowLeft from './icons/IconArrowLeft.vue'
import IconArrowRight from './icons/IconArrowRight.vue'
import IconArrowDown from './icons/IconArrowDown.vue'

const props = defineProps<{
  task: Task
}>()

const emit = defineEmits<{
  (e: 'swipe', direction: SwipeDirection): void
}>()

// 是否为只读类型（冷知识/短新闻）
const isReadOnly = computed(() => isReadOnlyType(props.task.type))

// 类型图标组件映射
const typeIconMap: Record<string, any> = {
  knowledge: IconKnowledge,
  action: IconAction,
  explore: IconExplore,
  news: IconNews,
}
const TypeIconComponent = computed(() => typeIconMap[props.task.type])

// 拖拽状态
const offsetX = ref(0)
const offsetY = ref(0)
const isDragging = ref(false)
const isAnimatingOut = ref(false)
const startX = ref(0)
const startY = ref(0)
const cardRef = ref<HTMLElement | null>(null)

// 阈值
const SWIPE_THRESHOLD_X = 100
const SWIPE_THRESHOLD_Y = 80
const ANGLE_THRESHOLD = 35

// 计算旋转角度
const rotation = computed(() => {
  return offsetX.value * 0.08
})

// 计算透明度
const opacity = computed(() => {
  const maxDist = Math.max(Math.abs(offsetX.value), Math.abs(offsetY.value))
  return Math.max(0.4, 1 - maxDist / 400)
})

// 计算方向提示
const currentHint = computed<SwipeDirection>(() => {
  const absX = Math.abs(offsetX.value)
  const absY = Math.abs(offsetY.value)

  if (absX < 30 && absY < 30) return 'none'

  const angle = Math.atan2(absY, absX) * (180 / Math.PI)

  if (angle < ANGLE_THRESHOLD && absX > 30) {
    return offsetX.value > 0 ? 'right' : 'left'
  }
  if (angle > (90 - ANGLE_THRESHOLD) && offsetY.value > 30) {
    return 'down'
  }
  return 'none'
})

// 卡片样式
const cardStyle = computed(() => {
  if (isAnimatingOut.value) return {}
  return {
    transform: `translate(${offsetX.value}px, ${offsetY.value}px) rotate(${rotation.value}deg)`,
    opacity: opacity.value,
    transition: isDragging.value ? 'none' : 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
  }
})

// 类型颜色
const typeColor = computed(() => TaskTypeColor[props.task.type])
const typeLabel = computed(() => TaskTypeLabel[props.task.type])

// 手势处理
function onTouchStart(e: TouchEvent) {
  if (isAnimatingOut.value) return
  const touch = e.touches[0]
  if (!touch) return
  isDragging.value = true
  startX.value = touch.clientX
  startY.value = touch.clientY
  offsetX.value = 0
  offsetY.value = 0
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value || isAnimatingOut.value) return
  e.preventDefault()
  const touch = e.touches[0]
  if (!touch) return
  offsetX.value = touch.clientX - startX.value
  offsetY.value = Math.max(0, touch.clientY - startY.value)
}

function onTouchEnd() {
  if (!isDragging.value || isAnimatingOut.value) return
  isDragging.value = false

  const absX = Math.abs(offsetX.value)
  const absY = offsetY.value
  const angle = Math.atan2(absY, absX) * (180 / Math.PI)

  if (angle < ANGLE_THRESHOLD && absX > SWIPE_THRESHOLD_X) {
    const direction: SwipeDirection = offsetX.value > 0 ? 'right' : 'left'
    animateOut(direction)
  } else if (angle > (90 - ANGLE_THRESHOLD) && absY > SWIPE_THRESHOLD_Y) {
    animateOut('down')
  } else {
    offsetX.value = 0
    offsetY.value = 0
  }
}

// 鼠标事件（开发调试用）
function onMouseDown(e: MouseEvent) {
  if (isAnimatingOut.value) return
  isDragging.value = true
  startX.value = e.clientX
  startY.value = e.clientY
  offsetX.value = 0
  offsetY.value = 0
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!isDragging.value || isAnimatingOut.value) return
  offsetX.value = e.clientX - startX.value
  offsetY.value = Math.max(0, e.clientY - startY.value)
}

function onMouseUp() {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
  onTouchEnd()
}

function animateOut(direction: SwipeDirection) {
  isAnimatingOut.value = true
  const el = cardRef.value
  if (!el) return

  let animClass = ''
  if (direction === 'right') animClass = 'animate-slide-right'
  else if (direction === 'left') animClass = 'animate-slide-left'
  else if (direction === 'down') animClass = 'animate-slide-down'

  el.style.transform = ''
  el.style.opacity = ''
  el.classList.add(animClass)

  // 使用 animationend 事件代替 setTimeout，更精确
  function onAnimEnd() {
    el.removeEventListener('animationend', onAnimEnd)
    el.classList.remove(animClass)
    isAnimatingOut.value = false
    offsetX.value = 0
    offsetY.value = 0
    emit('swipe', direction)
  }
  el.addEventListener('animationend', onAnimEnd)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<template>
  <div
    ref="cardRef"
    class="relative w-full select-none touch-none cursor-grab active:cursor-grabbing"
    :style="cardStyle"
    @touchstart.passive="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
    @mousedown="onMouseDown"
  >
    <!-- 卡片本体 -->
    <div
      class="relative rounded-3xl p-6 mx-4 overflow-hidden"
      style="
        background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
        box-shadow: 0 20px 60px -12px rgba(108, 99, 255, 0.15),
                    0 8px 24px -8px rgba(0, 0, 0, 0.08);
        backdrop-filter: blur(20px);
        min-height: 380px;
      "
    >
      <!-- 装饰背景圆 -->
      <div
        class="absolute -top-20 -right-20 w-48 h-48 rounded-full opacity-10"
        :style="{ background: `radial-gradient(circle, ${typeColor}, transparent)` }"
      ></div>
      <div
        class="absolute -bottom-16 -left-16 w-36 h-36 rounded-full opacity-8"
        :style="{ background: `radial-gradient(circle, ${typeColor}, transparent)` }"
      ></div>

      <!-- 类型标签 -->
      <div class="relative flex items-center gap-2 mb-8">
        <span
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-white"
          :style="{ background: `linear-gradient(135deg, ${typeColor}, ${typeColor}cc)` }"
        >
          <component :is="TypeIconComponent" :size="16" color="white" />
          {{ typeLabel }}
        </span>
      </div>

      <!-- 主文字 -->
      <div class="relative flex items-center justify-center" style="min-height: 200px;">
        <p
          class="text-center leading-relaxed font-medium"
          :style="{
            fontSize: task.content.length > 40 ? '18px' : '22px',
            color: 'var(--text-primary)',
            lineHeight: '1.7',
          }"
        >
          {{ task.content }}
        </p>
      </div>

      <!-- 大图标装饰 -->
      <div class="absolute bottom-6 right-6 opacity-10">
        <component :is="TypeIconComponent" :size="56" :color="typeColor" />
      </div>

      <!-- 操作方向提示 -->
      <!-- 只读类型（冷知识/短新闻）：只显示"滑动完成" -->
      <div v-if="isReadOnly" class="relative flex justify-center items-center gap-2 mt-4 text-xs" style="color: var(--text-muted);">
        <IconSwipe :size="16" color="var(--text-muted)" />
        <span>滑动完成</span>
      </div>
      <!-- 可操作类型（微行动/轻探索）：显示三向操作 -->
      <div v-else class="relative flex justify-center items-center gap-3 mt-4 text-xs" style="color: var(--text-muted);">
        <span
          class="flex items-center gap-1 transition-all duration-200"
          :class="currentHint === 'left' ? 'text-[#FFE66D] font-bold scale-110' : ''"
        >
          <IconArrowLeft :size="12" />
          <IconClock :size="12" />
        </span>
        <span class="opacity-30">|</span>
        <span
          class="flex items-center gap-1 transition-all duration-200"
          :class="currentHint === 'down' ? 'text-[#E17055] font-bold scale-110' : ''"
        >
          <IconArrowDown :size="12" />
          <IconDismiss :size="12" />
        </span>
        <span class="opacity-30">|</span>
        <span
          class="flex items-center gap-1 transition-all duration-200"
          :class="currentHint === 'right' ? 'text-[#00B894] font-bold scale-110' : ''"
        >
          <IconCheck :size="12" />
          <IconArrowRight :size="12" />
        </span>
      </div>
    </div>

    <!-- 滑动方向浮层指示 -->
    <!-- 只读类型：所有方向都显示"已阅" -->
    <template v-if="isReadOnly">
      <transition name="fade">
        <div
          v-if="currentHint !== 'none'"
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 py-2.5 rounded-2xl text-white font-bold text-lg"
          style="background: linear-gradient(135deg, #00B894, #4ECDC4);"
        >
          <span class="flex items-center gap-2">
            <IconCheck :size="20" color="white" />
            已阅
          </span>
        </div>
      </transition>
    </template>

    <!-- 可操作类型：三向提示 -->
    <template v-else>
      <transition name="fade">
        <div
          v-if="currentHint === 'right'"
          class="absolute top-1/2 left-8 -translate-y-1/2 px-4 py-2 rounded-2xl text-white font-bold text-lg"
          style="background: linear-gradient(135deg, #00B894, #4ECDC4);"
        >
          <span class="flex items-center gap-2">
            <IconCheck :size="20" color="white" />
            完成
          </span>
        </div>
      </transition>

      <transition name="fade">
        <div
          v-if="currentHint === 'left'"
          class="absolute top-1/2 right-8 -translate-y-1/2 px-4 py-2 rounded-2xl font-bold text-lg"
          style="background: linear-gradient(135deg, #FDCB6E, #FFE66D); color: #2D3436;"
        >
          <span class="flex items-center gap-2">
            <IconClock :size="20" color="#2D3436" />
            稍后
          </span>
        </div>
      </transition>

      <transition name="fade">
        <div
          v-if="currentHint === 'down'"
          class="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-2xl text-white font-bold text-lg"
          style="background: linear-gradient(135deg, #E17055, #FF6B6B);"
        >
          <span class="flex items-center gap-2">
            <IconDismiss :size="20" color="white" />
            不感兴趣
          </span>
        </div>
      </transition>
    </template>
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

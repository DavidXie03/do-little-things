<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const props = defineProps<{
  visible: boolean
  title?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const sheetRef = ref<HTMLElement | null>(null)
const dragOffset = ref(0)
const isDragging = ref(false)
let startY = 0
let startOffset = 0

// Animate in/out
const sheetTranslateY = ref(100) // percentage: 100 = fully hidden below
const isShowing = ref(false)
let animFrame: number | null = null

function cancelAnim() {
  if (animFrame !== null) {
    cancelAnimationFrame(animFrame)
    animFrame = null
  }
}

watch(() => props.visible, (val) => {
  if (val) {
    isShowing.value = true
    sheetTranslateY.value = 100
    dragOffset.value = 0
    cancelAnim()
    // Slide in
    requestAnimationFrame(() => {
      const start = 100
      const duration = 300
      const startTime = performance.now()
      function tick(now: number) {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
        sheetTranslateY.value = start * (1 - eased)
        if (progress < 1) {
          animFrame = requestAnimationFrame(tick)
        }
      }
      animFrame = requestAnimationFrame(tick)
    })
  } else {
    slideOut()
  }
})

function slideOut() {
  cancelAnim()
  const start = sheetTranslateY.value
  const target = 100
  const duration = 250
  const startTime = performance.now()
  function tick(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    sheetTranslateY.value = start + (target - start) * eased
    if (progress < 1) {
      animFrame = requestAnimationFrame(tick)
    } else {
      isShowing.value = false
    }
  }
  animFrame = requestAnimationFrame(tick)
}

function close() {
  emit('close')
}

// Touch gestures for drag-to-close
function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  startY = touch.clientY
  startOffset = dragOffset.value
  isDragging.value = true
}

function onTouchMove(e: TouchEvent) {
  if (!isDragging.value) return
  const touch = e.touches[0]
  if (!touch) return
  const dy = touch.clientY - startY
  // Only allow dragging down
  if (dy > 0) {
    dragOffset.value = dy
  } else {
    dragOffset.value = 0
  }
}

function onTouchEnd() {
  if (!isDragging.value) return
  isDragging.value = false
  // If dragged more than 100px or 25% of sheet height, close
  const sheetEl = sheetRef.value
  const threshold = sheetEl ? sheetEl.offsetHeight * 0.25 : 100
  if (dragOffset.value > threshold) {
    close()
  } else {
    // Snap back
    const start = dragOffset.value
    const duration = 200
    const startTime = performance.now()
    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      dragOffset.value = start * (1 - eased)
      if (progress < 1) {
        requestAnimationFrame(tick)
      }
    }
    requestAnimationFrame(tick)
  }
}

// Mask opacity based on sheet position
function getMaskOpacity() {
  const baseOpacity = 0.3
  const slideProgress = 1 - sheetTranslateY.value / 100
  const dragReduction = sheetRef.value ? 1 - dragOffset.value / sheetRef.value.offsetHeight : 1
  return baseOpacity * slideProgress * Math.max(0, dragReduction)
}

onUnmounted(() => {
  cancelAnim()
})
</script>

<template>
  <Teleport to="body">
    <div
      v-show="isShowing"
      class="fixed inset-0 z-[10000]"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 backdrop-blur-sm"
        :style="{ background: `rgba(0,0,0,${getMaskOpacity()})` }"
        @click="close"
      ></div>

      <!-- Sheet panel -->
      <div
        ref="sheetRef"
        class="half-sheet"
        :style="{
          transform: `translateY(${sheetTranslateY}%) translateY(${dragOffset}px)`,
          transition: isDragging ? 'none' : undefined,
        }"
        @touchstart.passive="onTouchStart"
        @touchmove.passive="onTouchMove"
        @touchend.passive="onTouchEnd"
      >
        <!-- Drag handle -->
        <div class="drag-handle-area">
          <div class="drag-handle"></div>
        </div>

        <!-- Title -->
        <h3
          v-if="title"
          class="text-lg font-bold px-6 pb-1"
          style="color: var(--text-primary);"
        >
          {{ title }}
        </h3>

        <!-- Content -->
        <div class="half-sheet-content px-6 pb-6 u-gap-md">
          <slot />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.half-sheet {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 85vh;
  background: var(--modal-bg);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 40px -8px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-bottom: calc(var(--safe-area-bottom, 0px) + 8px);
}

.drag-handle-area {
  display: flex;
  justify-content: center;
  padding: 12px 0 8px;
  flex-shrink: 0;
  cursor: grab;
}

.drag-handle {
  width: 36px;
  height: 4px;
  border-radius: 2px;
  background: var(--text-muted);
  opacity: 0.4;
}

.half-sheet-content {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  display: flex;
  flex-direction: column;
}
</style>

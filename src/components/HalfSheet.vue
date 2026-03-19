<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted } from 'vue'

const props = defineProps<{
  visible: boolean
  title?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const sheetRef = ref<HTMLElement | null>(null)
const isShowing = ref(false)
const sheetTranslateY = ref(100) // percentage: 100 = fully hidden
const keyboardOffset = ref(0)
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
    cancelAnim()
    requestAnimationFrame(() => {
      const start = 100
      const duration = 300
      const startTime = performance.now()
      function tick(now: number) {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
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
      keyboardOffset.value = 0
    }
  }
  animFrame = requestAnimationFrame(tick)
}

function close() {
  emit('close')
}

function getMaskOpacity() {
  const baseOpacity = 0.3
  const slideProgress = 1 - sheetTranslateY.value / 100
  return baseOpacity * slideProgress
}

// Keyboard adaptation via visualViewport
// Desktop browsers have visualViewport but no virtual keyboard,
// so we use a height-change heuristic to distinguish keyboard from other resize events.
const initialVVHeight = ref(0)

function onViewportResize() {
  const vv = window.visualViewport
  if (!vv) return

  // On desktop, vv.height ≈ window.innerHeight (no virtual keyboard).
  // Only treat it as keyboard if the viewport shrank significantly (> 100px)
  // compared to the initial height, which filters out minor resize / zoom.
  const heightDiff = initialVVHeight.value - vv.height
  if (heightDiff > 100) {
    const offset = window.innerHeight - vv.height - vv.offsetTop
    keyboardOffset.value = Math.max(0, offset)
  } else {
    keyboardOffset.value = 0
  }
}

onMounted(() => {
  if (window.visualViewport) {
    initialVVHeight.value = window.visualViewport.height
    window.visualViewport.addEventListener('resize', onViewportResize)
    window.visualViewport.addEventListener('scroll', onViewportResize)
  }
})

onUnmounted(() => {
  cancelAnim()
  if (window.visualViewport) {
    window.visualViewport.removeEventListener('resize', onViewportResize)
    window.visualViewport.removeEventListener('scroll', onViewportResize)
  }
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
        class="half-sheet u-card u-gap-md"
        :style="{
          transform: `translateY(${sheetTranslateY}%)`,
          bottom: keyboardOffset + 'px',
        }"
      >
        <!-- Title -->
        <h3
          v-if="title"
          class="text-lg font-bold"
          style="color: var(--text-primary);"
        >
          {{ title }}
        </h3>

        <!-- Content -->
        <slot />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.half-sheet {
  position: absolute;
  left: 0;
  right: 0;
  max-height: 85vh;
  background: var(--modal-bg);
  border-radius: 20px 20px 0 0;
  box-shadow: 0 -8px 40px -8px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: calc(var(--safe-area-bottom, 0px) + 20px);
}
</style>

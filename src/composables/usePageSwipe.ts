import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const TAB_PATHS = ['/todos', '/', '/settings']

const currentIndex = ref(1)
const dragOffset = ref(0)
const isAnimating = ref(false)
const containerWidth = ref(window.innerWidth)

let startX = 0
let startY = 0
let isDragging = false
let isIgnored = false
let directionLocked: 'horizontal' | 'vertical' | null = null

const LOCK_THRESHOLD = 8
const VELOCITY_THRESHOLD = 0.3
const SNAP_THRESHOLD = 0.25

const translateX = computed(() => {
  return -(currentIndex.value * containerWidth.value) + dragOffset.value
})

function animateTo(targetIndex: number, duration = 300): Promise<void> {
  return new Promise(resolve => {
    isAnimating.value = true
    const startOffset = dragOffset.value
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      dragOffset.value = startOffset * (1 - eased)

      if (progress < 1) {
        requestAnimationFrame(tick)
      } else {
        dragOffset.value = 0
        isAnimating.value = false
        resolve()
      }
    }

    requestAnimationFrame(tick)
  })
}

export function usePageSwipe() {
  const router = useRouter()
  const route = useRoute()

  function syncIndexFromRoute() {
    const idx = TAB_PATHS.indexOf(route.path)
    if (idx >= 0) currentIndex.value = idx
  }

  function goToPage(index: number, animate = true) {
    const clamped = Math.max(0, Math.min(TAB_PATHS.length - 1, index))
    if (clamped === currentIndex.value && dragOffset.value === 0) return

    const diff = clamped - currentIndex.value
    dragOffset.value += diff * containerWidth.value
    currentIndex.value = clamped
    router.replace(TAB_PATHS[clamped])

    if (animate) {
      animateTo(clamped)
    } else {
      dragOffset.value = 0
    }
  }

  let lastTouchX = 0
  let lastTouchTime = 0
  let velocity = 0

  function handleTouchStart(e: TouchEvent) {
    if (isAnimating.value) return

    const target = e.target as HTMLElement
    if (target.closest('.touch-none') || target.closest('[data-no-tab-swipe]')) {
      isIgnored = true
      return
    }

    isIgnored = false
    const touch = e.touches[0]
    if (!touch) return

    startX = touch.clientX
    startY = touch.clientY
    lastTouchX = touch.clientX
    lastTouchTime = performance.now()
    velocity = 0
    isDragging = false
    directionLocked = null
  }

  function handleTouchMove(e: TouchEvent) {
    if (isAnimating.value || isIgnored) return

    const touch = e.touches[0]
    if (!touch) return

    const dx = touch.clientX - startX
    const dy = touch.clientY - startY

    if (!directionLocked) {
      if (Math.abs(dx) < LOCK_THRESHOLD && Math.abs(dy) < LOCK_THRESHOLD) return

      const atLeftEdge = currentIndex.value === 0 && dx > 0
      const atRightEdge = currentIndex.value === TAB_PATHS.length - 1 && dx < 0
      if (atLeftEdge || atRightEdge) {
        directionLocked = 'vertical'
        return
      }

      directionLocked = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical'
    }

    if (directionLocked !== 'horizontal') return

    isDragging = true

    const now = performance.now()
    const dt = now - lastTouchTime
    if (dt > 0) {
      velocity = (touch.clientX - lastTouchX) / dt
    }
    lastTouchX = touch.clientX
    lastTouchTime = now

    dragOffset.value = dx
  }

  function handleTouchEnd() {
    if (isIgnored) {
      isIgnored = false
      return
    }

    if (!isDragging) {
      directionLocked = null
      return
    }

    isDragging = false
    directionLocked = null

    const offset = dragOffset.value
    const width = containerWidth.value
    const ratio = Math.abs(offset) / width
    const fastSwipe = Math.abs(velocity) > VELOCITY_THRESHOLD

    let targetIndex = currentIndex.value

    if (offset > 0 && (ratio > SNAP_THRESHOLD || (fastSwipe && velocity > 0))) {
      targetIndex = currentIndex.value - 1
    } else if (offset < 0 && (ratio > SNAP_THRESHOLD || (fastSwipe && velocity < 0))) {
      targetIndex = currentIndex.value + 1
    }

    targetIndex = Math.max(0, Math.min(TAB_PATHS.length - 1, targetIndex))

    if (targetIndex !== currentIndex.value) {
      const diff = targetIndex - currentIndex.value
      dragOffset.value += diff * containerWidth.value
      currentIndex.value = targetIndex
      router.replace(TAB_PATHS[targetIndex])
    }

    animateTo(targetIndex)
  }

  function handleResize() {
    containerWidth.value = window.innerWidth
  }

  onMounted(() => {
    syncIndexFromRoute()
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
    window.addEventListener('resize', handleResize)
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    window.removeEventListener('resize', handleResize)
  })

  return {
    currentIndex,
    translateX,
    containerWidth,
    goToPage,
    TAB_PATHS,
  }
}

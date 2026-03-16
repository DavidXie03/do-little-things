import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const TAB_PATHS = ['/', '/todos']

// ─── Horizontal (left/right) state ───
const currentIndex = ref(0)
const dragOffset = ref(0)
const isAnimating = ref(false)
const containerWidth = ref(window.innerWidth)
const settingsOpen = ref(false)

// ─── Vertical (up/down) state ───
const verticalIndex = ref(1) // 0 = CompletedView (top), 1 = PendingView (bottom, default)
const verticalDragOffset = ref(0)
const isVerticalAnimating = ref(false)
const containerHeight = ref(window.innerHeight)
const headerHeight = ref(0) // set by App.vue after mount

const scrollAreaHeight = computed(() => containerHeight.value - headerHeight.value)

// ─── Shared touch state ───
let startX = 0
let startY = 0
let isDragging = false
let isVerticalDragging = false
let isIgnored = false
let directionLocked: 'horizontal' | 'vertical' | null = null

// ─── Horizontal thresholds ───
const LOCK_THRESHOLD = 8
const VELOCITY_THRESHOLD = 0.3
const SNAP_THRESHOLD = 0.25

// ─── Vertical thresholds (with resistance) ───
const V_VELOCITY_THRESHOLD = 0.5
const V_SNAP_THRESHOLD = 0.35
const V_DRAG_DAMPING = 0.4

const translateX = computed(() => {
  return -(currentIndex.value * containerWidth.value) + dragOffset.value
})

const verticalTranslateY = computed(() => {
  return -(verticalIndex.value * scrollAreaHeight.value) + verticalDragOffset.value
})

// ─── Horizontal animation ───
let animationFrameId: number | null = null

function cancelAnimation() {
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId)
    animationFrameId = null
  }
  isAnimating.value = false
}

function animateTo(targetIndex: number, duration = 300): Promise<void> {
  return new Promise(resolve => {
    cancelAnimation()
    isAnimating.value = true
    const startOffset = dragOffset.value
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      dragOffset.value = startOffset * (1 - eased)

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(tick)
      } else {
        dragOffset.value = 0
        isAnimating.value = false
        animationFrameId = null
        resolve()
      }
    }

    animationFrameId = requestAnimationFrame(tick)
  })
}

// ─── Vertical animation ───
let vAnimationFrameId: number | null = null

function cancelVerticalAnimation() {
  if (vAnimationFrameId !== null) {
    cancelAnimationFrame(vAnimationFrameId)
    vAnimationFrameId = null
  }
  isVerticalAnimating.value = false
}

function animateVerticalTo(targetIndex: number, duration = 300): Promise<void> {
  return new Promise(resolve => {
    cancelVerticalAnimation()
    isVerticalAnimating.value = true
    const startOffset = verticalDragOffset.value
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)

      verticalDragOffset.value = startOffset * (1 - eased)

      if (progress < 1) {
        vAnimationFrameId = requestAnimationFrame(tick)
      } else {
        verticalDragOffset.value = 0
        isVerticalAnimating.value = false
        vAnimationFrameId = null
        resolve()
      }
    }

    vAnimationFrameId = requestAnimationFrame(tick)
  })
}

function findVerticalScrollContainer(): HTMLElement | null {
  const selector = verticalIndex.value === 0
    ? '[data-vertical-scroll="completed"]'
    : '[data-vertical-scroll="pending"]'
  return document.querySelector(selector)
}

function isAtScrollTop(el: HTMLElement): boolean {
  return el.scrollTop <= 0
}

function isAtScrollBottom(el: HTMLElement): boolean {
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 1
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

    if (isAnimating.value) {
      cancelAnimation()
    }

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

  function goToVerticalPage(index: number, animate = true) {
    const clamped = Math.max(0, Math.min(1, index))
    if (clamped === verticalIndex.value && verticalDragOffset.value === 0) return

    if (isVerticalAnimating.value) {
      cancelVerticalAnimation()
    }

    const diff = clamped - verticalIndex.value
    verticalDragOffset.value += diff * scrollAreaHeight.value
    verticalIndex.value = clamped

    if (animate) {
      animateVerticalTo(clamped)
    } else {
      verticalDragOffset.value = 0
    }
  }

  let lastTouchX = 0
  let lastTouchY = 0
  let lastTouchTime = 0
  let velocity = 0
  let vVelocity = 0
  let verticalScrollChecked = false
  let verticalScrollAllowed = false

  function handleTouchStart(e: TouchEvent) {
    if (settingsOpen.value) {
      isIgnored = true
      return
    }

    const target = e.target as HTMLElement
    if (target.closest('.touch-none') || target.closest('[data-no-tab-swipe]')) {
      isIgnored = true
      return
    }

    if (isAnimating.value) cancelAnimation()
    if (isVerticalAnimating.value) cancelVerticalAnimation()

    isIgnored = false
    const touch = e.touches[0]
    if (!touch) return

    startX = touch.clientX
    startY = touch.clientY
    lastTouchX = touch.clientX
    lastTouchY = touch.clientY
    lastTouchTime = performance.now()
    velocity = 0
    vVelocity = 0
    isDragging = false
    isVerticalDragging = false
    directionLocked = null
    verticalScrollChecked = false
    verticalScrollAllowed = false
  }

  function handleTouchMove(e: TouchEvent) {
    if (isIgnored) return

    const touch = e.touches[0]
    if (!touch) return

    const dx = touch.clientX - startX
    const dy = touch.clientY - startY

    if (!directionLocked) {
      if (Math.abs(dx) < LOCK_THRESHOLD && Math.abs(dy) < LOCK_THRESHOLD) return

      // Horizontal edge detection: at first page pulling right or last page pulling left
      const atLeftEdge = currentIndex.value === 0 && dx > 0
      const atRightEdge = currentIndex.value === TAB_PATHS.length - 1 && dx < 0
      if (atLeftEdge || atRightEdge) {
        directionLocked = 'vertical'
      } else {
        directionLocked = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical'
      }
    }

    // ─── Horizontal swipe ───
    if (directionLocked === 'horizontal') {
      isDragging = true

      const now = performance.now()
      const dt = now - lastTouchTime
      if (dt > 0) {
        velocity = (touch.clientX - lastTouchX) / dt
      }
      lastTouchX = touch.clientX
      lastTouchTime = now

      let clampedDx = dx
      if (currentIndex.value === 0 && dx > 0) {
        clampedDx = 0
      } else if (currentIndex.value === TAB_PATHS.length - 1 && dx < 0) {
        clampedDx = 0
      }

      dragOffset.value = clampedDx
      return
    }

    // ─── Vertical swipe (only on todos page, index=1) ───
    if (directionLocked === 'vertical' && currentIndex.value === 1) {
      // Check scroll boundary once per gesture
      if (!verticalScrollChecked) {
        verticalScrollChecked = true
        const scrollEl = findVerticalScrollContainer()
        if (scrollEl) {
          const pullingDown = dy > 0
          const pullingUp = dy < 0
          if (verticalIndex.value === 1 && pullingDown && isAtScrollTop(scrollEl)) {
            verticalScrollAllowed = true
          } else if (verticalIndex.value === 0 && pullingUp && isAtScrollBottom(scrollEl)) {
            verticalScrollAllowed = true
          } else {
            verticalScrollAllowed = false
          }
        } else {
          // No scroll container found, allow page switch
          verticalScrollAllowed = true
        }
      }

      if (!verticalScrollAllowed) return

      e.preventDefault()
      isVerticalDragging = true

      const now = performance.now()
      const dt = now - lastTouchTime
      if (dt > 0) {
        vVelocity = (touch.clientY - lastTouchY) / dt
      }
      lastTouchY = touch.clientY
      lastTouchTime = now

      // Apply damping for resistance feel
      let dampedDy = dy * V_DRAG_DAMPING

      // Clamp at vertical edges
      if (verticalIndex.value === 0 && dampedDy > 0) {
        dampedDy = 0 // Can't pull down further when already at CompletedView
      } else if (verticalIndex.value === 1 && dampedDy < 0) {
        dampedDy = 0 // Can't pull up further when already at PendingView
      }

      verticalDragOffset.value = dampedDy
    }
  }

  function handleTouchEnd() {
    if (isIgnored) {
      isIgnored = false
      return
    }

    // ─── Horizontal touch end ───
    if (isDragging) {
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
      return
    }

    // ─── Vertical touch end ───
    if (isVerticalDragging) {
      isVerticalDragging = false
      directionLocked = null

      const offset = verticalDragOffset.value
      const height = scrollAreaHeight.value
      const ratio = Math.abs(offset) / height
      const fastSwipe = Math.abs(vVelocity) > V_VELOCITY_THRESHOLD

      let targetIndex = verticalIndex.value

      if (offset > 0 && (ratio > V_SNAP_THRESHOLD || (fastSwipe && vVelocity > 0))) {
        targetIndex = verticalIndex.value - 1
      } else if (offset < 0 && (ratio > V_SNAP_THRESHOLD || (fastSwipe && vVelocity < 0))) {
        targetIndex = verticalIndex.value + 1
      }

      targetIndex = Math.max(0, Math.min(1, targetIndex))

      if (targetIndex !== verticalIndex.value) {
        const diff = targetIndex - verticalIndex.value
        verticalDragOffset.value += diff * scrollAreaHeight.value
        verticalIndex.value = targetIndex
      }

      animateVerticalTo(targetIndex)
      return
    }

    directionLocked = null
  }

  function handleResize() {
    containerWidth.value = window.innerWidth
    containerHeight.value = window.innerHeight
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
    isAnimating,
    dragOffset,
    settingsOpen,
    // Vertical
    verticalIndex,
    verticalTranslateY,
    verticalDragOffset,
    containerHeight,
    headerHeight,
    scrollAreaHeight,
    isVerticalAnimating,
    goToVerticalPage,
  }
}

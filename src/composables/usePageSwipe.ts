import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const TAB_PATHS = ['/', '/todos']

// ─── Horizontal (left/right) state ───
const currentIndex = ref(0)
const dragOffset = ref(0)
const isAnimating = ref(false)
const containerWidth = ref(window.innerWidth)
const settingsOpen = ref(false)

// ─── Vertical (continuous scroll) state ───
// verticalIndex: 0 = showing CompletedView at top, 1 = showing PendingView (default)
const verticalIndex = ref(1)
const verticalDragOffset = ref(0) // drag offset in pixels during gesture
const isVerticalAnimating = ref(false)
// Direction of the current vertical swipe/animation: 'up' = going to PendingView, 'down' = going to CompletedView, null = idle
const verticalSwipeDirection = ref<'up' | 'down' | null>(null)
const containerHeight = ref(window.innerHeight)
const headerHeight = ref(0)
const tabBarHeight = ref(52) // default 52px, will be measured in App.vue
const completedPanelHeight = ref(200) // measured from actual DOM

const scrollAreaHeight = computed(() => containerHeight.value - headerHeight.value - tabBarHeight.value)

// The vertical translate when at rest:
// Each view occupies the full scrollAreaHeight (indicators are inside scroll content)
// - verticalIndex=1 (PendingView): CompletedView hidden above
// - verticalIndex=0 (CompletedView): PendingView hidden below
const verticalTranslateY = computed(() => {
  const baseOffset = verticalIndex.value === 1
    ? -scrollAreaHeight.value  // hide CompletedView, show PendingView
    : 0                        // show CompletedView, hide PendingView
  return baseOffset + verticalDragOffset.value
})

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

// ─── Vertical thresholds ───
const V_VELOCITY_THRESHOLD = 0.5
const V_SNAP_THRESHOLD = 0.35

const translateX = computed(() => {
  return -(currentIndex.value * containerWidth.value) + dragOffset.value
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

function animateVerticalTo(targetOffset: number, duration = 300, onComplete?: () => void): Promise<void> {
  return new Promise(resolve => {
    cancelVerticalAnimation()
    isVerticalAnimating.value = true
    const startOffset = verticalDragOffset.value
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // Use linear-ish easing (ease-out quad) to avoid any bounce feel
      const eased = 1 - Math.pow(1 - progress, 2)

      verticalDragOffset.value = startOffset + (targetOffset - startOffset) * eased

      if (progress < 1) {
        vAnimationFrameId = requestAnimationFrame(tick)
      } else {
        verticalDragOffset.value = targetOffset
        isVerticalAnimating.value = false
        vAnimationFrameId = null
        verticalSwipeDirection.value = null
        if (onComplete) onComplete()
        resolve()
      }
    }

    vAnimationFrameId = requestAnimationFrame(tick)
  })
}

function findVerticalScrollContainer(): HTMLElement | null {
  return document.querySelector('[data-vertical-scroll="pending"]')
}

function findCompletedScrollContainer(): HTMLElement | null {
  return document.querySelector('[data-vertical-scroll="completed"] .completed-scroll')
}

function isAtScrollTop(el: HTMLElement): boolean {
  return el.scrollTop <= 0
}

function isAtScrollBottom(el: HTMLElement): boolean {
  return el.scrollTop + el.clientHeight >= el.scrollHeight - 2
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

    if (animate) {
      // Travel = distance between two rest positions = scrollAreaHeight
      const travel = scrollAreaHeight.value
      if (verticalIndex.value === 1 && clamped === 0) {
        // Going from PendingView to CompletedView
        // Immediately flip index and compensate offset so translateY stays the same
        verticalSwipeDirection.value = 'down'
        const currentOffset = verticalDragOffset.value
        const newOffset = -travel + currentOffset
        verticalIndex.value = 0
        verticalDragOffset.value = newOffset
        animateVerticalTo(0)
      } else if (verticalIndex.value === 0 && clamped === 1) {
        // Going from CompletedView to PendingView
        verticalSwipeDirection.value = 'up'
        const currentOffset = verticalDragOffset.value
        const newOffset = travel + currentOffset
        verticalIndex.value = 1
        verticalDragOffset.value = newOffset
        animateVerticalTo(0)
      } else {
        // Same index, just animate offset back to 0
        animateVerticalTo(0)
      }
    } else {
      verticalIndex.value = clamped
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
      if (!verticalScrollChecked) {
        verticalScrollChecked = true

        if (verticalIndex.value === 1) {
          // Currently showing PendingView, check if at scroll top to allow pull-down
          const scrollEl = findVerticalScrollContainer()
          if (scrollEl) {
            verticalScrollAllowed = dy > 0 && isAtScrollTop(scrollEl)
          } else {
            verticalScrollAllowed = dy > 0
          }
        } else {
          // Currently showing CompletedView, check if at scroll bottom to allow pull-up
          const scrollEl = findCompletedScrollContainer()
          if (scrollEl) {
            verticalScrollAllowed = dy < 0 && isAtScrollBottom(scrollEl)
          } else {
            verticalScrollAllowed = dy < 0
          }
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

      const travel = scrollAreaHeight.value

      if (verticalIndex.value === 1) {
        // Pulling down from PendingView to reveal CompletedView
        // Apply damping: the further you pull, the more resistance
        const clampedDy = Math.max(0, dy)
        const damped = travel * (1 - Math.exp(-clampedDy / (travel * 0.4)))
        verticalDragOffset.value = Math.min(travel, damped)
        verticalSwipeDirection.value = 'down'
      } else {
        // Pulling up from CompletedView to go back to PendingView
        const clampedDy = Math.max(0, -dy)
        const damped = travel * (1 - Math.exp(-clampedDy / (travel * 0.8)))
        verticalDragOffset.value = -Math.min(travel, damped)
        verticalSwipeDirection.value = 'up'
      }
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
      const travel = scrollAreaHeight.value
      const ratio = Math.abs(offset) / travel
      const fastSwipe = Math.abs(vVelocity) > V_VELOCITY_THRESHOLD

      if (verticalIndex.value === 1) {
        // Was pulling down from PendingView
        if (ratio > V_SNAP_THRESHOLD || (fastSwipe && vVelocity > 0)) {
          // Switch to CompletedView: immediately flip index and compensate offset
          // Before: translateY = -travel + offset  (verticalIndex=1)
          // After:  translateY = 0 + newOffset      (verticalIndex=0)
          // Keep translateY the same: newOffset = -travel + offset
          const newOffset = -travel + offset
          verticalIndex.value = 0
          verticalDragOffset.value = newOffset
          animateVerticalTo(0)
        } else {
          // Snap back to PendingView
          animateVerticalTo(0)
        }
      } else {
        // Was pulling up from CompletedView
        if (ratio > V_SNAP_THRESHOLD || (fastSwipe && vVelocity < 0)) {
          // Switch to PendingView: immediately flip index and compensate offset
          // Before: translateY = 0 + offset         (verticalIndex=0)
          // After:  translateY = -travel + newOffset (verticalIndex=1)
          // Keep translateY the same: newOffset = travel + offset
          const newOffset = travel + offset
          verticalIndex.value = 1
          verticalDragOffset.value = newOffset
          animateVerticalTo(0)
        } else {
          // Snap back to CompletedView
          animateVerticalTo(0)
        }
      }
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
    verticalDragOffset,
    verticalTranslateY,
    verticalSwipeDirection,
    containerHeight,
    headerHeight,
    tabBarHeight,
    scrollAreaHeight,
    completedPanelHeight,
    isVerticalAnimating,
    goToVerticalPage,
  }
}

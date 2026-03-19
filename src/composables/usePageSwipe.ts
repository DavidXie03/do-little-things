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

// Whether the target view should be rendered (visible) during a vertical switch.
// Stays false during drag; set to true only after touch-end confirms a switch.
const shouldRenderTarget = ref(false)

// Whether the scroll containers are at their boundary edges (used to show/hide indicator)
// PendingView: true when scrollTop <= 0 (at top)
// CompletedView: true when scrolled to bottom
const pendingAtTop = ref(true)
const completedAtBottom = ref(true)

// Measured height of the swipe indicator (chevron + text + gap), used by views to reserve padding
const indicatorHeight = ref(0)

const scrollAreaHeight = computed(() => containerHeight.value - headerHeight.value - tabBarHeight.value)

// Whether the current drag has reached the snap threshold (used by overlay to show text)
const hasReachedThreshold = computed(() => {
  if (!verticalSwipeDirection.value) return false
  const maxPull = scrollAreaHeight.value * V_MAX_PULL_RATIO
  const ratio = Math.abs(verticalDragOffset.value) / maxPull
  return ratio >= V_SNAP_THRESHOLD
})

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
const isVerticalDraggingRef = ref(false)
let isIgnored = false
let directionLocked: 'horizontal' | 'vertical' | null = null

// ─── Horizontal thresholds ───
const LOCK_THRESHOLD = 8
const VELOCITY_THRESHOLD = 0.3
const SNAP_THRESHOLD = 0.25

// ─── Vertical thresholds ───
const V_VELOCITY_THRESHOLD = 0.5
const V_SNAP_THRESHOLD = 0.35
const V_MAX_PULL_RATIO = 0.35 // max drag distance as ratio of scrollAreaHeight

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
        shouldRenderTarget.value = false
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
        shouldRenderTarget.value = true
        const currentOffset = verticalDragOffset.value
        const newOffset = -travel + currentOffset
        verticalIndex.value = 0
        verticalDragOffset.value = newOffset
        animateVerticalTo(0)
      } else if (verticalIndex.value === 0 && clamped === 1) {
        // Going from CompletedView to PendingView
        verticalSwipeDirection.value = 'up'
        shouldRenderTarget.value = true
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
    if (isVerticalAnimating.value) {
      cancelVerticalAnimation()
      shouldRenderTarget.value = false
    }

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
    isVerticalDraggingRef.value = false
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
      isVerticalDraggingRef.value = true

      const now = performance.now()
      const dt = now - lastTouchTime
      if (dt > 0) {
        vVelocity = (touch.clientY - lastTouchY) / dt
      }
      lastTouchY = touch.clientY
      lastTouchTime = now

      const travel = scrollAreaHeight.value
      const maxPull = travel * V_MAX_PULL_RATIO

      if (verticalIndex.value === 1) {
        // Pulling down from PendingView to reveal CompletedView
        // Hyperbolic damping: y = maxPull * x / (x + maxPull * 0.5)
        // Hard ceiling at maxPull, resistance → ∞ as damped → maxPull
        const clampedDy = Math.max(0, dy)
        const damped = maxPull * clampedDy / (clampedDy + maxPull * 0.5)
        verticalDragOffset.value = damped
        verticalSwipeDirection.value = 'down'
      } else {
        // Pulling up from CompletedView to go back to PendingView
        const clampedDy = Math.max(0, -dy)
        const damped = maxPull * clampedDy / (clampedDy + maxPull * 0.5)
        verticalDragOffset.value = -damped
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

    if (isVerticalDraggingRef.value) {
      isVerticalDraggingRef.value = false
      directionLocked = null

      const offset = verticalDragOffset.value
      const travel = scrollAreaHeight.value
      const maxPull = travel * V_MAX_PULL_RATIO
      // ratio relative to maxPull for threshold comparison
      const ratio = Math.abs(offset) / maxPull
      const fastSwipe = Math.abs(vVelocity) > V_VELOCITY_THRESHOLD

      if (verticalIndex.value === 1) {
        // Was pulling down from PendingView
        if (ratio > V_SNAP_THRESHOLD || (fastSwipe && vVelocity > 0)) {
          // Switch to CompletedView: immediately flip index and compensate offset
          shouldRenderTarget.value = true
          const newOffset = -travel + offset
          verticalIndex.value = 0
          verticalDragOffset.value = newOffset
          // Dynamic duration: the more already dragged, the shorter the animation
          const remaining = Math.abs(newOffset) / travel
          const duration = Math.max(150, Math.round(remaining * 300))
          animateVerticalTo(0, duration)
        } else {
          // Snap back to PendingView
          animateVerticalTo(0)
        }
      } else {
        // Was pulling up from CompletedView
        if (ratio > V_SNAP_THRESHOLD || (fastSwipe && vVelocity < 0)) {
          // Switch to PendingView: immediately flip index and compensate offset
          shouldRenderTarget.value = true
          const newOffset = travel + offset
          verticalIndex.value = 1
          verticalDragOffset.value = newOffset
          const remaining = Math.abs(newOffset) / travel
          const duration = Math.max(150, Math.round(remaining * 300))
          animateVerticalTo(0, duration)
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
    isVerticalDraggingRef,
    shouldRenderTarget,
    hasReachedThreshold,
    goToVerticalPage,
    pendingAtTop,
    completedAtBottom,
    indicatorHeight,
  }
}

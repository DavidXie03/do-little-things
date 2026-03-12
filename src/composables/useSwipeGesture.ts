import { ref, computed, onUnmounted, type Ref } from 'vue'
import type { SwipeDirection } from '../types'

const SWIPE_THRESHOLD_X = 100
const LEFT_DAMPED_MAX = 30

/** 阻尼函数：将实际拖拽距离映射为有上限的衰减距离 */
function dampedOffset(rawOffset: number): number {
  const abs = Math.abs(rawOffset)
  // 对数衰减，越往后阻力越大，上限约 LEFT_DAMPED_MAX
  return -LEFT_DAMPED_MAX * (1 - Math.exp(-abs / 120))
}

export function useSwipeGesture(
  cardRef: Ref<HTMLElement | null>,
  onSwipe: (direction: SwipeDirection) => void,
  options?: { canSwipeLeft?: () => boolean },
) {
  const offsetX = ref(0)
  const isDragging = ref(false)
  const isAnimatingOut = ref(false)
  const startX = ref(0)
  const startY = ref(0)
  const animatingDirection = ref<SwipeDirection | null>(null)

  const rotation = computed(() => offsetX.value * 0.06)

  const opacity = computed(() => {
    const absX = Math.abs(offsetX.value)
    return Math.max(0.3, 1 - absX / 800)
  })

  const leftZoneProgress = computed(() => {
    if (isAnimatingOut.value && animatingDirection.value === 'left') return 1
    if (offsetX.value >= 0) return 0
    return Math.min(1, Math.abs(offsetX.value) / SWIPE_THRESHOLD_X)
  })

  const rightZoneProgress = computed(() => {
    if (isAnimatingOut.value && animatingDirection.value === 'right') return 1
    if (offsetX.value <= 0) return 0
    return Math.min(1, offsetX.value / SWIPE_THRESHOLD_X)
  })

  const cardStyle = computed(() => {
    if (isAnimatingOut.value) return {}
    return {
      transform: `translateX(${offsetX.value}px) rotate(${rotation.value}deg)`,
      opacity: opacity.value,
      transition: isDragging.value ? 'none' : 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    }
  })

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
    const newOffsetX = touch.clientX - startX.value
    if (newOffsetX < 0 && options?.canSwipeLeft && !options.canSwipeLeft()) {
      offsetX.value = dampedOffset(newOffsetX)
      return
    }
    offsetX.value = newOffsetX
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
    const newOffsetX = e.clientX - startX.value
    if (newOffsetX < 0 && options?.canSwipeLeft && !options.canSwipeLeft()) {
      offsetX.value = dampedOffset(newOffsetX)
      return
    }
    offsetX.value = newOffsetX
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    onTouchEnd()
  }

  /** 卡片飞出屏幕 */
  function animateOut(direction: SwipeDirection) {
    isAnimatingOut.value = true
    animatingDirection.value = direction
    const el = cardRef.value
    if (!el) {
      isAnimatingOut.value = false
      animatingDirection.value = null
      onSwipe(direction)
      return
    }

    const currentX = offsetX.value
    const currentRot = rotation.value
    const currentOpacity = opacity.value

    const targetX = direction === 'right' ? window.innerWidth * 1.2 : -window.innerWidth * 1.2
    const targetRot = direction === 'right' ? 20 : -20

    let swiped = false
    const doSwipe = () => {
      if (swiped) return
      swiped = true
      isAnimatingOut.value = false
      animatingDirection.value = null
      offsetX.value = 0
      onSwipe(direction)
    }

    try {
      const animation = el.animate([
        {
          transform: `translateX(${currentX}px) rotate(${currentRot}deg)`,
          opacity: currentOpacity,
        },
        {
          transform: `translateX(${targetX}px) rotate(${targetRot}deg)`,
          opacity: 0,
        },
      ], {
        duration: 350,
        easing: 'cubic-bezier(0.45, 0, 0.55, 1)',
        fill: 'forwards',
      })

      animation.onfinish = doSwipe
      animation.oncancel = doSwipe
      setTimeout(doSwipe, 450)
    } catch {
      doSwipe()
    }
  }

  onUnmounted(() => {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
  })

  return {
    cardStyle,
    isDragging,
    isAnimatingOut,
    leftZoneProgress,
    rightZoneProgress,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMouseDown,
  }
}

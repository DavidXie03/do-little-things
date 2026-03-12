import { ref, computed, onUnmounted, type Ref } from 'vue'
import type { SwipeDirection } from '../types'

const SWIPE_THRESHOLD_X = 100

export function useSwipeGesture(
  cardRef: Ref<HTMLElement | null>,
  onSwipe: (direction: SwipeDirection) => void,
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
    offsetX.value = touch.clientX - startX.value
  }

  function onTouchEnd() {
    if (!isDragging.value || isAnimatingOut.value) return
    isDragging.value = false

    const absX = Math.abs(offsetX.value)
    if (absX > SWIPE_THRESHOLD_X) {
      const direction: SwipeDirection = offsetX.value > 0 ? 'right' : 'left'
      if (direction === 'left') {
        animateBackToStack()
      } else {
        animateOut(direction)
      }
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
    offsetX.value = e.clientX - startX.value
  }

  function onMouseUp() {
    document.removeEventListener('mousemove', onMouseMove)
    document.removeEventListener('mouseup', onMouseUp)
    onTouchEnd()
  }

  /** 右滑：飞出屏幕 */
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

  /** 左滑：翻回背面并缩小到牌堆底部 */
  function animateBackToStack() {
    isAnimatingOut.value = true
    animatingDirection.value = 'left'
    const el = cardRef.value
    if (!el) {
      isAnimatingOut.value = false
      animatingDirection.value = null
      onSwipe('left')
      return
    }

    const currentX = offsetX.value
    const currentRot = rotation.value

    let swiped = false
    const doSwipe = () => {
      if (swiped) return
      swiped = true
      isAnimatingOut.value = false
      animatingDirection.value = null
      offsetX.value = 0
      onSwipe('left')
    }

    try {
      // 阶段1：先回到中间位置
      const returnAnim = el.animate([
        {
          transform: `translateX(${currentX}px) rotate(${currentRot}deg)`,
          opacity: 1,
        },
        {
          transform: 'translateX(0px) rotate(0deg)',
          opacity: 1,
        },
      ], {
        duration: 200,
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        fill: 'forwards',
      })

      returnAnim.onfinish = () => {
        // 阶段2：翻转到背面（正面翻到 90°）
        const flipOut = el.animate([
          { transform: 'perspective(800px) rotateY(0deg) scale(1)', opacity: 1 },
          { transform: 'perspective(800px) rotateY(90deg) scale(0.9)', opacity: 0.8 },
        ], {
          duration: 200,
          easing: 'ease-in',
          fill: 'forwards',
        })

        flipOut.onfinish = () => {
          // 阶段3：从 -90° 翻出背面样式，同时缩小到牌堆底部
          const flipIn = el.animate([
            { transform: 'perspective(800px) rotateY(-90deg) scale(0.9)', opacity: 0.8 },
            { transform: 'perspective(800px) rotateY(0deg) scale(0.97) translateY(8px)', opacity: 0.6 },
          ], {
            duration: 200,
            easing: 'ease-out',
            fill: 'forwards',
          })

          flipIn.onfinish = () => {
            // 阶段4：最终淡出
            const fadeOut = el.animate([
              { opacity: 0.6 },
              { opacity: 0 },
            ], {
              duration: 150,
              easing: 'ease-out',
              fill: 'forwards',
            })

            fadeOut.onfinish = doSwipe
            fadeOut.oncancel = doSwipe
            setTimeout(doSwipe, 250)
          }
          flipIn.oncancel = doSwipe
        }
        flipOut.oncancel = doSwipe
      }
      returnAnim.oncancel = doSwipe

      // 安全超时
      setTimeout(doSwipe, 1200)
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

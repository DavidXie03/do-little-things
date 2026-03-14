import { ref, computed, nextTick } from 'vue'
import type { DailyTodoItem } from '../types'

export type AnimPhase = 'idle' | 'rising' | 'flipping' | 'front'

const MAX_STACK = 3

export function useCardAnimation(
  getUncompletedTodos: () => DailyTodoItem[],
) {
  const stackItems = ref<DailyTodoItem[]>([])
  const allDone = ref(false)
  const cardKey = ref(0)
  const animPhase = ref<AnimPhase>('idle')
  const lockedBackgroundCount = ref<number | null>(null)

  const risingCardRef = ref<HTMLElement | null>(null)
  const topCardRef = ref<HTMLElement | null>(null)

  let activeAnimations: Animation[] = []

  const visibleStack = computed(() => stackItems.value.slice(0, MAX_STACK))
  const topItem = computed(() => stackItems.value[0] ?? null)

  const totalRemainingCount = computed(() => {
    let count = 0
    for (const item of stackItems.value) {
      count += item.totalCount - item.completedCount
    }
    return count
  })

  const backgroundCardCount = computed(() => {
    if (lockedBackgroundCount.value !== null) return lockedBackgroundCount.value
    if (totalRemainingCount.value <= 1) return 0
    return 2
  })

  const isLastRemaining = computed(() => totalRemainingCount.value <= 1)

  function loadStack() {
    const uncompleted = getUncompletedTodos()
    if (uncompleted.length > 0) {
      stackItems.value = [...uncompleted]
      allDone.value = false
    } else {
      stackItems.value = []
      allDone.value = true
    }
  }

  function cancelAllAnimations() {
    activeAnimations.forEach(a => { try { a.cancel() } catch {} })
    activeAnimations = []
  }

  function resetAnimState() {
    animPhase.value = 'idle'
    lockedBackgroundCount.value = null
  }

  function lockBackground() {
    lockedBackgroundCount.value = Math.max(2, backgroundCardCount.value || 2)
  }

  function playRisingAnimation() {
    const el = risingCardRef.value
    if (!el) {
      resetAnimState()
      return
    }

    const safetyTimeout = setTimeout(() => {
      resetAnimState()
      cancelAllAnimations()
      if (el) { el.style.transform = ''; el.style.transition = ''; el.style.visibility = '' }
      const topEl = topCardRef.value
      if (topEl) { topEl.style.transform = ''; topEl.style.transition = '' }
    }, 2000)

    el.style.transition = 'none'
    el.getBoundingClientRect()

    const riseAnim = el.animate([
      { transform: 'translateY(24px) scale(0.96)', zIndex: '2' },
      { transform: 'translateY(0px) scale(1)', zIndex: '10' },
    ], {
      duration: 180,
      easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      fill: 'forwards',
    })
    activeAnimations.push(riseAnim)

    riseAnim.onfinish = () => {
      el.style.visibility = 'hidden'
      animPhase.value = 'flipping'
      el.style.transition = ''

      nextTick(() => {
        playFlipAnimation(safetyTimeout)
      })
    }
  }

  function playFlipAnimation(safetyTimeout: ReturnType<typeof setTimeout>) {
    const el = topCardRef.value
    if (!el) {
      clearTimeout(safetyTimeout)
      resetAnimState()
      return
    }

    el.style.transition = 'none'
    el.getBoundingClientRect()

    const flipAnim1 = el.animate([
      { transform: 'perspective(1000px) rotateY(0deg)' },
      { transform: 'perspective(1000px) rotateY(90deg)' },
    ], {
      duration: 160,
      easing: 'ease-in',
      fill: 'forwards',
    })
    activeAnimations.push(flipAnim1)

    flipAnim1.onfinish = () => {
      animPhase.value = 'front'

      nextTick(() => {
        el.style.transition = 'none'
        el.getBoundingClientRect()

        const flipAnim2 = el.animate([
          { transform: 'perspective(1000px) rotateY(-90deg)' },
          { transform: 'perspective(1000px) rotateY(0deg)' },
        ], {
          duration: 180,
          easing: 'ease-out',
          fill: 'forwards',
        })
        activeAnimations.push(flipAnim2)

        flipAnim2.onfinish = () => {
          clearTimeout(safetyTimeout)
          animPhase.value = 'idle'
          el.style.transform = ''
          el.style.transition = ''
          const rEl = risingCardRef.value
          if (rEl) rEl.style.visibility = ''
          lockedBackgroundCount.value = null
          cancelAllAnimations()
        }
      })
    }
  }

  function triggerLeftSwipe() {
    lockBackground()
    animPhase.value = 'rising'
    cancelAllAnimations()

    setTimeout(() => {
      loadStack()
      cardKey.value++

      nextTick(() => {
        requestAnimationFrame(() => { playRisingAnimation() })
      })
    }, 150)
  }

  function triggerRightSwipe() {
    lockBackground()
    animPhase.value = 'rising'
    cancelAllAnimations()

    setTimeout(() => {
      loadStack()
      cardKey.value++

      nextTick(() => {
        requestAnimationFrame(() => { playRisingAnimation() })
      })
    }, 150)
  }

  function triggerAllDone() {
    cancelAllAnimations()
    setTimeout(() => {
      loadStack()
      cardKey.value++
      animPhase.value = 'idle'
    }, 150)
  }

  return {
    stackItems,
    allDone,
    cardKey,
    animPhase,
    backgroundCardCount,
    isLastRemaining,
    risingCardRef,
    topCardRef,
    topItem,
    loadStack,
    triggerLeftSwipe,
    triggerRightSwipe,
    triggerAllDone,
    MAX_STACK,
  }
}

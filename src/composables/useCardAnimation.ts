import { ref, computed, watch, nextTick } from 'vue'
import type { DailyTodoItem } from '../types'
import { storageData } from './storageCore'

export type AnimPhase = 'idle' | 'rising' | 'flipping' | 'front' | 'left-flip' | 'left-back' | 'left-sink'

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
  const secondBgCardRef = ref<HTMLElement | null>(null)
  const topCardRef = ref<HTMLElement | null>(null)

  let activeAnimations: Animation[] = []

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

  let lastShownId: string | null = null

  function shuffle<T>(arr: T[]): T[] {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  function loadStack() {
    const uncompleted = getUncompletedTodos()
    if (uncompleted.length > 0) {
      let shuffled = shuffle(uncompleted)
      if (shuffled.length >= 2 && lastShownId && shuffled[0].id === lastShownId) {
        const swapIdx = 1 + Math.floor(Math.random() * (shuffled.length - 1))
        ;[shuffled[0], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[0]]
      }
      lastShownId = shuffled[0].id
      stackItems.value = shuffled
      allDone.value = false
    } else {
      stackItems.value = []
      allDone.value = true
      lastShownId = null
    }
  }

  watch(
    () => storageData.value.dailyTodos?.items.map(i => `${i.id}:${i.completed}:${i.completedCount}:${i.totalCount}`).join(','),
    () => {
      if (animPhase.value === 'idle') {
        loadStack()
      }
    },
  )

  function cancelAllAnimations() {
    activeAnimations.forEach(a => { try { a.cancel() } catch {} })
    activeAnimations = []
  }

  function resetAnimState() {
    animPhase.value = 'idle'
    lockedBackgroundCount.value = null
  }

  function lockBackground() {
    lockedBackgroundCount.value = Math.max(1, backgroundCardCount.value || 1)
  }

  function playLeftSwipeAnimation(releaseX: number) {
    const el = topCardRef.value
    if (!el) {
      resetAnimState()
      return
    }

    const releaseRot = releaseX * 0.06

    const safetyTimeout = setTimeout(() => {
      resetAnimState()
      cancelAllAnimations()
      if (el) { el.style.transform = ''; el.style.transition = ''; el.style.zIndex = '' }
    }, 2500)

    el.style.transition = 'none'
    el.getBoundingClientRect()

    animPhase.value = 'left-flip'
    const flipOut = el.animate([
      {
        transform: `translateX(${releaseX}px) rotate(${releaseRot}deg) perspective(800px) rotateY(0deg)`,
        opacity: 1,
      },
      {
        transform: 'translateX(0px) rotate(0deg) perspective(800px) rotateY(90deg)',
        opacity: 0.9,
      },
    ], {
      duration: 300,
      easing: 'ease-in-out',
      fill: 'forwards',
    })
    activeAnimations.push(flipOut)

    flipOut.onfinish = () => {
      animPhase.value = 'left-back'

      nextTick(() => {
        el.style.transition = 'none'
        el.getBoundingClientRect()

        const flipIn = el.animate([
          { transform: 'perspective(800px) rotateY(-90deg) scale(1)', opacity: 0.9 },
          { transform: 'perspective(800px) rotateY(0deg) scale(1)', opacity: 1 },
        ], {
          duration: 250,
          easing: 'ease-out',
          fill: 'forwards',
        })
        activeAnimations.push(flipIn)

        flipIn.onfinish = () => {
          animPhase.value = 'left-sink'
          el.style.zIndex = '0'

          nextTick(() => {
            el.style.transition = 'none'
            el.getBoundingClientRect()

            const sinkAnim = el.animate([
              { transform: 'scale(1) translateY(0px)', opacity: 1 },
              { transform: 'scale(0.96) translateY(16px)', opacity: 0.3 },
            ], {
              duration: 300,
              easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
              fill: 'forwards',
            })
            activeAnimations.push(sinkAnim)

            sinkAnim.onfinish = () => {
              clearTimeout(safetyTimeout)
              el.style.transform = ''
              el.style.transition = ''
              el.style.zIndex = ''
              cancelAllAnimations()

              loadStack()
              cardKey.value++

              if (getUncompletedTodos().length > 0) {
                animPhase.value = 'rising'
                nextTick(() => {
                  requestAnimationFrame(() => { playRisingAnimation() })
                })
              } else {
                resetAnimState()
              }
            }
            sinkAnim.oncancel = () => {
              clearTimeout(safetyTimeout)
              el.style.transform = ''
              el.style.transition = ''
              el.style.zIndex = ''
              resetAnimState()
            }
          })
        }
        flipIn.oncancel = () => {
          clearTimeout(safetyTimeout)
          resetAnimState()
        }
      })
    }
    flipOut.oncancel = () => {
      clearTimeout(safetyTimeout)
      resetAnimState()
    }
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
      { transform: 'translateY(12px) scale(0.98)', zIndex: '2' },
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

  function triggerLeftSwipe(releaseOffsetX: number) {
    cancelAllAnimations()
    lockBackground()
    playLeftSwipeAnimation(releaseOffsetX)
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
    secondBgCardRef,
    topCardRef,
    topItem,
    loadStack,
    triggerLeftSwipe,
    triggerRightSwipe,
    triggerAllDone,
    MAX_STACK,
  }
}

import { ref, computed, watch } from 'vue'
import type { DailyTodoItem } from '../types'
import { storageData } from './storageCore'

export type AnimPhase = 'idle'

const MAX_STACK = 3

export function useCardAnimation(
  getUncompletedTodos: () => DailyTodoItem[],
) {
  const stackItems = ref<DailyTodoItem[]>([])
  const allDone = ref(false)
  const cardKey = ref(0)
  const animPhase = ref<AnimPhase>('idle')

  const risingCardRef = ref<HTMLElement | null>(null)
  const secondBgCardRef = ref<HTMLElement | null>(null)
  const topCardRef = ref<HTMLElement | null>(null)

  const topItem = computed(() => stackItems.value[0] ?? null)

  const totalRemainingCount = computed(() => {
    let count = 0
    for (const item of stackItems.value) {
      count += item.totalCount - item.completedCount
    }
    return count
  })

  const backgroundCardCount = computed(() => {
    if (totalRemainingCount.value <= 1) return 0
    return 2
  })

  const isLastRemaining = computed(() => totalRemainingCount.value <= 1)

  /** 上一次展示的卡片 ID，用于避免连续重复 */
  let lastShownId: string | null = null

  /** Fisher-Yates 洗牌 */
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
      // 避免连续展示同一张卡片（当有 ≥2 张时）
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
      loadStack()
    },
  )

  /** 快速切换到下一张卡片 */
  function quickSwitch() {
    loadStack()
    cardKey.value++
  }

  function triggerLeftSwipe() {
    quickSwitch()
  }

  function triggerRightSwipe() {
    quickSwitch()
  }

  function triggerAllDone() {
    loadStack()
    cardKey.value++
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

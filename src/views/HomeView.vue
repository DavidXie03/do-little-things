<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SwipeDirection, DailyTodoItem } from '../types'
import type { SwipeInfo } from '../composables/useSwipeGesture'
import { useStorage } from '../composables/useStorage'
import TaskCard from '../components/TaskCard.vue'
import IconParty from '../components/icons/IconParty.vue'

const { t } = useI18n()

const {
  addRecord,
  addPendingTask,
  ensureDailyTodos,
  markTodoComplete,
  getUncompletedTodos,
} = useStorage()

const stackItems = ref<DailyTodoItem[]>([])
const allDone = ref(false)
const cardKey = ref(0)

/**
 * 动画阶段：
 * 'idle'        — 正常显示，顶部为 TaskCard 正面
 * 'rising'      — 顶部卡片已滑走，第一张卡背正在从堆叠位置升起
 * 'flipping'    — 卡背已升至顶部，正在翻转
 * 'front'       — 翻转完成，显示正面
 * 'left-flip'   — 左滑：正面翻到90°
 * 'left-back'   — 左滑：显示卡背从-90°翻出
 * 'left-sink'   — 左滑：卡背缩小沉入牌堆底部
 */
const animPhase = ref<'idle' | 'rising' | 'flipping' | 'front' | 'left-flip' | 'left-back' | 'left-sink'>('idle')

const MAX_STACK = 3

const visibleStack = computed(() => stackItems.value.slice(0, MAX_STACK))
const topItem = computed(() => stackItems.value[0] ?? null)

/**
 * 计算总的未完成次数（包含当前顶部卡片的剩余次数）
 * 用于决定是否在卡片下方显示卡背
 */
const totalRemainingCount = computed(() => {
  let count = 0
  for (const item of stackItems.value) {
    count += item.totalCount - item.completedCount
  }
  return count
})

/**
 * 动画进行中时锁定的卡背数量
 * 防止 loadStack() 触发响应式重算导致卡背 DOM 被移除
 */
const lockedBackgroundCount = ref<number | null>(null)

/**
 * 计算需要显示的卡背数量（不含顶部卡片本身）
 * 只要总未完成次数 > 1，就至少显示 1 个卡背
 * 动画进行中使用锁定值
 */
const backgroundCardCount = computed(() => {
  if (lockedBackgroundCount.value !== null) return lockedBackgroundCount.value
  if (totalRemainingCount.value <= 1) return 0
  // 用 visibleStack 中除了第一个之外的数量，或者至少 1 个
  return Math.max(1, Math.min(MAX_STACK - 1, visibleStack.value.length - 1))
})

/** 升起动画的卡背元素 ref */
const risingCardRef = ref<HTMLElement | null>(null)
/** 顶部卡片容器 ref */
const topCardRef = ref<HTMLElement | null>(null)

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

/** 当前所有活跃的 Web Animation，用于清理 */
let activeAnimations: Animation[] = []

function cancelAllAnimations() {
  activeAnimations.forEach(a => { try { a.cancel() } catch {} })
  activeAnimations = []
}

function handleSwipe(direction: SwipeDirection, info?: SwipeInfo) {
  const item = topItem.value
  if (!item) return

  if (animPhase.value !== 'idle') return

  const now = new Date()
  const task = item.task
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  if (direction === 'right') {
    markTodoComplete(item.id)
  } else if (direction === 'left') {
    addPendingTask(task)
    addRecord({
      taskId: task.id,
      type: task.type,
      action: 'pending',
      timestamp: now.getTime(),
      date: dateStr,
    })
  }

  const remaining = getUncompletedTodos()

  if (remaining.length > 0) {
    if (direction === 'left') {
      // 左滑：在 HomeView 层面执行翻回牌堆动画
      cancelAllAnimations()
      lockedBackgroundCount.value = Math.max(1, backgroundCardCount.value || 1)
      playLeftSwipeAnimation(info?.releaseOffsetX ?? -120)
    } else {
      // 右滑：走升起 + 翻牌动画
      lockedBackgroundCount.value = Math.max(1, backgroundCardCount.value || 1)
      animPhase.value = 'rising'
      cancelAllAnimations()

      setTimeout(() => {
        loadStack()
        cardKey.value++

        nextTick(() => {
          requestAnimationFrame(() => {
            playRisingAnimation()
          })
        })
      }, 150)
    }
  } else {
    // 全部完成：不需要动画，直接刷新
    cancelAllAnimations()
    setTimeout(() => {
      loadStack()
      cardKey.value++
      animPhase.value = 'idle'
    }, 150)
  }
}

/** 左滑翻回牌堆动画：从松手位置开始 → 翻转 → 显示卡背 → 缩入牌堆底部 */
function playLeftSwipeAnimation(releaseX: number) {
  const el = topCardRef.value
  if (!el) {
    animPhase.value = 'idle'
    lockedBackgroundCount.value = null
    return
  }

  const releaseRot = releaseX * 0.06

  // 安全超时
  const safetyTimeout = setTimeout(() => {
    animPhase.value = 'idle'
    lockedBackgroundCount.value = null
    cancelAllAnimations()
    if (el) { el.style.transform = ''; el.style.transition = ''; el.style.zIndex = '' }
  }, 2500)

  el.style.transition = 'none'
  el.getBoundingClientRect()

  // 阶段1：从松手位置回到中间并开始翻转（正面翻到 90°）
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
    // 阶段2：切换到卡背，从 -90° 翻出
    animPhase.value = 'left-back'

    nextTick(() => {
      el.style.transition = 'none'
      el.getBoundingClientRect()

      const flipIn = el.animate([
        {
          transform: 'perspective(800px) rotateY(-90deg) scale(1)',
          opacity: 0.9,
        },
        {
          transform: 'perspective(800px) rotateY(0deg) scale(1)',
          opacity: 1,
        },
      ], {
        duration: 250,
        easing: 'ease-out',
        fill: 'forwards',
      })
      activeAnimations.push(flipIn)

      flipIn.onfinish = () => {
        // 阶段3：卡背缩小沉入牌堆底部（z-index 降低产生遮挡效果）
        animPhase.value = 'left-sink'
        el.style.zIndex = '0'  // 降到卡背下方，产生被遮挡效果

        nextTick(() => {
          el.style.transition = 'none'
          el.getBoundingClientRect()

          const sinkAnim = el.animate([
            {
              transform: 'scale(1) translateY(0px)',
              opacity: 1,
            },
            {
              transform: 'scale(0.96) translateY(16px)',
              opacity: 0.3,
            },
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

            // 刷新数据并播放翻牌动画
            loadStack()
            cardKey.value++

            if (getUncompletedTodos().length > 0) {
              animPhase.value = 'rising'
              nextTick(() => {
                requestAnimationFrame(() => {
                  playRisingAnimation()
                })
              })
            } else {
              animPhase.value = 'idle'
              lockedBackgroundCount.value = null
            }
          }
          sinkAnim.oncancel = () => {
            clearTimeout(safetyTimeout)
            el.style.transform = ''
            el.style.transition = ''
            el.style.zIndex = ''
            animPhase.value = 'idle'
            lockedBackgroundCount.value = null
          }
        })
      }
      flipIn.oncancel = () => {
        clearTimeout(safetyTimeout)
        animPhase.value = 'idle'
        lockedBackgroundCount.value = null
      }
    })
  }
  flipOut.oncancel = () => {
    clearTimeout(safetyTimeout)
    animPhase.value = 'idle'
    lockedBackgroundCount.value = null
  }
}

function playRisingAnimation() {
  const el = risingCardRef.value
  if (!el) {
    // 没有可升起的卡背（不应该发生，但做安全处理）
    animPhase.value = 'idle'
    lockedBackgroundCount.value = null
    return
  }

  // 安全超时：防止动画状态永远卡死
  const safetyTimeout = setTimeout(() => {
    animPhase.value = 'idle'
    lockedBackgroundCount.value = null
    cancelAllAnimations()
    // 清除可能残留的 inline style
    if (el) { el.style.transform = ''; el.style.transition = ''; el.style.visibility = '' }
    const topEl = topCardRef.value
    if (topEl) { topEl.style.transform = ''; topEl.style.transition = '' }
  }, 2000)

  // ⚡ 关键修复：禁用 CSS transition，防止和 animate() 冲突
  el.style.transition = 'none'

  // 强制浏览器刷新 — 确保 transition:none 先被应用
  el.getBoundingClientRect()

  // 卡背从当前堆叠位置 (translateY(12px) scale(0.98)) 升起到顶部位置 (translateY(0) scale(1))
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
    // 升起完成，隐藏升起的卡背（防止翻转时多显示一个卡背）
    el.style.visibility = 'hidden'
    // 进入翻转阶段
    animPhase.value = 'flipping'
    // 恢复 transition
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
    animPhase.value = 'idle'
    lockedBackgroundCount.value = null
    return
  }

  // 同样禁用 transition 防冲突
  el.style.transition = 'none'
  el.getBoundingClientRect()

  // 第一阶段：卡背从 0° 翻到 90°（消失）
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
    // 切换内容为正面
    animPhase.value = 'front'

    nextTick(() => {
      el.style.transition = 'none'
      el.getBoundingClientRect()

      // 第二阶段：正面从 -90° 翻到 0°（出现）
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
        // 恢复升起卡背的可见性
        const rEl = risingCardRef.value
        if (rEl) rEl.style.visibility = ''
        // 解锁卡背数量，恢复响应式计算
        lockedBackgroundCount.value = null
        // 清理所有动画引用
        cancelAllAnimations()
      }
    })
  }
}

onMounted(() => {
  ensureDailyTodos()
  loadStack()
})
</script>

<template>
  <div class="h-full flex flex-col relative overflow-hidden" style="background-color: var(--bg-primary); transition: background-color 0.3s ease;">
    <!-- 卡片区域 -->
    <div class="flex-1 flex flex-col items-center justify-center px-6">
      <div class="w-full max-w-xs">
        <!-- 有未完成的待办 -->
        <template v-if="topItem">
          <!-- 标题 -->
          <h1
            class="text-2xl font-bold text-center u-mb-lg"
            style="color: var(--primary);"
          >
            {{ t('app.title') }}
          </h1>

          <!-- 卡片堆叠容器 -->
          <div class="card-stack-container" style="min-height: 360px;">
            <!--
              背景堆叠卡片：显示为卡牌背面
              数量基于总的未完成次数，而不仅是未完成任务数
              rising 阶段时，第一张卡背会被 animate() 直接驱动升起
            -->
            <div
              v-for="idx in backgroundCardCount"
              :key="'bg-' + idx"
              :ref="(el) => { if (idx === 1) risingCardRef = el as HTMLElement }"
              class="card-stack-layer"
              :style="{
                transform: `translateY(${idx * 12}px) scale(${1 - idx * 0.02})`,
                zIndex: MAX_STACK - idx,
              }"
            >
              <div class="card-back">
                <div class="card-back-pattern">
                  <div class="card-back-diamond"></div>
                  <div class="card-back-border"></div>
                  <div class="card-back-center-icon">✦</div>
                </div>
              </div>
            </div>

            <!-- 顶部卡片区域 -->
            <div
              ref="topCardRef"
              class="card-stack-top"
            >
              <!-- 翻转阶段 / 左滑背面阶段：顶部显示卡牌背面 -->
              <div v-if="animPhase === 'flipping' || animPhase === 'left-back' || animPhase === 'left-sink'" class="card-back">
                <div class="card-back-pattern">
                  <div class="card-back-diamond"></div>
                  <div class="card-back-border"></div>
                  <div class="card-back-center-icon">✦</div>
                </div>
              </div>

              <!-- 正常/front/left-flip 阶段：显示正面 TaskCard -->
              <TaskCard
                v-if="animPhase === 'idle' || animPhase === 'front' || animPhase === 'left-flip'"
                :key="cardKey"
                :task="topItem.task"
                :remaining-count="topItem.totalCount - topItem.completedCount"
                :total-count="topItem.totalCount"
                @swipe="handleSwipe"
              />

              <!-- rising 阶段：顶部区域什么也不显示，卡背正从堆叠位置升起 -->
            </div>
          </div>
        </template>

        <!-- 今日已全部完成 -->
        <div
          v-else-if="allDone"
          class="flex flex-col items-center justify-center px-8 py-16"
        >
          <div class="mb-6">
            <IconParty :size="64" color="#6C63FF" />
          </div>
          <h3 class="text-xl font-bold mb-2" style="color: var(--text-primary);">
            {{ t('home.allDoneTitle') }}
          </h3>
          <p class="text-sm text-center leading-relaxed" style="color: var(--text-muted);">
            {{ t('home.allDoneMsg1') }}<br/>
            {{ t('home.allDoneMsg2') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-stack-container {
  position: relative;
}

.card-stack-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}

.card-stack-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.card-back {
  border-radius: 1.5rem;
  margin: 0 1rem;
  min-height: 340px;
  background: linear-gradient(135deg, #6C63FF 0%, #8B83FF 50%, #6C63FF 100%);
  position: relative;
  overflow: hidden;
}

.card-back-pattern {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-back-border {
  position: absolute;
  inset: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 1.2rem;
}

.card-back-diamond {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(45deg, rgba(255,255,255,0.06) 25%, transparent 25%),
    linear-gradient(-45deg, rgba(255,255,255,0.06) 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.06) 75%),
    linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.06) 75%);
  background-size: 30px 30px;
  background-position: 0 0, 0 15px, 15px -15px, -15px 0px;
}

.card-back-center-icon {
  font-size: 48px;
  color: rgba(255, 255, 255, 0.25);
  z-index: 1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>

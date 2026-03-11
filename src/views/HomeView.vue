<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SwipeDirection, DailyTodoItem } from '../types'
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
 * 'idle'    — 正常显示，顶部为 TaskCard 正面
 * 'rising'  — 顶部卡片已滑走，第一张卡背正在从堆叠位置升起
 * 'flipping'— 卡背已升至顶部，正在翻转
 * 'front'   — 翻转完成，显示正面
 */
const animPhase = ref<'idle' | 'rising' | 'flipping' | 'front'>('idle')

const MAX_STACK = 3

const visibleStack = computed(() => stackItems.value.slice(0, MAX_STACK))
const topItem = computed(() => stackItems.value[0] ?? null)

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

function handleSwipe(direction: SwipeDirection) {
  const item = topItem.value
  if (!item) return

  // 如果动画还在进行中，忽略新的滑动
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

  // 检查滑走后是否还有更多未完成卡片
  const remaining = getUncompletedTodos()

  if (remaining.length > 1) {
    // 还有多张卡片：走升起 + 翻牌动画
    animPhase.value = 'rising'

    setTimeout(() => {
      loadStack()
      cardKey.value++

      nextTick(() => {
        playRisingAnimation()
      })
    }, 150)
  } else {
    // 只剩0或1张：不需要升起动画，直接刷新
    setTimeout(() => {
      loadStack()
      cardKey.value++
      animPhase.value = 'idle'
    }, 150)
  }
}

function playRisingAnimation() {
  const el = risingCardRef.value
  if (!el) {
    // 没有可升起的卡背（不应该发生，但做安全处理）
    animPhase.value = 'idle'
    return
  }

  // 安全超时：防止动画状态永远卡死
  const safetyTimeout = setTimeout(() => {
    animPhase.value = 'idle'
    if (el) el.style.transform = ''
    const topEl = topCardRef.value
    if (topEl) topEl.style.transform = ''
  }, 2000)

  // 卡背从当前堆叠位置 (translateY(14px) scale(0.96)) 升起到顶部位置 (translateY(0) scale(1))
  const riseAnim = el.animate([
    { transform: 'translateY(14px) scale(0.96)', zIndex: 2 },
    { transform: 'translateY(0px) scale(1)', zIndex: 10 },
  ], {
    duration: 280,
    easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    fill: 'forwards',
  })

  riseAnim.onfinish = () => {
    // 升起完成，进入翻转阶段
    animPhase.value = 'flipping'

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
    return
  }

  // 第一阶段：卡背从 0° 翻到 90°（消失）
  const flipAnim1 = el.animate([
    { transform: 'perspective(1000px) rotateY(0deg)' },
    { transform: 'perspective(1000px) rotateY(90deg)' },
  ], {
    duration: 250,
    easing: 'ease-in',
    fill: 'forwards',
  })

  flipAnim1.onfinish = () => {
    // 切换内容为正面
    animPhase.value = 'front'

    nextTick(() => {
      // 第二阶段：正面从 -90° 翻到 0°（出现）
      const flipAnim2 = el.animate([
        { transform: 'perspective(1000px) rotateY(-90deg)' },
        { transform: 'perspective(1000px) rotateY(0deg)' },
      ], {
        duration: 300,
        easing: 'ease-out',
        fill: 'forwards',
      })

      flipAnim2.onfinish = () => {
        clearTimeout(safetyTimeout)
        animPhase.value = 'idle'
        el.style.transform = ''
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
  <div class="h-full flex flex-col relative overflow-hidden">
    <!-- 卡片区域 -->
    <div class="flex-1 flex flex-col items-center justify-center px-2">
      <div class="w-full max-w-sm">
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
              rising 阶段时，第一张卡背会被 animate() 直接驱动升起
            -->
            <div
              v-for="(item, idx) in visibleStack.slice(1)"
              :key="'bg-' + item.id"
              :ref="(el) => { if (idx === 0) risingCardRef = el as HTMLElement }"
              class="card-stack-layer"
              :style="{
                transform: `translateY(${(idx + 1) * 14}px) scale(${1 - (idx + 1) * 0.04})`,
                zIndex: MAX_STACK - (idx + 1),
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
              <!-- 翻转阶段：顶部显示卡牌背面（即将翻走） -->
              <div v-if="animPhase === 'flipping'" class="card-back">
                <div class="card-back-pattern">
                  <div class="card-back-diamond"></div>
                  <div class="card-back-border"></div>
                  <div class="card-back-center-icon">✦</div>
                </div>
              </div>

              <!-- 正常/front 阶段：显示正面 TaskCard -->
              <TaskCard
                v-if="animPhase === 'idle' || animPhase === 'front'"
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
/* 卡片堆叠容器 */
.card-stack-container {
  position: relative;
}

/* 堆叠层 */
.card-stack-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

/* 顶部卡片 */
.card-stack-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

/* ====== 卡牌背面样式 ====== */
.card-back {
  border-radius: 1.5rem;
  margin: 0 2rem;
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

/* 内边框装饰 */
.card-back-border {
  position: absolute;
  inset: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 1.2rem;
}

/* 菱形背景纹理 */
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

/* 中心装饰符号 */
.card-back-center-icon {
  font-size: 48px;
  color: rgba(255, 255, 255, 0.25);
  z-index: 1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>

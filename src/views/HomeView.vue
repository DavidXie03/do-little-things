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

/** 当前堆叠中的待办列表（第一个是顶部卡片） */
const stackItems = ref<DailyTodoItem[]>([])
const allDone = ref(false)
const cardVisible = ref(false)
const cardKey = ref(0)

/** 翻牌动画状态 */
const isFlipping = ref(false)

/** 最多同时显示几张堆叠卡片 */
const MAX_STACK = 3

/** 可见的堆叠卡片（最多 MAX_STACK 张） */
const visibleStack = computed(() => stackItems.value.slice(0, MAX_STACK))

/** 当前顶部卡片 */
const topItem = computed(() => stackItems.value[0] ?? null)

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

  // 隐藏顶部卡片
  cardVisible.value = false

  // 重新加载堆叠 → 触发翻牌动画
  setTimeout(() => {
    loadStack()
    cardKey.value++

    if (stackItems.value.length > 0) {
      // 先显示卡牌背面，然后翻转到正面
      isFlipping.value = true
      nextTick(() => {
        requestAnimationFrame(() => {
          // 触发翻牌动画：从背面翻到正面
          isFlipping.value = false
          cardVisible.value = true
        })
      })
    }
  }, 100)
}

onMounted(() => {
  ensureDailyTodos()
  loadStack()
  nextTick(() => {
    requestAnimationFrame(() => {
      cardVisible.value = true
    })
  })
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
            <!-- 背景堆叠卡片：显示为卡牌背面 -->
            <div
              v-for="(item, idx) in visibleStack.slice(1)"
              :key="'bg-' + item.id"
              class="card-stack-layer"
              :style="{
                transform: `translateY(${(idx + 1) * 14}px) scale(${1 - (idx + 1) * 0.04})`,
                zIndex: MAX_STACK - (idx + 1),
              }"
            >
              <!-- 卡牌背面 -->
              <div class="card-back">
                <div class="card-back-pattern">
                  <!-- 装饰性图案 -->
                  <div class="card-back-diamond"></div>
                  <div class="card-back-border"></div>
                  <div class="card-back-center-icon">✦</div>
                </div>
              </div>
            </div>

            <!-- 顶部可交互卡片（带翻牌动画） -->
            <div
              class="card-stack-top card-flip-wrapper"
              :class="{ 'is-flipping': isFlipping }"
            >
              <!-- 卡牌背面（翻牌动画时先显示） -->
              <div class="card-flip-back">
                <div class="card-back">
                  <div class="card-back-pattern">
                    <div class="card-back-diamond"></div>
                    <div class="card-back-border"></div>
                    <div class="card-back-center-icon">✦</div>
                  </div>
                </div>
              </div>

              <!-- 卡牌正面 -->
              <div class="card-flip-front">
                <transition name="card-fade-in">
                  <TaskCard
                    v-show="cardVisible"
                    :key="cardKey"
                    :task="topItem.task"
                    :remaining-count="topItem.totalCount - topItem.completedCount"
                    :total-count="topItem.totalCount"
                    @swipe="handleSwipe"
                  />
                </transition>
              </div>
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
/* 卡片堆叠容器：启用 3D 透视 */
.card-stack-container {
  position: relative;
  perspective: 1000px;
}

/* 堆叠层：绝对定位覆盖同一区域 */
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

/* ====== 翻牌动画 ====== */
.card-flip-wrapper {
  transform-style: preserve-3d;
  transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-flip-wrapper.is-flipping {
  transform: rotateY(180deg);
}

.card-flip-front,
.card-flip-back {
  backface-visibility: hidden;
}

.card-flip-back {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  transform: rotateY(180deg);
}

.card-flip-front {
  position: relative;
}

/* 顶部卡片入场动画 */
.card-fade-in-enter-active {
  transition: opacity 0.3s ease;
}
.card-fade-in-leave-active {
  transition: opacity 0.15s ease;
  position: absolute;
  width: 100%;
}
.card-fade-in-enter-from {
  opacity: 0;
}
.card-fade-in-enter-to {
  opacity: 1;
}
.card-fade-in-leave-to {
  opacity: 0;
}
</style>

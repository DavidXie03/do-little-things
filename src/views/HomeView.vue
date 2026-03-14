<script setup lang="ts">
import { onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SwipeDirection } from '../types'
import { useStorage } from '../composables/useStorage'
import { useCardAnimation } from '../composables/useCardAnimation'
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

const {
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
} = useCardAnimation(getUncompletedTodos)

function handleSwipe(direction: SwipeDirection) {
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
      triggerLeftSwipe()
    } else {
      triggerRightSwipe()
    }
  } else {
    triggerAllDone()
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
          <div class="card-stack-container" data-no-tab-swipe style="min-height: 360px;">
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
              <!-- 翻转阶段：顶部显示卡牌背面 -->
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
                :disable-left="isLastRemaining"
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

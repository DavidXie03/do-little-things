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

  // 短暂延迟后重新加载堆叠
  setTimeout(() => {
    loadStack()
    cardKey.value++
    nextTick(() => {
      requestAnimationFrame(() => {
        cardVisible.value = true
      })
    })
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
          <div class="relative" style="min-height: 360px;">
            <!-- 背景堆叠卡片：用位置偏移 + 阴影递减体现层次，完全不透明 -->
            <div
              v-for="(item, idx) in visibleStack.slice(1)"
              :key="'bg-' + item.id"
              class="card-stack-layer"
              :style="{
                transform: `scale(${1 - (idx + 1) * 0.04}) translateY(${(idx + 1) * 14}px)`,
                zIndex: MAX_STACK - (idx + 1),
              }"
            >
              <div
                class="relative rounded-3xl p-6 mx-8 overflow-hidden"
                :style="{
                  background: idx === 0 ? '#F7F7F8' : '#EFEFF1',
                  boxShadow: `0 ${6 - (idx + 1) * 2}px ${20 - (idx + 1) * 6}px -4px rgba(0, 0, 0, ${0.08 - (idx + 1) * 0.02})`,
                  minHeight: '340px',
                }"
              >
                <div class="relative flex items-center justify-center" style="min-height: 260px;">
                  <p
                    class="text-center leading-relaxed font-medium"
                    :style="{
                      fontSize: item.task.content.length > 20 ? '20px' : '24px',
                      color: 'var(--text-secondary)',
                      lineHeight: '1.8',
                    }"
                  >
                    {{ item.task.content }}
                  </p>
                </div>
              </div>
            </div>

            <!-- 顶部可交互卡片 -->
            <transition name="card-fade-in">
              <TaskCard
                v-show="cardVisible"
                :key="cardKey"
                class="card-stack-top"
                :task="topItem.task"
                :remaining-count="topItem.totalCount - topItem.completedCount"
                :total-count="topItem.totalCount"
                @swipe="handleSwipe"
              />
            </transition>
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
/* 堆叠层：绝对定位覆盖同一区域 */
.card-stack-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

/* 顶部卡片：绝对定位，覆盖在堆叠层上 */
.card-stack-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

/* 顶部卡片入场动画 */
.card-fade-in-enter-active {
  transition: opacity 0.4s ease, transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}
.card-fade-in-leave-active {
  transition: opacity 0.15s ease;
  position: absolute;
  width: 100%;
}
.card-fade-in-enter-from {
  opacity: 0;
  transform: scale(0.92) translateY(20px);
}
.card-fade-in-enter-to {
  opacity: 1;
  transform: scale(1) translateY(0);
}
.card-fade-in-leave-to {
  opacity: 0;
}
</style>

<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Task, SwipeDirection, DailyTodoItem } from '../types'
import { useStorage } from '../composables/useStorage'
import TaskCard from '../components/TaskCard.vue'
import IconParty from '../components/icons/IconParty.vue'

const { t } = useI18n()

const {
  addRecord,
  addPendingTask,
  ensureDailyTodos,
  markTodoComplete,
  getNextUncompletedTodo,
} = useStorage()

const currentTask = ref<Task | null>(null)
const currentTodoId = ref<string | null>(null)
const currentTodoItem = ref<DailyTodoItem | null>(null)
const allDone = ref(false)
const cardVisible = ref(false)
const cardKey = ref(0)

function loadNextTask() {
  const todo = getNextUncompletedTodo()
  if (todo) {
    currentTask.value = todo.task
    currentTodoId.value = todo.id
    currentTodoItem.value = todo
    allDone.value = false
  } else {
    currentTask.value = null
    currentTodoId.value = null
    currentTodoItem.value = null
    allDone.value = true
  }
}

function handleSwipe(direction: SwipeDirection) {
  if (!currentTask.value) return

  const now = new Date()
  const task = currentTask.value
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  if (direction === 'right') {
    if (currentTodoId.value) {
      markTodoComplete(currentTodoId.value)
    } else {
      addRecord({
        taskId: task.id,
        type: task.type,
        action: 'complete',
        timestamp: now.getTime(),
        date: dateStr,
      })
    }
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

  // 先隐藏当前卡片
  cardVisible.value = false

  // 等待短暂间隔后加载并显示新卡片（带入场动画）
  setTimeout(() => {
    loadNextTask()
    cardKey.value++
    // 必须等 Vue 完成 DOM patch 后才设为 true，否则 transition 不生效
    nextTick(() => {
      requestAnimationFrame(() => {
        cardVisible.value = true
      })
    })
  }, 100)
}

onMounted(() => {
  ensureDailyTodos()
  loadNextTask()
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
        <template v-if="currentTask">
          <!-- 标题在卡片正上方，相对定位 -->
          <h1
            class="text-2xl font-bold text-center mb-8"
            style="color: var(--primary);"
          >
            {{ t('app.title') }}
          </h1>
          <div class="relative" style="min-height: 360px;">
            <transition name="card-fade-in">
              <TaskCard
                v-show="cardVisible"
                :key="cardKey"
                :task="currentTask"
                :remaining-count="currentTodoItem ? (currentTodoItem.totalCount - currentTodoItem.completedCount) : 1"
                :total-count="currentTodoItem?.totalCount ?? 1"
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

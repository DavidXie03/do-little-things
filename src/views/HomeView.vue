<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import type { Task, SwipeDirection, DailyTodoItem } from '../types'
import { useStorage } from '../composables/useStorage'
import TaskCard from '../components/TaskCard.vue'
import IconParty from '../components/icons/IconParty.vue'

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
const showCard = ref(false)
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
  const dateStr = now.toISOString().split('T')[0] ?? ''

  if (direction === 'right') {
    // 右滑 = 完成一次
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
    // 左滑 = 稍后，不标记为已完成
    addPendingTask(task)
    addRecord({
      taskId: task.id,
      type: task.type,
      action: 'pending',
      timestamp: now.getTime(),
      date: dateStr,
    })
  }

  // 先隐藏卡片，再加载下一个，再显示（带动画）
  showCard.value = false
  // 使用 setTimeout 确保 DOM 更新后再显示新卡片，避免动画不触发
  setTimeout(() => {
    loadNextTask()
    cardKey.value++
    nextTick(() => {
      showCard.value = true
    })
  }, 80)
}

onMounted(() => {
  ensureDailyTodos()
  loadNextTask()
  // 初始加载也带动画
  nextTick(() => {
    showCard.value = true
  })
})
</script>

<template>
  <div class="h-full flex flex-col relative overflow-hidden">
    <!-- 标题固定在上方 -->
    <div class="pt-16 pb-2">
      <h1
        class="text-2xl font-bold text-center"
        style="color: var(--primary);"
      >
        做件小事
      </h1>
    </div>

    <!-- 卡片区域 -->
    <div class="flex-1 flex items-center justify-center px-2" style="margin-top: -24px;">
      <div class="w-full max-w-sm">
        <!-- 有未完成的待办 -->
        <template v-if="currentTask">
          <transition name="card-appear" appear>
            <TaskCard
              v-if="showCard"
              :key="cardKey"
              :task="currentTask"
              :remaining-count="currentTodoItem ? (currentTodoItem.totalCount - currentTodoItem.completedCount) : 1"
              :total-count="currentTodoItem?.totalCount ?? 1"
              @swipe="handleSwipe"
            />
          </transition>
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
            今日任务完成！
          </h3>
          <p class="text-sm text-center leading-relaxed" style="color: var(--text-muted);">
            太棒了，今天的小事都做完了<br/>
            明天再来完成新的待办吧
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

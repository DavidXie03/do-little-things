<script setup lang="ts">
import { ref, onMounted } from 'vue'
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

  loadNextTask()
}

onMounted(() => {
  ensureDailyTodos()
  loadNextTask()
})
</script>

<template>
  <div class="h-full flex flex-col relative overflow-hidden">
    <!-- 卡片区域 -->
    <div class="flex-1 flex items-center justify-center px-2">
      <div class="w-full max-w-sm">
        <!-- 有未完成的待办 -->
        <template v-if="currentTask">
          <!-- 标题在卡片正上方 -->
          <h1
            class="text-2xl font-bold text-center mb-6"
            style="color: var(--primary);"
          >
            做件小事
          </h1>
          <TaskCard
            :key="currentTask.id + '-' + (currentTodoItem?.completedCount ?? 0)"
            :task="currentTask"
            :remaining-count="currentTodoItem ? (currentTodoItem.totalCount - currentTodoItem.completedCount) : 1"
            :total-count="currentTodoItem?.totalCount ?? 1"
            class="animate-card-enter"
            @swipe="handleSwipe"
          />
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

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import type { Task, SwipeDirection } from '../types'
import { isReadOnlyType } from '../types'
import { useStorage } from '../composables/useStorage'
import TaskCard from '../components/TaskCard.vue'
import IconTarget from '../components/icons/IconTarget.vue'
import IconRefresh from '../components/icons/IconRefresh.vue'
import IconSun from '../components/icons/IconSun.vue'
import IconParty from '../components/icons/IconParty.vue'

const {
  addRecord,
  addPendingTask,
  ensureDailyTodos,
  markTodoComplete,
  dailyProgress,
  getNextUncompletedTodo,
} = useStorage()

const currentTask = ref<Task | null>(null)
const currentTodoId = ref<string | null>(null)
const allDone = ref(false)

function loadNextTask() {
  const todo = getNextUncompletedTodo()
  if (todo) {
    currentTask.value = todo.task
    currentTodoId.value = todo.id
    allDone.value = false
  } else {
    currentTask.value = null
    currentTodoId.value = null
    allDone.value = true
  }
}

function handleSwipe(direction: SwipeDirection) {
  if (!currentTask.value) return

  const now = new Date()
  const task = currentTask.value
  const dateStr = now.toISOString().split('T')[0] ?? ''

  // 只读类型：所有方向都视为完成
  if (isReadOnlyType(task.type)) {
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
  } else {
    // 可操作类型
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
      // 待办中标记完成（已加入稍后列表也算处理了）
      if (currentTodoId.value) {
        markTodoComplete(currentTodoId.value)
      }
    } else if (direction === 'down') {
      addRecord({
        taskId: task.id,
        type: task.type,
        action: 'discard',
        timestamp: now.getTime(),
        date: dateStr,
      })
      if (currentTodoId.value) {
        markTodoComplete(currentTodoId.value)
      }
    }
  }

  loadNextTask()
}

function handleRefresh() {
  // 跳过当前（标记完成并加载下一个）
  if (currentTodoId.value) {
    markTodoComplete(currentTodoId.value)
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
    <!-- 顶部区域 -->
    <header class="flex items-center justify-between px-6 pt-safe-top pb-2" style="padding-top: calc(var(--safe-area-top, 0px) + 24px);">
      <div>
        <h1
          class="text-2xl font-bold"
          style="
            background: linear-gradient(135deg, #6C63FF, #4ECDC4);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
          "
        >
          做件小事
        </h1>
        <p class="text-xs mt-1 flex items-center gap-1" style="color: var(--text-muted);">
          <IconSun :size="14" color="var(--text-muted)" />
          每天一点小确幸
        </p>
      </div>
      <div
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold"
        style="
          background: linear-gradient(135deg, rgba(108,99,255,0.1), rgba(78,205,196,0.1));
          color: var(--primary);
        "
      >
        <IconTarget :size="16" color="var(--primary)" />
        <span>{{ dailyProgress.completed }}</span>
        <span class="text-xs opacity-60">/{{ dailyProgress.total }}</span>
      </div>
    </header>

    <!-- 卡片区域 -->
    <div class="flex-1 flex items-center justify-center px-2">
      <div class="w-full max-w-sm">
        <!-- 有未完成的待办 -->
        <TaskCard
          v-if="currentTask"
          :key="currentTask.id"
          :task="currentTask"
          class="animate-card-enter"
          @swipe="handleSwipe"
        />

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
            明天再来探索新的小确幸吧
          </p>
          <div class="mt-6 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
            style="background: linear-gradient(135deg, rgba(108,99,255,0.1), rgba(78,205,196,0.1)); color: var(--primary);">
            <IconTarget :size="16" color="var(--primary)" />
            {{ dailyProgress.completed }}/{{ dailyProgress.total }} 已完成
          </div>
        </div>
      </div>
    </div>

    <!-- 跳过按钮（只在有任务时显示） -->
    <div v-if="currentTask" class="flex justify-center pb-6">
      <button
        @click="handleRefresh"
        class="group flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all duration-300 active:scale-95"
        style="
          background: linear-gradient(135deg, rgba(108,99,255,0.08), rgba(78,205,196,0.08));
          color: var(--primary);
          border: 1.5px solid rgba(108,99,255,0.15);
        "
      >
        <span class="transition-transform duration-500 group-hover:rotate-180 group-active:rotate-180">
          <IconRefresh :size="18" color="var(--primary)" />
        </span>
        <span>跳过</span>
      </button>
    </div>

    <!-- 装饰背景元素 -->
    <div class="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden -z-10">
      <div
        class="absolute -top-32 -right-32 w-64 h-64 rounded-full opacity-[0.03]"
        style="background: radial-gradient(circle, #6C63FF, transparent);"
      ></div>
      <div
        class="absolute -bottom-48 -left-24 w-80 h-80 rounded-full opacity-[0.03]"
        style="background: radial-gradient(circle, #4ECDC4, transparent);"
      ></div>
    </div>
  </div>
</template>

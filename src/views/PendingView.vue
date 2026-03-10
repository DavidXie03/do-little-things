<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useStorage } from '../composables/useStorage'
import { TaskTypeLabel, TaskTypeColor } from '../types'
import IconTarget from '../components/icons/IconTarget.vue'
import IconParty from '../components/icons/IconParty.vue'
import IconKnowledge from '../components/icons/IconKnowledge.vue'
import IconAction from '../components/icons/IconAction.vue'
import IconExplore from '../components/icons/IconExplore.vue'
import IconNews from '../components/icons/IconNews.vue'
import IconCheck from '../components/icons/IconCheck.vue'

const {
  ensureDailyTodos,
  dailyTodos,
  dailyProgress,
  markTodoComplete,
} = useStorage()

const typeIconMap: Record<string, any> = {
  knowledge: IconKnowledge,
  action: IconAction,
  explore: IconExplore,
  news: IconNews,
}

const todayItems = computed(() => {
  if (!dailyTodos.value) return []
  return dailyTodos.value.items
})

const progressPercent = computed(() => {
  if (dailyProgress.value.total === 0) return 0
  return (dailyProgress.value.completed / dailyProgress.value.total) * 100
})

// 圆环进度条参数
const circleRadius = 30
const circleCircumference = 2 * Math.PI * circleRadius
const circleDashOffset = computed(() => {
  return circleCircumference * (1 - progressPercent.value / 100)
})

function handleComplete(todoId: string) {
  markTodoComplete(todoId)
}

function formatDate(): string {
  const now = new Date()
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${months[now.getMonth()]} ${now.getDate()}日 ${weekdays[now.getDay()]}`
}

onMounted(() => {
  ensureDailyTodos()
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- 顶部 -->
    <header class="px-6 pb-4" style="padding-top: calc(var(--safe-area-top, 0px) + 24px);">
      <div class="flex items-center justify-between">
        <div>
          <h1
            class="text-2xl font-bold"
            style="color: var(--text-primary);"
          >
            今日待办
          </h1>
          <p class="text-xs mt-1" style="color: var(--text-muted);">
            {{ formatDate() }}
          </p>
        </div>
        <!-- 圆环进度 -->
        <div class="relative flex items-center justify-center">
          <svg width="68" height="68" viewBox="0 0 68 68">
            <!-- 背景圆 -->
            <circle
              cx="34" cy="34" :r="circleRadius"
              fill="none"
              stroke="rgba(108, 99, 255, 0.1)"
              stroke-width="5"
            />
            <!-- 进度圆 -->
            <circle
              cx="34" cy="34" :r="circleRadius"
              fill="none"
              stroke="url(#progressGradient)"
              stroke-width="5"
              stroke-linecap="round"
              :stroke-dasharray="circleCircumference"
              :stroke-dashoffset="circleDashOffset"
              transform="rotate(-90 34 34)"
              style="transition: stroke-dashoffset 0.5s ease;"
            />
            <defs>
              <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#6C63FF" />
                <stop offset="100%" stop-color="#4ECDC4" />
              </linearGradient>
            </defs>
          </svg>
          <div class="absolute text-center">
            <span class="text-sm font-bold" style="color: var(--primary);">
              {{ dailyProgress.completed }}
            </span>
            <span class="text-[10px] opacity-60" style="color: var(--primary);">
              /{{ dailyProgress.total }}
            </span>
          </div>
        </div>
      </div>
    </header>

    <!-- 列表区域 -->
    <div class="flex-1 overflow-y-auto pb-4 px-4" style="-webkit-overflow-scrolling: touch;">
      <!-- 有待办 -->
      <template v-if="todayItems.length > 0">
        <div
          v-for="item in todayItems"
          :key="item.id"
          class="relative rounded-2xl p-4 mb-3 overflow-hidden transition-all duration-300"
          :class="item.completed ? 'opacity-60' : ''"
          style="
            background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
            box-shadow: 0 4px 20px -4px rgba(108, 99, 255, 0.08),
                        0 2px 8px -2px rgba(0, 0, 0, 0.04);
          "
        >
          <div class="flex items-start gap-3">
            <!-- 勾选框 -->
            <button
              @click="!item.completed && handleComplete(item.id)"
              class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
              :class="item.completed ? '' : 'active:scale-90'"
              :style="{
                background: item.completed
                  ? 'linear-gradient(135deg, #00B894, #4ECDC4)'
                  : 'transparent',
                border: item.completed ? 'none' : '2px solid var(--text-muted)',
              }"
            >
              <IconCheck v-if="item.completed" :size="16" color="white" />
            </button>

            <!-- 内容 -->
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-2 mb-1">
                <!-- 类型图标+标签 -->
                <span class="flex items-center gap-1">
                  <span
                    class="w-2 h-2 rounded-full"
                    :style="{ background: TaskTypeColor[item.task.type] }"
                  ></span>
                  <component :is="typeIconMap[item.task.type]" :size="14" :color="TaskTypeColor[item.task.type]" />
                  <span class="text-[10px] font-semibold" :style="{ color: TaskTypeColor[item.task.type] }">
                    {{ TaskTypeLabel[item.task.type] }}
                  </span>
                </span>
              </div>
              <p
                class="text-sm leading-relaxed transition-all duration-300"
                :class="item.completed ? 'line-through' : ''"
                style="color: var(--text-primary);"
              >
                {{ item.task.content }}
              </p>
            </div>
          </div>
        </div>
      </template>

      <!-- 空状态 -->
      <div
        v-else
        class="flex flex-col items-center justify-center h-full px-8"
      >
        <div class="mb-6">
          <IconParty :size="64" color="var(--text-muted)" />
        </div>
        <h3 class="text-lg font-bold mb-2" style="color: var(--text-primary);">
          还没有生成今日待办
        </h3>
        <p class="text-sm text-center leading-relaxed" style="color: var(--text-muted);">
          回首页开始今天的探索吧
        </p>
      </div>
    </div>
  </div>
</template>

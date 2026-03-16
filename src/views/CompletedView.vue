<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStorage } from '../composables/useStorage'
import TodoItem from '../components/TodoItem.vue'
import { ChevronDown } from 'lucide-vue-next'
import IconCheck from '../components/icons/IconCheck.vue'

const emit = defineEmits<{
  (e: 'back'): void
}>()

const { t, tm, locale } = useI18n()
const { completedTodos, restoreCompletedTodo } = useStorage()

// 只显示昨天及更早完成的任务（不包含今天完成的）
const pastCompletedTodos = computed(() => {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

  return completedTodos.value
    .filter(item => {
      // 如果没有 completedAt，视为旧数据保留
      if (!item.completedAt) return true
      // 只要 completedAt 在今天零点之前的
      return item.completedAt < todayStart
    })
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
})

// 按日期分组
interface CompletedGroup {
  dateStr: string
  label: string
  items: typeof pastCompletedTodos.value
}

const groupedCompleted = computed((): CompletedGroup[] => {
  const groups = new Map<string, CompletedGroup>()

  for (const item of pastCompletedTodos.value) {
    const dateStr = item.completedAt
      ? toDateStr(new Date(item.completedAt))
      : item.scheduledDate

    if (groups.has(dateStr)) {
      groups.get(dateStr)!.items.push(item)
    } else {
      groups.set(dateStr, {
        dateStr,
        label: formatCompletedDate(dateStr),
        items: [item],
      })
    }
  }

  return Array.from(groups.values()).sort((a, b) => b.dateStr.localeCompare(a.dateStr))
})

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatCompletedDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 1) return t('todos.yesterday')
  if (diffDays === 2) return t('todos.dayBeforeYesterday')
  if (diffDays <= 7) return t('todos.daysAgo', { days: diffDays })

  const weekdays = tm('date.weekdays') as string[]
  const month = date.getMonth() + 1
  const day = date.getDate()

  if (locale.value === 'zh') {
    const yearPrefix = date.getFullYear() !== now.getFullYear() ? `${date.getFullYear()}年` : ''
    return `${yearPrefix}${month}月${day}日${weekdays[date.getDay()]}`
  } else {
    const yearPrefix = date.getFullYear() !== now.getFullYear() ? `${date.getFullYear()}/` : ''
    return `${yearPrefix}${month}/${day} ${weekdays[date.getDay()]}`
  }
}

function handleRestore(todoId: string) {
  restoreCompletedTodo(todoId)
}

// 下滑返回手势
let touchStartY = 0
let touchStartX = 0
let isDragging = false
let pullOffset = 0
const BACK_THRESHOLD = 80

function onTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  touchStartY = touch.clientY
  touchStartX = touch.clientX
  isDragging = false
  pullOffset = 0
}

function onTouchMove(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  const dy = touch.clientY - touchStartY
  const dx = Math.abs(touch.clientX - touchStartX)
  // 只在垂直方向拉动、且向下拉时触发
  if (dy > 10 && dy > dx * 2) {
    isDragging = true
    pullOffset = dy
  }
}

function onTouchEnd() {
  if (isDragging && pullOffset > BACK_THRESHOLD) {
    emit('back')
  }
  isDragging = false
  pullOffset = 0
}
</script>

<template>
  <div
    class="h-full flex flex-col overflow-hidden relative"
    style="background-color: var(--bg-primary); transition: background-color 0.3s ease;"
  >
    <!-- Header -->
    <header class="u-page-header flex items-center gap-3">
      <button
        @click="emit('back')"
        class="w-8 h-8 flex items-center justify-center rounded-full transition-all active:scale-90"
        style="background: var(--bg-secondary); border: none; cursor: pointer;"
      >
        <ChevronDown
          :size="20"
          :style="{ color: 'var(--text-secondary)', transform: 'rotate(180deg)' }"
        />
      </button>
      <h1
        class="text-2xl font-bold"
        style="color: var(--text-primary);"
      >
        {{ t('completed.title') }}
      </h1>
    </header>

    <!-- Content -->
    <div
      class="flex-1 overflow-y-auto pb-4 u-section-x"
      :class="{ 'flex flex-col': pastCompletedTodos.length === 0 }"
      style="-webkit-overflow-scrolling: touch;"
    >
      <!-- Empty state -->
      <div
        v-if="pastCompletedTodos.length === 0"
        class="flex-1 flex flex-col items-center justify-center"
      >
        <div
          class="w-16 h-16 rounded-full flex items-center justify-center"
          style="background: var(--toast-success-bg);"
        >
          <IconCheck :size="32" color="var(--secondary)" />
        </div>
        <p class="text-sm mt-3" style="color: var(--text-muted);">
          {{ t('completed.empty') }}
        </p>
      </div>

      <!-- Grouped completed items -->
      <div v-for="group in groupedCompleted" :key="group.dateStr" class="u-mb-lg">
        <div class="flex items-center gap-2 u-mb-sm">
          <span
            class="text-sm font-bold"
            style="color: var(--secondary);"
          >
            {{ group.label }}
          </span>
          <span
            class="text-xs font-semibold min-w-[18px] h-[18px] flex items-center justify-center rounded-full"
            style="background: var(--toast-success-bg); color: var(--secondary);"
          >
            {{ group.items.length }}
          </span>
        </div>

        <div
          class="todo-group rounded-2xl overflow-hidden"
          style="background: var(--item-bg); box-shadow: var(--card-shadow);"
        >
          <TodoItem
            v-for="item in group.items"
            :key="'done_' + item.id"
            :item="item"
            :show-recurrence="true"
            :show-date-label="false"
            :is-completed-archive="true"
            :grouped="true"
            @complete="handleRestore"
          />
        </div>
      </div>

      <div class="h-20"></div>
    </div>
  </div>
</template>

<style scoped>
.todo-group > :not(:last-child) {
  border-bottom: 1px solid var(--divider);
}
</style>

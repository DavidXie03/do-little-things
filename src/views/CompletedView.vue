<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStorage } from '../composables/useStorage'
import TodoItem from '../components/TodoItem.vue'
import IconCheck from '../components/icons/IconCheck.vue'

const { t, tm, locale } = useI18n()
const { completedTodos, restoreCompletedTodo } = useStorage()

const allCompletedTodos = computed(() => {
  return completedTodos.value
    .slice()
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
})

interface CompletedGroup {
  dateStr: string
  label: string
  items: typeof allCompletedTodos.value
}

const groupedCompleted = computed((): CompletedGroup[] => {
  const groups = new Map<string, CompletedGroup>()

  for (const item of allCompletedTodos.value) {
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

  if (diffDays === 0) return t('todos.today')
  if (diffDays === 1) return t('todos.yesterday')
  if (diffDays === 2) return t('todos.dayBeforeYesterday')

  const weekdays = tm('date.weekdays') as string[]
  const month = date.getMonth() + 1
  const day = date.getDate()
  const crossYear = date.getFullYear() !== now.getFullYear()

  if (locale.value === 'zh') {
    const yearPrefix = crossYear ? `${date.getFullYear()}年` : ''
    return `${yearPrefix}${month}月${day}日${weekdays[date.getDay()]}`
  } else {
    const yearPrefix = crossYear ? `${date.getFullYear()}/` : ''
    return `${yearPrefix}${month}/${day} ${weekdays[date.getDay()]}`
  }
}

function handleRestore(todoId: string) {
  restoreCompletedTodo(todoId)
}
</script>

<template>
  <div
    data-vertical-scroll="completed"
    class="flex flex-col"
    style="background-color: var(--bg-primary); transition: background-color 0.3s ease;"
  >
    <!-- Header -->
    <header class="completed-header u-section-x">
      <h2
        class="text-lg font-bold"
        style="color: var(--secondary);"
      >
        {{ t('completed.title') }}
      </h2>
    </header>

    <!-- Content -->
    <div
      class="u-section-x"
      :class="{ 'pb-4': allCompletedTodos.length > 0 }"
    >
      <!-- Empty state -->
      <div
        v-if="allCompletedTodos.length === 0"
        class="flex flex-col items-center justify-center py-8"
      >
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center"
          style="background: var(--toast-success-bg);"
        >
          <IconCheck :size="24" color="var(--secondary)" />
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
    </div>

    <!-- Swipe indicator at bottom -->
    <div class="flex justify-center py-3">
      <div class="w-10 h-1 rounded-full" style="background: var(--text-muted); opacity: 0.25;"></div>
    </div>
  </div>
</template>

<style scoped>
.todo-group > :not(:last-child) {
  border-bottom: 1px solid var(--divider);
}

.completed-header {
  padding-top: var(--gap-md);
  padding-bottom: var(--gap-md);
}
</style>

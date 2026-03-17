<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStorage } from '../composables/useStorage'
import { usePageSwipe } from '../composables/usePageSwipe'
import TodoItem from '../components/TodoItem.vue'
import IconCheck from '../components/icons/IconCheck.vue'

const { t, tm, locale } = useI18n()
const { completedTodos, restoreCompletedTodo } = useStorage()
const { verticalIndex } = usePageSwipe()

const scrollContainer = ref<HTMLElement | null>(null)

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
    const dateStr = item.scheduledDate

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

  // Sort oldest first (top) → newest last (bottom), so user sees recent items at the bottom
  return Array.from(groups.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr))
})

function formatCompletedDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

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

// When CompletedView becomes visible (verticalIndex switches to 0), scroll to bottom
watch(verticalIndex, async (newVal) => {
  if (newVal === 0) {
    await nextTick()
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
    }
  }
})
</script>

<template>
  <div
    data-vertical-scroll="completed"
    class="completed-root flex flex-col"
    style="background-color: var(--bg-primary); transition: background-color 0.3s ease;"
  >
    <!-- Scrollable content area -->
    <div
      ref="scrollContainer"
      class="completed-scroll flex-1 overflow-y-auto u-section-x"
      style="-webkit-overflow-scrolling: touch;"
    >
      <!-- Empty state -->
      <div
        v-if="allCompletedTodos.length === 0"
        class="flex flex-col items-center justify-center py-8"
      >
        <div
          class="w-12 h-12 rounded-full flex items-center justify-center"
          style="background: rgba(108,99,255,0.1);"
        >
          <IconCheck :size="24" color="var(--primary)" />
        </div>
        <p class="text-sm mt-3" style="color: var(--text-muted);">
          {{ t('completed.empty') }}
        </p>
      </div>

      <!-- Grouped completed items -->
      <div class="pt-4 pb-2">
        <div v-for="group in groupedCompleted" :key="group.dateStr" class="u-mb-lg">
          <div class="flex items-center gap-2 u-mb-sm">
            <span
              class="text-sm font-bold"
              style="color: var(--primary);"
            >
              {{ group.label }}
            </span>
            <span
              class="text-xs font-semibold min-w-[18px] h-[18px] flex items-center justify-center rounded-full"
              style="background: rgba(108,99,255,0.1); color: var(--primary);"
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
    </div>

    <!-- Swipe indicator at bottom (pull up to go back) -->
    <div class="flex justify-center py-2" style="flex-shrink: 0;">
      <div class="w-10 h-1 rounded-full" style="background: var(--text-muted); opacity: 0.25;"></div>
    </div>
  </div>
</template>

<style scoped>
.completed-root {
  height: 100%;
}

.todo-group > :not(:last-child) {
  border-bottom: 1px solid var(--divider);
}
</style>

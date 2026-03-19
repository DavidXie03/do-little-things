<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useStorage } from '../composables/useStorage'
import { usePageSwipe } from '../composables/usePageSwipe'
import TodoItem from '../components/TodoItem.vue'
import TodoModal from '../components/TodoModal.vue'
import IconCheck from '../components/icons/IconCheck.vue'
import type { DailyTodoItem, RecurrenceType } from '../types'
import { RecurrenceType as RT } from '../types'

const { t, tm, locale } = useI18n()
const { completedTodos, restoreCompletedTodo, customActions, updateCustomAction, removeTodoItem } = useStorage()
const { verticalIndex, completedAtBottom, indicatorHeight } = usePageSwipe()

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

// ─── Edit Modal ───
const showModal = ref(false)
const modalMode = ref<'add' | 'edit'>('edit')
const modalContent = ref('')
const modalRepeatCount = ref(1)
const modalRecurrence = ref<RecurrenceType>(RT.Daily)
const modalCustomDays = ref<number[]>([])
const modalEditId = ref<string | null>(null)
const modalEditTodoId = ref<string | null>(null)

const existingNames = computed((): Set<string> => {
  const names = new Set<string>()
  for (const ca of customActions.value) {
    names.add(ca.content)
  }
  return names
})

const existingNamesForModal = computed((): Set<string> => {
  if (modalContent.value) {
    const names = new Set(existingNames.value)
    names.delete(modalContent.value)
    return names
  }
  return existingNames.value
})

function openEditModal(item: DailyTodoItem) {
  const taskId = item.task.id
  const caId = taskId.startsWith('custom_') ? taskId.slice(7) : null
  if (!caId) return

  const ca = customActions.value.find(c => c.id === caId)
  if (!ca) return

  modalMode.value = 'edit'
  modalContent.value = ca.content
  modalRepeatCount.value = ca.repeatCount
  modalRecurrence.value = ca.recurrence || RT.Daily
  modalCustomDays.value = ca.customDays ? [...ca.customDays] : []
  modalEditId.value = caId
  modalEditTodoId.value = item.id
  showModal.value = true
}

function handleModalConfirm(content: string, repeatCount: number, recurrence: RecurrenceType, _startDate?: string, customDays?: number[]) {
  if (modalEditId.value) {
    updateCustomAction(modalEditId.value, content, repeatCount, recurrence, customDays)
  }
  showModal.value = false
}

function handleModalDelete() {
  if (modalEditTodoId.value) {
    removeTodoItem(modalEditTodoId.value)
  }
  showModal.value = false
}

function onCompletedScroll(e: Event) {
  const el = e.target as HTMLElement
  completedAtBottom.value = el.scrollTop + el.clientHeight >= el.scrollHeight - 2
}

// When CompletedView becomes visible (verticalIndex switches to 0), scroll to bottom
watch(verticalIndex, async (newVal) => {
  if (newVal === 0) {
    await nextTick()
    if (scrollContainer.value) {
      scrollContainer.value.scrollTop = scrollContainer.value.scrollHeight
      completedAtBottom.value = true
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
      @scroll="onCompletedScroll"
    >
      <!-- Inner wrapper: pushes content to the bottom when items don't fill the viewport -->
      <div class="completed-scroll-inner">
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
        <div class="pt-8" :style="{ paddingBottom: indicatorHeight + 'px' }">
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
                @edit="openEditModal"
              />
            </div>
          </div>
        </div>
      </div>
    </div>

    <TodoModal
      :visible="showModal"
      :mode="modalMode"
      :initial-content="modalContent"
      :initial-repeat-count="modalRepeatCount"
      :initial-recurrence="modalRecurrence"
      :initial-custom-days="modalCustomDays"
      :existing-names="existingNamesForModal"
      @confirm="handleModalConfirm"
      @cancel="showModal = false"
      @delete="handleModalDelete"
    />
  </div>
</template>

<style scoped>
.completed-root {
  height: 100%;
}

.completed-scroll-inner {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: 100%;
}

.todo-group > :not(:last-child) {
  border-bottom: 1px solid var(--divider);
}
</style>

<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DailyTodoItem, RecurrenceType } from '../types'
import { RecurrenceType as RT } from '../types'
import { useStorage } from '../composables/useStorage'
import { useToast } from '../composables/useToast'
import { usePageSwipe } from '../composables/usePageSwipe'
import TodoItem from '../components/TodoItem.vue'
import TodoModal from '../components/TodoModal.vue'
import { ClipboardList } from 'lucide-vue-next'
import IconPlus from '../components/icons/IconPlus.vue'

const { t, tm, locale } = useI18n()
const { showToast } = useToast()
const { isAnimating, dragOffset, currentIndex, verticalIndex, verticalDragOffset } = usePageSwipe()

const fabVisible = ref(false)
const isScrolling = ref(false)
let fabTimer: ReturnType<typeof setTimeout> | null = null
let scrollTimer: ReturnType<typeof setTimeout> | null = null

function onListScroll() {
  isScrolling.value = true
  if (scrollTimer) clearTimeout(scrollTimer)
  scrollTimer = setTimeout(() => {
    isScrolling.value = false
  }, 150)
}

watch([isAnimating, dragOffset, currentIndex, isScrolling, verticalIndex, verticalDragOffset], ([animating, offset, idx, scrolling, vIdx, vOffset]) => {
  if (animating || offset !== 0 || idx !== 1 || scrolling || vIdx !== 1 || vOffset !== 0) {
    if (fabTimer) { clearTimeout(fabTimer); fabTimer = null }
    fabVisible.value = false
  } else {
    if (fabTimer) clearTimeout(fabTimer)
    fabTimer = setTimeout(() => {
      fabVisible.value = true
    }, 100)
  }
})

const {
  ensureDailyTodos,
  dailyTodos,
  markTodoComplete,
  markPastTodoComplete,
  removeTodoItem,
  customActions,
  addCustomAction,
  updateCustomAction,
  futureTodos,
  pastTodos,
} = useStorage()

function handleComplete(todoId: string) {
  const fullyDone = markTodoComplete(todoId)
  if (fullyDone) {
    const messages = tm('toast.completeMessages') as string[]
    const msg = messages[Math.floor(Math.random() * messages.length)]
    showToast(msg, 'success')
  }
}

function handlePastComplete(todoId: string, dateStr: string) {
  const done = markPastTodoComplete(todoId, dateStr)
  if (done) {
    const messages = tm('toast.completeMessages') as string[]
    const msg = messages[Math.floor(Math.random() * messages.length)]
    showToast(msg, 'success')
  }
}

const todayItems = computed(() => {
  const items = dailyTodos.value?.items ?? []
  return items.filter(i => !i.completed)
})

const todayCompletedItems = computed(() => {
  const items = dailyTodos.value?.items ?? []
  return items.filter(i => i.completed)
})

const existingNames = computed((): Set<string> => {
  const names = new Set<string>()
  for (const ca of customActions.value) {
    names.add(ca.content)
  }
  return names
})

const existingNamesForModal = computed((): Set<string> => {
  if (modalMode.value === 'edit' && modalContent.value) {
    const names = new Set(existingNames.value)
    names.delete(modalContent.value)
    return names
  }
  return existingNames.value
})

interface DateGroup {
  dateStr: string       // YYYY-MM-DD
  label: string         // 显示标签：今天、明天、3月15日周日
  count: number
  items: DailyTodoItem[]
  isFuture: boolean     // 是否未来日期（不可操作）
  isOverdue: boolean    // 是否过期
}

const groupedTodos = computed((): DateGroup[] => {
  const groups: Map<string, DateGroup> = new Map()

  const todayDateStr = dailyTodos.value?.date ?? getTodayStr()
  const allTodayItems = [...todayItems.value, ...todayCompletedItems.value]
  if (allTodayItems.length > 0) {
    groups.set(todayDateStr, {
      dateStr: todayDateStr,
      label: t('todos.today'),
      count: allTodayItems.length,
      items: allTodayItems,
      isFuture: false,
      isOverdue: false,
    })
  }

  for (const item of futureTodos.value) {
    const dateStr = item.scheduledDate
    if (groups.has(dateStr)) {
      const group = groups.get(dateStr)!
      group.items.push(item)
      group.count = group.items.length
    } else {
      groups.set(dateStr, {
        dateStr,
        label: formatGroupDate(dateStr),
        count: 1,
        items: [item],
        isFuture: true,
        isOverdue: false,
      })
    }
  }

  return Array.from(groups.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr))
})

// 过期未完成任务分组（按日期从近到远排列）
const overdueGroups = computed((): DateGroup[] => {
  return pastTodos.value
    .filter(p => p.items.length > 0)
    .map(p => ({
      dateStr: p.date,
      label: formatPastDate(p.date),
      count: p.items.length,
      items: p.items,
      isFuture: false,
      isOverdue: true,
    }))
    .sort((a, b) => a.dateStr.localeCompare(b.dateStr)) // 最远的在前（前天在昨天上面）
})

function getTodayStr(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const showModal = ref(false)
const modalMode = ref<'add' | 'edit'>('add')
const modalContent = ref('')
const modalRepeatCount = ref(1)
const modalRecurrence = ref<RecurrenceType>(RT.Daily)
const modalEditId = ref<string | null>(null)
const modalEditTodoId = ref<string | null>(null)

function openAddModal() {
  modalMode.value = 'add'
  modalContent.value = ''
  modalRepeatCount.value = 1
  modalRecurrence.value = RT.Daily
  modalEditId.value = null
  modalEditTodoId.value = null
  showModal.value = true
}

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
  modalEditId.value = caId
  modalEditTodoId.value = item.id
  showModal.value = true
}

function handleModalConfirm(content: string, repeatCount: number, recurrence: RecurrenceType, startDate?: string) {
  if (modalMode.value === 'add') {
    addCustomAction(content, repeatCount, recurrence, startDate)
  } else if (modalEditId.value) {
    updateCustomAction(modalEditId.value, content, repeatCount, recurrence)
  }
  showModal.value = false
}

function handleModalDelete() {
  if (modalEditTodoId.value) {
    removeTodoItem(modalEditTodoId.value)
  }
  showModal.value = false
}

function formatGroupDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return t('todos.today')
  if (diffDays === 1) return t('todos.tomorrow')
  if (diffDays === 2) return t('todos.dayAfterTomorrow')

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

function formatPastDate(dateStr: string): string {
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

onMounted(() => {
  ensureDailyTodos()
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden relative" style="background-color: var(--bg-primary); transition: background-color 0.3s ease;">
    <div
      data-vertical-scroll="pending"
      class="flex-1 overflow-y-auto pb-4 u-section-x"
      :class="{ 'flex flex-col': groupedTodos.length === 0 && overdueGroups.length === 0 }"
      style="-webkit-overflow-scrolling: touch;"
      @scroll="onListScroll"
    >

      <div
        v-if="groupedTodos.length === 0 && overdueGroups.length === 0"
        class="flex-1 flex flex-col items-center justify-center"
      >
        <ClipboardList :size="48" color="var(--text-muted)" :stroke-width="1.5" />
        <p class="text-sm mt-3" style="color: var(--text-muted);">
          {{ t('todos.empty') }}
        </p>
      </div>

      <!-- 过期未完成任务（展示在今天上面） -->
      <div v-for="group in overdueGroups" :key="'past_' + group.dateStr" class="u-mb-lg">
        <div class="flex items-center gap-2 u-mb-sm">
          <span class="text-sm font-bold" style="color: var(--primary);">
            {{ group.label }}
          </span>
          <span
            class="text-xs font-semibold min-w-[18px] h-[18px] flex items-center justify-center rounded-full"
            style="background: rgba(108,99,255,0.1); color: var(--primary);"
          >
            {{ group.count }}
          </span>
        </div>

        <div
          class="todo-group rounded-2xl overflow-hidden"
          style="background: var(--item-bg); box-shadow: var(--card-shadow);"
        >
          <TodoItem
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            :show-recurrence="true"
            :show-date-label="false"
            :is-overdue="true"
            :grouped="true"
            @complete="(todoId: string) => handlePastComplete(todoId, group.dateStr)"
            @edit="openEditModal"
          />
        </div>
      </div>

      <!-- 今日 + 未来待办 -->
      <div v-for="group in groupedTodos" :key="group.dateStr" class="u-mb-lg">
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
            {{ group.count }}
          </span>
        </div>

        <div
          v-if="!group.isFuture"
          class="todo-group rounded-2xl overflow-hidden"
          style="background: var(--item-bg); box-shadow: var(--card-shadow);"
        >
          <TodoItem
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            :show-recurrence="true"
            :show-date-label="false"
            :is-completed-archive="item.completed"
            :grouped="true"
            @complete="(todoId: string) => item.completed ? markTodoComplete(todoId) : handleComplete(todoId)"
            @edit="openEditModal"
          />
        </div>

        <div
          v-else
          class="todo-group rounded-2xl overflow-hidden"
          style="background: var(--item-bg); box-shadow: var(--card-shadow);"
        >
          <TodoItem
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            :show-recurrence="true"
            :show-date-label="false"
            :is-future="true"
            :grouped="true"
            @edit="openEditModal"
          />
        </div>
      </div>

      <div class="h-20"></div>
    </div>

    <Transition name="fab-fade">
      <button
        v-show="fabVisible"
        @click="openAddModal"
        class="fab-add"
      >
        <IconPlus :size="24" color="white" />
      </button>
    </Transition>

    <TodoModal
      :visible="showModal"
      :mode="modalMode"
      :initial-content="modalContent"
      :initial-repeat-count="modalRepeatCount"
      :initial-recurrence="modalRecurrence"
      :existing-names="existingNamesForModal"
      @confirm="handleModalConfirm"
      @cancel="showModal = false"
      @delete="handleModalDelete"
    />
  </div>
</template>

<style scoped>
.todo-group > :not(:last-child) {
  border-bottom: 1px solid var(--divider);
}

.fab-add {
  position: absolute;
  right: 20px;
  bottom: 20px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: var(--primary);
  box-shadow: 0 4px 16px -2px rgba(108, 99, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  z-index: 100;
  border: none;
  cursor: pointer;
}
.fab-add:active {
  transform: scale(0.92);
  box-shadow: 0 2px 8px -2px rgba(108, 99, 255, 0.5);
}

.fab-fade-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.fab-fade-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.fab-fade-enter-from {
  opacity: 0;
  transform: scale(0.6);
}
.fab-fade-leave-to {
  opacity: 0;
  transform: scale(0.6);
}

</style>

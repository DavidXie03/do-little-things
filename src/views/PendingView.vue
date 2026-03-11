<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import type { DailyTodoItem, RecurrenceType } from '../types'
import { RecurrenceType as RT } from '../types'
import { useStorage } from '../composables/useStorage'
import TodoItem from '../components/TodoItem.vue'
import TodoModal from '../components/TodoModal.vue'
import IconParty from '../components/icons/IconParty.vue'
import IconPlus from '../components/icons/IconPlus.vue'
import IconRefresh from '../components/icons/IconRefresh.vue'

const { t, locale } = useI18n()

const {
  ensureDailyTodos,
  dailyTodos,
  dailyProgress,
  markTodoComplete,
  removeTodoItem,
  customActions,
  addCustomAction,
  updateCustomAction,
  regenerateDailyTodos,
  futureTodos,
} = useStorage()

const todayItems = computed(() => dailyTodos.value?.items ?? [])

/** 按日期分组的全部待办（今天 + 未来） */
interface DateGroup {
  dateStr: string       // YYYY-MM-DD
  label: string         // 显示标签：今天、明天、3月15日周日
  count: number
  items: DailyTodoItem[]
  isFuture: boolean     // 是否未来日期（不可操作）
}

const groupedTodos = computed((): DateGroup[] => {
  const groups: Map<string, DateGroup> = new Map()

  // 1. 加入今天的所有待办（包括已完成的）
  const todayDateStr = dailyTodos.value?.date ?? getTodayStr()
  if (todayItems.value.length > 0) {
    groups.set(todayDateStr, {
      dateStr: todayDateStr,
      label: t('todos.today'),
      count: todayItems.value.length,
      items: [...todayItems.value],
      isFuture: false,
    })
  }

  // 2. 加入未来待办，按日期分组
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
      })
    }
  }

  // 3. 按日期排序
  return Array.from(groups.values()).sort((a, b) => a.dateStr.localeCompare(b.dateStr))
})

function getTodayStr(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const progressPercent = computed(() => {
  if (dailyProgress.value.total === 0) return 0
  return (dailyProgress.value.completed / dailyProgress.value.total) * 100
})

const circleRadius = 30
const circleCircumference = 2 * Math.PI * circleRadius
const circleDashOffset = computed(() => {
  return circleCircumference * (1 - progressPercent.value / 100)
})

const showModal = ref(false)
const modalMode = ref<'add' | 'edit'>('add')
const modalContent = ref('')
const modalRepeatCount = ref(1)
const modalRecurrence = ref<RecurrenceType>(RT.Daily)
const modalEditId = ref<string | null>(null)

function openAddModal() {
  modalMode.value = 'add'
  modalContent.value = ''
  modalRepeatCount.value = 1
  modalRecurrence.value = RT.Daily
  modalEditId.value = null
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
  showModal.value = true
}

function handleModalConfirm(content: string, repeatCount: number, recurrence: RecurrenceType) {
  if (modalMode.value === 'add') {
    addCustomAction(content, repeatCount, recurrence)
  } else if (modalEditId.value) {
    updateCustomAction(modalEditId.value, content, repeatCount, recurrence)
  }
  showModal.value = false
}

function formatDate(): string {
  const now = new Date()
  const months = t('date.months') as unknown as string[]
  const weekdays = t('date.weekdays') as unknown as string[]
  if (locale.value === 'zh') {
    return `${months[now.getMonth()]} ${now.getDate()}日 ${weekdays[now.getDay()]}`
  } else {
    return `${months[now.getMonth()]} ${now.getDate()}, ${weekdays[now.getDay()]}`
  }
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

  const weekdays = t('date.weekdays') as unknown as string[]
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

onMounted(() => {
  ensureDailyTodos()
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <header class="px-8 pb-4" style="padding-top: calc(var(--safe-area-top, 0px) + 24px);">
      <div class="flex items-center justify-between">
        <div>
          <h1
            class="text-2xl font-bold"
            style="color: var(--text-primary);"
          >
            {{ t('todos.title') }}
          </h1>
          <p class="text-xs mt-1" style="color: var(--text-muted);">
            {{ formatDate() }}
          </p>
        </div>
        <div class="relative flex items-center justify-center">
          <svg width="68" height="68" viewBox="0 0 68 68">
            <circle
              cx="34" cy="34" :r="circleRadius"
              fill="none"
              stroke="rgba(108, 99, 255, 0.1)"
              stroke-width="5"
            />
            <circle
              cx="34" cy="34" :r="circleRadius"
              fill="none"
              stroke="var(--primary)"
              stroke-width="5"
              stroke-linecap="round"
              :stroke-dasharray="circleCircumference"
              :stroke-dashoffset="circleDashOffset"
              transform="rotate(-90 34 34)"
              style="transition: stroke-dashoffset 0.5s ease;"
            />
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

    <div class="flex-1 overflow-y-auto pb-4 px-6" style="-webkit-overflow-scrolling: touch;">

      <!-- 无任务空状态 -->
      <div
        v-if="groupedTodos.length === 0"
        class="flex flex-col items-center justify-center py-12"
      >
        <IconParty :size="48" color="var(--text-muted)" />
        <p class="text-sm mt-3" style="color: var(--text-muted);">
          {{ t('todos.empty') }}
        </p>
      </div>

      <!-- 按日期分组显示 -->
      <div v-for="group in groupedTodos" :key="group.dateStr" class="mb-5">
        <!-- 分组标题 -->
        <div class="flex items-center gap-2 mb-3">
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

        <!-- 今天的待办：可操作 -->
        <template v-if="!group.isFuture">
          <TodoItem
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            :show-recurrence="true"
            :show-date-label="false"
            @complete="markTodoComplete"
            @delete="removeTodoItem"
            @edit="openEditModal"
          />
        </template>

        <!-- 未来的待办：只读预览 -->
        <template v-else>
          <TodoItem
            v-for="item in group.items"
            :key="item.id"
            :item="item"
            :show-recurrence="true"
            :show-date-label="false"
            :is-future="true"
            @edit="openEditModal"
          />
        </template>
      </div>

      <div class="my-4 border-t" style="border-color: rgba(0,0,0,0.05);"></div>

      <div class="flex gap-3 mb-6">
        <button
          @click="openAddModal"
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300 active:scale-[0.98]"
          style="background: var(--primary); color: white;"
        >
          <IconPlus :size="16" color="white" />
          {{ t('todos.addTodo') }}
        </button>
        <button
          @click="regenerateDailyTodos"
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300 active:scale-[0.98]"
          style="background: rgba(108,99,255,0.06); color: var(--primary); border: 1.5px solid rgba(108,99,255,0.12);"
        >
          <IconRefresh :size="16" color="var(--primary)" />
          {{ t('todos.regenerate') }}
        </button>
      </div>

      <div class="h-8"></div>
    </div>

    <TodoModal
      :visible="showModal"
      :mode="modalMode"
      :initial-content="modalContent"
      :initial-repeat-count="modalRepeatCount"
      :initial-recurrence="modalRecurrence"
      @confirm="handleModalConfirm"
      @cancel="showModal = false"
    />
  </div>
</template>

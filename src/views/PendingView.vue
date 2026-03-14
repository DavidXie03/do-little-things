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
const { isAnimating, dragOffset } = usePageSwipe()

const fabVisible = ref(true)
let fabTimer: ReturnType<typeof setTimeout> | null = null

watch([isAnimating, dragOffset], ([animating, offset]) => {
  if (animating || offset !== 0) {
    // 正在切换页面，立即隐藏
    if (fabTimer) { clearTimeout(fabTimer); fabTimer = null }
    fabVisible.value = false
  } else {
    // 页面稳定后，延迟一小段时间再显示（等过渡完成）
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
  removeTodoItem,
  customActions,
  addCustomAction,
  updateCustomAction,
  futureTodos,
} = useStorage()

function handleComplete(todoId: string) {
  const fullyDone = markTodoComplete(todoId)
  // 只在全部次数完成后才显示表扬 toast
  if (fullyDone) {
    const messages = tm('toast.completeMessages') as string[]
    const msg = messages[Math.floor(Math.random() * messages.length)]
    showToast(msg, 'success')
  }
}

const todayItems = computed(() => dailyTodos.value?.items ?? [])

/** 所有已有任务名的 Set（用于重名检查） */
const existingNames = computed((): Set<string> => {
  const names = new Set<string>()
  for (const ca of customActions.value) {
    names.add(ca.content)
  }
  return names
})

/** 编辑时排除当前编辑任务名的 Set */
const existingNamesForModal = computed((): Set<string> => {
  if (modalMode.value === 'edit' && modalContent.value) {
    const names = new Set(existingNames.value)
    names.delete(modalContent.value)
    return names
  }
  return existingNames.value
})

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

onMounted(() => {
  ensureDailyTodos()
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden relative" style="background-color: var(--bg-primary); transition: background-color 0.3s ease;">
    <header class="u-page-header">
      <h1
        class="text-2xl font-bold"
        style="color: var(--text-primary);"
      >
        {{ t('todos.title') }}
      </h1>
    </header>

    <div class="flex-1 overflow-y-auto pb-4 u-section-x" :class="{ 'flex flex-col': groupedTodos.length === 0 }" style="-webkit-overflow-scrolling: touch;">

      <!-- 无任务空状态 -->
      <div
        v-if="groupedTodos.length === 0"
        class="flex-1 flex flex-col items-center justify-center"
      >
        <ClipboardList :size="48" color="var(--text-muted)" :stroke-width="1.5" />
        <p class="text-sm mt-3" style="color: var(--text-muted);">
          {{ t('todos.empty') }}
        </p>
      </div>

      <!-- 按日期分组显示 -->
      <div v-for="group in groupedTodos" :key="group.dateStr" class="u-mb-lg">
        <!-- 分组标题 -->
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

        <!-- 今天的待办：可操作 -->
        <div
          v-if="!group.isFuture"
          class="todo-group rounded-2xl overflow-hidden"
          style="background: var(--item-bg); box-shadow: var(--card-shadow);"
        >
          <TodoItem
            v-for="(item, idx) in group.items"
            :key="item.id"
            :item="item"
            :show-recurrence="true"
            :show-date-label="false"
            :grouped="true"
            @complete="handleComplete"
            @edit="openEditModal"
          />
        </div>

        <!-- 未来的待办：只读预览 -->
        <div
          v-else
          class="todo-group rounded-2xl overflow-hidden"
          style="background: var(--item-bg); box-shadow: var(--card-shadow);"
        >
          <TodoItem
            v-for="(item, idx) in group.items"
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

      <!-- 底部留白，避免 FAB 遮挡内容 -->
      <div class="h-20"></div>
    </div>

    <!-- 右下角悬浮添加按钮 -->
    <transition name="fab-fade">
      <button
        v-show="fabVisible"
        @click="openAddModal"
        class="fab-add"
      >
        <IconPlus :size="24" color="white" />
      </button>
    </transition>

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
  transition: opacity 0.25s ease-out, transform 0.25s ease-out;
}
.fab-fade-leave-active {
  transition: opacity 0.15s ease-in, transform 0.15s ease-in;
}
.fab-fade-enter-from {
  opacity: 0;
  transform: scale(0.8);
}
.fab-fade-leave-to {
  opacity: 0;
  transform: scale(0.8);
}
</style>

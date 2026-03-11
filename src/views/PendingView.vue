<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { DailyTodoItem, RecurrenceType } from '../types'
import { RecurrenceType as RT, RecurrenceTypeLabel } from '../types'
import { useStorage } from '../composables/useStorage'
import TodoItem from '../components/TodoItem.vue'
import TodoModal from '../components/TodoModal.vue'
import IconParty from '../components/icons/IconParty.vue'
import IconPlus from '../components/icons/IconPlus.vue'
import IconRefresh from '../components/icons/IconRefresh.vue'

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
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${months[now.getMonth()]} ${now.getDate()}日 ${weekdays[now.getDay()]}`
}

function formatScheduledDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return '今天'
  if (diffDays === 1) return '明天'
  if (diffDays === 2) return '后天'

  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日 ${weekdays[date.getDay()]}`
}

function getRecurrenceLabel(recurrence?: RecurrenceType): string {
  if (!recurrence) return ''
  return RecurrenceTypeLabel[recurrence] || ''
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
            待办列表
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
      <!-- 今日待办 -->
      <template v-if="todayItems.length > 0">
        <div class="flex items-center gap-2 mb-3">
          <span class="text-xs font-semibold px-2 py-0.5 rounded-md" style="background: rgba(108,99,255,0.08); color: var(--primary);">今天</span>
        </div>
        <TodoItem
          v-for="item in todayItems"
          :key="item.id"
          :item="item"
          :show-recurrence="true"
          @complete="markTodoComplete"
          @delete="removeTodoItem"
          @edit="openEditModal"
        />
      </template>

      <div
        v-if="todayItems.length === 0"
        class="flex flex-col items-center justify-center py-12"
      >
        <IconParty :size="48" color="var(--text-muted)" />
        <p class="text-sm mt-3" style="color: var(--text-muted);">
          今天没有待办事项
        </p>
      </div>

      <!-- 未来待办预览 -->
      <template v-if="futureTodos.length > 0">
        <div class="flex items-center gap-2 mt-6 mb-3">
          <span class="text-xs font-semibold px-2 py-0.5 rounded-md" style="background: rgba(0,184,148,0.08); color: #00B894;">即将到来</span>
        </div>
        <div
          v-for="item in futureTodos"
          :key="item.id"
          class="relative rounded-2xl p-4 mb-3 overflow-hidden"
          style="background: #FFFFFF; box-shadow: 0 2px 12px -4px rgba(0, 0, 0, 0.06); opacity: 0.7;"
          @click="openEditModal(item)"
        >
          <div class="flex items-center gap-3">
            <div
              class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style="border: 2px dashed var(--text-muted); opacity: 0.4;"
            ></div>
            <div class="flex-1 min-w-0">
              <p class="text-sm leading-relaxed" style="color: var(--text-primary);">
                {{ item.task.content }}
              </p>
              <div class="flex items-center gap-2 mt-1">
                <span class="text-[10px]" style="color: var(--text-muted);">
                  {{ formatScheduledDate(item.scheduledDate) }}
                </span>
                <span
                  v-if="item.task.recurrence"
                  class="text-[10px] px-1.5 py-0.5 rounded"
                  style="background: rgba(108,99,255,0.06); color: var(--primary);"
                >
                  {{ getRecurrenceLabel(item.task.recurrence) }}
                </span>
              </div>
            </div>
            <span
              v-if="item.totalCount > 1"
              class="flex-shrink-0 text-xs px-2 py-0.5 rounded-full"
              style="background: rgba(108,99,255,0.08); color: var(--primary);"
            >
              ×{{ item.totalCount }}
            </span>
          </div>
        </div>
      </template>

      <div class="my-6 border-t" style="border-color: rgba(0,0,0,0.05);"></div>

      <div class="flex gap-3 mb-6">
        <button
          @click="openAddModal"
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300 active:scale-[0.98]"
          style="background: var(--primary); color: white;"
        >
          <IconPlus :size="16" color="white" />
          添加待办
        </button>
        <button
          @click="regenerateDailyTodos"
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300 active:scale-[0.98]"
          style="background: rgba(108,99,255,0.06); color: var(--primary); border: 1.5px solid rgba(108,99,255,0.12);"
        >
          <IconRefresh :size="16" color="var(--primary)" />
          重新生成
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

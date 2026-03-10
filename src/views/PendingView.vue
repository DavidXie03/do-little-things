<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import type { DailyTodoItem } from '../types'
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
const modalEditId = ref<string | null>(null)

function openAddModal() {
  modalMode.value = 'add'
  modalContent.value = ''
  modalRepeatCount.value = 1
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
  modalEditId.value = caId
  showModal.value = true
}

function handleModalConfirm(content: string, repeatCount: number) {
  if (modalMode.value === 'add') {
    addCustomAction(content, repeatCount)
  } else if (modalEditId.value) {
    updateCustomAction(modalEditId.value, content, repeatCount)
  }
  showModal.value = false
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
    <header class="px-8 pb-4" style="padding-top: calc(var(--safe-area-top, 0px) + 24px);">
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
      <template v-if="todayItems.length > 0">
        <TodoItem
          v-for="item in todayItems"
          :key="item.id"
          :item="item"
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
          还没有生成今日待办
        </p>
      </div>

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
      @confirm="handleModalConfirm"
      @cancel="showModal = false"
    />
  </div>
</template>

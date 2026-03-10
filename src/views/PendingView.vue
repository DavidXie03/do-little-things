<script setup lang="ts">
import { ref, onMounted, computed, nextTick } from 'vue'
import { useStorage } from '../composables/useStorage'
import IconParty from '../components/icons/IconParty.vue'
import IconCheck from '../components/icons/IconCheck.vue'
import IconPlus from '../components/icons/IconPlus.vue'
import IconMinus from '../components/icons/IconMinus.vue'
import IconRefresh from '../components/icons/IconRefresh.vue'
import IconTrash from '../components/icons/IconTrash.vue'

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

// ========== 删除二次确认 ==========
const confirmingDeleteId = ref<string | null>(null)
let confirmDeleteTimer: ReturnType<typeof setTimeout> | null = null

function handleDelete(todoId: string) {
  if (confirmingDeleteId.value === todoId) {
    // 二次点击 → 确认删除
    removeTodoItem(todoId)
    confirmingDeleteId.value = null
    if (confirmDeleteTimer) {
      clearTimeout(confirmDeleteTimer)
      confirmDeleteTimer = null
    }
  } else {
    // 第一次点击 → 进入确认状态
    confirmingDeleteId.value = todoId
    // 3秒后自动取消确认状态
    if (confirmDeleteTimer) clearTimeout(confirmDeleteTimer)
    confirmDeleteTimer = setTimeout(() => {
      confirmingDeleteId.value = null
    }, 3000)
  }
}

function formatDate(): string {
  const now = new Date()
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${months[now.getMonth()]} ${now.getDate()}日 ${weekdays[now.getDay()]}`
}

// ========== 统一弹窗 ==========
const showModal = ref(false)
const modalMode = ref<'add' | 'edit'>('add')
const modalContent = ref('')
const modalRepeatCount = ref(1)
const modalEditId = ref<string | null>(null) // 编辑时对应的 customAction id
const modalInputRef = ref<HTMLInputElement | null>(null)

function openAddModal() {
  modalMode.value = 'add'
  modalContent.value = ''
  modalRepeatCount.value = 1
  modalEditId.value = null
  showModal.value = true
  nextTick(() => modalInputRef.value?.focus())
}

function openEditModal(item: any) {
  const taskId = item.task.id as string
  const caId = taskId.startsWith('custom_') ? taskId.slice(7) : null
  if (!caId) return

  const ca = customActions.value.find(c => c.id === caId)
  if (!ca) return

  modalMode.value = 'edit'
  modalContent.value = ca.content
  modalRepeatCount.value = ca.repeatCount
  modalEditId.value = caId
  showModal.value = true
  nextTick(() => modalInputRef.value?.focus())
}

function handleModalConfirm() {
  const content = modalContent.value.trim()
  if (!content) return

  if (modalMode.value === 'add') {
    addCustomAction(content, modalRepeatCount.value)
  } else if (modalMode.value === 'edit' && modalEditId.value) {
    updateCustomAction(modalEditId.value, content, modalRepeatCount.value)
  }
  showModal.value = false
}

function handleModalCancel() {
  showModal.value = false
}

function handleRegenerate() {
  regenerateDailyTodos()
}

onMounted(() => {
  ensureDailyTodos()
})
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden">
    <!-- 顶部 -->
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
        <!-- 圆环进度 -->
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

    <!-- 列表区域 -->
    <div class="flex-1 overflow-y-auto pb-4 px-6" style="-webkit-overflow-scrolling: touch;">
      <!-- 今日待办列表 -->
      <template v-if="todayItems.length > 0">
        <div
          v-for="item in todayItems"
          :key="item.id"
          class="relative rounded-2xl p-4 mb-3 overflow-hidden transition-all duration-300"
          :class="item.completed ? 'opacity-60' : ''"
          style="
            background: #FFFFFF;
            box-shadow: 0 2px 12px -4px rgba(0, 0, 0, 0.06);
          "
        >
          <div class="flex items-center gap-3" @click="!item.completed && openEditModal(item)">
            <!-- 勾选框 -->
            <button
              @click.stop="!item.completed && handleComplete(item.id)"
              class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
              :class="item.completed ? '' : 'active:scale-90'"
              :style="{
                background: item.completed ? '#00B894' : 'transparent',
                border: item.completed ? 'none' : '2px solid var(--text-muted)',
              }"
            >
              <IconCheck v-if="item.completed" :size="16" color="white" />
            </button>

            <!-- 内容 -->
            <div class="flex-1 min-w-0">
              <p
                class="text-sm leading-relaxed transition-all duration-300"
                :class="item.completed ? 'line-through' : ''"
                style="color: var(--text-primary);"
              >
                {{ item.task.content }}
              </p>
            </div>

            <!-- 次数进度 -->
            <span
              v-if="item.totalCount > 1"
              class="flex-shrink-0 text-xs px-2 py-0.5 rounded-full"
              :style="{
                background: item.completed ? 'rgba(0,184,148,0.1)' : 'rgba(108,99,255,0.08)',
                color: item.completed ? '#00B894' : 'var(--primary)',
              }"
            >
              {{ item.completedCount }}/{{ item.totalCount }}
            </span>

            <!-- 删除按钮（二次确认） -->
            <button
              @click.stop="handleDelete(item.id)"
              class="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-90"
              :style="{
                background: confirmingDeleteId === item.id ? '#E17055' : 'rgba(225,112,85,0.08)',
                opacity: confirmingDeleteId === item.id ? 1 : 0.4,
              }"
              :title="confirmingDeleteId === item.id ? '再次点击确认删除' : '删除'"
            >
              <IconTrash :size="14" :color="confirmingDeleteId === item.id ? 'white' : '#E17055'" />
            </button>
          </div>
        </div>
      </template>

      <!-- 空状态 -->
      <div
        v-if="todayItems.length === 0"
        class="flex flex-col items-center justify-center py-12"
      >
        <IconParty :size="48" color="var(--text-muted)" />
        <p class="text-sm mt-3" style="color: var(--text-muted);">
          还没有生成今日待办
        </p>
      </div>

      <!-- 分割线 -->
      <div class="my-6 border-t" style="border-color: rgba(0,0,0,0.05);"></div>

      <!-- 操作按钮区域 -->
      <div class="flex gap-3 mb-6">
        <!-- 添加待办按钮 -->
        <button
          @click="openAddModal"
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300 active:scale-[0.98]"
          style="
            background: var(--primary);
            color: white;
          "
        >
          <IconPlus :size="16" color="white" />
          添加待办
        </button>
        <!-- 重新生成按钮 -->
        <button
          @click="handleRegenerate"
          class="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-all duration-300 active:scale-[0.98]"
          style="
            background: rgba(108,99,255,0.06);
            color: var(--primary);
            border: 1.5px solid rgba(108,99,255,0.12);
          "
        >
          <IconRefresh :size="16" color="var(--primary)" />
          重新生成
        </button>
      </div>

      <!-- 底部留白 -->
      <div class="h-8"></div>
    </div>

    <!-- 统一弹窗 (添加/编辑) -->
    <Teleport to="body">
      <transition name="modal-fade">
        <div
          v-if="showModal"
          class="fixed inset-0 z-[10000] flex items-center justify-center"
          @click.self="handleModalCancel"
        >
          <!-- 遮罩 -->
          <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
          <!-- 弹窗内容 -->
          <div
            class="relative w-[85%] max-w-sm rounded-2xl px-7 py-6 space-y-5"
            style="background: #FFFFFF; box-shadow: 0 20px 60px -12px rgba(0, 0, 0, 0.25); margin: 0 24px;"
          >
            <h3 class="text-lg font-bold pb-1" style="color: var(--text-primary);">
              {{ modalMode === 'add' ? '添加待办' : '编辑待办' }}
            </h3>

            <input
              ref="modalInputRef"
              v-model="modalContent"
              type="text"
              placeholder="输入待办事项内容..."
              class="w-full text-sm px-4 py-3 rounded-lg border-none outline-none"
              style="background: rgba(108,99,255,0.04); color: var(--text-primary);"
              @keyup.enter="handleModalConfirm"
            />

            <div class="flex items-center justify-between py-1">
              <span class="text-sm" style="color: var(--text-secondary);">每日执行次数</span>
              <div class="flex items-center gap-3">
                <button
                  @click="modalRepeatCount = Math.max(1, modalRepeatCount - 1)"
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                  style="background: rgba(108,99,255,0.08);"
                >
                  <IconMinus :size="12" color="var(--primary)" />
                </button>
                <span class="text-lg font-bold w-6 text-center" style="color: var(--primary);">{{ modalRepeatCount }}</span>
                <button
                  @click="modalRepeatCount = Math.min(20, modalRepeatCount + 1)"
                  class="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                  style="background: rgba(108,99,255,0.08);"
                >
                  <IconPlus :size="12" color="var(--primary)" />
                </button>
              </div>
            </div>

            <div class="flex gap-3 pt-2">
              <button
                @click="handleModalCancel"
                class="flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
                style="background: rgba(0,0,0,0.04); color: var(--text-secondary);"
              >
                取消
              </button>
              <button
                @click="handleModalConfirm"
                class="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
                style="background: var(--primary);"
              >
                {{ modalMode === 'add' ? '添加' : '保存' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-active .relative,
.modal-fade-leave-active .relative {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .relative {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}
.modal-fade-leave-to .relative {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}
</style>

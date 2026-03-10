<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useStorage } from '../composables/useStorage'
import IconParty from '../components/icons/IconParty.vue'
import IconAction from '../components/icons/IconAction.vue'
import IconCheck from '../components/icons/IconCheck.vue'
import IconPlus from '../components/icons/IconPlus.vue'
import IconMinus from '../components/icons/IconMinus.vue'
import IconTrash from '../components/icons/IconTrash.vue'
import IconRefresh from '../components/icons/IconRefresh.vue'

const {
  ensureDailyTodos,
  dailyTodos,
  dailyProgress,
  markTodoComplete,
  customActions,
  addCustomAction,
  removeCustomAction,
  updateCustomActionRepeatCount,
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

function formatDate(): string {
  const now = new Date()
  const months = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return `${months[now.getMonth()]} ${now.getDate()}日 ${weekdays[now.getDay()]}`
}

// 添加自定义待办
const showAddInput = ref(false)
const newActionContent = ref('')
const newActionRepeat = ref(1)

function handleAddAction() {
  const content = newActionContent.value.trim()
  if (content) {
    addCustomAction(content, newActionRepeat.value)
    newActionContent.value = ''
    newActionRepeat.value = 1
    showAddInput.value = false
  }
}

function handleRemoveAction(id: string) {
  removeCustomAction(id)
}

function adjustRepeatCount(id: string, delta: number) {
  const ca = customActions.value.find(c => c.id === id)
  if (ca) {
    updateCustomActionRepeatCount(id, ca.repeatCount + delta)
  }
}

// 编辑今日待办
const editingTodoId = ref<string | null>(null)
const editContent = ref('')
const editRepeatCount = ref(1)

function startEditTodo(item: any) {
  // 从task id中提取customAction id
  const taskId = item.task.id as string
  const caId = taskId.startsWith('custom_') ? taskId.slice(7) : null
  if (!caId) return // 只能编辑自定义待办

  const ca = customActions.value.find(c => c.id === caId)
  if (!ca) return

  editingTodoId.value = caId
  editContent.value = ca.content
  editRepeatCount.value = ca.repeatCount
}

function saveEditTodo() {
  if (!editingTodoId.value) return
  const content = editContent.value.trim()
  if (!content) return

  updateCustomAction(editingTodoId.value, content, editRepeatCount.value)
  editingTodoId.value = null
  editContent.value = ''
  editRepeatCount.value = 1
}

function cancelEditTodo() {
  editingTodoId.value = null
  editContent.value = ''
  editRepeatCount.value = 1
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
          <!-- 编辑模式 -->
          <div v-if="editingTodoId && item.task.id === `custom_${editingTodoId}`" class="space-y-3">
            <input
              v-model="editContent"
              type="text"
              placeholder="待办事项内容..."
              class="w-full text-sm px-3 py-2.5 rounded-xl border-none outline-none"
              style="background: rgba(108,99,255,0.04); color: var(--text-primary);"
              autofocus
            />
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-xs" style="color: var(--text-secondary);">执行次数</span>
                <button
                  @click="editRepeatCount = Math.max(1, editRepeatCount - 1)"
                  class="w-6 h-6 rounded-full flex items-center justify-center"
                  style="background: rgba(108,99,255,0.08);"
                >
                  <IconMinus :size="10" color="var(--primary)" />
                </button>
                <span class="text-sm font-bold w-4 text-center" style="color: var(--primary);">{{ editRepeatCount }}</span>
                <button
                  @click="editRepeatCount = Math.min(20, editRepeatCount + 1)"
                  class="w-6 h-6 rounded-full flex items-center justify-center"
                  style="background: rgba(108,99,255,0.08);"
                >
                  <IconPlus :size="10" color="var(--primary)" />
                </button>
              </div>
            </div>
            <div class="flex gap-2">
              <button
                @click="cancelEditTodo"
                class="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
                style="background: rgba(0,0,0,0.04); color: var(--text-secondary);"
              >
                取消
              </button>
              <button
                @click="saveEditTodo"
                class="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
                style="background: var(--primary);"
              >
                保存
              </button>
            </div>
          </div>

          <!-- 普通显示模式 -->
          <div v-else class="flex items-center gap-3" @click="!item.completed && startEditTodo(item)">
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

      <!-- 重新生成按钮 -->
      <button
        @click="handleRegenerate"
        class="w-full flex items-center justify-center gap-2 py-3 mb-6 rounded-2xl text-sm font-semibold transition-all duration-300 active:scale-[0.98]"
        style="
          background: rgba(108,99,255,0.06);
          color: var(--primary);
          border: 1.5px solid rgba(108,99,255,0.12);
        "
      >
        <IconRefresh :size="16" color="var(--primary)" />
        重新生成今日待办
      </button>

      <!-- 自定义待办管理 -->
      <div class="flex items-center justify-between mb-3">
        <h2 class="text-sm font-bold" style="color: var(--text-secondary);">我的待办</h2>
        <button
          @click="showAddInput = true"
          class="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all duration-200 active:scale-95"
          style="background: rgba(108,99,255,0.08); color: var(--primary);"
        >
          <IconPlus :size="12" color="var(--primary)" />
          添加
        </button>
      </div>

      <!-- 添加输入框 -->
      <div
        v-if="showAddInput"
        class="rounded-2xl p-4 mb-3"
        style="background: #FFFFFF; box-shadow: 0 2px 12px -4px rgba(0, 0, 0, 0.06);"
      >
        <input
          v-model="newActionContent"
          type="text"
          placeholder="输入待办事项内容..."
          class="w-full text-sm px-3 py-2.5 rounded-xl border-none outline-none"
          style="background: rgba(108,99,255,0.04); color: var(--text-primary);"
          @keyup.enter="handleAddAction"
          autofocus
        />
        <div class="flex items-center justify-between mt-3">
          <div class="flex items-center gap-2">
            <span class="text-xs" style="color: var(--text-secondary);">重复次数</span>
            <button
              @click="newActionRepeat = Math.max(1, newActionRepeat - 1)"
              class="w-6 h-6 rounded-full flex items-center justify-center"
              style="background: rgba(108,99,255,0.08);"
            >
              <IconMinus :size="10" color="var(--primary)" />
            </button>
            <span class="text-sm font-bold w-4 text-center" style="color: var(--primary);">{{ newActionRepeat }}</span>
            <button
              @click="newActionRepeat = Math.min(20, newActionRepeat + 1)"
              class="w-6 h-6 rounded-full flex items-center justify-center"
              style="background: rgba(108,99,255,0.08);"
            >
              <IconPlus :size="10" color="var(--primary)" />
            </button>
          </div>
        </div>
        <div class="flex gap-2 mt-3">
          <button
            @click="showAddInput = false; newActionContent = ''"
            class="flex-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
            style="background: rgba(0,0,0,0.04); color: var(--text-secondary);"
          >
            取消
          </button>
          <button
            @click="handleAddAction"
            class="flex-1 py-2 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
            style="background: var(--primary);"
          >
            添加
          </button>
        </div>
      </div>

      <!-- 自定义待办列表 -->
      <div
        class="rounded-2xl overflow-hidden"
        style="background: #FFFFFF; box-shadow: 0 2px 12px -4px rgba(0, 0, 0, 0.06);"
      >
        <template v-if="customActions.length > 0">
          <div
            v-for="(ca, index) in customActions"
            :key="ca.id"
            class="flex items-center justify-between px-4 py-3"
            :class="index < customActions.length - 1 ? 'border-b border-gray-50' : ''"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: rgba(108, 99, 255, 0.08);">
                <IconAction :size="14" color="#6C63FF" />
              </div>
              <span class="text-sm truncate" style="color: var(--text-primary);">{{ ca.content }}</span>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <!-- 重复次数调整 -->
              <button
                @click="adjustRepeatCount(ca.id, -1)"
                class="w-6 h-6 rounded-full flex items-center justify-center"
                style="background: rgba(108,99,255,0.06);"
              >
                <IconMinus :size="10" color="var(--primary)" />
              </button>
              <span class="text-xs font-bold w-4 text-center" style="color: var(--primary);">{{ ca.repeatCount }}</span>
              <button
                @click="adjustRepeatCount(ca.id, 1)"
                class="w-6 h-6 rounded-full flex items-center justify-center"
                style="background: rgba(108,99,255,0.06);"
              >
                <IconPlus :size="10" color="var(--primary)" />
              </button>
              <button
                @click="handleRemoveAction(ca.id)"
                class="w-7 h-7 rounded-lg flex items-center justify-center ml-1 transition-all duration-200 active:scale-90"
                style="background: rgba(225, 112, 85, 0.06);"
              >
                <IconTrash :size="14" color="#E17055" />
              </button>
            </div>
          </div>
        </template>
        <div v-else class="flex flex-col items-center justify-center py-8">
          <IconAction :size="32" color="var(--text-muted)" />
          <p class="text-xs mt-2" style="color: var(--text-muted);">
            还没有待办事项
          </p>
          <p class="text-[10px] mt-1" style="color: var(--text-muted);">
            添加属于你的专属待办事项吧
          </p>
        </div>
      </div>

      <!-- 底部留白 -->
      <div class="h-8"></div>
    </div>
  </div>
</template>

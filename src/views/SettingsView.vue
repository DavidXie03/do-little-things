<script setup lang="ts">
import { ref, computed } from 'vue'
import { useStorage } from '../composables/useStorage'
import { TaskType, TaskTypeLabel, TaskTypeColor } from '../types'
import type { DailyConfig } from '../types'
import IconKnowledge from '../components/icons/IconKnowledge.vue'
import IconAction from '../components/icons/IconAction.vue'
import IconExplore from '../components/icons/IconExplore.vue'
import IconNews from '../components/icons/IconNews.vue'
import IconPlus from '../components/icons/IconPlus.vue'
import IconMinus from '../components/icons/IconMinus.vue'
import IconTrash from '../components/icons/IconTrash.vue'
import IconRefresh from '../components/icons/IconRefresh.vue'

const {
  dailyConfig,
  updateDailyConfig,
  customActions,
  addCustomAction,
  removeCustomAction,
  regenerateDailyTodos,
} = useStorage()

const typeIconMap: Record<string, any> = {
  knowledge: IconKnowledge,
  action: IconAction,
  explore: IconExplore,
  news: IconNews,
}

const configTypes = [
  { key: 'knowledge' as keyof DailyConfig, type: TaskType.Knowledge },
  { key: 'action' as keyof DailyConfig, type: TaskType.Action },
  { key: 'explore' as keyof DailyConfig, type: TaskType.Explore },
  { key: 'news' as keyof DailyConfig, type: TaskType.News },
]

// 新增微行动输入
const showAddInput = ref(false)
const newActionContent = ref('')

function adjustCount(key: keyof DailyConfig, delta: number) {
  const newConfig = { ...dailyConfig.value }
  newConfig[key] = Math.max(0, Math.min(10, newConfig[key] + delta))
  updateDailyConfig(newConfig)
}

function handleAddAction() {
  const content = newActionContent.value.trim()
  if (content) {
    addCustomAction(content)
    newActionContent.value = ''
    showAddInput.value = false
  }
}

function handleRemoveAction(id: string) {
  removeCustomAction(id)
}

function handleRegenerate() {
  regenerateDailyTodos()
}

const totalDaily = computed(() => {
  const c = dailyConfig.value
  return c.knowledge + c.action + c.explore + c.news
})
</script>

<template>
  <div class="h-full flex flex-col overflow-y-auto" style="-webkit-overflow-scrolling: touch;">
    <!-- 顶部 -->
    <header class="px-6 pb-4" style="padding-top: calc(var(--safe-area-top, 0px) + 24px);">
      <h1
        class="text-2xl font-bold"
        style="color: var(--text-primary);"
      >
        我的设置
      </h1>
      <p class="text-xs mt-1" style="color: var(--text-muted);">
        自定义你的每日小事
      </p>
    </header>

    <!-- 每日数量配置 -->
    <section class="px-4 mb-6">
      <div class="flex items-center justify-between px-2 mb-3">
        <h2 class="text-sm font-bold" style="color: var(--text-secondary);">每日数量</h2>
        <span class="text-xs px-2 py-0.5 rounded-full" style="background: rgba(108,99,255,0.1); color: var(--primary);">
          共 {{ totalDaily }} 件
        </span>
      </div>
      <div
        class="rounded-2xl overflow-hidden"
        style="
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
          box-shadow: 0 4px 20px -4px rgba(108, 99, 255, 0.08);
        "
      >
        <div
          v-for="(item, index) in configTypes"
          :key="item.key"
          class="flex items-center justify-between px-4 py-3.5"
          :class="index < configTypes.length - 1 ? 'border-b border-gray-50' : ''"
        >
          <div class="flex items-center gap-3">
            <div
              class="w-9 h-9 rounded-xl flex items-center justify-center"
              :style="{ background: `${TaskTypeColor[item.type]}15` }"
            >
              <component :is="typeIconMap[item.key]" :size="20" :color="TaskTypeColor[item.type]" />
            </div>
            <span class="text-sm font-medium" style="color: var(--text-primary);">
              {{ TaskTypeLabel[item.type] }}
            </span>
          </div>
          <!-- 步进器 -->
          <div class="flex items-center gap-3">
            <button
              @click="adjustCount(item.key, -1)"
              class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
              :style="{
                background: dailyConfig[item.key] > 0
                  ? 'linear-gradient(135deg, rgba(108,99,255,0.1), rgba(78,205,196,0.1))'
                  : 'rgba(0,0,0,0.03)',
                opacity: dailyConfig[item.key] > 0 ? 1 : 0.4,
              }"
            >
              <IconMinus :size="14" :color="dailyConfig[item.key] > 0 ? 'var(--primary)' : 'var(--text-muted)'" />
            </button>
            <span class="text-base font-bold w-6 text-center" style="color: var(--primary);">
              {{ dailyConfig[item.key] }}
            </span>
            <button
              @click="adjustCount(item.key, 1)"
              class="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
              :style="{
                background: dailyConfig[item.key] < 10
                  ? 'linear-gradient(135deg, rgba(108,99,255,0.15), rgba(78,205,196,0.15))'
                  : 'rgba(0,0,0,0.03)',
                opacity: dailyConfig[item.key] < 10 ? 1 : 0.4,
              }"
            >
              <IconPlus :size="14" :color="dailyConfig[item.key] < 10 ? 'var(--primary)' : 'var(--text-muted)'" />
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 重新生成今日待办 -->
    <section class="px-4 mb-6">
      <button
        @click="handleRegenerate"
        class="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 active:scale-[0.98]"
        style="
          background: linear-gradient(135deg, rgba(108,99,255,0.08), rgba(78,205,196,0.08));
          color: var(--primary);
          border: 1.5px solid rgba(108,99,255,0.15);
        "
      >
        <IconRefresh :size="16" color="var(--primary)" />
        重新生成今日待办
      </button>
    </section>

    <!-- 自定义微行动 -->
    <section class="px-4 pb-8">
      <div class="flex items-center justify-between px-2 mb-3">
        <h2 class="text-sm font-bold" style="color: var(--text-secondary);">我的微行动</h2>
        <button
          @click="showAddInput = true"
          class="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full transition-all duration-200 active:scale-95"
          style="background: linear-gradient(135deg, rgba(108,99,255,0.1), rgba(78,205,196,0.1)); color: var(--primary);"
        >
          <IconPlus :size="12" color="var(--primary)" />
          添加
        </button>
      </div>

      <!-- 添加输入框 -->
      <div
        v-if="showAddInput"
        class="rounded-2xl p-4 mb-3"
        style="
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
          box-shadow: 0 4px 20px -4px rgba(108, 99, 255, 0.08);
        "
      >
        <input
          v-model="newActionContent"
          type="text"
          placeholder="输入微行动内容..."
          class="w-full text-sm px-3 py-2.5 rounded-xl border-none outline-none"
          style="background: rgba(108,99,255,0.04); color: var(--text-primary);"
          @keyup.enter="handleAddAction"
          autofocus
        />
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
            style="background: linear-gradient(135deg, #6C63FF, #4ECDC4);"
          >
            添加
          </button>
        </div>
      </div>

      <!-- 列表 -->
      <div
        class="rounded-2xl overflow-hidden"
        style="
          background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
          box-shadow: 0 4px 20px -4px rgba(108, 99, 255, 0.08);
        "
      >
        <template v-if="customActions.length > 0">
          <div
            v-for="(ca, index) in customActions"
            :key="ca.id"
            class="flex items-center justify-between px-4 py-3"
            :class="index < customActions.length - 1 ? 'border-b border-gray-50' : ''"
          >
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="w-7 h-7 rounded-lg flex items-center justify-center" style="background: rgba(255, 107, 107, 0.1);">
                <IconAction :size="14" color="#FF6B6B" />
              </div>
              <span class="text-sm truncate" style="color: var(--text-primary);">{{ ca.content }}</span>
            </div>
            <button
              @click="handleRemoveAction(ca.id)"
              class="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-90"
              style="background: rgba(225, 112, 85, 0.08);"
            >
              <IconTrash :size="14" color="#E17055" />
            </button>
          </div>
        </template>
        <div v-else class="flex flex-col items-center justify-center py-8">
          <IconAction :size="32" color="var(--text-muted)" />
          <p class="text-xs mt-2" style="color: var(--text-muted);">
            还没有自定义微行动
          </p>
          <p class="text-[10px] mt-1" style="color: var(--text-muted);">
            添加属于你的专属小事吧
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

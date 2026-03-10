<script setup lang="ts">
import type { PendingTask } from '../types'
import { TaskTypeLabel, TaskTypeColor } from '../types'
import IconKnowledge from './icons/IconKnowledge.vue'
import IconAction from './icons/IconAction.vue'
import IconExplore from './icons/IconExplore.vue'
import IconNews from './icons/IconNews.vue'
import IconCheck from './icons/IconCheck.vue'
import IconDismiss from './icons/IconDismiss.vue'

const props = defineProps<{
  item: PendingTask
}>()

const emit = defineEmits<{
  (e: 'complete', taskId: string): void
  (e: 'remove', taskId: string): void
}>()

const typeIconMap: Record<string, any> = {
  knowledge: IconKnowledge,
  action: IconAction,
  explore: IconExplore,
  news: IconNews,
}

function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}
</script>

<template>
  <div
    class="relative rounded-2xl p-4 mx-4 mb-3 overflow-hidden animate-fade-in-up"
    style="
      background: linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85));
      box-shadow: 0 4px 20px -4px rgba(108, 99, 255, 0.08),
                  0 2px 8px -2px rgba(0, 0, 0, 0.04);
    "
  >
    <div class="flex items-start gap-3">
      <!-- 图标 -->
      <div
        class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        :style="{ background: `${TaskTypeColor[item.task.type]}15` }"
      >
        <component :is="typeIconMap[item.task.type]" :size="20" :color="TaskTypeColor[item.task.type]" />
      </div>

      <!-- 内容 -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span
            class="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
            :style="{ background: TaskTypeColor[item.task.type] }"
          >
            {{ TaskTypeLabel[item.task.type] }}
          </span>
          <span class="text-[10px]" style="color: var(--text-muted);">
            {{ formatTime(item.addedAt) }}
          </span>
        </div>
        <p class="text-sm leading-relaxed" style="color: var(--text-primary);">
          {{ item.task.content }}
        </p>
      </div>

      <!-- 操作按钮 -->
      <div class="flex-shrink-0 flex flex-col gap-2">
        <button
          @click="emit('complete', item.task.id)"
          class="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90"
          style="background: linear-gradient(135deg, #00B894, #4ECDC4);"
          title="完成"
        >
          <IconCheck :size="16" color="white" />
        </button>
        <button
          @click="emit('remove', item.task.id)"
          class="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90"
          style="background: linear-gradient(135deg, #E17055, #FF6B6B);"
          title="删除"
        >
          <IconDismiss :size="16" color="white" />
        </button>
      </div>
    </div>
  </div>
</template>

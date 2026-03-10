<script setup lang="ts">
import type { PendingTask } from '../types'
import IconAction from './icons/IconAction.vue'
import IconCheck from './icons/IconCheck.vue'
import IconDismiss from './icons/IconDismiss.vue'

const props = defineProps<{
  item: PendingTask
}>()

const emit = defineEmits<{
  (e: 'complete', taskId: string): void
  (e: 'remove', taskId: string): void
}>()

function formatTime(ts: number): string {
  const d = new Date(ts)
  const h = d.getHours().toString().padStart(2, '0')
  const m = d.getMinutes().toString().padStart(2, '0')
  return `${h}:${m}`
}
</script>

<template>
  <div
    class="relative rounded-2xl p-4 mx-6 mb-3 overflow-hidden animate-fade-in-up"
    style="
      background: #FFFFFF;
      box-shadow: 0 2px 12px -4px rgba(0, 0, 0, 0.06);
    "
  >
    <div class="flex items-start gap-3">
      <!-- 图标 -->
      <div
        class="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
        style="background: rgba(108, 99, 255, 0.08);"
      >
        <IconAction :size="20" color="#6C63FF" />
      </div>

      <!-- 内容 -->
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-2 mb-1">
          <span
            class="px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
            style="background: #6C63FF;"
          >
            待办
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
          style="background: #00B894;"
          title="完成"
        >
          <IconCheck :size="16" color="white" />
        </button>
        <button
          @click="emit('remove', item.task.id)"
          class="w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 active:scale-90"
          style="background: #E17055;"
          title="删除"
        >
          <IconDismiss :size="16" color="white" />
        </button>
      </div>
    </div>
  </div>
</template>

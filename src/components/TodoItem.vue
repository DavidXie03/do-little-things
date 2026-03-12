<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DailyTodoItem } from '../types'
import IconCheck from './icons/IconCheck.vue'

const { t } = useI18n()

const props = defineProps<{
  item: DailyTodoItem
  showRecurrence?: boolean
  showDateLabel?: boolean
  isFuture?: boolean
}>()

const emit = defineEmits<{
  (e: 'complete', todoId: string): void
  (e: 'edit', item: DailyTodoItem): void
}>()

/** 构建副信息文本：仅显示循环类型 */
function getSubInfo(): string {
  if (props.showRecurrence && props.item.task.recurrence) {
    return t(`recurrence.${props.item.task.recurrence}`)
  }
  return ''
}
</script>

<template>
  <div
    class="relative rounded-2xl u-item u-mb-md overflow-hidden transition-all duration-300"
    :class="[
      item.completed ? 'opacity-60' : '',
      isFuture ? 'opacity-70' : '',
    ]"
    style="background: var(--item-bg); box-shadow: var(--card-shadow);"
  >
    <div class="flex items-center gap-3" @click="emit('edit', item)">
      <!-- 复选圆圈 -->
      <button
        v-if="!isFuture"
        @click.stop="emit('complete', item.id)"
        class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
        :style="{
          background: item.completed ? '#00B894' : 'transparent',
          border: item.completed ? 'none' : '2px solid var(--text-muted)',
        }"
      >
        <IconCheck v-if="item.completed" :size="16" color="white" />
      </button>
      <!-- 未来任务用虚线圈 -->
      <div
        v-else
        class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style="border: 2px dashed var(--text-muted); opacity: 0.4;"
      ></div>

      <!-- 内容区 -->
      <div class="flex-1 min-w-0">
        <p
          class="text-sm leading-relaxed transition-all duration-300"
          :class="item.completed ? 'line-through' : ''"
          style="color: var(--text-primary);"
        >
          {{ item.task.content }}
        </p>
        <!-- 副信息行：循环类型 -->
        <p v-if="getSubInfo()" class="text-[11px] mt-0.5" style="color: var(--text-muted);">
          {{ getSubInfo() }}
        </p>
      </div>

      <!-- 次数 -->
      <span
        v-if="item.totalCount > 1"
        class="flex-shrink-0 text-xs u-badge rounded-full"
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

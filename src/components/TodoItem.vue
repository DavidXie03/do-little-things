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
  grouped?: boolean
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
    class="relative overflow-hidden transition-all duration-300"
    :class="[
      item.completed ? 'opacity-60' : '',
      isFuture ? 'opacity-70' : '',
      grouped ? '' : 'rounded-2xl u-mb-md',
    ]"
    :style="grouped ? {} : { background: 'var(--item-bg)', boxShadow: 'var(--card-shadow)' }"
  >
    <div class="flex items-center gap-3 u-item" @click="emit('edit', item)">
      <button
        v-if="!isFuture"
        @click.stop="emit('complete', item.id)"
        class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
        :style="{
          background: item.completed ? 'var(--secondary)' : 'transparent',
          border: item.completed ? 'none' : '2px solid var(--text-muted)',
        }"
      >
        <IconCheck v-if="item.completed" :size="16" color="white" />
      </button>
      <div
        v-else
        class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style="border: 2px dashed var(--text-muted); opacity: 0.4;"
      ></div>

      <div class="flex-1 min-w-0">
        <p
          class="text-sm leading-relaxed transition-all duration-300"
          :class="item.completed ? 'line-through' : ''"
          style="color: var(--text-primary);"
        >
          {{ item.task.content }}
        </p>
        <p v-if="getSubInfo()" class="text-[11px] mt-0.5" style="color: var(--text-muted);">
          {{ getSubInfo() }}
        </p>
      </div>

      <span
        v-if="item.totalCount > 1"
        class="flex-shrink-0 text-xs u-badge rounded-full"
        :style="{
          background: item.completed ? 'var(--toast-success-bg)' : 'rgba(108,99,255,0.08)',
          color: item.completed ? 'var(--secondary)' : 'var(--primary)',
        }"
      >
        {{ item.completedCount }}/{{ item.totalCount }}
      </span>
    </div>
  </div>
</template>

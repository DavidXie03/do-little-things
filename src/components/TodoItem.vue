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
  isOverdue?: boolean
  isCompletedArchive?: boolean
  grouped?: boolean
}>()

const emit = defineEmits<{
  (e: 'complete', todoId: string): void
  (e: 'edit', item: DailyTodoItem): void
}>()

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
      item.completed && !isCompletedArchive ? 'opacity-60' : '',
      isFuture ? 'opacity-70' : '',
      grouped ? '' : 'rounded-2xl u-mb-md',
    ]"
    :style="grouped ? {} : { background: 'var(--item-bg)', boxShadow: 'var(--card-shadow)' }"
  >
    <div class="flex items-center gap-3 u-item" @click="!isCompletedArchive ? emit('edit', item) : undefined">
      <!-- 已完成归档：绿色圆（可点击恢复） -->
      <button
        v-if="isCompletedArchive"
        @click.stop="emit('complete', item.id)"
        class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
        :style="{
          background: 'var(--secondary)',
          border: 'none',
        }"
      >
        <IconCheck :size="16" color="white" />
      </button>
      <!-- 过期任务：红色空心圆（可点击完成） -->
      <button
        v-else-if="isOverdue"
        @click.stop="emit('complete', item.id)"
        class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
        style="background: transparent; border: 2px solid #ef4444;"
      >
      </button>
      <!-- 普通未来项：虚线圆 -->
      <div
        v-else-if="isFuture"
        class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
        style="border: 2px dashed var(--text-muted); opacity: 0.4;"
      ></div>
      <!-- 正常今日项 -->
      <button
        v-else
        @click.stop="emit('complete', item.id)"
        class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 active:scale-90"
        :style="{
          background: item.completed ? 'var(--primary)' : 'transparent',
          border: item.completed ? 'none' : '2px solid var(--text-muted)',
        }"
      >
        <IconCheck v-if="item.completed" :size="16" color="white" />
      </button>

      <div class="flex-1 min-w-0">
        <p
          class="text-sm leading-relaxed transition-all duration-300"
          :class="[
            item.completed && !isCompletedArchive ? 'line-through' : '',
            isCompletedArchive ? 'line-through' : '',
          ]"
          :style="{ color: 'var(--text-primary)' }"
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
          background: 'rgba(108,99,255,0.08)',
          color: 'var(--primary)',
        }"
      >
        {{ item.completedCount }}/{{ item.totalCount }}
      </span>
    </div>
  </div>
</template>

<style scoped>
</style>

<script setup lang="ts">
import { ref } from 'vue'
import type { DailyTodoItem } from '../types'
import { RecurrenceTypeLabel } from '../types'
import IconCheck from './icons/IconCheck.vue'
import IconTrash from './icons/IconTrash.vue'

const props = defineProps<{
  item: DailyTodoItem
  showRecurrence?: boolean
  showDateLabel?: boolean
  isFuture?: boolean
}>()

const emit = defineEmits<{
  (e: 'complete', todoId: string): void
  (e: 'delete', todoId: string): void
  (e: 'edit', item: DailyTodoItem): void
}>()

const confirmingDelete = ref(false)
let confirmTimer: ReturnType<typeof setTimeout> | null = null

function handleDelete(todoId: string) {
  if (confirmingDelete.value) {
    emit('delete', todoId)
    confirmingDelete.value = false
    if (confirmTimer) {
      clearTimeout(confirmTimer)
      confirmTimer = null
    }
  } else {
    confirmingDelete.value = true
    if (confirmTimer) clearTimeout(confirmTimer)
    confirmTimer = setTimeout(() => {
      confirmingDelete.value = false
    }, 3000)
  }
}

/** 构建副信息文本：仅显示循环类型 */
function getSubInfo(): string {
  if (props.showRecurrence && props.item.task.recurrence) {
    return RecurrenceTypeLabel[props.item.task.recurrence] || ''
  }
  return ''
}
</script>

<template>
  <div
    class="relative rounded-2xl p-4 mb-3 overflow-hidden transition-all duration-300"
    :class="[
      item.completed ? 'opacity-60' : '',
      isFuture ? 'opacity-70' : '',
    ]"
    style="background: #FFFFFF; box-shadow: 0 2px 12px -4px rgba(0, 0, 0, 0.06);"
  >
    <div class="flex items-center gap-3" @click="emit('edit', item)">
      <!-- 复选圆圈 -->
      <button
        v-if="!isFuture"
        @click.stop="!item.completed && emit('complete', item.id)"
        class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
        :class="item.completed ? '' : 'active:scale-90'"
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
        class="flex-shrink-0 text-xs px-2 py-0.5 rounded-full"
        :style="{
          background: item.completed ? 'rgba(0,184,148,0.1)' : 'rgba(108,99,255,0.08)',
          color: item.completed ? '#00B894' : 'var(--primary)',
        }"
      >
        {{ item.completedCount }}/{{ item.totalCount }}
      </span>

      <!-- 删除按钮（仅今天的任务） -->
      <button
        v-if="!isFuture"
        @click.stop="handleDelete(item.id)"
        class="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-90"
        :style="{
          background: confirmingDelete ? '#E17055' : 'rgba(225,112,85,0.08)',
          opacity: confirmingDelete ? 1 : 0.4,
        }"
        :title="confirmingDelete ? '再次点击确认删除' : '删除'"
      >
        <IconTrash :size="14" :color="confirmingDelete ? 'white' : '#E17055'" />
      </button>
    </div>
  </div>
</template>

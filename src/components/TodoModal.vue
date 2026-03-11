<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { RecurrenceType, RecurrenceTypeLabel, ALL_RECURRENCE_TYPES } from '../types'
import type { RecurrenceType as RecurrenceTypeT } from '../types'
import IconPlus from './icons/IconPlus.vue'
import IconMinus from './icons/IconMinus.vue'

const props = defineProps<{
  visible: boolean
  mode: 'add' | 'edit'
  initialContent?: string
  initialRepeatCount?: number
  initialRecurrence?: RecurrenceTypeT
}>()

const emit = defineEmits<{
  (e: 'confirm', content: string, repeatCount: number, recurrence: RecurrenceTypeT): void
  (e: 'cancel'): void
}>()

const content = ref('')
const repeatCount = ref(1)
const recurrence = ref<RecurrenceTypeT>(RecurrenceType.Daily)
const inputRef = ref<HTMLInputElement | null>(null)

watch(() => props.visible, (val) => {
  if (val) {
    content.value = props.initialContent ?? ''
    repeatCount.value = props.initialRepeatCount ?? 1
    recurrence.value = props.initialRecurrence ?? RecurrenceType.Daily
    nextTick(() => inputRef.value?.focus())
  }
})

function handleConfirm() {
  const trimmed = content.value.trim()
  if (!trimmed) return
  emit('confirm', trimmed, repeatCount.value, recurrence.value)
}
</script>

<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[10000] flex items-center justify-center"
        @click.self="emit('cancel')"
      >
        <div class="absolute inset-0 bg-black/30 backdrop-blur-sm"></div>
        <div
          class="relative w-[85%] max-w-sm rounded-2xl px-7 py-6 space-y-5"
          style="background: #FFFFFF; box-shadow: 0 20px 60px -12px rgba(0, 0, 0, 0.25); margin: 0 24px;"
        >
          <h3 class="text-lg font-bold pb-1" style="color: var(--text-primary);">
            {{ mode === 'add' ? '添加待办' : '编辑待办' }}
          </h3>

          <input
            ref="inputRef"
            v-model="content"
            type="text"
            placeholder="输入待办事项内容..."
            class="w-full text-sm px-4 py-3 rounded-lg border-none outline-none"
            style="background: rgba(108,99,255,0.04); color: var(--text-primary);"
            @keyup.enter="handleConfirm"
          />

          <!-- 循环类型选择 -->
          <div class="space-y-2">
            <span class="text-sm" style="color: var(--text-secondary);">循环方式</span>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="rt in ALL_RECURRENCE_TYPES"
                :key="rt"
                @click="recurrence = rt"
                class="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 active:scale-95"
                :style="{
                  background: recurrence === rt ? 'var(--primary)' : 'rgba(108,99,255,0.06)',
                  color: recurrence === rt ? 'white' : 'var(--primary)',
                  border: recurrence === rt ? '1.5px solid var(--primary)' : '1.5px solid rgba(108,99,255,0.12)',
                }"
              >
                {{ RecurrenceTypeLabel[rt] }}
              </button>
            </div>
          </div>

          <div class="flex items-center justify-between py-1">
            <span class="text-sm" style="color: var(--text-secondary);">每次执行次数</span>
            <div class="flex items-center gap-3">
              <button
                @click="repeatCount = Math.max(1, repeatCount - 1)"
                class="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                style="background: rgba(108,99,255,0.08);"
              >
                <IconMinus :size="12" color="var(--primary)" />
              </button>
              <span class="text-lg font-bold w-6 text-center" style="color: var(--primary);">{{ repeatCount }}</span>
              <button
                @click="repeatCount = Math.min(20, repeatCount + 1)"
                class="w-8 h-8 rounded-lg flex items-center justify-center transition-all active:scale-90"
                style="background: rgba(108,99,255,0.08);"
              >
                <IconPlus :size="12" color="var(--primary)" />
              </button>
            </div>
          </div>

          <div class="flex gap-3 pt-2">
            <button
              @click="emit('cancel')"
              class="flex-1 py-3 rounded-xl text-sm font-semibold transition-all active:scale-95"
              style="background: rgba(0,0,0,0.04); color: var(--text-secondary);"
            >
              取消
            </button>
            <button
              @click="handleConfirm"
              class="flex-1 py-3 rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
              style="background: var(--primary);"
            >
              {{ mode === 'add' ? '添加' : '保存' }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </Teleport>
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

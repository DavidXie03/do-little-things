<script setup lang="ts">
import { ref, nextTick, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RecurrenceType, ALL_RECURRENCE_TYPES } from '../types'
import type { RecurrenceType as RecurrenceTypeT } from '../types'
import BaseModal from './BaseModal.vue'
import IconPlus from './icons/IconPlus.vue'
import IconMinus from './icons/IconMinus.vue'

const { t } = useI18n()

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
  <BaseModal
    :visible="visible"
    :title="mode === 'add' ? t('modal.addTitle') : t('modal.editTitle')"
    @close="emit('cancel')"
  >
    <input
      ref="inputRef"
      v-model="content"
      type="text"
      :placeholder="t('modal.placeholder')"
      class="w-full text-sm px-4 py-3 rounded-lg border-none outline-none"
      style="background: rgba(108,99,255,0.04); color: var(--text-primary);"
      @keyup.enter="handleConfirm"
    />

    <!-- 循环类型选择 -->
    <div class="space-y-2">
      <span class="text-sm" style="color: var(--text-secondary);">{{ t('modal.recurrenceLabel') }}</span>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="rt in ALL_RECURRENCE_TYPES"
          :key="rt"
          @click="recurrence = rt"
          class="u-item-sm rounded-lg text-xs font-medium transition-all duration-200 active:scale-95"
          :style="{
            background: recurrence === rt ? 'var(--primary)' : 'rgba(108,99,255,0.06)',
            color: recurrence === rt ? 'white' : 'var(--primary)',
            border: recurrence === rt ? '1.5px solid var(--primary)' : '1.5px solid rgba(108,99,255,0.12)',
          }"
        >
          {{ t(`recurrence.${rt}`) }}
        </button>
      </div>
    </div>

    <div class="flex items-center justify-between py-1">
      <span class="text-sm" style="color: var(--text-secondary);">{{ t('modal.repeatLabel') }}</span>
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
        class="flex-1 u-item-sm rounded-xl text-sm font-semibold transition-all active:scale-95"
        style="background: rgba(0,0,0,0.04); color: var(--text-secondary);"
      >
        {{ t('modal.cancel') }}
      </button>
      <button
        @click="handleConfirm"
        class="flex-1 u-item-sm rounded-xl text-sm font-semibold text-white transition-all active:scale-95"
        style="background: var(--primary);"
      >
        {{ mode === 'add' ? t('modal.add') : t('modal.save') }}
      </button>
    </div>
  </BaseModal>
</template>

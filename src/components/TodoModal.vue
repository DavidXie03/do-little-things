<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RecurrenceType, ALL_RECURRENCE_TYPES } from '../types'
import type { RecurrenceType as RecurrenceTypeT } from '../types'
import HalfSheet from './HalfSheet.vue'
import IconPlus from './icons/IconPlus.vue'
import IconMinus from './icons/IconMinus.vue'
import IconTrash from './icons/IconTrash.vue'

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
  mode: 'add' | 'edit'
  initialContent?: string
  initialRepeatCount?: number
  initialRecurrence?: RecurrenceTypeT
  initialStartDate?: string
  existingNames?: Set<string>
}>()

const emit = defineEmits<{
  (e: 'confirm', content: string, repeatCount: number, recurrence: RecurrenceTypeT, startDate?: string): void
  (e: 'cancel'): void
  (e: 'delete'): void
}>()

const content = ref('')
const repeatCount = ref(1)
const recurrence = ref<RecurrenceTypeT>(RecurrenceType.Daily)
const inputRef = ref<HTMLInputElement | null>(null)
const errorMsg = ref('')

const MAX_NAME_LENGTH = 20

const confirmingDelete = ref(false)
let deleteTimer: ReturnType<typeof setTimeout> | null = null

type StartDateOption = 'today' | 'tomorrow' | 'dayAfter' | 'custom'
const startDateOption = ref<StartDateOption>('today')
const customDate = ref('')
const showDatePicker = ref(false)

function toDateStr(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function getTodayStr(): string {
  return toDateStr(new Date())
}

function getOffsetDateStr(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toDateStr(d)
}

const resolvedStartDate = computed((): string | undefined => {
  switch (startDateOption.value) {
    case 'today':
      return undefined // 默认今天，不需要传 startDate
    case 'tomorrow':
      return getOffsetDateStr(1)
    case 'dayAfter':
      return getOffsetDateStr(2)
    case 'custom':
      return customDate.value || getTodayStr()
    default:
      return undefined
  }
})

watch(() => props.visible, (val) => {
  if (val) {
    content.value = props.initialContent ?? ''
    repeatCount.value = props.initialRepeatCount ?? 1
    recurrence.value = props.initialRecurrence ?? RecurrenceType.Daily
    showDatePicker.value = false
    confirmingDelete.value = false
    errorMsg.value = ''
    if (deleteTimer) { clearTimeout(deleteTimer); deleteTimer = null }

    if (props.initialStartDate) {
      const today = getTodayStr()
      const tomorrow = getOffsetDateStr(1)
      const dayAfter = getOffsetDateStr(2)
      if (props.initialStartDate === today || !props.initialStartDate) {
        startDateOption.value = 'today'
      } else if (props.initialStartDate === tomorrow) {
        startDateOption.value = 'tomorrow'
      } else if (props.initialStartDate === dayAfter) {
        startDateOption.value = 'dayAfter'
      } else {
        startDateOption.value = 'custom'
        customDate.value = props.initialStartDate
      }
    } else {
      startDateOption.value = 'today'
      customDate.value = ''
    }

    nextTick(() => inputRef.value?.focus())
  }
})

function selectDateOption(option: StartDateOption) {
  if (option === 'custom') {
    showDatePicker.value = true
    startDateOption.value = 'custom'
    if (!customDate.value) {
      customDate.value = getTodayStr()
    }
  } else {
    showDatePicker.value = false
    startDateOption.value = option
  }
}

function handleDateInput(e: Event) {
  const target = e.target as HTMLInputElement
  customDate.value = target.value
}

function validateInput() {
  const trimmed = content.value.trim()
  if (trimmed.length >= MAX_NAME_LENGTH) {
    errorMsg.value = t('modal.errorTooLong', { max: MAX_NAME_LENGTH })
  } else if (trimmed && props.existingNames?.has(trimmed)) {
    errorMsg.value = t('modal.errorDuplicate')
  } else {
    errorMsg.value = ''
  }
}

function handleConfirm() {
  const trimmed = content.value.trim()
  if (!trimmed) return

  if (trimmed.length > MAX_NAME_LENGTH) {
    errorMsg.value = t('modal.errorTooLong', { max: MAX_NAME_LENGTH })
    return
  }

  if (props.existingNames?.has(trimmed)) {
    errorMsg.value = t('modal.errorDuplicate')
    return
  }

  errorMsg.value = ''
  emit('confirm', trimmed, repeatCount.value, recurrence.value, resolvedStartDate.value)
}

function handleDelete() {
  if (confirmingDelete.value) {
    emit('delete')
    confirmingDelete.value = false
    if (deleteTimer) { clearTimeout(deleteTimer); deleteTimer = null }
  } else {
    confirmingDelete.value = true
    if (deleteTimer) clearTimeout(deleteTimer)
    deleteTimer = setTimeout(() => {
      confirmingDelete.value = false
    }, 3000)
  }
}

function formatCustomDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.getMonth() + 1}/${d.getDate()}`
}
</script>

<template>
  <HalfSheet
    :visible="visible"
    :title="mode === 'add' ? t('modal.addTitle') : t('modal.editTitle')"
    @close="emit('cancel')"
  >
    <input
      ref="inputRef"
      v-model="content"
      type="text"
      :maxlength="MAX_NAME_LENGTH"
      :placeholder="t('modal.placeholder')"
      class="w-full text-sm px-4 py-3 rounded-lg border-none outline-none"
      style="background: rgba(108,99,255,0.04); color: var(--text-primary);"
      @keyup.enter="handleConfirm"
      @input="validateInput"
    />
    <p
      v-if="errorMsg"
      class="text-xs px-1"
      style="color: #E17055;"
    >
      {{ errorMsg }}
    </p>

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

    <div class="space-y-2">
      <span class="text-sm" style="color: var(--text-secondary);">
        {{ mode === 'add' ? t('modal.startDateLabel') : t('modal.dueDateLabel') }}
      </span>
      <div class="flex flex-wrap gap-2">
        <button
          @click="selectDateOption('today')"
          class="u-item-sm rounded-lg text-xs font-medium transition-all duration-200 active:scale-95"
          :style="{
            background: startDateOption === 'today' ? 'var(--primary)' : 'rgba(108,99,255,0.06)',
            color: startDateOption === 'today' ? 'white' : 'var(--primary)',
            border: startDateOption === 'today' ? '1.5px solid var(--primary)' : '1.5px solid rgba(108,99,255,0.12)',
          }"
        >
          {{ t('modal.startToday') }}
        </button>
        <button
          @click="selectDateOption('tomorrow')"
          class="u-item-sm rounded-lg text-xs font-medium transition-all duration-200 active:scale-95"
          :style="{
            background: startDateOption === 'tomorrow' ? 'var(--primary)' : 'rgba(108,99,255,0.06)',
            color: startDateOption === 'tomorrow' ? 'white' : 'var(--primary)',
            border: startDateOption === 'tomorrow' ? '1.5px solid var(--primary)' : '1.5px solid rgba(108,99,255,0.12)',
          }"
        >
          {{ t('modal.startTomorrow') }}
        </button>
        <button
          @click="selectDateOption('dayAfter')"
          class="u-item-sm rounded-lg text-xs font-medium transition-all duration-200 active:scale-95"
          :style="{
            background: startDateOption === 'dayAfter' ? 'var(--primary)' : 'rgba(108,99,255,0.06)',
            color: startDateOption === 'dayAfter' ? 'white' : 'var(--primary)',
            border: startDateOption === 'dayAfter' ? '1.5px solid var(--primary)' : '1.5px solid rgba(108,99,255,0.12)',
          }"
        >
          {{ t('modal.startDayAfter') }}
        </button>
        <button
          @click="selectDateOption('custom')"
          class="u-item-sm rounded-lg text-xs font-medium transition-all duration-200 active:scale-95"
          :style="{
            background: startDateOption === 'custom' ? 'var(--primary)' : 'rgba(108,99,255,0.06)',
            color: startDateOption === 'custom' ? 'white' : 'var(--primary)',
            border: startDateOption === 'custom' ? '1.5px solid var(--primary)' : '1.5px solid rgba(108,99,255,0.12)',
          }"
        >
          {{ startDateOption === 'custom' && customDate ? formatCustomDate(customDate) : t('modal.startPickDate') }}
        </button>
      </div>
      <div v-if="showDatePicker" class="mt-2">
        <input
          type="date"
          :value="customDate"
          @input="handleDateInput"
          class="w-full text-sm px-4 py-2.5 rounded-lg border-none outline-none"
          style="background: rgba(108,99,255,0.04); color: var(--text-primary);"
        />
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

    <button
      v-if="mode === 'edit'"
      @click="handleDelete"
      class="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 active:scale-[0.98]"
      :style="{
        background: confirmingDelete ? '#E17055' : 'rgba(225,112,85,0.06)',
        color: confirmingDelete ? 'white' : '#E17055',
        border: confirmingDelete ? '1.5px solid #E17055' : '1.5px solid rgba(225,112,85,0.15)',
      }"
    >
      <IconTrash :size="14" :color="confirmingDelete ? 'white' : '#E17055'" />
      {{ confirmingDelete ? t('modal.deleteConfirm') : t('modal.delete') }}
    </button>

    <div class="flex pt-2" style="gap: var(--gap-sm);">
      <button
        @click="emit('cancel')"
        class="flex-1 u-item-sm rounded-xl text-sm font-semibold transition-all active:scale-95"
        style="background: var(--divider); color: var(--text-secondary);"
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
  </HalfSheet>
</template>

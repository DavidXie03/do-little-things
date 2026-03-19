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

// Dropdown open states
const showRecurrenceDropdown = ref(false)
const showDateDropdown = ref(false)
const recurrenceTriggerRef = ref<HTMLElement | null>(null)
const dateTriggerRef = ref<HTMLElement | null>(null)
const recurrenceDropUp = ref(false)
const dateDropUp = ref(false)

// Estimate dropdown panel height (items * itemHeight + border/padding)
const RECURRENCE_ITEM_COUNT = ALL_RECURRENCE_TYPES.length
const DATE_ITEM_COUNT = 4
const DROPDOWN_ITEM_HEIGHT = 40 // ~10px padding * 2 + 13px font + 7px
const DROPDOWN_PADDING = 4 // margin-top between trigger and panel

function shouldDropUp(triggerEl: HTMLElement | null, itemCount: number): boolean {
  if (!triggerEl) return false
  const rect = triggerEl.getBoundingClientRect()
  const panelHeight = itemCount * DROPDOWN_ITEM_HEIGHT + DROPDOWN_PADDING
  const spaceBelow = window.innerHeight - rect.bottom
  const spaceAbove = rect.top
  return spaceBelow < panelHeight && spaceAbove > spaceBelow
}

type StartDateOption = 'today' | 'tomorrow' | 'dayAfter' | 'custom'
const startDateOption = ref<StartDateOption>('today')
const customDate = ref('')

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
      return undefined
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

const recurrenceLabel = computed(() => t(`recurrence.${recurrence.value}`))

const startDateLabel = computed(() => {
  switch (startDateOption.value) {
    case 'today': return t('modal.startToday')
    case 'tomorrow': return t('modal.startTomorrow')
    case 'dayAfter': return t('modal.startDayAfter')
    case 'custom': return customDate.value ? formatCustomDate(customDate.value) : t('modal.startPickDate')
    default: return t('modal.startToday')
  }
})

watch(() => props.visible, (val) => {
  if (val) {
    content.value = props.initialContent ?? ''
    repeatCount.value = props.initialRepeatCount ?? 1
    recurrence.value = props.initialRecurrence ?? RecurrenceType.Daily
    showRecurrenceDropdown.value = false
    showDateDropdown.value = false
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

function toggleRecurrenceDropdown() {
  if (!showRecurrenceDropdown.value) {
    recurrenceDropUp.value = shouldDropUp(recurrenceTriggerRef.value, RECURRENCE_ITEM_COUNT)
  }
  showRecurrenceDropdown.value = !showRecurrenceDropdown.value
  showDateDropdown.value = false
}

function selectRecurrence(rt: RecurrenceTypeT) {
  recurrence.value = rt
  showRecurrenceDropdown.value = false
}

function toggleDateDropdown() {
  if (!showDateDropdown.value) {
    dateDropUp.value = shouldDropUp(dateTriggerRef.value, DATE_ITEM_COUNT)
  }
  showDateDropdown.value = !showDateDropdown.value
  showRecurrenceDropdown.value = false
}

function selectDateOption(option: StartDateOption) {
  if (option === 'custom') {
    startDateOption.value = 'custom'
    if (!customDate.value) {
      customDate.value = getTodayStr()
    }
  } else {
    startDateOption.value = option
  }
  showDateDropdown.value = false
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
    <!-- Input -->
    <input
      ref="inputRef"
      v-model="content"
      type="text"
      :maxlength="MAX_NAME_LENGTH"
      :placeholder="t('modal.placeholder')"
      class="w-full text-sm px-5 py-3.5 rounded-xl border-none outline-none"
      style="background: rgba(108,99,255,0.04); color: var(--text-primary);"
      @keyup.enter="handleConfirm"
      @input="validateInput"
    />
    <p
      v-if="errorMsg"
      class="text-xs px-1"
      style="color: #E17055; margin-top: -8px;"
    >
      {{ errorMsg }}
    </p>

    <!-- Recurrence + Start Date: same row, dropdown selects -->
    <div class="flex items-start gap-3">
      <!-- Recurrence dropdown -->
      <div class="flex-1">
        <span class="text-xs font-medium" style="color: var(--text-muted);">{{ t('modal.recurrenceLabel') }}</span>
        <div class="select-wrapper">
          <button
            ref="recurrenceTriggerRef"
            @click="toggleRecurrenceDropdown"
            class="select-trigger"
          >
            <span class="select-trigger-text">{{ recurrenceLabel }}</span>
            <svg class="select-chevron" :class="{ 'rotate-180': showRecurrenceDropdown }" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <!-- Dropdown panel -->
          <Transition :name="recurrenceDropUp ? 'dropdown-up' : 'dropdown'">
            <div v-if="showRecurrenceDropdown" class="dropdown-panel" :class="{ 'dropdown-panel-up': recurrenceDropUp }">
              <button
                v-for="rt in ALL_RECURRENCE_TYPES"
                :key="rt"
                @click="selectRecurrence(rt)"
                class="dropdown-option"
                :class="{ 'dropdown-option-active': recurrence === rt }"
              >
                {{ t(`recurrence.${rt}`) }}
              </button>
            </div>
          </Transition>
        </div>
      </div>

      <!-- Start date dropdown -->
      <div class="flex-1">
        <span class="text-xs font-medium" style="color: var(--text-muted);">
          {{ mode === 'add' ? t('modal.startDateLabel') : t('modal.dueDateLabel') }}
        </span>
        <div class="select-wrapper">
          <button
            ref="dateTriggerRef"
            @click="toggleDateDropdown"
            class="select-trigger"
          >
            <span class="select-trigger-text">{{ startDateLabel }}</span>
            <svg class="select-chevron" :class="{ 'rotate-180': showDateDropdown }" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <!-- Dropdown panel -->
          <Transition :name="dateDropUp ? 'dropdown-up' : 'dropdown'">
            <div v-if="showDateDropdown" class="dropdown-panel" :class="{ 'dropdown-panel-up': dateDropUp }">
              <button @click="selectDateOption('today')" class="dropdown-option" :class="{ 'dropdown-option-active': startDateOption === 'today' }">
                {{ t('modal.startToday') }}
              </button>
              <button @click="selectDateOption('tomorrow')" class="dropdown-option" :class="{ 'dropdown-option-active': startDateOption === 'tomorrow' }">
                {{ t('modal.startTomorrow') }}
              </button>
              <button @click="selectDateOption('dayAfter')" class="dropdown-option" :class="{ 'dropdown-option-active': startDateOption === 'dayAfter' }">
                {{ t('modal.startDayAfter') }}
              </button>
              <button @click="selectDateOption('custom')" class="dropdown-option" :class="{ 'dropdown-option-active': startDateOption === 'custom' }">
                {{ startDateOption === 'custom' && customDate ? formatCustomDate(customDate) : t('modal.startPickDate') }}
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>

    <!-- Custom date picker (shown when custom selected) -->
    <div v-if="startDateOption === 'custom'" style="margin-top: -8px;">
      <input
        type="date"
        :value="customDate"
        @input="handleDateInput"
        class="w-full text-sm px-4 py-2.5 rounded-xl border-none outline-none"
        style="background: rgba(108,99,255,0.04); color: var(--text-primary);"
      />
    </div>

    <!-- Repeat count -->
    <div class="flex items-center justify-between">
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

    <!-- Delete button (edit mode) -->
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

    <!-- Action buttons -->
    <div class="flex" style="gap: var(--gap-sm);">
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

<style scoped>
.select-wrapper {
  position: relative;
}
.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 8px 12px;
  margin-top: 4px;
  border-radius: 10px;
  background: rgba(108,99,255,0.06);
  border: 1.5px solid rgba(108,99,255,0.12);
  cursor: pointer;
  transition: all 0.2s ease;
}
.select-trigger:active {
  transform: scale(0.98);
}
.select-trigger-text {
  font-size: 13px;
  font-weight: 500;
  color: var(--primary);
}
.select-chevron {
  color: var(--primary);
  transition: transform 0.2s ease;
  flex-shrink: 0;
}
.rotate-180 {
  transform: rotate(180deg);
}

.dropdown-panel {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 4px;
  background: var(--modal-bg);
  border-radius: 12px;
  box-shadow: 0 8px 24px -4px rgba(0,0,0,0.15);
  border: 1px solid var(--divider);
  z-index: 100;
  overflow: hidden;
}
.dropdown-panel-up {
  top: auto;
  bottom: 100%;
  margin-top: 0;
  margin-bottom: 4px;
}

.dropdown-option {
  display: block;
  width: 100%;
  text-align: left;
  padding: 10px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background 0.15s ease;
}
.dropdown-option:not(:last-child) {
  border-bottom: 1px solid var(--divider);
}
.dropdown-option:active {
  background: rgba(108,99,255,0.06);
}
.dropdown-option-active {
  color: var(--primary);
  background: rgba(108,99,255,0.06);
}

.dropdown-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.dropdown-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* Upward dropdown animation */
.dropdown-up-enter-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-up-leave-active {
  transition: opacity 0.1s ease, transform 0.1s ease;
}
.dropdown-up-enter-from {
  opacity: 0;
  transform: translateY(4px);
}
.dropdown-up-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>

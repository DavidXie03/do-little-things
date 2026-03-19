<script setup lang="ts">
import { ref, nextTick, watch, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { RecurrenceType, ALL_RECURRENCE_TYPES } from '../types'
import type { RecurrenceType as RecurrenceTypeT } from '../types'
import HalfSheet from './HalfSheet.vue'
import IconPlus from './icons/IconPlus.vue'
import IconMinus from './icons/IconMinus.vue'
import IconTrash from './icons/IconTrash.vue'

const { t, tm } = useI18n()

const props = defineProps<{
  visible: boolean
  mode: 'add' | 'edit'
  initialContent?: string
  initialRepeatCount?: number
  initialRecurrence?: RecurrenceTypeT
  initialStartDate?: string
  initialCustomDays?: number[]
  existingNames?: Set<string>
}>()

const emit = defineEmits<{
  (e: 'confirm', content: string, repeatCount: number, recurrence: RecurrenceTypeT, startDate?: string, customDays?: number[]): void
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

// Custom days for custom recurrence (0=Sun, 1=Mon, ..., 6=Sat)
const customDays = ref<number[]>([])
const showCustomDaysPicker = ref(false)

// Dropdown open states
const showRecurrenceDropdown = ref(false)
const showDateDropdown = ref(false)
const recurrenceTriggerRef = ref<HTMLElement | null>(null)
const dateTriggerRef = ref<HTMLElement | null>(null)
const recurrenceDropUp = ref(false)
const dateDropUp = ref(false)

// Hidden date input ref for system date picker
const dateInputRef = ref<HTMLInputElement | null>(null)

// Estimate dropdown panel height
const RECURRENCE_ITEM_COUNT = ALL_RECURRENCE_TYPES.length
const DATE_ITEM_COUNT = 4
const DROPDOWN_ITEM_HEIGHT = 40
const DROPDOWN_PADDING = 4

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

// Recurrence label: show custom days summary for custom type
const recurrenceLabel = computed(() => {
  if (recurrence.value === RecurrenceType.Custom && customDays.value.length > 0) {
    const weekdays = tm('date.weekdays') as string[]
    // Sort days starting from Monday (1,2,3,4,5,6,0)
    const sorted = [...customDays.value].sort((a, b) => {
      const aIdx = a === 0 ? 7 : a
      const bIdx = b === 0 ? 7 : b
      return aIdx - bIdx
    })
    return sorted.map(d => weekdays[d]).join(' ')
  }
  return t(`recurrence.${recurrence.value}`)
})

// Date label: show formatted date with weekday for custom dates
const startDateLabel = computed(() => {
  switch (startDateOption.value) {
    case 'today': return t('modal.startToday')
    case 'tomorrow': return t('modal.startTomorrow')
    case 'dayAfter': return t('modal.startDayAfter')
    case 'custom': return customDate.value ? formatCustomDateFull(customDate.value) : t('modal.startPickDate')
    default: return t('modal.startToday')
  }
})

watch(() => props.visible, (val) => {
  if (val) {
    content.value = props.initialContent ?? ''
    repeatCount.value = props.initialRepeatCount ?? 1
    recurrence.value = props.initialRecurrence ?? RecurrenceType.Daily
    customDays.value = props.initialCustomDays ? [...props.initialCustomDays] : []
    showRecurrenceDropdown.value = false
    showDateDropdown.value = false
    showCustomDaysPicker.value = false
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
  showCustomDaysPicker.value = false
}

function selectRecurrence(rt: RecurrenceTypeT) {
  recurrence.value = rt
  showRecurrenceDropdown.value = false
  if (rt === RecurrenceType.Custom) {
    // Open custom days picker
    if (customDays.value.length === 0) {
      // Default to today's weekday
      customDays.value = [new Date().getDay()]
    }
    showCustomDaysPicker.value = true
  } else {
    showCustomDaysPicker.value = false
  }
}

function toggleCustomDay(day: number) {
  const idx = customDays.value.indexOf(day)
  if (idx >= 0) {
    // Don't allow removing the last day
    if (customDays.value.length > 1) {
      customDays.value.splice(idx, 1)
    }
  } else {
    customDays.value.push(day)
  }
}

function confirmCustomDays() {
  showCustomDaysPicker.value = false
}

function toggleDateDropdown() {
  if (!showDateDropdown.value) {
    dateDropUp.value = shouldDropUp(dateTriggerRef.value, DATE_ITEM_COUNT)
  }
  showDateDropdown.value = !showDateDropdown.value
  showRecurrenceDropdown.value = false
  showCustomDaysPicker.value = false
}

function selectDateOption(option: StartDateOption) {
  if (option === 'custom') {
    // Open system date picker
    if (!customDate.value) {
      customDate.value = getTodayStr()
    }
    showDateDropdown.value = false
    nextTick(() => {
      dateInputRef.value?.showPicker?.()
      dateInputRef.value?.click()
    })
  } else {
    startDateOption.value = option
    showDateDropdown.value = false
  }
}

function handleDateInput(e: Event) {
  const target = e.target as HTMLInputElement
  if (target.value) {
    customDate.value = target.value
    startDateOption.value = 'custom'
    // Check if the selected date is today/tomorrow/dayAfter
    const today = getTodayStr()
    const tomorrow = getOffsetDateStr(1)
    const dayAfter = getOffsetDateStr(2)
    if (customDate.value === today) {
      startDateOption.value = 'today'
    } else if (customDate.value === tomorrow) {
      startDateOption.value = 'tomorrow'
    } else if (customDate.value === dayAfter) {
      startDateOption.value = 'dayAfter'
    }
  }
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
  const days = recurrence.value === RecurrenceType.Custom ? customDays.value : undefined
  emit('confirm', trimmed, repeatCount.value, recurrence.value, resolvedStartDate.value, days)
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

// Format date as "(X年)X月X日 周几 提醒"
function formatCustomDateFull(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  const now = new Date()
  const weekdays = tm('date.weekdays') as string[]
  const weekday = weekdays[d.getDay()]
  const month = d.getMonth() + 1
  const day = d.getDate()
  const crossYear = d.getFullYear() !== now.getFullYear()
  const yearPrefix = crossYear ? `${d.getFullYear()}年` : ''
  return `${yearPrefix}${month}月${day}日 ${weekday}`
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
      class="w-full text-sm px-5 py-4 rounded-xl border-none outline-none"
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

    <!-- Recurrence + Date: same row, no labels -->
    <div class="flex items-start gap-3">
      <!-- Recurrence dropdown -->
      <div class="flex-1">
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

      <!-- Date dropdown -->
      <div class="flex-1">
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
                {{ startDateOption === 'custom' && customDate ? formatCustomDateFull(customDate) : t('modal.startPickDate') }}
              </button>
            </div>
          </Transition>
        </div>
        <!-- Hidden date input for system picker -->
        <input
          ref="dateInputRef"
          type="date"
          :value="customDate"
          @input="handleDateInput"
          class="hidden-date-input"
        />
      </div>
    </div>

    <!-- Custom days picker (shown when recurrence is custom) -->
    <Transition name="dropdown">
      <div v-if="showCustomDaysPicker" class="custom-days-picker">
        <p class="text-xs font-medium" style="color: var(--text-muted); margin-bottom: 8px;">
          {{ t('modal.customDaysTitle') }}
        </p>
        <div class="custom-days-grid">
          <button
            v-for="(_, dayIdx) in 7"
            :key="dayIdx"
            @click="toggleCustomDay(dayIdx)"
            class="custom-day-btn"
            :class="{ 'custom-day-active': customDays.includes(dayIdx) }"
          >
            {{ (tm('date.weekdays') as string[])[dayIdx] }}
          </button>
        </div>
        <button
          @click="confirmCustomDays"
          class="custom-days-confirm"
        >
          {{ t('modal.customDaysConfirm') }}
        </button>
      </div>
    </Transition>

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

/* Hidden date input (used to trigger system date picker) */
.hidden-date-input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
  pointer-events: none;
}

/* Custom days picker */
.custom-days-picker {
  padding: 12px 14px;
  border-radius: 12px;
  background: rgba(108,99,255,0.04);
  border: 1.5px solid rgba(108,99,255,0.12);
}
.custom-days-grid {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}
.custom-day-btn {
  flex: 1;
  min-width: 0;
  padding: 8px 0;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  border: 1.5px solid rgba(108,99,255,0.12);
  background: transparent;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.15s ease;
}
.custom-day-btn:active {
  transform: scale(0.95);
}
.custom-day-active {
  background: var(--primary);
  color: white;
  border-color: var(--primary);
}
.custom-days-confirm {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 8px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  text-align: center;
  background: rgba(108,99,255,0.08);
  color: var(--primary);
  border: none;
  cursor: pointer;
  transition: all 0.15s ease;
}
.custom-days-confirm:active {
  transform: scale(0.98);
}
</style>

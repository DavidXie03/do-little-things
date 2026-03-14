<script setup lang="ts">
import { onMounted, computed, ref, watch, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import type { SwipeDirection } from '../types'
import { useStorage } from '../composables/useStorage'
import { useCardAnimation } from '../composables/useCardAnimation'
import { useToast } from '../composables/useToast'
import { storageData } from '../composables/storageCore'
import TaskCard from '../components/TaskCard.vue'
import IconParty from '../components/icons/IconParty.vue'

const { t, tm } = useI18n()
const { showToast } = useToast()

const displaySlogan = computed(() => {
  if (storageData.value.showSlogan === false) return ''
  const custom = storageData.value.slogan
  if (custom && custom.trim()) return custom
  return t('home.defaultSlogan')
})

const typedSlogan = ref('')
const isTyping = ref(false)
let typeTimer: ReturnType<typeof setTimeout> | null = null

function startTyping(text: string) {
  if (typeTimer) { clearTimeout(typeTimer); typeTimer = null }
  typedSlogan.value = ''
  isTyping.value = true
  let i = 0
  function typeNext() {
    if (i < text.length) {
      typedSlogan.value = text.slice(0, i + 1)
      i++
      typeTimer = setTimeout(typeNext, 60)
    } else {
      isTyping.value = false
    }
  }
  typeNext()
}

watch(displaySlogan, (val) => {
  startTyping(val)
}, { immediate: true })

onUnmounted(() => {
  if (typeTimer) clearTimeout(typeTimer)
})

const {
  addRecord,
  addPendingTask,
  ensureDailyTodos,
  markTodoComplete,
  getUncompletedTodos,
} = useStorage()

const {
  allDone,
  cardKey,
  animPhase,
  backgroundCardCount,
  isLastRemaining,
  risingCardRef,
  secondBgCardRef,
  topCardRef,
  topItem,
  loadStack,
  triggerSwipeOut,
  triggerAllDone,
  MAX_STACK,
} = useCardAnimation(getUncompletedTodos)

function showCompleteToast() {
  const messages = tm('toast.completeMessages') as string[]
  const msg = messages[Math.floor(Math.random() * messages.length)]
  showToast(msg, 'success')
}

function handleSwipe(direction: SwipeDirection) {
  const item = topItem.value
  if (!item) return

  if (animPhase.value !== 'idle') return

  const now = new Date()
  const task = item.task
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

  if (direction === 'right') {
    const fullyDone = markTodoComplete(item.id)
    if (fullyDone) {
      showCompleteToast()
    }
  } else if (direction === 'left') {
    addPendingTask(task)
    addRecord({
      taskId: task.id,
      type: task.type,
      action: 'pending',
      timestamp: now.getTime(),
      date: dateStr,
    })
  }

  const remaining = getUncompletedTodos()

  if (remaining.length > 0) {
    triggerSwipeOut()
  } else {
    triggerAllDone()
  }
}

onMounted(() => {
  ensureDailyTodos()
  loadStack()
})
</script>

<template>
  <div class="h-full flex flex-col relative overflow-hidden" style="background-color: var(--bg-primary); transition: background-color 0.3s ease;">
    <!-- 卡片区域 -->
    <div class="flex-1 flex flex-col items-center justify-center px-6">
      <div class="w-full max-w-xs" data-no-tab-swipe>
        <!-- 有未完成的待办 -->
        <template v-if="topItem">
          <!-- 标题 -->
          <h1
            class="text-2xl font-bold text-center"
            :class="displaySlogan ? 'u-mb-sm' : 'u-mb-lg'"
            style="color: var(--primary);"
          >
            {{ t('app.title') }}
          </h1>
          <p
            v-if="displaySlogan"
            class="text-sm text-center u-mb-lg slogan-text"
            style="color: var(--text-muted);"
          >
            {{ typedSlogan }}<span v-if="isTyping" class="typing-cursor">|</span>
          </p>

          <!-- 卡片堆叠容器 -->
          <div class="card-stack-container" style="min-height: 360px;">
            <div
              v-for="idx in backgroundCardCount"
              :key="'bg-' + idx"
              :ref="(el) => { if (idx === 1) risingCardRef = el as HTMLElement; if (idx === 2) secondBgCardRef = el as HTMLElement }"
              class="card-stack-layer"
              :style="{
                transform: `translateY(24px) scale(0.96)`,
                zIndex: MAX_STACK - idx,
              }"
            >
              <div class="card-back">
                <div class="card-back-pattern">
                  <div class="card-back-border"></div>
                  <div class="card-back-center-icon">✦</div>
                </div>
              </div>
            </div>

            <!-- 顶部卡片区域 -->
            <div
              ref="topCardRef"
              class="card-stack-top"
            >
              <!-- 翻转阶段：显示卡牌背面 -->
              <div v-if="animPhase === 'flipping'" class="card-back">
                <div class="card-back-pattern">
                  <div class="card-back-border"></div>
                  <div class="card-back-center-icon">✦</div>
                </div>
              </div>

              <!-- 正常 / front 阶段：显示正面 TaskCard -->
              <TaskCard
                v-if="animPhase === 'idle' || animPhase === 'front'"
                :key="cardKey"
                :task="topItem.task"
                :remaining-count="topItem.totalCount - topItem.completedCount"
                :total-count="topItem.totalCount"
                :disable-left="isLastRemaining"
                @swipe="handleSwipe"
              />
            </div>
          </div>
        </template>

        <!-- 今日已全部完成 -->
        <div
          v-else-if="allDone"
          class="flex flex-col items-center justify-center px-8 py-16"
        >
          <div class="mb-6">
            <IconParty :size="64" color="var(--primary)" />
          </div>
          <h3 class="text-xl font-bold mb-2" style="color: var(--text-primary);">
            {{ t('home.allDoneTitle') }}
          </h3>
          <p class="text-sm text-center leading-relaxed" style="color: var(--text-muted);">
            {{ t('home.allDoneMsg1') }}<br/>
            {{ t('home.allDoneMsg2') }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.card-stack-container {
  position: relative;
}

.typing-cursor {
  display: inline;
  animation: blink 1s step-end infinite;
  color: var(--text-muted);
  font-weight: 300;
}

@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.card-stack-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  pointer-events: none;
}

.card-stack-top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
}

.card-back {
  border-radius: 1.5rem;
  margin: 0 1rem;
  min-height: 340px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 50%, var(--primary) 100%);
  position: relative;
  overflow: hidden;
}

.card-back-pattern {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-back-border {
  position: absolute;
  inset: 12px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  border-radius: 1.2rem;
}

.card-back-center-icon {
  font-size: 48px;
  color: rgba(255, 255, 255, 0.25);
  z-index: 1;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
</style>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import TabBar from './components/TabBar.vue'
import AppToast from './components/AppToast.vue'
import HomeView from './views/HomeView.vue'
import PendingView from './views/PendingView.vue'
import SettingsView from './views/SettingsView.vue'
import CompletedView from './views/CompletedView.vue'
import IconSettings from './components/icons/IconSettings.vue'
import SwipeIndicator from './components/SwipeIndicator.vue'
import { usePageSwipe } from './composables/usePageSwipe'

const { t } = useI18n()
const {
  translateX,
  containerWidth,
  settingsOpen,
  verticalIndex,
  verticalTranslateY,
  verticalDragOffset,
  verticalSwipeDirection,
  scrollAreaHeight,
  headerHeight,
  tabBarHeight,
  goToVerticalPage,
  completedPanelHeight,
  isVerticalDraggingRef,
  shouldRenderTarget,
  hasReachedThreshold,
} = usePageSwipe()

// Morph progress: 0 (flat bar) → 1 (full chevron) based on drag distance relative to threshold
const morphProgress = computed(() => {
  if (!isVerticalDraggingRef.value) return 0
  const maxPull = scrollAreaHeight.value * 0.35 // V_MAX_PULL_RATIO
  const thresholdDist = maxPull * 0.35 // V_SNAP_THRESHOLD
  return Math.min(1, Math.abs(verticalDragOffset.value) / thresholdDist)
})

const pendingHeaderRef = ref<HTMLElement | null>(null)
const completedPanelRef = ref<HTMLElement | null>(null)

const showSettings = ref(false)
const settingsPanelOffset = ref(0)
const settingsIsDragging = ref(false)
let settingsStartX = 0
let settingsStartY = 0
let settingsDirectionLocked: 'horizontal' | 'vertical' | null = null
let settingsClosing = false

function openSettings() {
  showSettings.value = true
  settingsOpen.value = true
  settingsClosing = false
  settingsPanelOffset.value = window.innerWidth
  const start = window.innerWidth
  const duration = 300
  const startTime = performance.now()

  function tick(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
    settingsPanelOffset.value = start * (1 - eased)
    if (progress < 1) {
      requestAnimationFrame(tick)
    }
  }
  requestAnimationFrame(tick)
}

function closeSettings() {
  if (settingsClosing) return
  settingsClosing = true
  settingsIsDragging.value = false
  const start = settingsPanelOffset.value
  const target = window.innerWidth
  const duration = 250
  const startTime = performance.now()

  function tick(now: number) {
    const elapsed = now - startTime
    const progress = Math.min(elapsed / duration, 1)
    const eased = 1 - Math.pow(1 - progress, 3)
    settingsPanelOffset.value = start + (target - start) * eased

    if (progress < 1) {
      requestAnimationFrame(tick)
    } else {
      showSettings.value = false
      settingsPanelOffset.value = 0
      settingsOpen.value = false
      settingsClosing = false
    }
  }
  requestAnimationFrame(tick)
}

let resizeObserver: ResizeObserver | null = null

function measureCompletedPanel() {
  if (completedPanelRef.value) {
    const h = completedPanelRef.value.offsetHeight
    if (h > 0) {
      completedPanelHeight.value = h
    }
  }
}

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect()
    resizeObserver = null
  }
})

onMounted(async () => {
  await nextTick()
  if (pendingHeaderRef.value) {
    headerHeight.value = pendingHeaderRef.value.offsetHeight
  }
  // TabBar is position:fixed, query it directly
  const tabBarEl = document.querySelector('nav.fixed')
  if (tabBarEl) {
    tabBarHeight.value = tabBarEl.getBoundingClientRect().height
  }
  measureCompletedPanel()

  // Use ResizeObserver to track CompletedView height changes
  if (completedPanelRef.value) {
    resizeObserver = new ResizeObserver(() => {
      measureCompletedPanel()
    })
    resizeObserver.observe(completedPanelRef.value)
  }

  if (Capacitor.isNativePlatform()) {
    CapApp.addListener('backButton', () => {
      if (showSettings.value) {
        closeSettings()
      } else if (verticalIndex.value === 0) {
        goToVerticalPage(1)
      } else {
        CapApp.exitApp()
      }
    })
  }
})

function onSettingsTouchStart(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  settingsStartX = touch.clientX
  settingsStartY = touch.clientY
  settingsIsDragging.value = false
  settingsDirectionLocked = null
}

function onSettingsTouchMove(e: TouchEvent) {
  const touch = e.touches[0]
  if (!touch) return
  const dx = touch.clientX - settingsStartX
  const dy = touch.clientY - settingsStartY

  if (!settingsDirectionLocked) {
    if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
    settingsDirectionLocked = Math.abs(dx) >= Math.abs(dy) ? 'horizontal' : 'vertical'
  }

  if (settingsDirectionLocked !== 'horizontal') return

  if (dx > 0) {
    settingsIsDragging.value = true
    settingsPanelOffset.value = dx
  }
}

function onSettingsTouchEnd() {
  if (!settingsIsDragging.value) {
    settingsDirectionLocked = null
    return
  }
  settingsIsDragging.value = false
  settingsDirectionLocked = null

  const width = window.innerWidth
  if (settingsPanelOffset.value > width * 0.25) {
    closeSettings()
  } else {
    const start = settingsPanelOffset.value
    const duration = 200
    const startTime = performance.now()

    function tick(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      settingsPanelOffset.value = start * (1 - eased)
      if (progress < 1) {
        requestAnimationFrame(tick)
      }
    }
    requestAnimationFrame(tick)
  }
}
</script>

<template>
  <div class="h-full flex flex-col overflow-hidden" style="background-color: var(--bg-primary); transition: background-color 0.3s ease;">
    <main class="flex-1 overflow-hidden">
      <div
        class="h-full flex"
        :style="{
          width: containerWidth * 2 + 'px',
          transform: `translateX(${translateX}px)`,
          willChange: 'transform',
        }"
      >
        <!-- Horizontal page 0: HomeView -->
        <div :style="{ width: containerWidth + 'px', flexShrink: 0 }" class="h-full">
          <HomeView />
        </div>

        <!-- Horizontal page 1: Fixed header + Vertical swipe container -->
        <div :style="{ width: containerWidth + 'px', flexShrink: 0 }" class="h-full flex flex-col overflow-hidden">
          <!-- Fixed header (does not scroll with vertical swipe) -->
          <header ref="pendingHeaderRef" class="u-page-header flex items-center justify-between" style="flex-shrink: 0;">
            <h1
              class="text-2xl font-bold"
              style="color: var(--text-primary);"
            >
              {{ t('todos.title') }}
            </h1>
            <button
              @click="openSettings"
              class="settings-btn"
            >
              <IconSettings :size="26" color="var(--text-muted)" />
            </button>
          </header>

          <!-- Vertical swipe area -->
          <div class="flex-1 overflow-hidden relative">
            <div
              class="flex flex-col"
              :style="{
                transform: `translateY(${verticalTranslateY}px)`,
                willChange: 'transform',
              }"
            >
              <!-- CompletedView (full height) -->
              <div
                ref="completedPanelRef"
                style="flex-shrink: 0; position: relative;"
                :style="{ visibility: verticalIndex === 0 || shouldRenderTarget ? 'visible' : 'hidden' }"
              >
                <div class="completed-section" :style="{ height: scrollAreaHeight + 'px' }">
                  <CompletedView />
                </div>
              </div>
              <!-- PendingView (full height) -->
              <div
                :style="{
                  height: scrollAreaHeight + 'px',
                  flexShrink: 0,
                  visibility: verticalIndex === 1 || shouldRenderTarget ? 'visible' : 'hidden',
                }"
                class="overflow-hidden relative"
              >
                <PendingView />
              </div>
            </div>
            <!-- Swipe overlay: covers only the exposed blank area during drag -->
            <Transition name="overlay-fade">
              <div
                v-if="isVerticalDraggingRef && verticalSwipeDirection"
                class="swipe-overlay"
                :class="verticalSwipeDirection === 'up' ? 'swipe-overlay--up' : 'swipe-overlay--down'"
                :style="{
                  ...(verticalSwipeDirection === 'down'
                    ? { top: '0', bottom: 'auto', height: Math.abs(verticalDragOffset) + 'px' }
                    : { bottom: '0', top: 'auto', height: Math.abs(verticalDragOffset) + 'px' }
                  ),
                }"
              >
                <div class="swipe-overlay-content">
                  <Transition name="text-fade">
                    <span v-if="hasReachedThreshold && verticalSwipeDirection === 'up'" class="swipe-overlay-text">{{ t('swipeOverlay.current') }}</span>
                  </Transition>
                  <SwipeIndicator
                    :progress="morphProgress"
                    :direction="verticalSwipeDirection === 'down' ? 'up' : 'down'"
                  />
                  <Transition name="text-fade">
                    <span v-if="hasReachedThreshold && verticalSwipeDirection === 'down'" class="swipe-overlay-text">{{ t('swipeOverlay.history') }}</span>
                  </Transition>
                </div>
              </div>
            </Transition>
          </div>
        </div>
      </div>
    </main>

    <TabBar />
    <AppToast />

    <!-- Settings panel (slide from right) -->
    <div
      v-show="showSettings"
      class="fixed inset-0 z-[200]"
      @touchstart.passive="onSettingsTouchStart"
      @touchmove="onSettingsTouchMove"
      @touchend.passive="onSettingsTouchEnd"
    >
      <div
        class="settings-mask"
        :style="{ opacity: Math.max(0, 1 - settingsPanelOffset / (containerWidth || 1)) }"
        @click="closeSettings"
      ></div>
      <div
        class="settings-slide-panel"
        :style="{
          transform: `translateX(${settingsPanelOffset}px)`,
        }"
      >
        <SettingsView @close="closeSettings" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.settings-btn {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  border: none;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
}
.settings-btn:active {
  transform: scale(0.92);
}

.completed-section {
  overflow: hidden;
}

.settings-slide-panel {
  position: absolute;
  top: 0;
  left: 0;
  bottom: 0;
  width: 100%;
  z-index: 1;
  background-color: var(--bg-primary);
}

.settings-mask {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.3);
}

/* ─── Swipe overlay ─── */
.swipe-overlay {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  background-color: var(--bg-primary);
  overflow: hidden;
}

.swipe-overlay--down {
  justify-content: flex-end;
  padding-bottom: 12px;
}

.swipe-overlay--up {
  justify-content: flex-start;
  padding-top: 12px;
}

.swipe-overlay-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
}

.swipe-overlay-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 2px;
}

.text-fade-enter-active {
  transition: opacity 0.15s ease;
}
.text-fade-enter-from {
  opacity: 0;
}

.overlay-fade-leave-active {
  transition: opacity 0.2s ease;
}
.overlay-fade-leave-to {
  opacity: 0;
}
</style>

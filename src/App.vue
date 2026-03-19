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
  pendingAtTop,
  completedAtBottom,
  indicatorHeight,
} = usePageSwipe()

const morphProgress = computed(() => {
  if (verticalDragOffset.value === 0) return 0
  const maxPull = scrollAreaHeight.value * 0.08 // V_MAX_PULL_RATIO
  const thresholdDist = maxPull * 0.7 // morph reaches 1.0 at 70% of maxPull
  return Math.min(1, Math.abs(verticalDragOffset.value) / thresholdDist)
})

// Text opacity: smoothly fades in/out based on morphProgress (0.7~1.0 range)
// This replaces the v-if + Transition approach for symmetric appear/disappear animation
const textOpacity = computed(() => {
  if (!verticalSwipeDirection.value) return 0
  const fadeStart = 0.7
  if (morphProgress.value <= fadeStart) return 0
  return Math.min(1, (morphProgress.value - fadeStart) / (1 - fadeStart))
})

// Indicator direction: which way the chevron points when morphed
const indicatorDirection = computed<'up' | 'down'>(() => {
  if (verticalSwipeDirection.value === 'down') return 'up'
  if (verticalSwipeDirection.value === 'up') return 'down'
  // At rest: show direction based on current view
  return verticalIndex.value === 1 ? 'up' : 'down'
})

// Indicator vertical position (px from top of scroll area)
// Mostly fixed, but shifts slightly (up to ~10px) during drag for subtle visual feedback
const INDICATOR_MAX_SHIFT = 10
const indicatorTop = computed(() => {
  const areaH = scrollAreaHeight.value
  const shift = morphProgress.value * INDICATOR_MAX_SHIFT
  if (verticalIndex.value === 1) {
    // PendingView: resting at top, shifts down slightly when pulling
    return verticalDragOffset.value > 0 ? shift : 0
  } else {
    // CompletedView: resting at bottom, shifts up slightly when pulling
    return verticalDragOffset.value < 0 ? areaH - 20 - shift : areaH - 20
  }
})

// Text label position (independent from indicator, positioned inside overlay area)
const textLabelTop = computed(() => {
  if (verticalSwipeDirection.value === 'down') {
    // Pulling down from PendingView: text appears below indicator (inside overlay)
    return 40 // indicator height (~20px) + generous gap
  }
  if (verticalSwipeDirection.value === 'up') {
    // Pulling up from CompletedView: text appears above indicator (inside overlay)
    const areaH = scrollAreaHeight.value
    return areaH - 40 - 20 // from bottom: 20px indicator + generous gap
  }
  return 0
})

// Whether the swipe indicator should be visible at rest
// Hidden when the list has scrolled away from the boundary where the indicator sits
// Always visible during vertical drag
const indicatorVisible = computed(() => {
  if (isVerticalDraggingRef.value || verticalDragOffset.value !== 0) return true
  if (verticalIndex.value === 1) {
    // PendingView: indicator at top, hide when list scrolled down
    return pendingAtTop.value
  } else {
    // CompletedView: indicator at bottom, hide when list scrolled up
    return completedAtBottom.value
  }
})

const pendingHeaderRef = ref<HTMLElement | null>(null)
const completedPanelRef = ref<HTMLElement | null>(null)
const indicatorGroupRef = ref<HTMLElement | null>(null)

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

  // Measure indicator height for dynamic padding in views
  if (indicatorGroupRef.value) {
    indicatorHeight.value = indicatorGroupRef.value.offsetHeight
  }

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

            <!-- Swipe overlay: covers only the exposed blank area during drag (background only) -->
            <Transition name="overlay-fade">
              <div
                v-if="isVerticalDraggingRef && verticalSwipeDirection"
                class="swipe-overlay"
                :style="{
                  ...(verticalSwipeDirection === 'down'
                    ? { top: '0', bottom: 'auto', height: Math.abs(verticalDragOffset) + 'px' }
                    : { bottom: '0', top: 'auto', height: Math.abs(verticalDragOffset) + 'px' }
                  ),
                }"
              >
              </div>
            </Transition>

            <!-- SwipeIndicator: fixed position, only morphs shape during drag -->
            <div
              class="swipe-indicator-anchor"
              :style="{
                top: indicatorTop + 'px',
                zIndex: 60,
                opacity: indicatorVisible ? 1 : 0,
                transition: 'opacity 0.2s ease',
                pointerEvents: 'none',
              }"
            >
              <div ref="indicatorGroupRef" class="swipe-indicator-group">
                <SwipeIndicator
                  :progress="morphProgress"
                  :direction="indicatorDirection"
                />
              </div>
            </div>

            <!-- Text label: independently positioned inside overlay area -->
            <div
              v-if="isVerticalDraggingRef && verticalSwipeDirection"
              class="swipe-text-label"
              :style="{
                top: textLabelTop + 'px',
                opacity: textOpacity,
                zIndex: 61,
                pointerEvents: 'none',
              }"
            >
              <span class="swipe-overlay-text">
                {{ verticalSwipeDirection === 'up' ? t('swipeOverlay.current') : t('swipeOverlay.history') }}
              </span>
            </div>
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

/* ─── Swipe indicator (single, always visible) ─── */
.swipe-indicator-anchor {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
}

.swipe-indicator-group {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ─── Swipe overlay (background only) ─── */
.swipe-overlay {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 50;
  pointer-events: none;
  background-color: var(--bg-primary);
  overflow: hidden;
}

/* ─── Text label (independently positioned inside overlay) ─── */
.swipe-text-label {
  position: absolute;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
  transition: opacity 0.15s ease;
}

.swipe-overlay-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 2px;
  line-height: 20px;
}

.overlay-fade-leave-active {
  transition: opacity 0.2s ease;
}
.overlay-fade-leave-to {
  opacity: 0;
}
</style>

<template>
  <div class="swipe-indicator" :style="rootStyle">
    <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" fill="none">
      <path
        :d="pathD"
        stroke="var(--text-muted)"
        :stroke-width="strokeWidth"
        stroke-linecap="round"
        stroke-linejoin="round"
        :stroke-opacity="opacity"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  /** Morph progress: 0 = flat bar, 1 = full chevron */
  progress?: number
  /** Chevron direction when fully morphed */
  direction?: 'up' | 'down'
  /** Overall width of the SVG canvas */
  width?: number
  /** Overall height of the SVG canvas */
  height?: number
}>(), {
  progress: 0,
  direction: 'down',
  width: 40,
  height: 24,
})

// Stroke width: flat bar is thicker (4), chevron is thinner (2.5)
const strokeWidth = computed(() => {
  const t = clamp(props.progress)
  return 4 - 1.5 * t // 4 → 2.5
})

// Opacity: flat bar is 0.3, chevron is 0.6
const opacity = computed(() => {
  const t = clamp(props.progress)
  return 0.3 + 0.3 * t // 0.3 → 0.6
})

// Root style: scale up slightly as it morphs
const rootStyle = computed(() => {
  const t = clamp(props.progress)
  const scale = 1 + 0.15 * t // 1.0 → 1.15
  return { transform: `scale(${scale})` }
})

/**
 * SVG path that morphs from a horizontal line to a chevron.
 *
 * Flat bar (progress=0):
 *   M 0, midY  L width, midY
 *
 * Chevron (progress=1):
 *   direction=down: M 4, midY-6  L midX, midY+6  L width-4, midY-6
 *   direction=up:   M 4, midY+6  L midX, midY-6  L width-4, midY+6
 */
const pathD = computed(() => {
  const t = clamp(props.progress)
  const w = props.width
  const h = props.height
  const midX = w / 2
  const midY = h / 2

  // End-point horizontal inset: 0 → 4
  const inset = 4 * t
  // End-point vertical offset from midY: 0 → 6
  const endDy = 6 * t
  // Mid-point vertical offset from midY: 0 → 6
  const midDy = 6 * t

  const isDown = props.direction === 'down'

  // Left point
  const lx = inset
  const ly = midY + (isDown ? -endDy : endDy)

  // Center point
  const cx = midX
  const cy = midY + (isDown ? midDy : -midDy)

  // Right point
  const rx = w - inset
  const ry = ly // symmetrical

  return `M ${lx},${ly} L ${cx},${cy} L ${rx},${ry}`
})

function clamp(v: number): number {
  return Math.max(0, Math.min(1, v))
}
</script>

<style scoped>
.swipe-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  transition: transform 0.05s linear;
}
</style>

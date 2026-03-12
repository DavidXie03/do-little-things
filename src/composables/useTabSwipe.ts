import { onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const TAB_PATHS = ['/', '/todos', '/settings']
const SWIPE_THRESHOLD = 60
const VERTICAL_LIMIT = 80

/**
 * 在 App 层面监听水平滑动手势以切换 Tab
 * 排除卡片区域（通过检测 touch-none 类名）
 */
export function useTabSwipe() {
  const router = useRouter()
  const route = useRoute()

  let startX = 0
  let startY = 0
  let isTracking = false

  function handleTouchStart(e: TouchEvent) {
    const touch = e.touches[0]
    if (!touch) return

    // 检查触摸点是否在卡片区域内（有 touch-none 类的元素或其子元素）
    const target = e.target as HTMLElement
    if (target.closest('.touch-none') || target.closest('[data-no-tab-swipe]')) {
      isTracking = false
      return
    }

    startX = touch.clientX
    startY = touch.clientY
    isTracking = true
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!isTracking) return
    isTracking = false

    const touch = e.changedTouches[0]
    if (!touch) return

    const dx = touch.clientX - startX
    const dy = touch.clientY - startY

    // 只在水平滑动距离足够大且垂直距离较小时触发
    if (Math.abs(dx) < SWIPE_THRESHOLD) return
    if (Math.abs(dy) > VERTICAL_LIMIT) return

    const currentIdx = TAB_PATHS.indexOf(route.path)
    if (currentIdx === -1) return

    if (dx < 0 && currentIdx < TAB_PATHS.length - 1) {
      router.push(TAB_PATHS[currentIdx + 1])
    } else if (dx > 0 && currentIdx > 0) {
      router.push(TAB_PATHS[currentIdx - 1])
    }
  }

  onMounted(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchend', handleTouchEnd, { passive: true })
  })

  onUnmounted(() => {
    document.removeEventListener('touchstart', handleTouchStart)
    document.removeEventListener('touchend', handleTouchEnd)
  })
}

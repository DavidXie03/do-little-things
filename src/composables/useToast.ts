import { ref } from 'vue'

export type ToastType = 'success' | 'info' | 'error'

interface ToastState {
  message: string
  type: ToastType
  visible: boolean
}

const state = ref<ToastState>({
  message: '',
  type: 'info',
  visible: false,
})

let timer: ReturnType<typeof setTimeout> | null = null

export function useToast() {
  function showToast(message: string, type: ToastType = 'info', duration = 2000) {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    state.value = { message, type, visible: true }

    timer = setTimeout(() => {
      state.value.visible = false
      timer = null
    }, duration)
  }

  function hideToast() {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    state.value.visible = false
  }

  return {
    state,
    showToast,
    hideToast,
  }
}

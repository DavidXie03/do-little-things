import { ref, watch } from 'vue'

const STORAGE_KEY = 'do-little-things-dark-mode'

const isDark = ref(false)

function loadTheme() {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved !== null) {
    isDark.value = saved === 'true'
  } else {
    isDark.value = false
  }
  applyTheme()
}

function applyTheme() {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

function toggleDark(value?: boolean) {
  isDark.value = value !== undefined ? value : !isDark.value
  localStorage.setItem(STORAGE_KEY, String(isDark.value))
  applyTheme()
}

// 初始化
loadTheme()

export function useTheme() {
  return {
    isDark,
    toggleDark,
  }
}

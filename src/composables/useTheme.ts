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
  const targets = [document.documentElement, document.body]
  if (isDark.value) {
    targets.forEach(el => {
      el.classList.add('dark')
      el.setAttribute('data-theme', 'dark')
    })
  } else {
    targets.forEach(el => {
      el.classList.remove('dark')
      el.removeAttribute('data-theme')
    })
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

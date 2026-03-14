import { ref } from 'vue'

const DARK_STORAGE_KEY = 'do-little-things-dark-mode'
const COLOR_STORAGE_KEY = 'do-little-things-color-theme'

export type ColorTheme = 'purple' | 'teal'

export interface ThemeColorSet {
  primary: string
  primaryLight: string
  toastInfoBg: string
  toastInfoText: string
  toastInfoBgDark: string
  toastInfoTextDark: string
}

export const COLOR_THEMES: Record<ColorTheme, ThemeColorSet> = {
  purple: {
    primary: '#6C63FF',
    primaryLight: '#8B83FF',
    toastInfoBg: 'rgba(108, 99, 255, 0.12)',
    toastInfoText: '#6C63FF',
    toastInfoBgDark: 'rgba(108, 99, 255, 0.2)',
    toastInfoTextDark: '#8B83FF',
  },
  teal: {
    primary: '#0EA5A5',
    primaryLight: '#2DD4BF',
    toastInfoBg: 'rgba(14, 165, 165, 0.12)',
    toastInfoText: '#0EA5A5',
    toastInfoBgDark: 'rgba(14, 165, 165, 0.2)',
    toastInfoTextDark: '#2DD4BF',
  },
}

const isDark = ref(false)
const colorTheme = ref<ColorTheme>('purple')

function loadTheme() {
  // Dark mode
  const savedDark = localStorage.getItem(DARK_STORAGE_KEY)
  if (savedDark !== null) {
    isDark.value = savedDark === 'true'
  } else {
    isDark.value = false
  }

  // Color theme
  const savedColor = localStorage.getItem(COLOR_STORAGE_KEY) as ColorTheme | null
  if (savedColor && COLOR_THEMES[savedColor]) {
    colorTheme.value = savedColor
  } else {
    colorTheme.value = 'purple'
  }

  applyTheme()
}

function applyTheme() {
  const targets = [document.documentElement, document.body]

  // Dark mode
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

  // Color theme — set CSS variables on :root
  const colors = COLOR_THEMES[colorTheme.value]
  const root = document.documentElement
  root.style.setProperty('--primary', colors.primary)
  root.style.setProperty('--primary-light', colors.primaryLight)
  root.style.setProperty('--toast-info-bg', isDark.value ? colors.toastInfoBgDark : colors.toastInfoBg)
  root.style.setProperty('--toast-info-text', isDark.value ? colors.toastInfoTextDark : colors.toastInfoText)
}

function toggleDark(value?: boolean) {
  isDark.value = value !== undefined ? value : !isDark.value
  localStorage.setItem(DARK_STORAGE_KEY, String(isDark.value))
  applyTheme()
}

function setColorTheme(theme: ColorTheme) {
  colorTheme.value = theme
  localStorage.setItem(COLOR_STORAGE_KEY, theme)
  applyTheme()
}

loadTheme()

export function useTheme() {
  return {
    isDark,
    colorTheme,
    toggleDark,
    setColorTheme,
  }
}

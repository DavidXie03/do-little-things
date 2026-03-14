import { ref } from 'vue'

const DARK_STORAGE_KEY = 'do-little-things-dark-mode'
const COLOR_STORAGE_KEY = 'do-little-things-color-theme'

export type ColorTheme = 'purple' | 'blue' | 'green'

export interface ThemeColorSet {
  primary: string
  primaryLight: string
  secondary: string
  secondaryLight: string
  toastInfoBg: string
  toastInfoText: string
  toastInfoBgDark: string
  toastInfoTextDark: string
  toastSuccessBg: string
  toastSuccessText: string
  toastSuccessBgDark: string
  toastSuccessTextDark: string
}

export const COLOR_THEMES: Record<ColorTheme, ThemeColorSet> = {
  purple: {
    primary: '#6C63FF',
    primaryLight: '#8B83FF',
    secondary: '#4ECDC4',
    secondaryLight: '#6FE4DC',
    toastInfoBg: 'rgba(108, 99, 255, 0.12)',
    toastInfoText: '#6C63FF',
    toastInfoBgDark: 'rgba(108, 99, 255, 0.2)',
    toastInfoTextDark: '#8B83FF',
    toastSuccessBg: 'rgba(78, 205, 196, 0.15)',
    toastSuccessText: '#4ECDC4',
    toastSuccessBgDark: 'rgba(78, 205, 196, 0.2)',
    toastSuccessTextDark: '#6FE4DC',
  },
  blue: {
    primary: '#0EA5E9',
    primaryLight: '#38BDF8',
    secondary: '#F97316',
    secondaryLight: '#FB923C',
    toastInfoBg: 'rgba(14, 165, 233, 0.12)',
    toastInfoText: '#0EA5E9',
    toastInfoBgDark: 'rgba(14, 165, 233, 0.2)',
    toastInfoTextDark: '#38BDF8',
    toastSuccessBg: 'rgba(249, 115, 22, 0.15)',
    toastSuccessText: '#F97316',
    toastSuccessBgDark: 'rgba(249, 115, 22, 0.2)',
    toastSuccessTextDark: '#FB923C',
  },
  green: {
    primary: '#059669',
    primaryLight: '#34D399',
    secondary: '#E11D48',
    secondaryLight: '#FB7185',
    toastInfoBg: 'rgba(5, 150, 105, 0.12)',
    toastInfoText: '#059669',
    toastInfoBgDark: 'rgba(5, 150, 105, 0.2)',
    toastInfoTextDark: '#34D399',
    toastSuccessBg: 'rgba(225, 29, 72, 0.15)',
    toastSuccessText: '#E11D48',
    toastSuccessBgDark: 'rgba(225, 29, 72, 0.2)',
    toastSuccessTextDark: '#FB7185',
  },
}

const isDark = ref(false)
const colorTheme = ref<ColorTheme>('purple')

function loadTheme() {
  const savedDark = localStorage.getItem(DARK_STORAGE_KEY)
  if (savedDark !== null) {
    isDark.value = savedDark === 'true'
  } else {
    isDark.value = false
  }

  const savedColor = localStorage.getItem(COLOR_STORAGE_KEY) as string | null
  const MIGRATION: Record<string, ColorTheme> = { ocean: 'blue', forest: 'green' }
  const migrated = savedColor && MIGRATION[savedColor] ? MIGRATION[savedColor] : savedColor
  if (migrated && COLOR_THEMES[migrated as ColorTheme]) {
    colorTheme.value = migrated as ColorTheme
  } else {
    colorTheme.value = 'purple'
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

  const colors = COLOR_THEMES[colorTheme.value]
  const root = document.documentElement
  root.style.setProperty('--primary', colors.primary)
  root.style.setProperty('--primary-light', colors.primaryLight)
  root.style.setProperty('--secondary', colors.secondary)
  root.style.setProperty('--secondary-light', colors.secondaryLight)
  root.style.setProperty('--toast-info-bg', isDark.value ? colors.toastInfoBgDark : colors.toastInfoBg)
  root.style.setProperty('--toast-info-text', isDark.value ? colors.toastInfoTextDark : colors.toastInfoText)
  root.style.setProperty('--toast-success-bg', isDark.value ? colors.toastSuccessBgDark : colors.toastSuccessBg)
  root.style.setProperty('--toast-success-text', isDark.value ? colors.toastSuccessTextDark : colors.toastSuccessText)
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

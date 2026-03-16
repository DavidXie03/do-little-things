import { ref } from 'vue'

const DARK_STORAGE_KEY = 'flip-a-little-dark-mode'
const COLOR_STORAGE_KEY = 'flip-a-little-color-theme'

export type ColorTheme = 'purple' | 'blue'

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
    toastInfoBg: '#ECEAFF',
    toastInfoText: '#6C63FF',
    toastInfoBgDark: '#2A2850',
    toastInfoTextDark: '#8B83FF',
    toastSuccessBg: '#E2F7F5',
    toastSuccessText: '#4ECDC4',
    toastSuccessBgDark: '#1C3735',
    toastSuccessTextDark: '#6FE4DC',
  },
  blue: {
    primary: '#0EA5E9',
    primaryLight: '#38BDF8',
    secondary: '#F472B6',
    secondaryLight: '#F9A8D4',
    toastInfoBg: '#E0F2FE',
    toastInfoText: '#0EA5E9',
    toastInfoBgDark: '#1A3344',
    toastInfoTextDark: '#38BDF8',
    toastSuccessBg: '#FDE8F0',
    toastSuccessText: '#F472B6',
    toastSuccessBgDark: '#3D2233',
    toastSuccessTextDark: '#F9A8D4',
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
  const MIGRATION: Record<string, ColorTheme> = { ocean: 'blue', forest: 'purple' }
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

import { ref } from 'vue'

const DARK_STORAGE_KEY = 'do-little-things-dark-mode'
const COLOR_STORAGE_KEY = 'do-little-things-color-theme'

export type ColorTheme = 'purple' | 'ocean' | 'sunset' | 'forest' | 'rose'

export interface ThemeColorSet {
  primary: string
  primaryLight: string
  secondary: string
  secondaryLight: string
  toastInfoBg: string
  toastInfoText: string
  toastInfoBgDark: string
  toastInfoTextDark: string
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
  },
  ocean: {
    primary: '#0EA5E9',
    primaryLight: '#38BDF8',
    secondary: '#06B6D4',
    secondaryLight: '#22D3EE',
    toastInfoBg: 'rgba(14, 165, 233, 0.12)',
    toastInfoText: '#0EA5E9',
    toastInfoBgDark: 'rgba(14, 165, 233, 0.2)',
    toastInfoTextDark: '#38BDF8',
  },
  sunset: {
    primary: '#F97316',
    primaryLight: '#FB923C',
    secondary: '#EAB308',
    secondaryLight: '#FACC15',
    toastInfoBg: 'rgba(249, 115, 22, 0.12)',
    toastInfoText: '#F97316',
    toastInfoBgDark: 'rgba(249, 115, 22, 0.2)',
    toastInfoTextDark: '#FB923C',
  },
  forest: {
    primary: '#059669',
    primaryLight: '#34D399',
    secondary: '#0D9488',
    secondaryLight: '#2DD4BF',
    toastInfoBg: 'rgba(5, 150, 105, 0.12)',
    toastInfoText: '#059669',
    toastInfoBgDark: 'rgba(5, 150, 105, 0.2)',
    toastInfoTextDark: '#34D399',
  },
  rose: {
    primary: '#E11D48',
    primaryLight: '#FB7185',
    secondary: '#DB2777',
    secondaryLight: '#F472B6',
    toastInfoBg: 'rgba(225, 29, 72, 0.12)',
    toastInfoText: '#E11D48',
    toastInfoBgDark: 'rgba(225, 29, 72, 0.2)',
    toastInfoTextDark: '#FB7185',
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

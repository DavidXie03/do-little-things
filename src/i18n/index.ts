import { createI18n } from 'vue-i18n'
import zh from './zh'
import en from './en'

const LANG_STORAGE_KEY = 'do-little-things-lang'

function getSavedLanguage(): string {
  try {
    return localStorage.getItem(LANG_STORAGE_KEY) || 'zh'
  } catch {
    return 'zh'
  }
}

export function saveLanguage(lang: string): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang)
  } catch {
    // ignore
  }
}

const i18n = createI18n({
  legacy: false,
  locale: getSavedLanguage(),
  fallbackLocale: 'zh',
  messages: {
    zh,
    en,
  },
})

export default i18n

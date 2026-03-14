import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { storageData, saveData } from './storageCore'

export function useSlogan() {
  const { t } = useI18n()

  const showSloganModal = ref(false)
  const sloganInput = ref('')
  const tempShowSlogan = ref(true)
  const tempTypingEffect = ref(true)

  const displaySlogan = computed(() => {
    if (storageData.value.showSlogan === false) return t('settings.sloganOff')
    const custom = storageData.value.slogan
    if (custom && custom.trim()) return custom
    return t('home.defaultSlogan')
  })

  function openSloganModal() {
    sloganInput.value = storageData.value.slogan || ''
    tempShowSlogan.value = storageData.value.showSlogan !== false
    tempTypingEffect.value = storageData.value.typingEffect !== false
    showSloganModal.value = true
  }

  function saveSlogan() {
    const trimmed = sloganInput.value.trim()
    storageData.value.slogan = trimmed || undefined
    storageData.value.showSlogan = tempShowSlogan.value
    storageData.value.typingEffect = tempTypingEffect.value
    saveData(storageData.value)
    showSloganModal.value = false
  }

  return {
    showSloganModal,
    sloganInput,
    tempShowSlogan,
    tempTypingEffect,
    displaySlogan,
    openSloganModal,
    saveSlogan,
  }
}

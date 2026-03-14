<script setup lang="ts">
import { useToast } from '../composables/useToast'
import { Check, Info, AlertCircle } from 'lucide-vue-next'

const { state } = useToast()
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="state.visible"
        class="toast-container"
        :class="[`toast-${state.type}`]"
      >
        <component
          :is="state.type === 'success' ? Check : state.type === 'error' ? AlertCircle : Info"
          :size="18"
          class="toast-icon"
        />
        <span class="toast-message">{{ state.message }}</span>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.toast-container {
  position: fixed;
  bottom: calc(100px + var(--safe-area-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border-radius: 50px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  pointer-events: none;
  max-width: calc(100vw - 48px);
}

.toast-success {
  background: var(--toast-success-bg);
  color: var(--toast-success-text);
}

.toast-info {
  background: var(--toast-info-bg);
  color: var(--toast-info-text);
}

.toast-error {
  background: var(--toast-error-bg);
  color: var(--toast-error-text);
}

.toast-icon {
  flex-shrink: 0;
}

.toast-message {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toast-enter-active {
  transition: all 0.3s ease-out;
}

.toast-leave-active {
  transition: all 0.2s ease-in;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(10px);
}
</style>

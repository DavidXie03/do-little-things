<script setup lang="ts">
defineProps<{
  visible: boolean
  title?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()
</script>

<template>
  <Teleport to="body">
    <transition name="modal-fade">
      <div
        v-if="visible"
        class="fixed inset-0 z-[10000] flex items-center justify-center"
      >
        <div
          class="absolute inset-0 bg-black/30 backdrop-blur-sm"
          @click="emit('close')"
        ></div>
        <div
          class="relative w-[85%] max-w-sm rounded-2xl u-card u-gap-md"
          style="background: #FFFFFF; box-shadow: 0 20px 60px -12px rgba(0, 0, 0, 0.25); margin: 0 24px;"
        >
          <h3
            v-if="title"
            class="text-lg font-bold pb-1"
            style="color: var(--text-primary);"
          >
            {{ title }}
          </h3>

          <slot />
        </div>
      </div>
    </transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.25s ease;
}
.modal-fade-enter-active .relative,
.modal-fade-leave-active .relative {
  transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease;
}
.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}
.modal-fade-enter-from .relative {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}
.modal-fade-leave-to .relative {
  transform: scale(0.9) translateY(20px);
  opacity: 0;
}
</style>

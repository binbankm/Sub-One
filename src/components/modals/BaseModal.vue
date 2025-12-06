<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';

withDefaults(defineProps<{
  show: boolean;
  confirmKeyword?: string;
  size?: 'sm' | '2xl' | '4xl' | '6xl' | '7xl';
  confirmDisabled?: boolean;
  confirmButtonTitle?: string;
}>(), {
  size: 'sm',
  confirmDisabled: false,
  confirmButtonTitle: '确认'
});

const emit = defineEmits<{
  (e: 'update:show', value: boolean): void;
  (e: 'confirm'): void;
}>();

defineSlots<{
  title(props: {}): any;
  body(props: {}): any;
}>();

const confirmInput = ref('');

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('update:show', false);
  }
};

const handleConfirm = () => {
  emit('confirm');
  // 移除自动关闭，让调用方决定何时关闭
  // emit('update:show', false);
}

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div v-if="show" class="fixed inset-0 bg-black/60 z-[99] flex items-center justify-center p-4"
        @click="emit('update:show', false)">
        <Transition name="modal-inner">
          <div v-if="show"
            class="bg-white dark:bg-gray-900 rounded-3xl border border-gray-200 dark:border-gray-700 shadow-2xl w-full text-left flex flex-col max-h-[85vh]"
            :class="{
              'max-w-sm': size === 'sm',
              'max-w-2xl': size === '2xl',
              'max-w-4xl': size === '4xl',
              'max-w-6xl': size === '6xl',
              'max-w-7xl': size === '7xl'
            }" @click.stop>
            <div class="p-6 pb-4 flex-shrink-0">
              <slot name="title">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">确认操作</h3>
              </slot>
            </div>

            <div class="px-6 pb-6 flex-grow overflow-y-auto">
              <slot name="body">
                <p class="text-sm text-gray-500 dark:text-gray-400">你确定要继续吗？</p>
              </slot>
            </div>

            <div
              class="p-6 pt-4 flex justify-end space-x-3 flex-shrink-0 border-t border-gray-200 dark:border-gray-700">
              <button @click="emit('update:show', false)"
                class="px-6 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 hover:shadow-md">取消</button>
              <button @click="handleConfirm"
                :disabled="confirmDisabled || !!(confirmKeyword && confirmInput !== confirmKeyword)"
                :title="confirmDisabled ? confirmButtonTitle : '确认'"
                class="btn-modern px-6 py-2.5 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed">确认</button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

.modal-inner-enter-active,
.modal-inner-leave-active {
  transition: all 0.25s ease;
}

.modal-inner-enter-from,
.modal-inner-leave-to {
  opacity: 0;
  transform: scale(0.95);
}
</style>

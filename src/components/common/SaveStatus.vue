<template>
  <Transition name="slide-fade">
    <div v-if="dirty" class="p-4 mb-6 lg:mb-8 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 ring-1 ring-inset ring-indigo-500/30 flex items-center justify-between shadow-modern-enhanced">
      <p class="text-sm font-medium text-indigo-800 dark:text-indigo-200">您有未保存的更改</p>
      <div class="flex items-center gap-3">
        <button @click="$emit('discard')" class="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors hover-lift">
          放弃更改
        </button>
        <button 
          @click="$emit('save')" 
          :disabled="saveState !== 'idle'" 
          class="px-6 py-2.5 text-sm text-white font-semibold rounded-xl shadow-sm flex items-center justify-center transition-all duration-300 w-32 hover-lift" 
          :class="{
            'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700': saveState === 'idle', 
            'bg-gray-500 cursor-not-allowed': saveState === 'saving', 
            'bg-gradient-to-r from-green-500 to-emerald-600 cursor-not-allowed': saveState === 'success' 
          }"
        >
          <div v-if="saveState === 'saving'" class="flex items-center">
            <svg class="animate-spin h-5 w-5 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>保存中...</span>
          </div>
          <div v-else-if="saveState === 'success'" class="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span>已保存</span>
          </div>
          <span v-else>保存更改</span>
        </button>
      </div>
    </div>
  </Transition>
</template>

<script setup>
// Props
defineProps({
  dirty: {
    type: Boolean,
    required: true
  },
  saveState: {
    type: String,
    default: 'idle'
  }
});

// Emits
defineEmits(['save', 'discard']);
</script>

<style scoped>
.slide-fade-enter-active, 
.slide-fade-leave-active { 
  transition: all 0.3s ease-out; 
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}
</style>

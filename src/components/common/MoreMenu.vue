<template>
  <div class="relative" ref="menuRef">
    <button @click="showMenu = !showMenu" class="p-4 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors hover-lift">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-gray-600 dark:text-gray-300" viewBox="0 0 20 20" fill="currentColor">
        <path d="M6 10a2 2 0 11-4 0 2 2 0 014 0zM12 10a2 2 0 11-4 0 2 2 0 014 0zM16 12a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
    </button>
    
    <Transition name="slide-fade-sm">
      <div v-if="showMenu" class="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-xl z-10 ring-1 ring-black ring-opacity-5" :class="menuWidth">
        <slot></slot>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

// Props
defineProps({
  menuWidth: {
    type: String,
    default: 'w-40'
  }
});

// Local state
const showMenu = ref(false);
const menuRef = ref(null);

// Click outside handler
const handleClickOutside = (event) => {
  if (showMenu.value && menuRef.value && !menuRef.value.contains(event.target)) {
    showMenu.value = false;
  }
};

// Lifecycle
onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});

// Expose methods
defineExpose({
  close: () => {
    showMenu.value = false;
  }
});
</script>

<style scoped>
.slide-fade-sm-enter-active,
.slide-fade-sm-leave-active {
  transition: all 0.2s ease-out;
}

.slide-fade-sm-enter-from,
.slide-fade-sm-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}
</style>

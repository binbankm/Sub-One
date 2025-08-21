<template>
  <div v-if="totalPages > 1" class="flex justify-center items-center space-x-6 mt-10 text-base font-medium">
    <button 
      @click="handlePageChange(currentPage - 1)" 
      :disabled="currentPage === 1" 
      class="px-6 py-3 rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift"
    >
      &laquo; 上一页
    </button>
    
    <span class="text-gray-500 dark:text-gray-400">
      第 {{ currentPage }} / {{ totalPages }} 页
    </span>
    
    <button 
      @click="handlePageChange(currentPage + 1)" 
      :disabled="currentPage === totalPages" 
      class="px-6 py-3 rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift"
    >
      下一页 &raquo;
    </button>
  </div>
</template>

<script setup>
// Props
defineProps({
  currentPage: {
    type: Number,
    required: true
  },
  totalPages: {
    type: Number,
    required: true
  }
});

// Emits
const emit = defineEmits(['page-change']);

// Methods
const handlePageChange = (page) => {
  if (page < 1 || page > props.totalPages) return;
  emit('page-change', page);
};
</script>

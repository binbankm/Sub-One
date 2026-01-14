<script setup lang="ts">
defineProps<{
  currentPage: number;
  totalPages: number;
}>();

defineEmits<{
  (e: 'change-page', page: number): void;
}>();
</script>

<template>
  <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 sm:gap-4 mt-10 text-base font-medium">
    <button @click="$emit('change-page', currentPage - 1)" :disabled="currentPage === 1"
      class="min-w-[70px] sm:min-w-[100px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift font-medium text-sm sm:text-base flex items-center justify-center">
      &laquo;<span class="hidden xs:inline ml-1">上一页</span>
    </button>
    
    <span class="min-w-[80px] sm:min-w-[100px] text-center text-xs sm:text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
      第{{ currentPage }}/{{ totalPages }}页
    </span>
    
    <button @click="$emit('change-page', currentPage + 1)" :disabled="currentPage === totalPages"
      class="min-w-[70px] sm:min-w-[100px] px-3 py-2 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl disabled:opacity-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors hover-lift font-medium text-sm sm:text-base flex items-center justify-center">
      <span class="hidden xs:inline mr-1">下一页</span>&raquo;
    </button>
  </div>
</template>

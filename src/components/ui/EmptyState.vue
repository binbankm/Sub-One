<script setup lang="ts">
defineProps<{
  title: string;
  description: string;
  iconColorClass?: string;
  bgGradientClass?: string;
}>();
</script>

<template>
  <div class="text-center py-20 lg:py-24 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl">
    <div class="w-24 h-24 mx-auto mb-8 rounded-3xl flex items-center justify-center"
      :class="bgGradientClass || 'bg-gradient-to-br from-gray-500/20 to-gray-400/20'">
      <slot name="icon">
        <!-- Default Icon if none provided -->
         <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12" :class="iconColorClass || 'text-gray-500'" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
           <path stroke-linecap="round" stroke-linejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
         </svg>
      </slot>
    </div>
    <h3 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced mb-3">{{ title }}</h3>
    <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">{{ description }}</p>
    <div class="mt-6">
      <slot name="action"></slot>
    </div>
  </div>
</template>

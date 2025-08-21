<template>
  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-6">
    <div class="flex items-center gap-4">
      <div class="w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg" :class="iconBgClass">
        <component :is="icon" class="h-8 w-8 text-white" />
      </div>
      <div>
        <h2 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced">{{ title }}</h2>
        <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">{{ description }}</p>
      </div>
      <span v-if="count !== undefined" class="px-4 py-2 text-base font-semibold text-gray-700 dark:text-gray-200 bg-gray-200 dark:bg-gray-700/50 rounded-2xl shadow-sm">
        {{ count }}
      </span>
    </div>
    
    <div class="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end sm:justify-start">
      <slot name="actions"></slot>
    </div>
  </div>
</template>

<script setup>
// Props
defineProps({
  icon: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  iconBgClass: {
    type: String,
    required: true
  },
  count: {
    type: [Number, String],
    default: undefined
  }
});
</script>

<template>
  <div class="text-center py-20 lg:py-24 text-gray-500 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-3xl">
    <div class="w-24 h-24 mx-auto mb-8 rounded-3xl flex items-center justify-center" :class="iconBgClass">
      <component :is="icon" class="h-12 w-12" :class="iconColorClass" />
    </div>
    <h3 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced mb-3">{{ title }}</h3>
    <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">{{ description }}</p>
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
    default: 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20'
  },
  iconColorClass: {
    type: String,
    default: 'text-indigo-500'
  }
});
</script>

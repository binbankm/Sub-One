<template>
  <div class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
    <div class="flex items-center gap-4 mb-8">
      <div class="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
        </svg>
      </div>
      <div>
        <h2 class="text-2xl lg:text-3xl font-bold gradient-text-enhanced">生成订阅链接</h2>
        <p class="text-base lg:text-lg text-gray-500 dark:text-gray-400">生成和管理订阅链接</p>
      </div>
    </div>
    
    <SubscriptionLinkGenerator :config="config" :profiles="profiles" />
  </div>
</template>

<script setup>
import SubscriptionLinkGenerator from '../SubscriptionLinkGenerator.vue';

// Props
defineProps({
  config: {
    type: Object,
    required: true
  },
  profiles: {
    type: Array,
    required: true
  }
});
</script>

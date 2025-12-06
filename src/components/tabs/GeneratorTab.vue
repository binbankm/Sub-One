<script setup lang="ts">
import SubscriptionLinkGenerator from '../cards/SubscriptionLinkGeneratorCard.vue';
import type { AppConfig, Profile } from '../../types';

defineProps<{
  config: AppConfig;
  profiles: Profile[];
}>();
</script>

<template>
  <div
    class="bg-white/60 dark:bg-gray-800/75 rounded-2xl p-4 sm:p-8 lg:p-10 border border-gray-300/50 dark:border-gray-700/30 shadow-lg hover:shadow-xl transition-all duration-300">
    <SubscriptionLinkGenerator :config="config" :profiles="profiles" />
  </div>
</template>

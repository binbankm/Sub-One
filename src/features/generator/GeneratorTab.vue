<script setup lang="ts">
import SubscriptionLinkGenerator from './components/SubscriptionLinkGeneratorCard.vue';
import type { AppConfig, Profile } from '../../types/index';

defineProps<{
  config: AppConfig;
  profiles: Profile[];
}>();
</script>

<template>
  <div class="w-full">
    <SubscriptionLinkGenerator :config="config" :profiles="profiles" />
  </div>
</template>

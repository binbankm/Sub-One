<script setup lang="ts">
import SubscriptionLinkGenerator from '../cards/SubscriptionLinkGeneratorCard.vue';
import type { AppConfig, Profile } from '../../types';

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

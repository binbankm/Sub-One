<template>
  <div class="space-y-6 lg:space-y-8">
    <!-- 链接生成器卡片 -->
    <SubscriptionLinkGeneratorCard
      :subscriptions="subscriptions"
      :profiles="profiles"
      :config="config"
    />
  </div>
</template>

<script setup>
import SubscriptionLinkGeneratorCard from '../cards/SubscriptionLinkGeneratorCard.vue';

const props = defineProps({
  subscriptions: {
    type: Array,
    default: () => []
  },
  profiles: {
    type: Array,
    default: () => []
  },
  config: {
    type: Object,
    default: () => ({})
  }
});
</script>

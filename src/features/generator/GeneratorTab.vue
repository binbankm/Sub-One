<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { useDataStore } from '../../stores/data';
import SubscriptionLinkGenerator from './components/SubscriptionLinkGeneratorCard.vue';

const dataStore = useDataStore();
const { config, profiles } = storeToRefs(dataStore);
</script>

<template>
  <div class="w-full">
    <SubscriptionLinkGenerator :config="config" :profiles="profiles" />
  </div>
</template>

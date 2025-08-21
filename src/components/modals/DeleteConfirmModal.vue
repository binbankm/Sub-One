<template>
  <Modal :show="show" @update:show="$emit('update:show', $event)" @confirm="handleConfirm">
    <template #title>
      <h3 class="text-xl font-bold text-red-500">{{ title }}</h3>
    </template>
    <template #body>
      <p class="text-base text-gray-400">{{ message }}</p>
    </template>
  </Modal>
</template>

<script setup>
import Modal from '../Modal.vue';

// Props
const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'danger', // danger, warning, info
    validator: (value) => ['danger', 'warning', 'info'].includes(value)
  }
});

// Emits
const emit = defineEmits(['update:show', 'confirm']);

// Methods
const handleConfirm = () => {
  emit('confirm');
};
</script>

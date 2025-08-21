<template>
  <Modal :show="show" @update:show="$emit('update:show', $event)" @confirm="handleSave">
    <template #title>
      <h3 class="text-xl font-bold text-gray-800 dark:text-white">
        {{ isNew ? '新增手动节点' : '编辑手动节点' }}
      </h3>
    </template>
    <template #body>
      <div class="space-y-4">
        <div>
          <label for="node-name" class="block text-base font-medium text-gray-700 dark:text-gray-300">
            节点名称
          </label>
          <input 
            type="text" 
            id="node-name" 
            v-model="editingNode.name" 
            placeholder="（可选）不填将自动获取" 
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base dark:text-white"
          />
        </div>
        <div>
          <label for="node-url" class="block text-base font-medium text-gray-700 dark:text-gray-300">
            节点链接
          </label>
          <textarea 
            id="node-url" 
            v-model="editingNode.url" 
            rows="4" 
            placeholder="ss://... 或 vmess://..."
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base font-mono dark:text-white"
          />
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { computed } from 'vue';
import Modal from '../Modal.vue';

// Props
const props = defineProps({
  show: {
    type: Boolean,
    required: true
  },
  node: {
    type: Object,
    required: true
  },
  isNew: {
    type: Boolean,
    default: false
  }
});

// Emits
const emit = defineEmits(['update:show', 'save']);

// Computed
const editingNode = computed(() => props.node);

// Methods
const handleSave = () => {
  emit('save', editingNode.value);
};
</script>

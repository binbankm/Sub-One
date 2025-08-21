<template>
  <Modal :show="show" @update:show="$emit('update:show', $event)" @confirm="handleSave">
    <template #title>
      <h3 class="text-xl font-bold text-gray-800 dark:text-white">
        {{ isNew ? '新增订阅' : '编辑订阅' }}
      </h3>
    </template>
    <template #body>
      <div class="space-y-4">
        <div>
          <label for="sub-edit-name" class="block text-base font-medium text-gray-700 dark:text-gray-300">
            订阅名称
          </label>
          <input 
            type="text" 
            id="sub-edit-name" 
            v-model="editingSubscription.name" 
            placeholder="（可选）不填将自动获取" 
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base dark:text-white"
          />
        </div>
        <div>
          <label for="sub-edit-url" class="block text-base font-medium text-gray-700 dark:text-gray-300">
            订阅链接
          </label>
          <input 
            type="text" 
            id="sub-edit-url" 
            v-model="editingSubscription.url" 
            placeholder="https://..." 
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base font-mono dark:text-white"
          />
        </div>
        <div>
          <label for="sub-edit-exclude" class="block text-base font-medium text-gray-700 dark:text-gray-300">
            包含/排除节点
          </label>
          <textarea 
            id="sub-edit-exclude" 
            v-model="editingSubscription.exclude"
            placeholder="[排除模式 (默认)]&#10;proto:vless,trojan&#10;(过期|官网)&#10;---&#10;[包含模式 (只保留匹配项)]&#10;keep:(香港|HK)&#10;keep:proto:ss"
            rows="5" 
            class="mt-1 block w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-base font-mono dark:text-white"
          />
          <p class="text-sm text-gray-400 mt-1">
            每行一条规则。使用 `keep:` 切换为白名单模式。
          </p>
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
  subscription: {
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
const editingSubscription = computed(() => props.subscription);

// Methods
const handleSave = () => {
  emit('save', editingSubscription.value);
};
</script>

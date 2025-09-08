<script setup>
import { ref } from 'vue';
import Modal from '../Modal.vue';

const props = defineProps({
  show: Boolean,
});

const emit = defineEmits(['update:show', 'import']);

const importText = ref('');

const handleConfirm = () => {
    emit('import', importText.value);
    emit('update:show', false);
    importText.value = '';
};
</script>

<template>
  <Modal :show="show" @update:show="emit('update:show', $event)" @confirm="handleConfirm">
    <template #title><h3 class="text-lg font-bold gradient-text">批量导入</h3></template>
    <template #body>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">每行一个订阅链接或分享节点。将自动识别节点名称。</p>
      <textarea 
        v-model="importText"
        rows="8"
        class="input-modern w-full text-sm font-mono resize-none"
        placeholder="http://...&#10;https://...&#10;vmess://...&#10;vless://...&#10;trojan://..."
      ></textarea>
    </template>
  </Modal>
</template>
<!--
  ==================== 手动节点编辑模态框 ====================
  
  功能说明：
  - 新增和编辑手动节点
  - 节点名称和URL配置
  - 自动提取节点名称
  - URL格式验证
  
  ==================================================
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue';

import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import Modal from '../../../components/ui/BaseModal.vue';
import { useToastStore } from '../../../stores/toast';
import type { Node } from '../../../types/index';
import { getProtocol } from '../../../utils/protocols';
import { extractHostAndPort, extractNodeName } from '../../../utils/utils';

// ==================== Props 和 Emit ====================

const props = defineProps<{
    /** 显示状态 */
    show: boolean;
    /** 正在编辑的节点（空表示新建） */
    node: Node | null;
    /** 是否为新建模式 */
    isNew: boolean;
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
    (e: 'save', node: Node): void;
}>();

// ==================== 状态 ====================

const toastStore = useToastStore();

/** 本地编辑的节点副本 */
const localNode = ref<Node | null>(null);

/** URL 错误提示 */
const urlError = ref('');

/** 是否自动提取过名称 */
const hasAutoExtractedName = ref(false);

// ==================== 计算属性 ====================

/** 模态框标题 */
const modalTitle = computed(() => (props.isNew ? '新增手动节点' : '编辑手动节点'));

/** 保存按钮文本 */
const saveButtonText = computed(() => (props.isNew ? '添加' : '保存'));

/** 是否可以保存 */
const canSave = computed(() => {
    return localNode.value?.url && !urlError.value;
});

// ==================== 监听器 ====================

/** 监听显示状态和节点变化，初始化本地副本 */
watch(
    [() => props.show, () => props.node],
    ([show, node]) => {
        if (show && node) {
            localNode.value = JSON.parse(JSON.stringify(node));
            urlError.value = '';
            hasAutoExtractedName.value = false;
        }
    },
    { immediate: true }
);

// ==================== 验证 ====================

/** 验证节点 URL */
const validateUrl = () => {
    urlError.value = '';

    if (!localNode.value?.url) {
        urlError.value = '节点链接不能为空';
        return false;
    }

    const url = localNode.value.url.trim();

    // 基本检查：确保不是空字符串
    if (!url) {
        urlError.value = '节点链接不能为空';
        return false;
    }

    // 简单验证：应该包含 ://
    if (!url.includes('://')) {
        urlError.value = '无效的节点链接格式';
        return false;
    }

    return true;
};

/** URL 输入失焦时验证 */
const handleUrlBlur = () => {
    validateUrl();
};

// ==================== URL 自动提取名称 ====================

/**
 * URL 输入变化时，自动提取节点名称
 */
const handleUrlInput = () => {
    if (!localNode.value) return;

    const url = localNode.value.url?.trim();

    // 如果输入了 URL 但没有名称，自动提取名称
    if (url && !localNode.value.name && !hasAutoExtractedName.value) {
        const extractedName = extractNodeName(url);
        if (extractedName && extractedName !== '未命名节点') {
            localNode.value.name = extractedName;
            hasAutoExtractedName.value = true;
        }
    }
};

/**
 * 名称输入变化时，标记为手动输入
 */
const handleNameInput = () => {
    hasAutoExtractedName.value = false;
};

// ==================== 保存逻辑 ====================

/**
 * 保存节点
 */
const handleSave = () => {
    if (!localNode.value) return;

    // 验证
    if (!validateUrl()) {
        toastStore.showToast('⚠️ 请修正错误后再保存', 'error');
        return;
    }

    // 清理空白字符
    localNode.value.url = localNode.value.url?.trim();
    if (localNode.value.name) {
        localNode.value.name = localNode.value.name.trim();
    }

    // 如果没有名称，尝试自动提取
    if (!localNode.value.name && localNode.value.url) {
        localNode.value.name = extractNodeName(localNode.value.url);
    }

    // 解析并填充服务器信息 (server, port, type)
    if (localNode.value.url) {
        const { host, port } = extractHostAndPort(localNode.value.url);
        const type = getProtocol(localNode.value.url);

        localNode.value.server = host;
        localNode.value.port = parseInt(port) || 0;
        localNode.value.type = type as any;
    }

    // 触发保存事件
    emit('save', localNode.value);
};

/**
 * 取消编辑
 */
const handleCancel = () => {
    emit('update:show', false);
};
</script>

<template>
    <Modal
        :show="show"
        :confirm-text="saveButtonText"
        :confirm-disabled="!canSave"
        @update:show="handleCancel"
        @confirm="handleSave"
    >
        <template #title>
            <h3 class="text-xl font-bold text-gray-900 dark:text-gray-100">
                {{ modalTitle }}
            </h3>
        </template>

        <template #body>
            <div v-if="localNode" class="space-y-4">
                <!-- 节点名称 -->
                <div>
                    <Label
                        for="node-name"
                        class="mb-2"
                    >
                        节点名称
                        <span class="ml-1 text-xs text-gray-400">(可选)</span>
                    </Label>
                    <Input
                        id="node-name"
                        v-model="localNode.name"
                        type="text"
                        placeholder="留空时自动从链接提取"
                        @input="handleNameInput"
                    />
                    <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        如留空，系统将自动从节点链接中提取名称
                    </p>
                </div>

                <!-- 节点链接 -->
                <div>
                    <Label
                        for="node-url"
                        class="mb-2"
                    >
                        节点链接
                        <span class="text-red-500">*</span>
                    </Label>
                    <Textarea
                        id="node-url"
                        v-model="localNode.url"
                        rows="4"
                        placeholder="vmess://... 或 ss://... 等节点分享链接"
                        class="resize-none font-mono text-sm"
                        :class="{ 'border-red-500 dark:border-red-500': urlError }"
                        @input="handleUrlInput"
                        @blur="handleUrlBlur"
                    />
                    <p v-if="urlError" class="mt-1 text-sm text-red-600 dark:text-red-400">
                        {{ urlError }}
                    </p>
                    <p v-else class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        支持 VMess、VLESS、Trojan、SS/SSR、Hysteria、TUIC、Socks5、WireGuard、Snell
                        等协议
                    </p>
                </div>

                <!-- 提示信息 -->
                <div
                    class="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20"
                >
                    <div class="flex items-start gap-3">
                        <svg
                            class="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fill-rule="evenodd"
                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                clip-rule="evenodd"
                            />
                        </svg>
                        <div class="flex-1">
                            <p class="mb-1 text-sm font-medium text-blue-900 dark:text-blue-100">
                                粘贴节点分享链接
                            </p>
                            <p class="text-xs text-blue-700 dark:text-blue-300">
                                从其他应用或网站复制节点分享链接，粘贴到上方输入框即可
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </template>
    </Modal>
</template>

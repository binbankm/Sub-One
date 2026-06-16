<!--
  ==================== 通用确认模态框 ====================
  
  功能说明：
  - 通用的确认对话框组件
  - 支持自定义标题、内容、图标
  - 支持危险操作（红色）和普通操作（蓝色）
  - 自动处理确认和取消事件
  
  使用示例：
  <ConfirmModal
    :show="showConfirm"
    @update:show="showConfirm = $event"
    @confirm="handleDelete"
    :title="t('common.ui.confirmDelete')"
    message="您确定要删除此项目吗？"
    type="danger"
  />
  
  ==================================================
-->

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import Modal from '@/common/ui/BaseModal.vue';

const { t } = useI18n();

// ==================== Props 和 Emit ====================

const props = withDefaults(
    defineProps<{
        /** 显示状态 */
        show: boolean;
        /** 模态框标题 */
        title?: string;
        /** 模态框正文信息 */
        message?: string;
        /** 确认按钮文字 */
        confirmText?: string;
        /** 取消按钮文字 */
        cancelText?: string;
        /** 类型：danger(危险) | warning(警告) | info(信息) */
        type?: 'danger' | 'warning' | 'info';
        /** 是否显示图标 */
        showIcon?: boolean;
    }>(),
    {
        title: undefined,
        message: undefined,
        confirmText: undefined,
        cancelText: undefined,
        type: 'danger',
        showIcon: true
    }
);

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
    (e: 'confirm'): void;
    (e: 'cancel'): void;
}>();

// ==================== 样式配置 ====================

/** 根据类型返回对应的颜色类 */
const colorClasses = {
    danger: {
        title: 'text-danger-500 dark:text-danger-400',
        icon: 'text-danger-500 dark:text-danger-400',
        iconBg: 'bg-danger-100 dark:bg-danger-900/30'
    },
    warning: {
        title: 'text-yellow-500 dark:text-yellow-400',
        icon: 'text-yellow-500 dark:text-yellow-400',
        iconBg: 'bg-yellow-100 dark:bg-yellow-900/30'
    },
    info: {
        title: 'text-info-500 dark:text-info-400',
        icon: 'text-info-500 dark:text-info-400',
        iconBg: 'bg-info-100 dark:bg-info-900/30'
    }
};

const iconBgClass = computed(() => colorClasses[props.type].iconBg);
const iconColorClass = computed(() => colorClasses[props.type].icon);

/** 根据类型返回对应的图标 */
const iconPaths = {
    danger: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    warning:
        'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
};

type MessageSegment = {
    text: string;
    strong: boolean;
};

const stripHtmlTags = (value: string) => value.replace(/<\/?[^>]+(>|$)/g, '');

const messageSegments = computed<MessageSegment[]>(() => {
    const message = props.message ?? t('common.ui.confirm.message');
    const segments: MessageSegment[] = [];
    const strongRegex = /<strong\b[^>]*>(.*?)<\/strong>/gi;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = strongRegex.exec(message)) !== null) {
        const plainText = message.slice(lastIndex, match.index);
        if (plainText) {
            segments.push({ text: stripHtmlTags(plainText), strong: false });
        }

        segments.push({ text: stripHtmlTags(match[1] ?? ''), strong: true });
        lastIndex = strongRegex.lastIndex;
    }

    const tailText = message.slice(lastIndex);
    if (tailText) {
        segments.push({ text: stripHtmlTags(tailText), strong: false });
    }

    if (segments.length === 0) {
        segments.push({ text: stripHtmlTags(message), strong: false });
    }

    return segments;
});

// ==================== 事件处理 ====================

const handleConfirm = () => {
    emit('confirm');
    emit('update:show', false);
};

const handleCancel = () => {
    emit('cancel');
    emit('update:show', false);
};
</script>

<template>
    <Modal
        :show="props.show"
        :confirm-text="props.confirmText || t('common.ui.confirm.confirm')"
        :cancel-text="props.cancelText || t('common.ui.confirm.cancel')"
        @update:show="handleCancel"
        @confirm="handleConfirm"
    >
        <template #title>
            <div class="flex items-center gap-3">
                <div :class="['flex h-10 w-10 shrink-0 items-center justify-center rounded-full', iconBgClass]">
                    <slot name="icon">
                        <svg
                            class="h-6 w-6"
                            :class="iconColorClass"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                :d="iconPaths[props.type]"
                            />
                        </svg>
                    </slot>
                </div>
                <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
                    {{ title || t('common.ui.confirmDelete') }}
                </h3>
            </div>
        </template>

        <template #body>
            <div class="text-base leading-relaxed text-gray-600 dark:text-gray-400">
                <span v-for="(segment, index) in messageSegments" :key="index">
                    <strong
                        v-if="segment.strong"
                        class="font-semibold text-gray-900 dark:text-gray-100"
                    >
                        {{ segment.text }}
                    </strong>
                    <template v-else>{{ segment.text }}</template>
                </span>
            </div>
        </template>
    </Modal>
</template>

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
    title="确认删除"
    message="您确定要删除此项目吗？"
    type="danger"
  />
  
  ==================================================
-->

<script setup lang="ts">
import Modal from './BaseModal.vue';

// ==================== Props 和 Emit ====================

const props = withDefaults(
    defineProps<{
        /** 显示状态 */
        show: boolean;
        /** 标题 */
        title?: string;
        /** 提示消息 */
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
        title: '确认操作',
        message: '您确定要执行此操作吗？',
        confirmText: '确认',
        cancelText: '取消',
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
        title: 'text-red-500 dark:text-red-400',
        icon: 'text-red-500 dark:text-red-400',
        iconBg: 'bg-red-100 dark:bg-red-900/30'
    },
    warning: {
        title: 'text-yellow-500 dark:text-yellow-400',
        icon: 'text-yellow-500 dark:text-yellow-400',
        iconBg: 'bg-yellow-100 dark:bg-yellow-900/30'
    },
    info: {
        title: 'text-blue-500 dark:text-blue-400',
        icon: 'text-blue-500 dark:text-blue-400',
        iconBg: 'bg-blue-100 dark:bg-blue-900/30'
    }
};

/** 根据类型返回对应的图标 */
const iconPaths = {
    danger: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    warning:
        'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
};

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
        :confirm-text="props.confirmText"
        @update:show="handleCancel"
        @confirm="handleConfirm"
    >
        <template #title>
            <div class="flex items-center gap-3">
                <!-- 图标 -->
                <div
                    v-if="props.showIcon"
                    class="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
                    :class="colorClasses[props.type].iconBg"
                >
                    <svg
                        class="h-6 w-6"
                        :class="colorClasses[props.type].icon"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        stroke-width="2"
                    >
                        <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            :d="iconPaths[props.type]"
                        />
                    </svg>
                </div>

                <!-- 标题 -->
                <h3 class="text-xl font-bold" :class="colorClasses[props.type].title">
                    {{ props.title }}
                </h3>
            </div>
        </template>

        <template #body>
            <div class="text-base leading-relaxed text-gray-600 dark:text-gray-400">
                <!-- 支持 HTML 内容 -->
                <div v-html="props.message"></div>
            </div>
        </template>
    </Modal>
</template>

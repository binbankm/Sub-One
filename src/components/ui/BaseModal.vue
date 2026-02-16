<!--
  ==================== 基础模态框组件 (shadcn-ui) ====================
  
  功能说明：
  - 通用模态框组件，基于 shadcn-ui Dialog
  - 支持多种尺寸（sm, 2xl, 4xl, 6xl, 7xl）
  - 支持插槽自定义标题和内容
  - ESC 键关闭 (由 Dialog 原生支持)
  - 点击遮罩关闭 (由 Dialog 原生支持)
  - 优雅的进入/退出动画
  
  Props：
  - show: 显示状态
  - size: 尺寸大小
  - confirmDisabled: 禁用确认按钮
  - confirmButtonTitle: 确认按钮提示文字
  
  Events：
  - update:show: 更新显示状态
  - confirm: 确认事件
  
  Slots：
  - title: 标题区域
  - body: 内容区域
  
  ==================================================
-->

<script setup lang="ts">
import { computed } from 'vue';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from './dialog';
import { Button } from './button';
import { cn } from '@/lib/utils';

// ==================== Props 定义 ====================

const props = withDefaults(
    defineProps<{
        /** 显示状态 */
        show: boolean;
        /** 尺寸大小 */
        size?: 'sm' | '2xl' | '4xl' | '6xl' | '7xl';
        /** 禁用确认按钮 */
        confirmDisabled?: boolean;
        /** 确认按钮提示文字 */
        confirmButtonTitle?: string;
    }>(),
    {
        size: 'sm',
        confirmDisabled: false,
        confirmButtonTitle: '确认'
    }
);

// ==================== Emit 事件定义 ====================

const emit = defineEmits<{
    /** 更新显示状态 */
    (e: 'update:show', value: boolean): void;
    /** 确认事件 */
    (e: 'confirm'): void;
}>();

// ==================== Slots 定义 ====================

defineSlots<{
    title(props: Record<string, never>): any;
    body(props: Record<string, never>): any;
}>();

// ==================== 计算属性 ====================

/**
 * 根据 size 属性计算对话框的最大宽度类
 */
const sizeClasses = computed(() => {
    const sizeMap = {
        sm: 'sm:max-w-sm',
        '2xl': 'sm:max-w-2xl',
        '4xl': 'sm:max-w-4xl',
        '6xl': 'sm:max-w-6xl',
        '7xl': 'sm:max-w-7xl'
    };
    return sizeMap[props.size];
});

// ==================== 事件处理 ====================

/**
 * 处理对话框打开状态变化
 */
const handleOpenChange = (open: boolean) => {
    emit('update:show', open);
};

/**
 * 确认按钮处理
 */
const handleConfirm = () => {
    emit('confirm');
};
</script>

<template>
    <Dialog :open="show" @update:open="handleOpenChange">
        <DialogContent :class="cn('max-h-[85vh] overflow-y-auto', sizeClasses)">
            <DialogHeader>
                <slot name="title">
                    <h3 class="text-lg font-bold text-gray-900 dark:text-white">确认操作</h3>
                </slot>
            </DialogHeader>

            <div class="flex-1 overflow-y-auto py-4">
                <slot name="body">
                    <p class="text-sm text-gray-500 dark:text-gray-400">你确定要继续吗？</p>
                </slot>
            </div>

            <DialogFooter>
                <Button variant="outline" @click="emit('update:show', false)"> 取消 </Button>
                <Button
                    :disabled="confirmDisabled"
                    :title="confirmDisabled ? confirmButtonTitle : '确认'"
                    @click="handleConfirm"
                >
                    确认
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
</template>

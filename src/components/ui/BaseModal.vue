<!--
  ==================== 基础模态框组件 ====================
  
  功能说明：
  - 通用模态框组件，所有其他模态框的基础
  - 支持多种尺寸（sm, 2xl, 4xl, 6xl, 7xl）
  - 支持插槽自定义标题和内容
  - ESC 键关闭
  - 点击遮罩关闭
  - 优雅的进入/退出动画
  
  Props：
  - show: 显示状态
  - size: 尺寸大小
  - confirmKeyword: 确认关键词（需要输入才能确认）
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
import { onMounted, onUnmounted } from 'vue';

// ==================== Props 定义 ====================

withDefaults(defineProps<{
  /** 显示状态 */
  show: boolean;

  /** 尺寸大小 */
  size?: 'sm' | '2xl' | '4xl' | '6xl' | '7xl';
  /** 禁用确认按钮 */
  confirmDisabled?: boolean;
  /** 确认按钮提示文字 */
  confirmButtonTitle?: string;
}>(), {
  size: 'sm',
  confirmDisabled: false,
  confirmButtonTitle: '确认'
});

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

// ==================== 本地状态 ====================



// ==================== 事件处理 ====================

/**
 * 键盘事件处理
 * ESC 键关闭模态框
 */
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape') {
    emit('update:show', false);
  }
};

/**
 * 确认按钮处理
 * 触发 confirm 事件，由调用方决定何时关闭
 */
const handleConfirm = () => {
  emit('confirm');
  // 移除自动关闭，让调用方决定何时关闭
  // emit('update:show', false);
}

// ==================== 生命周期 ====================

onMounted(() => window.addEventListener('keydown', handleKeydown));
onUnmounted(() => window.removeEventListener('keydown', handleKeydown));
</script>

<template>
  <!-- 使用 Teleport 将模态框渲染到 body -->
  <Teleport to="body">
    <!-- 遮罩层过渡 -->
    <Transition name="fade">
      <!-- 遮罩层 - 点击关闭 -->
      <div 
        v-if="show" 
        class="fixed inset-0 bg-black/60 z-[99] flex items-center justify-center p-4"
        @click="emit('update:show', false)"
      >
        <!-- 模态框内容过渡 -->
        <Transition name="scale-fade">
          <!-- 模态框容器 - 点击阻止冒泡，避免关闭 -->
          <div 
            v-if="show"
            class="bg-white dark:bg-gray-900 rounded-3xl border border-gray-300 dark:border-gray-700 shadow-2xl w-full text-left flex flex-col max-h-[85vh]"
            :class="{
              'max-w-sm': size === 'sm',
              'max-w-2xl': size === '2xl',
              'max-w-4xl': size === '4xl',
              'max-w-6xl': size === '6xl',
              'max-w-7xl': size === '7xl'
            }" 
            @click.stop
          >
            <!-- 标题区域 -->
            <div class="p-6 pb-4 flex-shrink-0">
              <slot name="title">
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">确认操作</h3>
              </slot>
            </div>

            <!-- 内容区域 - 可滚动 -->
            <div class="px-6 pb-6 flex-grow overflow-y-auto">
              <slot name="body">
                <p class="text-sm text-gray-500 dark:text-gray-400">你确定要继续吗？</p>
              </slot>
            </div>

            <!-- 按钮区域 -->
            <div
              class="p-6 pt-4 flex justify-end space-x-3 flex-shrink-0 border-t border-gray-300 dark:border-gray-700">
              <!-- 取消按钮 -->
              <button 
                @click="emit('update:show', false)"
                class="px-6 py-2.5 text-sm font-semibold rounded-xl bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-300 hover:shadow-md"
              >
                取消
              </button>
              <!-- 确认按钮 -->
              <button 
                @click="handleConfirm"
                :disabled="confirmDisabled"
                :title="confirmDisabled ? confirmButtonTitle : '确认'"
                class="btn-modern px-6 py-2.5 text-sm font-semibold disabled:opacity-70 disabled:cursor-not-allowed"
              >
                确认
              </button>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>



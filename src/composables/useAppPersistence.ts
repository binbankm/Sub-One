/**
 * ==================== 数据持久化组合式函数 ====================
 * 
 * 功能说明：
 * - 管理应用数据的自动保存和手动保存
 * - 监听数据变化并标记未保存状态
 * - 处理页面关闭前的未保存提示
 * - 提供保存状态的实时反馈
 * 
 * =============================================================
 */

import { ref, type Ref, onMounted, onUnmounted, watch } from 'vue';
import { saveSubs } from '../lib/api';
import { useToastStore } from '../stores/toast';
import type { Subscription, Node, Profile, AppConfig } from '../types';

/**
 * 数据持久化组合式函数
 * 
 * 说明：
 * - 监听订阅、节点、订阅组、配置的变化
 * - 提供保存功能和保存状态管理
 * - 在页面关闭前提示用户保存未保存的更改
 * 
 * @param {Ref<Subscription[]>} subscriptions - 订阅列表的响应式引用
 * @param {Ref<Node[]>} manualNodes - 手动节点列表的响应式引用
 * @param {Ref<Profile[]>} profiles - 订阅组列表的响应式引用
 * @param {Ref<AppConfig>} config - 应用配置的响应式引用
 * @returns 持久化管理相关的状态和方法
 */
export function useAppPersistence(
    subscriptions: Ref<Subscription[]>,
    manualNodes: Ref<Node[]>,
    profiles: Ref<Profile[]>,
    config: Ref<AppConfig>
) {
    // 获取 Toast 提示功能
    const { showToast } = useToastStore();

    // ==================== 响应式状态 ====================

    /**
     * 脏数据标记
     * true 表示有未保存的更改
     */
    const dirty = ref(false);

    /**
     * 保存状态
     * - idle: 空闲状态（未保存或保存完成后）
     * - saving: 正在保存
     * - success: 保存成功
     */
    const saveState = ref<'idle' | 'saving' | 'success'>('idle');

    // ==================== 数据变化监听 ====================

    /**
     * 监听所有需要持久化的数据
     * 
     * 说明：
     * - 使用 deep 深度监听，捕获对象内部属性的变化
     * - 任何数据变化都会标记 dirty 为 true
     */
    watch([subscriptions, manualNodes, profiles, config], () => {
        dirty.value = true;
    }, { deep: true });

    /**
     * 监听保存状态
     * 
     * 说明：
     * - 保存成功后立即重置 dirty 标记
     * - 1.5秒后将 saveState 重置为 idle
     */
    watch(saveState, (newState) => {
        if (newState === 'success') {
            // 立即重置脏数据标记
            dirty.value = false;

            // 1.5秒后重置保存状态
            setTimeout(() => {
                saveState.value = 'idle';
            }, 1500);
        }
    });

    // ==================== 页面关闭提示（已禁用） ====================

    /**
     * 处理页面关闭前事件（已禁用）
     * 
     * 说明：
     * - 如果有未保存的更改，弹出确认对话框
     * - 防止用户意外丢失数据
     * 
     * @param {BeforeUnloadEvent} event - 页面关闭前事件对象
     */
    /*
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        if (dirty.value) {
            // 阻止默认行为
            event.preventDefault();
            // 设置提示消息（现代浏览器可能不显示自定义消息）
            event.returnValue = '您有未保存的更改，确定要离开吗？';
        }
    };
    */

    // ==================== 生命周期钩子 ====================

    /**
     * 组件挂载时注册事件监听器
     */
    onMounted(() => {
        // 已禁用 beforeunload 事件监听器，避免每次都弹出"重新加载"提示
        // window.addEventListener('beforeunload', handleBeforeUnload);
    });

    /**
     * 组件卸载时移除事件监听器
     */
    onUnmounted(() => {
        // window.removeEventListener('beforeunload', handleBeforeUnload);
    });

    // ==================== 保存功能 ====================

    /**
     * 主保存函数
     * 
     * 说明：
     * - 合并订阅和手动节点数据
     * - 移除临时字段（如 isUpdating）
     * - 调用 API 保存到服务器
     * - 处理保存结果和错误
     * 
     * @returns {Promise<boolean>} 保存是否成功
     */
    async function handleSave() {
        // 设置保存状态为"正在保存"
        saveState.value = 'saving';

        // ==================== 准备数据 ====================

        /**
         * 合并订阅和手动节点数据
         * 移除临时字段（isUpdating）以减少存储空间
         */
        const combinedSubs = [
            // 处理订阅列表
            ...subscriptions.value.map(sub => {
                // 解构赋值，移除 isUpdating 字段
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { isUpdating, ...rest } = sub;
                return rest;
            }),
            // 处理手动节点列表
            ...manualNodes.value.map(node => {
                // 解构赋值，移除 isUpdating 字段
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { isUpdating, ...rest } = node;
                return rest;
            })
        ];

        try {
            // ==================== 数据验证 ====================

            // 确保数据格式正确
            if (!Array.isArray(combinedSubs) || !Array.isArray(profiles.value)) {
                throw new Error('数据格式错误，请刷新页面后重试');
            }

            // ==================== 调用 API 保存 ====================

            const result = await saveSubs(combinedSubs, profiles.value);

            // ==================== 处理保存结果 ====================

            if (result.success) {
                // 保存成功
                saveState.value = 'success';
                return true;
            } else {
                // 保存失败，抛出错误
                const errorMessage = result.message || result.error || '保存失败，请稍后重试';
                throw new Error(errorMessage);
            }
        } catch (error: any) {
            // ==================== 错误处理 ====================

            console.error('保存数据时发生错误:', error);

            /**
             * 错误消息映射表
             * 将技术性错误消息转换为用户友好的提示
             */
            const errorMessageMap = new Map([
                ['网络', '网络连接异常，请检查网络连接'],
                ['格式', '数据格式异常，请刷新页面后重试'],
                ['存储', '存储服务暂时不可用，请稍后重试']
            ]);

            // 根据错误消息关键词匹配友好提示
            let userMessage = error.message;
            for (const [key, message] of errorMessageMap) {
                if (error.message.includes(key)) {
                    userMessage = message;
                    break;
                }
            }

            // 显示错误提示
            showToast(userMessage, 'error');

            // 重置保存状态
            saveState.value = 'idle';

            return false;
        }
    }

    /**
     * 直接保存辅助函数
     * 
     * 说明：
     * - 用于需要自动保存的操作
     * - 可选择是否显示保存成功通知
     * - 统一处理保存流程和错误
     * 
     * @param {string} operationName - 操作名称（用于显示提示消息）
     * @param {boolean} showNotification - 是否显示保存成功通知
     * @returns {Promise<boolean>} 保存是否成功
     */
    async function handleDirectSave(operationName = '操作', showNotification = true) {
        try {
            // 调用主保存函数
            const success = await handleSave();

            // 保存成功且需要显示通知
            if (success && showNotification) {
                showToast(`${operationName}已保存`, 'success');
            }

            return success;
        } catch (error) {
            // 错误处理
            console.error('直接保存失败:', error);
            return false;
        }
    }

    // ==================== 导出接口 ====================

    return {
        /** 脏数据标记（是否有未保存的更改） */
        dirty,
        /** 保存状态（idle | saving | success） */
        saveState,
        /** 主保存函数 */
        handleSave,
        /** 直接保存辅助函数 */
        handleDirectSave
    };
}

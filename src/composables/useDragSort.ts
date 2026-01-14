/**
 * ==================== 拖拽排序状态管理 ====================
 * 
 * 功能说明：
 * - 管理订阅和节点的拖拽排序模式状态
 * - 跟踪未保存的排序更改
 * - 提供排序模式的切换和保存方法
 * 
 * =============================================================
 */

import { ref } from 'vue';

/**
 * 拖拽排序状态管理 Composable
 * 
 * @param saveFn 保存数据的函数，返回 Promise<boolean>
 */
export function useDragSort(saveFn: (label: string) => Promise<boolean>) {
    // ==================== 状态 ====================

    /** 订阅排序模式是否开启 */
    const isSortingSubs = ref(false);

    /** 节点排序模式是否开启 */
    const isSortingNodes = ref(false);

    /** 是否有未保存的排序更改 */
    const hasUnsavedSortChanges = ref(false);

    // ==================== 方法 ====================

    /**
     * 切换订阅排序模式
     * 如果有未保存的更改，会提示用户确认
     */
    const toggleSortSubs = () => {
        if (isSortingSubs.value && hasUnsavedSortChanges.value) {
            if (!confirm('有未保存的排序更改，确定要退出吗？')) {
                return;
            }
        }
        isSortingSubs.value = !isSortingSubs.value;
        if (!isSortingSubs.value) {
            hasUnsavedSortChanges.value = false;
        }
    };

    /**
     * 切换节点排序模式
     * 如果有未保存的更改，会提示用户确认
     */
    const toggleSortNodes = () => {
        if (isSortingNodes.value && hasUnsavedSortChanges.value) {
            if (!confirm('有未保存的排序更改，确定要退出吗？')) {
                return;
            }
        }
        isSortingNodes.value = !isSortingNodes.value;
        if (!isSortingNodes.value) {
            hasUnsavedSortChanges.value = false;
        }
    };

    /**
     * 保存排序更改
     * 保存成功后自动退出排序模式
     */
    const saveSortChanges = async () => {
        const success = await saveFn('排序');
        if (success) {
            hasUnsavedSortChanges.value = false;
            // 保存后自动退出排序模式，提升用户体验
            isSortingSubs.value = false;
            isSortingNodes.value = false;
        }
        return success;
    };

    /**
     * 标记订阅拖拽结束
     * 用于标记有未保存的更改
     */
    const onSubscriptionDragEnd = () => {
        hasUnsavedSortChanges.value = true;
    };

    /**
     * 标记节点拖拽结束
     * 用于标记有未保存的更改
     */
    const onNodeDragEnd = () => {
        hasUnsavedSortChanges.value = true;
    };

    /**
     * 重置排序状态
     * 退出所有排序模式并清除未保存标记
     */
    const resetSortState = () => {
        isSortingSubs.value = false;
        isSortingNodes.value = false;
        hasUnsavedSortChanges.value = false;
    };

    // ==================== 导出 ====================

    return {
        // 状态
        isSortingSubs,
        isSortingNodes,
        hasUnsavedSortChanges,

        // 方法
        toggleSortSubs,
        toggleSortNodes,
        saveSortChanges,
        onSubscriptionDragEnd,
        onNodeDragEnd,
        resetSortState,
    };
}

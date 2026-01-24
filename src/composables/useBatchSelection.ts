import { computed, ref } from 'vue';

/**
 * 具有唯一标识符的对象接口
 * 用于约束列表项必须包含 id 属性
 */
export interface Identifiable {
    id: string;
}

/**
 * 批量选择逻辑的 Composable
 *
 * 提供一套完整的批量选择状态管理，包括进入/退出批量模式、全选、反选、单选等功能。
 * 适用于需要批量操作（如删除）的列表场景。
 *
 * @param itemsRef - 响应式的列表数据源（Ref 或 Computed），用于全选/反选操作时获取当前列表项
 * @returns 包含状态和操作方法的对象
 */
export function useBatchSelection<T extends Identifiable>(itemsRef: { value: T[] }) {
    /** 是否处于批量删除/操作模式 */
    const isBatchDeleteMode = ref(false);

    /** 当前选中的 ID 集合 */
    const selectedIds = ref(new Set<string>());

    /** 当前选中的数量 */
    const selectedCount = computed(() => selectedIds.value.size);

    /**
     * 切换批量模式状态
     * @param shouldReset - 退出模式时是否清空已选项，默认为 true
     */
    const toggleBatchDeleteMode = (shouldReset = true) => {
        isBatchDeleteMode.value = !isBatchDeleteMode.value;
        if (!isBatchDeleteMode.value && shouldReset) {
            selectedIds.value.clear();
        }
    };

    /**
     * 检查指定 ID 是否已被选中
     * @param id - 要检查的 ID
     */
    const isSelected = (id: string) => {
        return selectedIds.value.has(id);
    };

    /**
     * 切换指定 ID 的选中状态（选中 -> 未选，未选 -> 选中）
     * @param id - 要操作的 ID
     */
    const toggleSelection = (id: string) => {
        if (selectedIds.value.has(id)) {
            selectedIds.value.delete(id);
        } else {
            selectedIds.value.add(id);
        }
    };

    /**
     * 全选所有项
     * 将 itemsRef 中的所有 ID 加入选中集合
     */
    const selectAll = () => {
        itemsRef.value.forEach((item) => selectedIds.value.add(item.id));
    };

    /**
     * 清空所有选中项
     */
    const deselectAll = () => {
        selectedIds.value.clear();
    };

    /**
     * 反选
     * 已选的变未选，未选的变已选
     */
    const invertSelection = () => {
        itemsRef.value.forEach((item) => {
            if (selectedIds.value.has(item.id)) {
                selectedIds.value.delete(item.id);
            } else {
                selectedIds.value.add(item.id);
            }
        });
    };

    /**
     * 获取所有选中的 ID 数组
     * @returns ID 字符串数组
     */
    const getSelectedIds = () => {
        return Array.from(selectedIds.value);
    };

    return {
        /** 是否处于批量模式 */
        isBatchDeleteMode,
        /** 选中的 ID Set 对象 */
        selectedIds,
        /** 选中的数量 */
        selectedCount,
        /** 切换批量模式 */
        toggleBatchDeleteMode,
        /** 检查是否选中 */
        isSelected,
        /** 切换单项选中状态 */
        toggleSelection,
        /** 全选 */
        selectAll,
        /** 清空选择 */
        deselectAll,
        /** 反选 */
        invertSelection,
        /** 获取选中 ID 数组 */
        getSelectedIds
    };
}

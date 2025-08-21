// FILE: src/composables/useSorting.js
import { ref } from 'vue';

export function useSorting() {
  // 排序状态
  const isSortingSubs = ref(false);
  const isSortingNodes = ref(false);

  // 切换订阅排序模式
  const toggleSubsSorting = () => {
    isSortingSubs.value = !isSortingSubs.value;
  };

  // 切换节点排序模式
  const toggleNodesSorting = () => {
    isSortingNodes.value = !isSortingNodes.value;
  };

  // 退出所有排序模式
  const exitAllSorting = () => {
    isSortingSubs.value = false;
    isSortingNodes.value = false;
  };

  // 检查是否处于任何排序模式
  const isInSortingMode = () => {
    return isSortingSubs.value || isSortingNodes.value;
  };

  // 获取排序模式描述
  const getSortingModeDescription = () => {
    if (isSortingSubs.value) return '订阅排序模式';
    if (isSortingNodes.value) return '节点排序模式';
    return '正常模式';
  };

  return {
    // 状态
    isSortingSubs,
    isSortingNodes,
    
    // 方法
    toggleSubsSorting,
    toggleNodesSorting,
    exitAllSorting,
    isInSortingMode,
    getSortingModeDescription,
  };
}

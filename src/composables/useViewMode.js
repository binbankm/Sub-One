// FILE: src/composables/useViewMode.js
import { ref, onMounted } from 'vue';

export function useViewMode(storageKey = 'viewMode', defaultValue = 'card') {
  const viewMode = ref(defaultValue);

  // 设置视图模式
  const setViewMode = (mode) => {
    viewMode.value = mode;
    localStorage.setItem(storageKey, mode);
  };

  // 获取视图模式
  const getViewMode = () => {
    return viewMode.value;
  };

  // 切换视图模式
  const toggleViewMode = () => {
    const newMode = viewMode.value === 'card' ? 'list' : 'card';
    setViewMode(newMode);
  };

  // 检查是否为卡片模式
  const isCardMode = () => {
    return viewMode.value === 'card';
  };

  // 检查是否为列表模式
  const isListMode = () => {
    return viewMode.value === 'list';
  };

  // 初始化视图模式
  const initializeViewMode = () => {
    const savedViewMode = localStorage.getItem(storageKey);
    if (savedViewMode && ['card', 'list'].includes(savedViewMode)) {
      viewMode.value = savedViewMode;
    }
  };

  // 组件挂载时初始化
  onMounted(() => {
    initializeViewMode();
  });

  return {
    // 状态
    viewMode,
    
    // 方法
    setViewMode,
    getViewMode,
    toggleViewMode,
    isCardMode,
    isListMode,
    initializeViewMode,
  };
}

// FILE: src/composables/usePagination.js
import { ref, computed, watch } from 'vue';

export function usePagination(items, itemsPerPage = 6) {
  const currentPage = ref(1);
  
  // 计算总页数
  const totalPages = computed(() => {
    if (!items || !Array.isArray(items.value)) return 1;
    return Math.ceil(items.value.length / itemsPerPage);
  });
  
  // 计算分页后的项目
  const paginatedItems = computed(() => {
    if (!items || !Array.isArray(items.value)) return [];
    const start = (currentPage.value - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    return items.value.slice(start, end);
  });
  
  // 自动监听 items 变化，调整分页
  watch(items, (newItems) => {
    if (!newItems || !Array.isArray(newItems)) return;
    
    // 如果当前页面没有内容且不是第一页，则跳转到上一页
    if (paginatedItems.value.length === 0 && currentPage.value > 1) {
      currentPage.value--;
    }
    
    // 如果当前页面超出总页数，则跳转到最后一页
    if (currentPage.value > totalPages.value && totalPages.value > 0) {
      currentPage.value = totalPages.value;
    }
  }, { deep: true });
  
  // 监听总页数变化
  watch(totalPages, (newTotalPages) => {
    if (currentPage.value > newTotalPages && newTotalPages > 0) {
      currentPage.value = newTotalPages;
    }
  });

  function changePage(page) {
    if (page < 1 || page > totalPages.value) return;
    currentPage.value = page;
  }

  function goToFirstPage() {
    currentPage.value = 1;
  }

  function goToLastPage() {
    currentPage.value = totalPages.value;
  }

  function goToNextPage() {
    if (currentPage.value < totalPages.value) {
      currentPage.value++;
    }
  }

  function goToPrevPage() {
    if (currentPage.value > 1) {
      currentPage.value--;
    }
  }

  function resetPagination() {
    currentPage.value = 1;
  }

  // 当项目数量变化时，自动调整分页
  function handleItemsChange(newItems, totalCount) {
    if (newItems && Array.isArray(newItems)) {
      // 如果当前页面没有内容且不是第一页，则跳转到上一页
      if (paginatedItems.value.length === 0 && currentPage.value > 1) {
        currentPage.value--;
      }
      
      // 如果当前页面超出总页数，则跳转到最后一页
      if (currentPage.value > totalPages.value && totalPages.value > 0) {
        currentPage.value = totalPages.value;
      }
    }
  }

  // 获取分页信息
  const paginationInfo = computed(() => ({
    currentPage: currentPage.value,
    totalPages: totalPages.value,
    totalItems: items?.value?.length || 0,
    itemsPerPage,
    hasNextPage: currentPage.value < totalPages.value,
    hasPrevPage: currentPage.value > 1,
    startIndex: (currentPage.value - 1) * itemsPerPage + 1,
    endIndex: Math.min(currentPage.value * itemsPerPage, items?.value?.length || 0)
  }));

  return {
    currentPage,
    totalPages,
    paginatedItems,
    paginationInfo,
    changePage,
    goToFirstPage,
    goToLastPage,
    goToNextPage,
    goToPrevPage,
    resetPagination,
    handleItemsChange
  };
}

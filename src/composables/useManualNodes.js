// FILE: src/composables/useManualNodes.js
import { ref, computed, watch } from 'vue';
import { useToastStore } from '../stores/toast.js';
import { COUNTRY_CODE_MAP, PAGINATION_CONFIG } from '../lib/constants.js';

export function useManualNodes(initialNodesRef, markDirty) {
  const { showToast } = useToastStore();
  const manualNodes = ref([]);
  const manualNodesCurrentPage = ref(1);
  const manualNodesPerPage = PAGINATION_CONFIG.MANUAL_NODES_PER_PAGE;
  const searchTerm = ref('');

  function initializeManualNodes(nodesData) {
    manualNodes.value = (nodesData || []).map(node => ({
      ...node,
      id: node.id || crypto.randomUUID(),
      enabled: node.enabled ?? true,
    }));
  }

  // 根据搜索词过滤节点
  const filteredManualNodes = computed(() => {
    if (!searchTerm.value) {
      return manualNodes.value;
    }
    const lowerCaseSearch = searchTerm.value.toLowerCase();
    
    // 获取可能的替代搜索词
    const alternativeTerms = COUNTRY_CODE_MAP[lowerCaseSearch] || [];
    
    return manualNodes.value.filter(node => {
      const nodeNameLower = node.name ? node.name.toLowerCase() : '';
      
      // 检查节点名称是否包含原始搜索词
      if (nodeNameLower.includes(lowerCaseSearch)) {
        return true;
      }
      
      // 检查节点名称是否包含任何替代词
      for (const altTerm of alternativeTerms) {
        if (nodeNameLower.includes(altTerm.toLowerCase())) {
          return true;
        }
      }
      
      return false;
    });
  });

  const manualNodesTotalPages = computed(() => Math.ceil(filteredManualNodes.value.length / manualNodesPerPage));

  // 分页使用过滤后的节点
  const paginatedManualNodes = computed(() => {
    const start = (manualNodesCurrentPage.value - 1) * manualNodesPerPage;
    const end = start + manualNodesPerPage;
    return filteredManualNodes.value.slice(start, end);
  });
  
  const enabledManualNodes = computed(() => manualNodes.value.filter(n => n.enabled));

  function changeManualNodesPage(page) {
    if (page < 1 || page > manualNodesTotalPages.value) return;
    manualNodesCurrentPage.value = page;
  }

  function addNode(nodeData) {
    const newNode = {
      ...nodeData,
      id: crypto.randomUUID(),
      enabled: true,
    };
    manualNodes.value.push(newNode);
    markDirty();
    showToast('节点添加成功', 'success');
  }

  function updateNode(nodeId, updates) {
    const index = manualNodes.value.findIndex(n => n.id === nodeId);
    if (index !== -1) {
      manualNodes.value[index] = { ...manualNodes.value[index], ...updates };
      markDirty();
      showToast('节点更新成功', 'success');
    }
  }

  function deleteNode(nodeId) {
    const index = manualNodes.value.findIndex(n => n.id === nodeId);
    if (index !== -1) {
      manualNodes.value.splice(index, 1);
      markDirty();
      showToast('节点删除成功', 'success');
    }
  }

  function deleteAllNodes() {
    manualNodes.value = [];
    markDirty();
    showToast('所有节点已删除', 'success');
  }

  function addNodesFromBulk(nodesData) {
    const newNodes = nodesData.map(node => ({
      ...node,
      id: crypto.randomUUID(),
      enabled: true,
    }));
    manualNodes.value.push(...newNodes);
    markDirty();
    showToast(`成功添加 ${newNodes.length} 个节点`, 'success');
  }

  // 一键排序功能
  function autoSortNodes() {
    manualNodes.value.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      
      // 按地区排序
      for (const [code, [flag, ...names]] of Object.entries(COUNTRY_CODE_MAP)) {
        const aHasRegion = names.some(name => nameA.toLowerCase().includes(name.toLowerCase()));
        const bHasRegion = names.some(name => nameB.toLowerCase().includes(name.toLowerCase()));
        
        if (aHasRegion && !bHasRegion) return -1;
        if (!aHasRegion && bHasRegion) return 1;
        if (aHasRegion && bHasRegion) {
          const aRegionIndex = names.findIndex(name => nameA.toLowerCase().includes(name.toLowerCase()));
          const bRegionIndex = names.findIndex(name => nameB.toLowerCase().includes(name.toLowerCase()));
          if (aRegionIndex !== bRegionIndex) {
            return aRegionIndex - bRegionIndex;
          }
        }
      }
      
      // 如果地区相同，按名称排序
      return nameA.localeCompare(nameB);
    });
    
    markDirty();
    showToast('节点排序完成', 'success');
  }

  // 一键去重功能
  function deduplicateNodes() {
    const seen = new Set();
    const uniqueNodes = [];
    
    for (const node of manualNodes.value) {
      const key = node.name || node.url || '';
      if (!seen.has(key)) {
        seen.add(key);
        uniqueNodes.push(node);
      }
    }
    
    const removedCount = manualNodes.value.length - uniqueNodes.length;
    manualNodes.value = uniqueNodes;
    
    if (removedCount > 0) {
      markDirty();
      showToast(`已移除 ${removedCount} 个重复节点`, 'success');
    } else {
      showToast('没有发现重复节点', 'info');
    }
  }

  // 监听初始数据变化
  watch(initialNodesRef, (newData) => {
    if (newData) {
      initializeManualNodes(newData);
    }
  }, { immediate: true });

  return {
    manualNodes,
    manualNodesCurrentPage,
    manualNodesTotalPages,
    paginatedManualNodes,
    enabledManualNodes,
    searchTerm,
    changeManualNodesPage,
    addNode,
    updateNode,
    deleteNode,
    deleteAllNodes,
    addNodesFromBulk,
    autoSortNodes,
    deduplicateNodes,
  };
}
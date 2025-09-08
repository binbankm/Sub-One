/**
 * 手动节点管理Composable
 * 提供手动节点的增删改查、搜索、排序、去重等功能
 */
import { ref, computed, watch } from 'vue'
import { useToastStore } from '../stores/toast.js'
import { REGION_CODES, REGION_KEYWORDS, REGION_ORDER, PAGINATION } from '../lib/constants.js'
import { getRegionCode, sortNodesByRegion, uniqueArray } from '../lib/helpers.js'

export function useManualNodes(initialNodesRef, markDirty) {
  const { showToast } = useToastStore() // 获取 showToast 函数
  const manualNodes = ref([])
  const manualNodesCurrentPage = ref(1)
  const manualNodesPerPage = PAGINATION.MANUAL_NODES_PER_PAGE

  const searchTerm = ref('')

  // 使用常量中的地区代码映射
  const countryCodeMap = REGION_CODES

  function initializeManualNodes(nodesData) {
    manualNodes.value = (nodesData || []).map(node => ({
      ...node,
      id: node.id || crypto.randomUUID(),
      enabled: node.enabled ?? true
    }))
  }

  // [新增] 根据搜索词过滤节点
  const filteredManualNodes = computed(() => {
    if (!searchTerm.value) {
      return manualNodes.value
    }
    const lowerCaseSearch = searchTerm.value.toLowerCase()

    // 获取可能的替代搜索词
    const alternativeTerms = countryCodeMap[lowerCaseSearch] || []

    return manualNodes.value.filter(node => {
      const nodeNameLower = node.name ? node.name.toLowerCase() : ''

      // 检查节点名称是否包含原始搜索词
      if (nodeNameLower.includes(lowerCaseSearch)) {
        return true
      }

      // 检查节点名称是否包含任何替代词
      for (const altTerm of alternativeTerms) {
        if (nodeNameLower.includes(altTerm.toLowerCase())) {
          return true
        }
      }

      return false
    })
  })
  const manualNodesTotalPages = computed(() =>
    Math.ceil(filteredManualNodes.value.length / manualNodesPerPage)
  )

  // [修改] 分页使用过滤后的节点
  const paginatedManualNodes = computed(() => {
    const start = (manualNodesCurrentPage.value - 1) * manualNodesPerPage
    const end = start + manualNodesPerPage
    return filteredManualNodes.value.slice(start, end)
  })

  const enabledManualNodes = computed(() => manualNodes.value.filter(n => n.enabled))

  function changeManualNodesPage(page) {
    if (page < 1 || page > manualNodesTotalPages.value) return
    manualNodesCurrentPage.value = page
  }

  function addNode(node) {
    manualNodes.value.unshift(node)
    // 修复分页逻辑：只有在当前页面已满时才跳转到第一页
    const currentPageItems = paginatedManualNodes.value.length
    if (currentPageItems >= manualNodesPerPage) {
      manualNodesCurrentPage.value = 1
    }
  }

  function updateNode(updatedNode) {
    const index = manualNodes.value.findIndex(n => n.id === updatedNode.id)
    if (index !== -1) {
      manualNodes.value[index] = updatedNode
    }
  }

  function deleteNode(nodeId) {
    manualNodes.value = manualNodes.value.filter(n => n.id !== nodeId)
    if (paginatedManualNodes.value.length === 0 && manualNodesCurrentPage.value > 1) {
      manualNodesCurrentPage.value--
    }
  }

  function deleteAllNodes() {
    manualNodes.value = []
    manualNodesCurrentPage.value = 1
  }

  function addNodesFromBulk(nodes) {
    manualNodes.value.unshift(...nodes)
    // 修复分页逻辑：批量添加后跳转到第一页
    manualNodesCurrentPage.value = 1
  }
  const getUniqueKey = url => {
    try {
      if (url.startsWith('vmess://')) {
        const base64Part = url.substring('vmess://'.length)

        // 关键步骤：解码后，移除所有空白字符，解决格式不一致问题
        const decodedString = atob(base64Part)
        const cleanedString = decodedString.replace(/\s/g, '') // 移除所有空格、换行等

        const nodeConfig = JSON.parse(cleanedString)

        delete nodeConfig.ps
        delete nodeConfig.remark

        // 重新序列化对象，并以此作为唯一键
        // 通过排序键来确保即使字段顺序不同也能得到相同的结果
        return (
          'vmess://' +
          JSON.stringify(
            Object.keys(nodeConfig)
              .sort()
              .reduce((obj, key) => {
                obj[key] = nodeConfig[key]
                return obj
              }, {})
          )
        )
      }
      // 对于其他协议，简单地移除 # 后面的部分
      const hashIndex = url.indexOf('#')
      return hashIndex !== -1 ? url.substring(0, hashIndex) : url
    } catch (e) {
      console.error('生成节点唯一键失败，将使用原始URL:', url, e)
      // 如果解析失败，回退到使用原始URL，避免程序崩溃
      return url
    }
  }

  function deduplicateNodes() {
    const originalCount = manualNodes.value.length
    const seenKeys = new Set()
    const uniqueNodes = []

    for (const node of manualNodes.value) {
      // 使用新的、更智能的函数来生成唯一键
      const uniqueKey = getUniqueKey(node.url)

      if (!seenKeys.has(uniqueKey)) {
        seenKeys.add(uniqueKey)
        uniqueNodes.push(node)
      }
    }

    manualNodes.value = uniqueNodes
    const removedCount = originalCount - uniqueNodes.length

    if (removedCount > 0) {
      showToast(`成功移除 ${removedCount} 个重复节点。`, 'success')
    } else {
      showToast('没有发现重复的节点。', 'info')
    }
  }

  function autoSortNodes() {
    manualNodes.value = sortNodesByRegion(manualNodes.value)
  }

  // [新增] 监听搜索词变化，重置分页
  watch(searchTerm, () => {
    manualNodesCurrentPage.value = 1
  })

  watch(
    initialNodesRef,
    newInitialNodes => {
      initializeManualNodes(newInitialNodes)
    },
    { immediate: true, deep: true }
  )

  return {
    manualNodes,
    manualNodesCurrentPage,
    manualNodesTotalPages,
    paginatedManualNodes,
    enabledManualNodesCount: computed(() => enabledManualNodes.value.length),
    searchTerm, // [新增] 导出搜索词
    changeManualNodesPage,
    addNode,
    updateNode,
    deleteNode,
    deleteAllNodes,
    addNodesFromBulk,
    autoSortNodes,
    deduplicateNodes // 导出新函数
  }
}

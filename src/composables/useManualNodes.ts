/**
 * ==================== 手动节点管理组合式函数 ====================
 * 
 * 功能说明：
 * - 管理手动添加的节点列表
 * - 支持节点的增删改查操作
 * - 实现节点搜索功能（支持防抖）
 * - 提供节点去重功能
 * - 支持节点自动排序（按地区）
 * - 处理节点分页显示
 * 
 * ===============================================================
 */

import { ref, computed, watch, type Ref } from 'vue';
import { debounce } from 'lodash-es';
import { useToastStore } from '../stores/toast';
import { getCountryTerms, REGION_KEYWORDS, REGION_ORDER } from '../lib/constants';
import type { Node } from '../types';

/**
 * 手动节点管理组合式函数
 * 
 * @param {Ref<Node[] | null>} initialNodesRef - 初始节点列表的响应式引用
 * @returns 手动节点管理相关的状态和方法
 */
export function useManualNodes(initialNodesRef: Ref<Node[] | null>) {
  // 获取 Toast 提示功能
  const { showToast } = useToastStore();

  // ==================== 响应式状态 ====================

  /** 手动节点列表 */
  const manualNodes = ref<Node[]>([]);

  /** 当前页码（从 1 开始） */
  const manualNodesCurrentPage = ref(1);

  /** 每页显示的节点数量 */
  const manualNodesPerPage = 24;

  /** 搜索关键词（实时输入） */
  const searchTerm = ref('');

  /** 防抖后的搜索关键词（延迟 300ms 更新） */
  const debouncedSearchTerm = ref('');

  // ==================== 搜索防抖 ====================

  /**
   * 防抖更新搜索关键词
   * 
   * 说明：
   * - 延迟 300ms 更新搜索关键词
   * - 避免用户输入时频繁触发搜索计算
   * - 提升性能和用户体验
   */
  const updateSearchTerm = debounce((newVal: string) => {
    debouncedSearchTerm.value = newVal;
  }, 300);

  /**
   * 监听搜索词输入，触发防抖更新
   */
  watch(searchTerm, (newVal) => {
    updateSearchTerm(newVal);
  });

  // ==================== 数据初始化 ====================

  /**
   * 初始化手动节点列表
   * 
   * 说明：
   * - 从服务器获取的数据初始化节点
   * - 确保每个节点都有必需的字段和默认值
   * 
   * @param {Partial<Node>[]} nodesData - 原始节点数据数组
   */
  function initializeManualNodes(nodesData: Partial<Node>[]) {
    manualNodes.value = (nodesData || []).map(node => ({
      id: node.id || crypto.randomUUID(),
      name: node.name || '未命名节点',
      url: node.url || '',
      enabled: node.enabled ?? true,
      protocol: node.protocol || 'unknown',
      type: node.type || 'manual',
      subscriptionName: node.subscriptionName || 'manual',
      ...node
    } as Node));
  }

  // ==================== 计算属性 ====================

  /**
   * 过滤后的节点列表
   * 
   * 说明：
   * - 根据防抖后的搜索词过滤节点
   * - 支持智能国家/地区搜索（输入任何相关词汇都能匹配）
   * - 支持多种地区名称别名（中文、繁体、emoji、国家代码等）
   */
  const filteredManualNodes = computed(() => {
    // 如果没有搜索词，返回所有节点
    if (!debouncedSearchTerm.value) {
      return manualNodes.value;
    }

    // 转换为小写进行不区分大小写的搜索
    const lowerCaseSearch = debouncedSearchTerm.value.toLowerCase();

    // 使用 getCountryTerms 获取所有相关的国家/地区词汇
    // 例如：输入 '美国' 可以匹配 ['🇺🇸', '美国', '美國', 'us']
    const alternativeTerms = getCountryTerms(lowerCaseSearch);

    // 过滤节点
    return manualNodes.value.filter(node => {
      const nodeNameLower = node.name ? node.name.toLowerCase() : '';

      // 检查节点名称是否包含原始搜索词
      if (nodeNameLower.includes(lowerCaseSearch)) {
        return true;
      }

      // 检查节点名称是否包含任何国家/地区相关词汇
      for (const altTerm of alternativeTerms) {
        if (nodeNameLower.includes(altTerm.toLowerCase())) {
          return true;
        }
      }

      return false;
    });
  });

  /**
   * 总页数
   * 根据过滤后的节点数量和每页数量计算
   */
  const manualNodesTotalPages = computed(() => Math.ceil(filteredManualNodes.value.length / manualNodesPerPage));

  /**
   * 当前页显示的节点列表
   * 对过滤后的节点进行分页切片
   */
  const paginatedManualNodes = computed(() => {
    const start = (manualNodesCurrentPage.value - 1) * manualNodesPerPage;
    const end = start + manualNodesPerPage;
    return filteredManualNodes.value.slice(start, end);
  });

  /**
   * 已启用的节点列表
   * 过滤出 enabled 为 true 的节点
   */
  const enabledManualNodes = computed(() => manualNodes.value.filter(n => n.enabled));

  // ==================== 分页控制 ====================

  /**
   * 切换页码
   * 
   * @param {number} page - 目标页码
   */
  function changeManualNodesPage(page: number) {
    // 验证页码范围
    if (page < 1 || page > manualNodesTotalPages.value) return;
    manualNodesCurrentPage.value = page;
  }

  // ==================== 节点操作 ====================

  /**
   * 添加新节点
   * 
   * 说明：
   * - 将新节点添加到列表开头
   * - 根据当前页面状态决定是否跳转到第一页
   * 
   * @param {Node} node - 要添加的节点对象
   */
  function addNode(node: Node) {
    // 添加到列表开头（unshift 添加到数组开头）
    manualNodes.value.unshift(node);

    // 修复分页逻辑：只有在当前页面已满时才跳转到第一页
    const currentPageItems = paginatedManualNodes.value.length;
    if (currentPageItems >= manualNodesPerPage) {
      manualNodesCurrentPage.value = 1;
    }
  }

  /**
   * 更新现有节点
   * 
   * @param {Node} updatedNode - 更新后的节点对象
   */
  function updateNode(updatedNode: Node) {
    // 查找节点在数组中的位置
    const index = manualNodes.value.findIndex(n => n.id === updatedNode.id);

    if (index !== -1) {
      // 更新节点数据
      manualNodes.value[index] = updatedNode;
    }
  }

  /**
   * 删除节点
   * 
   * 说明：
   * - 从列表中移除指定的节点
   * - 如果当前页变为空页且不是第一页，自动跳转到上一页
   * 
   * @param {string} nodeId - 要删除的节点 ID
   */
  function deleteNode(nodeId: string) {
    // 过滤掉要删除的节点
    manualNodes.value = manualNodes.value.filter(n => n.id !== nodeId);

    // 如果删除后当前页为空且不是第一页，跳转到上一页
    if (paginatedManualNodes.value.length === 0 && manualNodesCurrentPage.value > 1) {
      manualNodesCurrentPage.value--;
    }
  }

  /**
   * 删除所有节点
   * 
   * 说明：
   * - 清空节点列表
   * - 重置页码为第一页
   */
  function deleteAllNodes() {
    manualNodes.value = [];
    manualNodesCurrentPage.value = 1;
  }

  /**
   * 批量添加节点
   * 
   * @param {Node[]} nodes - 要添加的节点数组
   */
  function addNodesFromBulk(nodes: Node[]) {
    // 批量添加到列表开头
    manualNodes.value.unshift(...nodes);

    // 批量添加后跳转到第一页
    manualNodesCurrentPage.value = 1;
  }

  // ==================== 节点去重 ====================

  /**
   * 生成节点的唯一标识键
   * 
   * 说明：
   * - 用于节点去重，判断两个节点是否相同
   * - 针对不同协议采用不同的处理策略
   * - VMess 协议：解析 JSON 配置，移除名称字段后生成唯一键
   * - 其他协议：移除 # 后面的部分（节点名称）
   * 
   * @param {string} url - 节点 URL
   * @returns {string} 唯一标识键
   */
  const getUniqueKey = (url: string) => {
    try {
      // ==================== VMess 协议特殊处理 ====================
      if (url.startsWith('vmess://')) {
        // 提取 Base64 编码部分
        const base64Part = url.substring('vmess://'.length);

        // 关键步骤：解码后，移除所有空白字符，解决格式不一致问题
        const decodedString = atob(base64Part);
        const cleanedString = decodedString.replace(/\s/g, ''); // 移除所有空格、换行等

        // 解析 JSON 配置
        const nodeConfig = JSON.parse(cleanedString);

        // 删除名称相关字段（这些字段不影响节点的实际配置）
        delete nodeConfig.ps;     // 节点名称
        delete nodeConfig.remark; // 备注

        // 重新序列化对象，并以此作为唯一键
        // 通过排序键来确保即使字段顺序不同也能得到相同的结果
        return 'vmess://' + JSON.stringify(
          Object.keys(nodeConfig).sort().reduce(
            (obj: Record<string, unknown>, key) => {
              obj[key] = nodeConfig[key];
              return obj;
            },
            {}
          )
        );
      }

      // ==================== 其他协议通用处理 ====================
      // 简单地移除 # 后面的部分（节点名称）
      const hashIndex = url.indexOf('#');
      return hashIndex !== -1 ? url.substring(0, hashIndex) : url;
    } catch (e) {
      console.error('生成节点唯一键失败，将使用原始URL:', url, e);
      // 如果解析失败，回退到使用原始 URL，避免程序崩溃
      return url;
    }
  };

  /**
   * 节点去重
   * 
   * 说明：
   * - 移除配置相同的重复节点
   * - 使用智能的唯一键生成算法判断节点是否重复
   * - 保留第一次出现的节点，删除后续重复的节点
   * - 显示去重结果提示
   */
  function deduplicateNodes() {
    // 记录原始节点数量
    const originalCount = manualNodes.value.length;

    // 使用 Set 记录已见过的唯一键
    const seenKeys = new Set();
    // 存储去重后的节点
    const uniqueNodes: Node[] = [];

    // 遍历所有节点
    for (const node of manualNodes.value) {
      // 使用智能函数生成唯一键
      const uniqueKey = getUniqueKey(node.url);

      // 如果这个唯一键还没见过
      if (!seenKeys.has(uniqueKey)) {
        // 记录这个唯一键
        seenKeys.add(uniqueKey);
        // 保留这个节点
        uniqueNodes.push(node);
      }
      // 如果已经见过，则跳过（删除重复节点）
    }

    // 更新节点列表为去重后的列表
    manualNodes.value = uniqueNodes;

    // 计算移除的重复节点数量
    const removedCount = originalCount - uniqueNodes.length;

    // 显示结果提示
    if (removedCount > 0) {
      showToast(`成功移除 ${removedCount} 个重复节点。`, 'success');
    } else {
      showToast('没有发现重复的节点。', 'info');
    }
  }

  // ==================== 节点自动排序 ====================

  /**
   * 节点自动排序
   * 
   * 说明：
   * - 按照预定义的地区顺序排序节点
   * - 优先级：HK > TW > SG > JP > US > 其他
   * - 同一地区内按节点名称字母顺序排序
   * - 使用缓存优化性能，避免重复计算
   * 
   * 排序规则：
   * 1. 先按地区优先级排序
   * 2. 地区相同时按节点名称字母顺序排序
   * 3. 无法识别地区的节点排在最后
   */
  function autoSortNodes() {
    // ==================== 性能优化：使用缓存 ====================

    /**
     * 地区代码缓存
     * key: 节点名称
     * value: 地区代码（如 'HK', 'US' 等）
     * 
     * 作用：避免对同名节点重复计算地区代码
     */
    const regionCodeCache = new Map();

    /**
     * 获取节点所属地区代码
     * 
     * 说明：
     * - 根据节点名称中的关键词判断地区
     * - 使用缓存避免重复计算
     * - 无法识别的地区返回 'ZZ'（排在最后）
     * 
     * @param {string} name - 节点名称
     * @returns {string} 地区代码
     */
    const getRegionCode = (name: string) => {
      // 检查缓存
      if (regionCodeCache.has(name)) {
        return regionCodeCache.get(name);
      }

      // 遍历所有地区关键词
      const entries = Object.entries(REGION_KEYWORDS);
      for (let i = 0; i < entries.length; i++) {
        const [code, keywords] = entries[i];
        const keywordsLength = keywords.length;

        // 检查节点名称是否匹配当前地区的任一关键词
        for (let j = 0; j < keywordsLength; j++) {
          if (keywords[j].test(name)) {
            // 匹配成功，缓存并返回地区代码
            regionCodeCache.set(name, code);
            return code;
          }
        }
      }

      // 无法识别地区，返回 'ZZ'（排在最后）
      regionCodeCache.set(name, 'ZZ');
      return 'ZZ';
    };

    // ==================== 执行排序 ====================

    manualNodes.value.sort((a, b) => {
      // 获取两个节点的地区代码
      const regionA = getRegionCode(a.name);
      const regionB = getRegionCode(b.name);

      // 在预定义顺序中查找地区的位置
      const indexA = REGION_ORDER.indexOf(regionA);
      const indexB = REGION_ORDER.indexOf(regionB);

      // 计算有效索引（未找到的地区使用 Infinity，排在最后）
      const effectiveIndexA = indexA === -1 ? Infinity : indexA;
      const effectiveIndexB = indexB === -1 ? Infinity : indexB;

      // 首先按地区优先级排序
      if (effectiveIndexA !== effectiveIndexB) {
        return effectiveIndexA - effectiveIndexB;
      }

      // 地区相同时，按节点名称字母顺序排序
      return a.name.localeCompare(b.name, 'zh-CN');
    });
  }

  // ==================== 数据监听 ====================

  /**
   * 监听搜索词变化，重置分页
   * 
   * 说明：
   * - 当搜索词变化时，过滤结果会改变
   * - 自动跳转到第一页以显示搜索结果
   */
  watch(debouncedSearchTerm, () => {
    manualNodesCurrentPage.value = 1;
  });

  /**
   * 监听初始数据变化
   * 
   * 说明：
   * - 当初始数据发生变化时，重新初始化节点列表
   * - immediate: true - 立即执行一次
   * - deep: true - 深度监听对象内部变化
   */
  watch(initialNodesRef, (newInitialNodes) => {
    initializeManualNodes(newInitialNodes || []);
  }, { immediate: true, deep: true });

  // ==================== 导出接口 ====================

  return {
    /** 手动节点列表 */
    manualNodes,
    /** 当前页码 */
    manualNodesCurrentPage,
    /** 总页数 */
    manualNodesTotalPages,
    /** 当前页显示的节点列表 */
    paginatedManualNodes,
    /** 已启用的节点数量（计算属性） */
    enabledManualNodesCount: computed(() => enabledManualNodes.value.length),
    /** 搜索关键词 */
    searchTerm,
    /** 切换页码 */
    changeManualNodesPage,
    /** 添加节点 */
    addNode,
    /** 更新节点 */
    updateNode,
    /** 删除节点 */
    deleteNode,
    /** 删除所有节点 */
    deleteAllNodes,
    /** 批量添加节点 */
    addNodesFromBulk,
    /** 节点自动排序 */
    autoSortNodes,
    /** 节点去重 */
    deduplicateNodes,
  };
}

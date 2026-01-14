/**
 * ==================== 订阅管理组合式函数 ====================
 * 
 * 功能说明：
 * - 管理订阅列表的增删改查操作
 * - 处理订阅分页显示
 * - 更新订阅的节点数量和用户信息
 * - 支持批量导入和批量更新订阅
 * - 优化性能，减少 API 请求次数
 * 
 * =============================================================
 */

import { ref, computed, watch, type Ref } from 'vue';
import { fetchNodeCount, batchUpdateNodes } from '../../utils/api';
import { useToastStore } from '../../stores/toast';
import type { Subscription } from '../../types/index';

// ==================== 常量定义 ====================

/**
 * HTTP/HTTPS 协议正则表达式
 * 用于判断是否为有效的订阅链接
 * 预编译正则表达式以提升性能
 */
const HTTP_REGEX = /^https?:\/\//;

/**
 * 订阅管理组合式函数
 * 
 * @param {Ref<Subscription[] | null>} initialSubsRef - 初始订阅列表的响应式引用
 * @returns 订阅管理相关的状态和方法
 */
export function useSubscriptions(initialSubsRef: Ref<Subscription[] | null>) {
  // 获取 Toast 提示功能
  const { showToast } = useToastStore();

  // ==================== 响应式状态 ====================

  /** 订阅列表 */
  const subscriptions = ref<Subscription[]>([]);

  /** 当前页码（从 1 开始） */
  const subsCurrentPage = ref(1);

  /** 每页显示的订阅数量 */
  const subsItemsPerPage = 6;

  // ==================== 数据初始化 ====================

  /**
   * 初始化订阅列表
   * 
   * 说明：
   * - 从服务器获取的数据初始化订阅
   * - 确保每个订阅都有必需的字段和默认值
   * - 设置初始更新状态为 false
   * 
   * @param {Partial<Subscription>[]} subsData - 原始订阅数据数组
   */
  function initializeSubscriptions(subsData: Partial<Subscription>[]) {
    subscriptions.value = (subsData || []).map(sub => ({
      id: sub.id || crypto.randomUUID(),
      name: sub.name,
      url: sub.url,
      enabled: sub.enabled ?? true,
      nodeCount: sub.nodeCount || 0,
      isUpdating: false,
      userInfo: sub.userInfo || undefined,
      exclude: sub.exclude || '',
      ...sub
    } as Subscription));
  }

  // ==================== 计算属性 ====================

  /**
   * 已启用的订阅列表
   * 过滤出 enabled 为 true 的订阅
   */
  const enabledSubscriptions = computed(() => subscriptions.value.filter(s => s.enabled));

  /**
   * 总页数
   * 根据订阅总数和每页数量计算
   */
  const subsTotalPages = computed(() => Math.ceil(subscriptions.value.length / subsItemsPerPage));

  /**
   * 当前页显示的订阅列表
   * 根据当前页码进行分页切片
   */
  const paginatedSubscriptions = computed(() => {
    const start = (subsCurrentPage.value - 1) * subsItemsPerPage;
    const end = start + subsItemsPerPage;
    return subscriptions.value.slice(start, end);
  });

  // ==================== 分页控制 ====================

  /**
   * 切换页码
   * 
   * @param {number} page - 目标页码
   */
  function changeSubsPage(page: number) {
    // 验证页码范围
    if (page < 1 || page > subsTotalPages.value) return;
    subsCurrentPage.value = page;
  }

  // ==================== 节点信息更新 ====================

  /**
   * 更新单个订阅的节点数量和用户信息
   * 
   * 说明：
   * - 向服务器请求订阅的节点统计信息
   * - 更新节点数量和用户信息（流量、到期时间等）
   * - 支持初始加载模式（不显示更新状态）
   * 
   * @param {string} subId - 订阅 ID
   * @param {boolean} isInitialLoad - 是否为初始加载（默认 false）
   * @returns {Promise<boolean>} 是否更新成功
   */
  async function handleUpdateNodeCount(subId: string, isInitialLoad = false) {
    // 查找要更新的订阅
    const subToUpdate = subscriptions.value.find(s => s.id === subId);

    // 验证订阅是否存在且有有效的 URL
    if (!subToUpdate || !subToUpdate.url || !HTTP_REGEX.test(subToUpdate.url)) return false;

    // 如果不是初始加载，显示更新状态
    if (!isInitialLoad) {
      subToUpdate.isUpdating = true;
    }

    try {
      // 从服务器获取节点统计信息
      const data = await fetchNodeCount(subToUpdate.url);

      // 更新节点数量
      subToUpdate.nodeCount = data.count || 0;

      // 更新用户信息（流量、到期时间等）
      subToUpdate.userInfo = data.userInfo || undefined;

      return true;
    } catch (error) {
      console.error(`获取订阅 ${subToUpdate.name} 的节点数量失败:`, error);
      return false;
    } finally {
      // 无论成功失败，都重置更新状态
      subToUpdate.isUpdating = false;
    }
  }

  // ==================== 订阅操作 ====================

  /**
   * 添加新订阅
   * 
   * 说明：
   * - 将新订阅添加到列表开头
   * - 自动更新节点数量
   * - 根据当前页面状态决定是否跳转到第一页
   * 
   * @param {Subscription} sub - 要添加的订阅对象
   * @returns {Promise} 节点数量更新的 Promise
   */
  function addSubscription(sub: Subscription) {
    // 添加到列表开头（unshift 添加到数组开头）
    subscriptions.value.unshift(sub);

    // 判断是否需要跳转到第一页
    const currentPageItems = paginatedSubscriptions.value.length;
    if (currentPageItems >= subsItemsPerPage) {
      // 当前页面已满，跳转到第一页
      subsCurrentPage.value = 1;
    }
    // 如果当前页面未满，保持在当前页面，新订阅会自动显示

    // 新增订阅时自动更新节点数量（单个更新）
    return handleUpdateNodeCount(sub.id);
  }

  /**
   * 更新现有订阅
   * 
   * 说明：
   * - 查找并更新对应的订阅
   * - 如果 URL 发生变化，重置节点数量并重新获取
   * 
   * @param {Subscription} updatedSub - 更新后的订阅对象
   */
  function updateSubscription(updatedSub: Subscription) {
    // 查找订阅在数组中的位置
    const index = subscriptions.value.findIndex(s => s.id === updatedSub.id);

    if (index !== -1) {
      // 检查 URL 是否发生变化
      if (subscriptions.value[index].url !== updatedSub.url) {
        // URL 变更时，重置节点数量
        updatedSub.nodeCount = 0;
        // 自动更新节点数量（单个更新）
        handleUpdateNodeCount(updatedSub.id);
      }

      // 更新订阅数据
      subscriptions.value[index] = updatedSub;
    }
  }

  /**
   * 删除订阅
   * 
   * 说明：
   * - 从列表中移除指定的订阅
   * - 如果当前页变为空页且不是第一页，自动跳转到上一页
   * 
   * @param {string} subId - 要删除的订阅 ID
   */
  function deleteSubscription(subId: string) {
    // 过滤掉要删除的订阅
    subscriptions.value = subscriptions.value.filter((s) => s.id !== subId);

    // 如果删除后当前页为空且不是第一页，跳转到上一页
    if (paginatedSubscriptions.value.length === 0 && subsCurrentPage.value > 1) {
      subsCurrentPage.value--;
    }
  }

  /**
   * 删除所有订阅
   * 
   * 说明：
   * - 清空订阅列表
   * - 重置页码为第一页
   */
  function deleteAllSubscriptions() {
    subscriptions.value = [];
    subsCurrentPage.value = 1;
  }

  // ==================== 批量操作 ====================

  /**
   * 批量导入订阅
   * 
   * 说明：
   * - 将多个订阅添加到列表开头
   * - 使用批量更新 API 提升性能，减少 KV 写入次数
   * - 如果批量更新失败，自动降级到逐个更新
   * - 过滤出有效的 HTTP/HTTPS 链接进行更新
   * 
   * @param {Subscription[]} subs - 要导入的订阅数组
   */
  async function addSubscriptionsFromBulk(subs: Subscription[]) {
    // 批量添加到列表开头
    subscriptions.value.unshift(...subs);

    // 批量添加后跳转到第一页
    subsCurrentPage.value = 1;

    // ==================== 过滤需要更新的订阅 ====================
    // 只有 HTTP/HTTPS 链接才需要更新节点信息
    const subsToUpdate = subs.filter(sub => sub.url && HTTP_REGEX.test(sub.url));

    if (subsToUpdate.length > 0) {
      // 显示批量更新提示
      showToast(`正在批量更新 ${subsToUpdate.length} 个订阅...`, 'success');

      try {
        // ==================== 调用批量更新 API ====================
        const result = await batchUpdateNodes(subsToUpdate.map(sub => sub.id));

        if (result.success) {
          // ==================== 批量更新成功 ====================

          // 使用 Map 提升查找性能（O(1) 查找时间）
          const subsMap = new Map(subscriptions.value.map(s => [s.id, s]));

          // 安全地获取结果数组，兼容不同的后端返回格式
          const results = Array.isArray(result.data)
            ? result.data
            : (Array.isArray(result.results) ? result.results : []);

          // 遍历更新结果，更新每个订阅的数据
          results.forEach((updateResult: any) => {
            if (updateResult.success) {
              const sub = subsMap.get(updateResult.id);
              if (sub) {
                // 更新节点数量
                if (typeof updateResult.nodeCount === 'number') {
                  sub.nodeCount = updateResult.nodeCount;
                }
                // 更新用户信息
                if (updateResult.userInfo) {
                  sub.userInfo = updateResult.userInfo;
                }
              }
            }
          });

          // 统计成功更新的数量
          const successCount = results.filter((r: any) => r.success).length;
          showToast(`批量更新完成！成功更新 ${successCount}/${subsToUpdate.length} 个订阅`, 'success');
        } else {
          // ==================== 批量更新失败，降级处理 ====================

          showToast(`批量更新失败: ${result.message}`, 'error');

          // 降级到逐个更新模式
          showToast('正在降级到逐个更新模式...', 'info');
          for (const sub of subsToUpdate) {
            await handleUpdateNodeCount(sub.id);
          }
        }
      } catch (error) {
        // ==================== 发生错误，降级处理 ====================

        console.error('批量更新失败:', error);
        showToast('批量更新失败，正在降级到逐个更新...', 'error');

        // 降级到逐个更新
        for (const sub of subsToUpdate) {
          await handleUpdateNodeCount(sub.id);
        }
      }
    } else {
      // 没有需要更新的订阅
      showToast('批量导入完成！', 'success');
    }
  }

  // ==================== 数据监听 ====================

  /**
   * 监听初始数据变化
   * 
   * 说明：
   * - 当初始数据发生变化时，重新初始化订阅列表
   * - immediate: true - 立即执行一次
   * - deep: true - 深度监听对象内部变化
   */
  watch(initialSubsRef, (newInitialSubs) => {
    initializeSubscriptions(newInitialSubs || []);
  }, { immediate: true, deep: true });

  // ==================== 高级业务操作 ====================

  /**
   * 保存订阅（新增或更新）
   * 自动处理验证、新增/更新逻辑、ID生成
   */
  async function saveSubscription(sub: Subscription, isNew: boolean): Promise<{ success: boolean; message?: string; updatePromise?: Promise<boolean> }> {
    // 验证
    if (!sub.url) return { success: false, message: '订阅链接不能为空' };
    if (!HTTP_REGEX.test(sub.url)) return { success: false, message: '请输入有效的 http:// 或 https:// 订阅链接' };

    let updatePromise: Promise<boolean> | undefined;

    if (isNew) {
      // 新建
      const newSub = { ...sub, id: sub.id || crypto.randomUUID() };
      updatePromise = addSubscription(newSub);
    } else {
      // 更新
      updateSubscription(sub);
    }

    return { success: true, updatePromise };
  }

  /**
   * 切换订阅启用状态
   */
  function toggleSubscription(subId: string) {
    const sub = subscriptions.value.find(s => s.id === subId);
    if (sub) {
      sub.enabled = !sub.enabled;
      return true;
    }
    return false;
  }

  /**
   * 批量删除订阅
   */
  function batchDeleteSubscriptions(ids: string[]) {
    if (!ids || ids.length === 0) return 0;
    const initialCount = subscriptions.value.length;
    subscriptions.value = subscriptions.value.filter(s => !ids.includes(s.id));
    // 如果当前页变空，跳到上一页
    if (paginatedSubscriptions.value.length === 0 && subsCurrentPage.value > 1) {
      subsCurrentPage.value--;
    }
    return initialCount - subscriptions.value.length;
  }

  /**
   * 更新所有已启用的订阅
   * 返回更新结果统计
   */
  async function updateAllEnabledSubscriptions() {
    // 1. 筛选需要更新的订阅
    const enabledSubs = subscriptions.value.filter(sub => sub.enabled && sub.url && HTTP_REGEX.test(sub.url));

    if (enabledSubs.length === 0) {
      return { success: false, message: '没有可更新的订阅', count: 0 };
    }

    try {
      // 2. 批量更新API调用
      const result = await batchUpdateNodes(enabledSubs.map(sub => sub.id));

      // 3. 处理结果
      // 兼容后端返回格式
      const updateResults = (Array.isArray(result.data)
        ? result.data
        : (Array.isArray((result as any).results) ? (result as any).results : null)) as any[];

      if (result.success && updateResults) {
        // 使用 Map 提升查找性能
        const subsMap = new Map(subscriptions.value.map(s => [s.id, s]));
        let successCount = 0;

        updateResults.forEach((r) => {
          if (r.success) {
            const sub = subsMap.get(r.id);
            if (sub) {
              if (typeof r.nodeCount === 'number') sub.nodeCount = r.nodeCount;
              if (r.userInfo) sub.userInfo = r.userInfo;
              successCount++;
            }
          }
        });

        return { success: true, count: successCount, total: enabledSubs.length };
      } else {
        return { success: false, message: result.message || '未知错误', count: 0 };
      }
    } catch (error) {
      console.error('批量更新异常:', error);
      return { success: false, message: '批量更新请求失败', count: 0 };
    }
  }

  // ==================== 导出接口 ====================

  return {
    /** 订阅列表 */
    subscriptions,
    /** 当前页码 */
    subsCurrentPage,
    /** 总页数 */
    subsTotalPages,
    /** 当前页显示的订阅列表 */
    paginatedSubscriptions,
    /** 已启用的订阅数量（计算属性） */
    enabledSubscriptionsCount: computed(() => enabledSubscriptions.value.length),
    /** 切换页码 */
    changeSubsPage,
    /** 添加订阅 */
    addSubscription,
    /** 更新订阅 */
    updateSubscription,
    /** 删除订阅 */
    deleteSubscription,
    /** 删除所有订阅 */
    deleteAllSubscriptions,
    /** 批量导入订阅 */
    addSubscriptionsFromBulk,
    /** 更新节点数量 */
    handleUpdateNodeCount,
    /** 保存订阅 (New) */
    saveSubscription,
    /** 切换订阅状态 (New) */
    toggleSubscription,
    /** 批量删除订阅 (New) */
    batchDeleteSubscriptions,
    /** 更新所有订阅 (New) */
    updateAllEnabledSubscriptions
  };
}

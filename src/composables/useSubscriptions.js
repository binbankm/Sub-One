// FILE: src/composables/useSubscriptions.js
import { ref, computed, watch } from 'vue';
import { fetchNodeCount, batchUpdateNodes } from '../lib/api.js';
import { useToastStore } from '../stores/toast.js';

// 优化：预编译正则表达式，提升性能
const HTTP_REGEX = /^https?:\/\//;

export function useSubscriptions(initialSubsRef, markDirty) {
  const { showToast } = useToastStore();
  const subscriptions = ref([]);
  const subsCurrentPage = ref(1);
  const subsItemsPerPage = 6;

  function initializeSubscriptions(subsData) {
    subscriptions.value = (subsData || []).map(sub => ({
      ...sub,
      id: sub.id || crypto.randomUUID(),
      enabled: sub.enabled ?? true,
      nodeCount: sub.nodeCount || 0,
      isUpdating: false,
      userInfo: sub.userInfo || null,
      exclude: sub.exclude || '', // 新增 exclude 属性
    }));
    // [最終修正] 移除此處的自動更新迴圈，以防止本地開發伺服器因併發請求過多而崩潰。
    // subscriptions.value.forEach(sub => handleUpdateNodeCount(sub.id, true)); 
  }

  const enabledSubscriptions = computed(() => subscriptions.value.filter(s => s.enabled));



  const subsTotalPages = computed(() => Math.ceil(subscriptions.value.length / subsItemsPerPage));
  const paginatedSubscriptions = computed(() => {
    const start = (subsCurrentPage.value - 1) * subsItemsPerPage;
    const end = start + subsItemsPerPage;
    return subscriptions.value.slice(start, end);
  });

  function changeSubsPage(page) {
    if (page < 1 || page > subsTotalPages.value) return;
    subsCurrentPage.value = page;
  }

  /**
   * 更新订阅节点数和用户信息
   * @param {string} subId - 订阅ID
   * @param {Object} options - 配置选项
   * @param {boolean} options.silent - 是否静默更新（不显示任何通知）
   * @param {boolean} options.showProgress - 是否显示"正在更新..."进度提示
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async function handleUpdateNodeCount(subId, options = {}) {
    const { silent = false, showProgress = false } = options;

    const subToUpdate = subscriptions.value.find(s => s.id === subId);
    if (!subToUpdate || !HTTP_REGEX.test(subToUpdate.url)) {
      return { success: false, error: 'Invalid subscription' };
    }

    // 显示更新中状态
    if (!silent) {
      subToUpdate.isUpdating = true;
      if (showProgress) {
        showToast(`正在更新 ${subToUpdate.name || '订阅'}...`, 'info');
      }
    }

    try {
      const data = await fetchNodeCount(subToUpdate.url);
      subToUpdate.nodeCount = data.count || 0;
      subToUpdate.userInfo = data.userInfo || null;

      // 标记数据已变更
      markDirty();

      // 只有非静默模式才显示成功通知
      if (!silent) {
        showToast(`${subToUpdate.name || '订阅'} 更新成功`, 'success');
      }

      return { success: true };
    } catch (error) {
      const errorMsg = `${subToUpdate.name || '订阅'} 更新失败`;

      // 静默模式下也要显示错误（错误总是重要的）
      showToast(errorMsg, 'error');
      console.error(`Failed to fetch node count for ${subToUpdate.name}:`, error);

      return { success: false, error: errorMsg };
    } finally {
      subToUpdate.isUpdating = false;
    }
  }

  function addSubscription(sub) {
    subscriptions.value.unshift(sub);
    markDirty();

    // 新增订阅时，如果当前页面未满，保持在当前页面；如果已满，跳转到第一页
    const currentPageItems = paginatedSubscriptions.value.length;
    if (currentPageItems >= subsItemsPerPage) {
      // 当前页面已满，跳转到第一页
      subsCurrentPage.value = 1;
    }
    // 如果当前页面未满，保持在当前页面，新订阅会自动显示在当前页面

    // 新增时静默更新，避免通知干扰
    handleUpdateNodeCount(sub.id, { silent: true });
  }

  function updateSubscription(updatedSub) {
    const index = subscriptions.value.findIndex(s => s.id === updatedSub.id);
    if (index !== -1) {
      const oldUrl = subscriptions.value[index].url;
      subscriptions.value[index] = updatedSub;
      markDirty();

      // URL变更时静默更新
      if (oldUrl !== updatedSub.url) {
        updatedSub.nodeCount = 0;
        handleUpdateNodeCount(updatedSub.id, { silent: true });
      }
    }
  }

  function deleteSubscription(subId) {
    subscriptions.value = subscriptions.value.filter((s) => s.id !== subId);
    markDirty();

    if (paginatedSubscriptions.value.length === 0 && subsCurrentPage.value > 1) {
      subsCurrentPage.value--;
    }
  }

  function deleteAllSubscriptions() {
    subscriptions.value = [];
    subsCurrentPage.value = 1;
    markDirty();
  }

  // {{ AURA-X: Modify - 使用批量更新API优化批量导入. Approval: 寸止(ID:1735459200). }}
  // [优化] 批量導入使用批量更新API，减少KV写入次数
  async function addSubscriptionsFromBulk(subs) {
    subscriptions.value.unshift(...subs);
    markDirty();

    // 修复分页逻辑：批量添加后跳转到第一页
    subsCurrentPage.value = 1;

    // 过滤出需要更新的订阅（只有http/https链接）
    const subsToUpdate = subs.filter(sub => sub.url && HTTP_REGEX.test(sub.url));

    if (subsToUpdate.length > 0) {
      // 显示初始进度提示
      showToast(`正在批量更新 ${subsToUpdate.length} 个订阅...`, 'info');

      try {
        const result = await batchUpdateNodes(subsToUpdate.map(sub => sub.id));

        if (result.success) {
          // 优化：使用Map提升查找性能
          const subsMap = new Map(subscriptions.value.map(s => [s.id, s]));

          result.results.forEach(updateResult => {
            if (updateResult.success) {
              const sub = subsMap.get(updateResult.id);
              if (sub) {
                if (typeof updateResult.nodeCount === 'number') {
                  sub.nodeCount = updateResult.nodeCount;
                }
                if (updateResult.userInfo) {
                  sub.userInfo = updateResult.userInfo;
                }
              }
            }
          });

          const successCount = result.results.filter(r => r.success).length;
          const failedCount = subsToUpdate.length - successCount;

          if (failedCount === 0) {
            showToast(`批量更新完成！全部 ${successCount} 个订阅更新成功`, 'success');
          } else {
            showToast(`批量更新完成！${successCount} 个成功，${failedCount} 个失败`, 'warning');
          }
        } else {
          showToast(`批量更新API失败: ${result.message || '未知错误'}`, 'error');
          // 降级到逐个更新（静默模式，避免大量通知）
          showToast('正在降级到逐个更新模式...', 'info');

          let successCount = 0;
          for (const sub of subsToUpdate) {
            const result = await handleUpdateNodeCount(sub.id, { silent: true });
            if (result.success) successCount++;
          }

          showToast(`逐个更新完成！${successCount}/${subsToUpdate.length} 个订阅更新成功`, 'success');
        }
      } catch (error) {
        console.error('Batch update failed:', error);
        showToast('批量更新失败，正在降级到逐个更新...', 'error');

        // 降级到逐个更新（静默模式，避免大量通知）
        let successCount = 0;
        for (const sub of subsToUpdate) {
          const result = await handleUpdateNodeCount(sub.id, { silent: true });
          if (result.success) successCount++;
        }

        showToast(`逐个更新完成！${successCount}/${subsToUpdate.length} 个订阅更新成功`, 'success');
      }
    } else {
      // 没有需要更新的订阅
      showToast('批量导入完成！', 'success');
    }
  }

  watch(initialSubsRef, (newInitialSubs) => {
    initializeSubscriptions(newInitialSubs);
  }, { immediate: true, deep: true });

  return {
    subscriptions,
    subsCurrentPage,
    subsTotalPages,
    paginatedSubscriptions,
    enabledSubscriptionsCount: computed(() => enabledSubscriptions.value.length),
    changeSubsPage,
    addSubscription,
    updateSubscription,
    deleteSubscription,
    deleteAllSubscriptions,
    addSubscriptionsFromBulk,
    handleUpdateNodeCount,
  };
}
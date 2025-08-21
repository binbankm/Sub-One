// FILE: src/composables/useDataManager.js
import { ref } from 'vue';
import { saveSubs, batchUpdateNodes } from '../lib/api.js';
import { useToastStore } from '../stores/toast.js';

export function useDataManager() {
  const { showToast } = useToastStore();
  
  const dirty = ref(false);
  const saveState = ref('idle');
  const isUpdatingAllSubs = ref(false);

  // 标记数据已修改
  const markDirty = () => { 
    dirty.value = true; 
    saveState.value = 'idle'; 
  };

  // 保存数据
  const handleSave = async (subscriptions, profiles) => {
    saveState.value = 'saving';
    
    // 优化：使用更高效的对象创建方式
    const combinedSubs = [
      ...subscriptions.map(sub => {
        const { isUpdating, ...rest } = sub;
        return rest;
      }),
      ...profiles.map(profile => {
        const { isUpdating, ...rest } = profile;
        return rest;
      })
    ];

    try {
      // 数据验证
      if (!Array.isArray(combinedSubs) || !Array.isArray(profiles)) {
        throw new Error('数据格式错误，请刷新页面后重试');
      }

      const result = await saveSubs(combinedSubs, profiles);

      if (result.success) {
        saveState.value = 'success';
        showToast('保存成功！', 'success');
        
        // 延迟重置状态
        setTimeout(() => { 
          dirty.value = false; 
          saveState.value = 'idle'; 
        }, 1500);
        
        return { success: true };
      } else {
        // 显示服务器返回的具体错误信息
        const errorMessage = result.message || result.error || '保存失败，请稍后重试';
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('保存数据时发生错误:', error);

      // 优化：使用Map提升查找性能
      const errorMessageMap = new Map([
        ['网络', '网络连接异常，请检查网络后重试'],
        ['格式', '数据格式异常，请刷新页面后重试'],
        ['存储', '存储服务暂时不可用，请稍后重试']
      ]);
      
      let userMessage = error.message;
      for (const [key, message] of errorMessageMap) {
        if (error.message.includes(key)) {
          userMessage = message;
          break;
        }
      }

      showToast(userMessage, 'error');
      saveState.value = 'idle';
      return { success: false, error: userMessage };
    }
  };

  // 通用直接保存函数
  const handleDirectSave = async (operationName = '操作', subscriptions, profiles) => {
    try {
      const result = await handleSave(subscriptions, profiles);
      if (result.success) {
        showToast(`${operationName}已保存`, 'success');
      }
      return result;
    } catch (error) {
      console.error('保存失败:', error);
      showToast('保存失败', 'error');
      return { success: false, error: error.message };
    }
  };

  // 批量更新订阅
  const handleUpdateAllSubscriptions = async (subscriptions) => {
    if (isUpdatingAllSubs.value) return;
    
    const enabledSubs = subscriptions.filter(sub => sub.enabled && sub.url.startsWith('http'));
    if (enabledSubs.length === 0) {
      showToast('没有可更新的订阅', 'warning');
      return;
    }
    
    isUpdatingAllSubs.value = true;
    
    try {
      const subscriptionIds = enabledSubs.map(sub => sub.id);
      const result = await batchUpdateNodes(subscriptionIds);
      
      if (result.success) {
        // 优化：使用Map提升查找性能
        if (result.results && Array.isArray(result.results)) {
          const subsMap = new Map(subscriptions.map(s => [s.id, s]));
          
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
        }
        
        const successCount = result.results ? result.results.filter(r => r.success).length : enabledSubs.length;
        showToast(`成功更新了 ${successCount} 个订阅`, 'success');
        return { success: true, count: successCount };
      } else {
        showToast(`更新失败: ${result.message}`, 'error');
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('批量更新订阅失败:', error);
      showToast('批量更新失败', 'error');
      return { success: false, error: error.message };
    } finally {
      isUpdatingAllSubs.value = false;
    }
  };

  // 放弃更改
  const handleDiscard = (initialData, resetFunctions) => {
    // 调用所有重置函数
    if (resetFunctions && Array.isArray(resetFunctions)) {
      resetFunctions.forEach(resetFn => {
        if (typeof resetFn === 'function') {
          resetFn();
        }
      });
    }
    
    dirty.value = false;
    showToast('已放弃所有未保存的更改');
  };

  return {
    // 状态
    dirty,
    saveState,
    isUpdatingAllSubs,
    
    // 方法
    markDirty,
    handleSave,
    handleDirectSave,
    handleUpdateAllSubscriptions,
    handleDiscard,
  };
}

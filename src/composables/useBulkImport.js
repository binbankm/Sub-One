// FILE: src/composables/useBulkImport.js
import { extractNodeName } from '../lib/utils.js';
import { useToastStore } from '../stores/toast.js';

export function useBulkImport() {
  const { showToast } = useToastStore();

  // 预编译正则表达式，提升性能
  const httpRegex = /^https?:\/\//;
  const nodeRegex = /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//;

  // 解析批量导入文本
  const parseBulkImportText = (importText) => {
    if (!importText) return { newSubs: [], newNodes: [] };
    
    // 优化：使用更高效的字符串处理
    const lines = importText.split('\n').map(line => line.trim()).filter(Boolean);
    const newSubs = [];
    const newNodes = [];
    
    for (const line of lines) {
      const newItem = { 
        id: crypto.randomUUID(), 
        name: extractNodeName(line) || '未命名', 
        url: line, 
        enabled: true, 
        status: 'unchecked' 
      };
      
      if (httpRegex.test(line)) {
        newSubs.push(newItem);
      } else if (nodeRegex.test(line)) {
        newNodes.push(newItem);
      }
    }
    
    return { newSubs, newNodes };
  };

  // 处理批量导入
  const handleBulkImport = async (importText, addSubscriptionsFromBulk, addNodesFromBulk, handleDirectSave) => {
    const { newSubs, newNodes } = parseBulkImportText(importText);
    
    if (newSubs.length > 0) {
      addSubscriptionsFromBulk(newSubs);
    }
    if (newNodes.length > 0) {
      addNodesFromBulk(newNodes);
    }
    
    if (newSubs.length > 0 || newNodes.length > 0) {
      await handleDirectSave('批量导入', newSubs, newNodes);
      showToast(`成功导入 ${newSubs.length} 条订阅和 ${newNodes.length} 个手动节点`, 'success');
    }
    
    return { newSubs, newNodes };
  };

  // 验证导入文本
  const validateImportText = (importText) => {
    if (!importText || importText.trim().length === 0) {
      return { valid: false, message: '请输入要导入的内容' };
    }
    
    const lines = importText.split('\n').filter(line => line.trim().length > 0);
    if (lines.length === 0) {
      return { valid: false, message: '没有找到有效的内容行' };
    }
    
    let validLines = 0;
    let invalidLines = 0;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (httpRegex.test(trimmedLine) || nodeRegex.test(trimmedLine)) {
        validLines++;
      } else {
        invalidLines++;
      }
    }
    
    if (validLines === 0) {
      return { valid: false, message: '没有找到有效的订阅链接或节点链接' };
    }
    
    if (invalidLines > 0) {
      return { 
        valid: true, 
        warning: true, 
        message: `发现 ${invalidLines} 行无效内容，将跳过这些行` 
      };
    }
    
    return { valid: true, message: `找到 ${validLines} 行有效内容` };
  };

  // 获取导入统计信息
  const getImportStats = (importText) => {
    const { newSubs, newNodes } = parseBulkImportText(importText);
    
    return {
      totalLines: importText ? importText.split('\n').filter(line => line.trim().length > 0).length : 0,
      subscriptions: newSubs.length,
      nodes: newNodes.length,
      total: newSubs.length + newNodes.length
    };
  };

  return {
    parseBulkImportText,
    handleBulkImport,
    validateImportText,
    getImportStats,
  };
}

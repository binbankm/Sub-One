// 创建基础请求函数，避免代码重复
const baseFetch = async (url, options = {}) => {
  try {
    // 添加默认头部
    const defaultHeaders = {
      'Content-Type': 'application/json'
    };
    
    const config = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers
      }
    };
    
    const response = await fetch(url, config);
    
    // 检查HTTP状态码
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`;
      return { success: false, message: errorMessage, status: response.status };
    }
    
    // 检查响应是否为空
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    }
    
    return { success: true };
  } catch (error) {
    console.error(`API请求失败 [${url}]:`, error);
    
    // 提供更具体的错误信息
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { success: false, message: '网络连接失败，请检查网络连接' };
    } else if (error.name === 'SyntaxError') {
      return { success: false, message: '服务器响应格式错误' };
    } else {
      return { success: false, message: `请求失败: ${error.message}` };
    }
  }
};

// 获取初始数据
export async function fetchInitialData() {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      console.error("会话无效或API错误, 状态:", response.status);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error("获取初始数据失败:", error);
    return null;
  }
}

// 登录
export async function login(password) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    return response;
  } catch (error) {
    console.error("登录请求失败:", error);
    return { ok: false, error: '网络请求失败' };
  }
}

// 保存订阅和配置
export async function saveSubs(subs, profiles) {
  // 数据预验证
  if (!Array.isArray(subs) || !Array.isArray(profiles)) {
    return { success: false, message: '数据格式错误：subs 和 profiles 必须是数组' };
  }

  return baseFetch('/api/subs', {
    method: 'POST',
    body: JSON.stringify({ subs, profiles })
  });
}

// 获取节点数量
export async function fetchNodeCount(subUrl) {
  try {
    const res = await fetch('/api/node_count', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: subUrl })
    });
    const data = await res.json();
    return data; // 返回整个对象 { count, userInfo }
  } catch (e) {
    console.error('fetchNodeCount 错误:', e);
    return { count: 0, userInfo: null };
  }
}

// 获取设置
export async function fetchSettings() {
  try {
    const response = await fetch('/api/settings');
    if (!response.ok) return {};
    return await response.json();
  } catch (error) {
    console.error("获取设置失败:", error);
    return {};
  }
}

// 保存设置
export async function saveSettings(settings) {
  return baseFetch('/api/settings', {
    method: 'POST',
    body: JSON.stringify(settings)
  });
}

/**
 * 批量更新订阅的节点信息
 * @param {string[]} subscriptionIds - 要更新的订阅ID数组
 * @returns {Promise<Object>} - 更新结果
 */
export async function batchUpdateNodes(subscriptionIds) {
  return baseFetch('/api/batch_update_nodes', {
    method: 'POST',
    body: JSON.stringify({ subscriptionIds })
  });
}


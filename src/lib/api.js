/**
 * API接口函数库
 * 提供与后端服务的数据交互功能
 */

/**
 * 获取初始数据
 * @returns {Promise<Object|null>} 返回初始数据对象或null
 */
export async function fetchInitialData() {
  try {
    const response = await fetch('/api/data')
    if (!response.ok) {
      console.error('Session invalid or API error, status:', response.status)
      return null
    }
    // 后端已经更新，会返回 { subs, profiles, config }
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch initial data:', error)
    return null
  }
}

/**
 * 用户登录
 * @param {string} password - 用户密码
 * @returns {Promise<Response>} 登录响应对象
 */
export async function login(password) {
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    })
    return response
  } catch (error) {
    console.error('Login request failed:', error)
    return { ok: false, error: '网络请求失败' }
  }
}

/**
 * 保存订阅和订阅组数据
 * @param {Array} subs - 订阅数据数组
 * @param {Array} profiles - 订阅组数据数组
 * @returns {Promise<Object>} 保存结果对象
 */
export async function saveSubs(subs, profiles) {
  try {
    // 数据预验证
    if (!Array.isArray(subs) || !Array.isArray(profiles)) {
      return { success: false, message: '数据格式错误：subs 和 profiles 必须是数组' }
    }

    const response = await fetch('/api/subs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // 将 subs 和 profiles 一起发送
      body: JSON.stringify({ subs, profiles })
    })

    // 检查HTTP状态码
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`
      return { success: false, message: errorMessage }
    }

    return await response.json()
  } catch (error) {
    console.error('saveSubs 网络请求失败:', error)

    // 根据错误类型返回更具体的错误信息
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { success: false, message: '网络连接失败，请检查网络连接' }
    } else if (error.name === 'SyntaxError') {
      return { success: false, message: '服务器响应格式错误' }
    } else {
      return { success: false, message: `网络请求失败: ${error.message}` }
    }
  }
}

/**
 * 获取订阅的节点数量
 * @param {string} subUrl - 订阅链接
 * @returns {Promise<Object>} 包含节点数量和用户信息的对象
 */
export async function fetchNodeCount(subUrl) {
  try {
    const res = await fetch('/api/node_count', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: subUrl })
    })
    const data = await res.json()
    return data // [修正] 直接返回整个对象 { count, userInfo }
  } catch (e) {
    console.error('fetchNodeCount error:', e)
    return { count: 0, userInfo: null }
  }
}

/**
 * 获取应用设置
 * @returns {Promise<Object>} 设置对象
 */
export async function fetchSettings() {
  try {
    const response = await fetch('/api/settings')
    if (!response.ok) return {}
    return await response.json()
  } catch (error) {
    console.error('Failed to fetch settings:', error)
    return {}
  }
}

/**
 * 保存应用设置
 * @param {Object} settings - 设置对象
 * @returns {Promise<Object>} 保存结果对象
 */
export async function saveSettings(settings) {
  try {
    const response = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })

    // 检查HTTP状态码
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`
      return { success: false, message: errorMessage }
    }

    return await response.json()
  } catch (error) {
    console.error('saveSettings 网络请求失败:', error)

    // 根据错误类型返回更具体的错误信息
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return { success: false, message: '网络连接失败，请检查网络连接' }
    } else if (error.name === 'SyntaxError') {
      return { success: false, message: '服务器响应格式错误' }
    } else {
      return { success: false, message: `网络请求失败: ${error.message}` }
    }
  }
}

/**
 * 批量更新订阅的节点信息
 * @param {string[]} subscriptionIds - 要更新的订阅ID数组
 * @returns {Promise<Object>} 更新结果对象
 */
export async function batchUpdateNodes(subscriptionIds) {
  try {
    const response = await fetch('/api/batch_update_nodes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscriptionIds })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`
      return { success: false, message: errorMessage }
    }

    const result = await response.json()
    return result
  } catch (error) {
    console.error('Failed to batch update nodes:', error)
    return { success: false, message: '网络请求失败，请检查网络连接' }
  }
}

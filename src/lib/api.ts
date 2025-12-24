/**
 * ==================== API 请求模块 ====================
 * 
 * 功能说明：
 * - 封装所有与后端 API 的交互逻辑
 * - 包括登录、数据获取、保存、节点更新等操作
 * - 统一错误处理和响应格式
 * 
 * ======================================================
 */

import type { Subscription, Profile, AppConfig, ApiResponse } from '../types';

// 导出 ApiResponse 类型供其他模块使用
export { ApiResponse };

// ==================== 数据获取 ====================

/**
 * 获取初始数据
 * 
 * 说明：
 * - 从服务器获取用户的所有订阅、订阅组和配置信息
 * - 用于应用启动时的数据初始化
 * 
 * @returns {Promise} 返回包含 subs、profiles、config 的对象，失败返回 null
 */
export async function fetchInitialData(): Promise<{ subs: Subscription[]; profiles: Profile[]; config: AppConfig } | null> {
    try {
        // 发送 GET 请求获取数据
        const response = await fetch('/api/data');

        // 检查 HTTP 响应状态
        if (!response.ok) {
            console.error("会话无效或 API 错误，状态码:", response.status);
            return null;
        }

        // 解析并返回 JSON 数据（后端返回格式：{ subs, profiles, config }）
        return await response.json();
    } catch (error) {
        console.error("获取初始数据失败:", error);
        return null;
    }
}

// ==================== 用户认证 ====================

/**
 * 用户登录
 * 
 * 说明：
 * - 向服务器提交密码进行身份验证
 * - 成功后服务器会设置会话凭证
 * 
 * @param {string} password - 用户密码
 * @returns {Promise} 返回 HTTP Response 对象或错误对象
 */
export async function login(password: string): Promise<Response | { ok: boolean; error: string }> {
    try {
        // 发送 POST 请求提交登录信息
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });

        return response;
    } catch (error) {
        console.error("登录请求失败:", error);
        // 网络请求失败时返回自定义错误对象
        return { ok: false, error: '网络请求失败' };
    }
}

// ==================== 数据保存 ====================

/**
 * 保存订阅和订阅组数据
 * 
 * 说明：
 * - 核心保存函数，同时保存订阅列表和订阅组列表
 * - 包含数据验证和详细的错误处理
 * 
 * @param {Subscription[]} subs - 订阅列表
 * @param {Profile[]} profiles - 订阅组列表
 * @returns {Promise<ApiResponse>} 返回 API 响应对象
 */
export async function saveSubs(subs: Subscription[], profiles: Profile[]): Promise<ApiResponse> {
    try {
        // 数据预验证：确保传入的参数是数组类型
        if (!Array.isArray(subs) || !Array.isArray(profiles)) {
            return { success: false, message: '数据格式错误：subs 和 profiles 必须是数组' };
        }

        // 发送 POST 请求保存数据
        const response = await fetch('/api/subs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 将 subs 和 profiles 一起发送到后端
            body: JSON.stringify({ subs, profiles })
        });

        // 检查 HTTP 状态码
        if (!response.ok) {
            // 尝试解析错误响应
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`;
            return { success: false, message: errorMessage };
        }

        // 返回服务器响应的 JSON 数据
        return await response.json();
    } catch (error: any) {
        console.error('保存订阅数据失败:', error);

        // 根据错误类型返回更具体的错误信息
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return { success: false, message: '网络连接失败，请检查网络连接' };
        } else if (error.name === 'SyntaxError') {
            return { success: false, message: '服务器响应格式错误' };
        } else {
            return { success: false, message: `网络请求失败: ${error.message}` };
        }
    }
}

// ==================== 节点信息获取 ====================

/**
 * 获取订阅的节点数量和用户信息
 * 
 * 说明：
 * - 向服务器发送订阅链接，获取该订阅包含的节点数
 * - 同时获取流量、到期时间等用户信息
 * 
 * @param {string} subUrl - 订阅链接地址
 * @returns {Promise} 返回包含 count 和 userInfo 的对象
 */
export async function fetchNodeCount(subUrl: string): Promise<{ count: number; userInfo: any }> {
    try {
        // 发送 POST 请求获取节点统计信息
        const res = await fetch('/api/node_count', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: subUrl })
        });

        // 解析响应数据
        const data = await res.json();
        // 直接返回完整对象（包含 count 和 userInfo 字段）
        return data;
    } catch (e) {
        console.error('获取节点数量失败:', e);
        // 请求失败时返回默认值
        return { count: 0, userInfo: null };
    }
}

// ==================== 配置管理 ====================

/**
 * 获取应用配置
 * 
 * 说明：
 * - 从服务器获取应用的全局配置信息
 * - 如 profileToken（订阅组分享令牌）等
 * 
 * @returns {Promise} 返回配置对象，失败返回空对象
 */
export async function fetchSettings(): Promise<Partial<AppConfig>> {
    try {
        // 发送 GET 请求获取配置
        const response = await fetch('/api/settings');
        if (!response.ok) return {};

        return await response.json();
    } catch (error) {
        console.error("获取配置失败:", error);
        return {};
    }
}

/**
 * 保存应用配置
 * 
 * 说明：
 * - 将应用配置保存到服务器
 * - 包含完整的错误处理逻辑
 * 
 * @param {AppConfig} settings - 要保存的配置对象
 * @returns {Promise<ApiResponse>} 返回 API 响应对象
 */
export async function saveSettings(settings: AppConfig): Promise<ApiResponse> {
    try {
        // 发送 POST 请求保存配置
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        // 检查 HTTP 状态码
        if (!response.ok) {
            // 尝试解析错误响应
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`;
            return { success: false, message: errorMessage };
        }

        // 返回服务器响应
        return await response.json();
    } catch (error: any) {
        console.error('保存配置失败:', error);

        // 根据错误类型返回更具体的错误信息
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return { success: false, message: '网络连接失败，请检查网络连接' };
        } else if (error.name === 'SyntaxError') {
            return { success: false, message: '服务器响应格式错误' };
        } else {
            return { success: false, message: `网络请求失败: ${error.message}` };
        }
    }
}

// ==================== 批量操作 ====================

/**
 * 批量更新订阅的节点信息
 * 
 * 说明：
 * - 向服务器发送多个订阅 ID，批量更新这些订阅的节点数据
 * - 提高更新效率，避免多次单独请求
 * 
 * @param {string[]} subscriptionIds - 要更新的订阅 ID 数组
 * @returns {Promise<ApiResponse>} 返回更新结果
 */
export async function batchUpdateNodes(subscriptionIds: string[]): Promise<ApiResponse> {
    try {
        // 发送 POST 请求批量更新
        const response = await fetch('/api/batch_update_nodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionIds })
        });

        // 检查 HTTP 状态码
        if (!response.ok) {
            // 尝试解析错误响应
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`;
            return { success: false, message: errorMessage };
        }

        // 返回更新结果
        const result = await response.json();
        return result;
    } catch (error) {
        console.error("批量更新节点失败:", error);
        return { success: false, message: '网络请求失败，请检查网络连接' };
    }
}

// ==================== 延迟测试 ====================

/**
 * 测试订阅链接的响应延迟
 * 
 * 说明：
 * - 向服务器发送订阅链接，测试该链接的可用性和响应时间
 * - 用于判断订阅源的质量和可访问性
 * 
 * @param {string} url - 要测试的订阅链接
 * @returns {Promise} 返回测试结果对象 { success, latency, message, status }
 */
export async function testLatency(url: string): Promise<{ success: boolean; latency?: number; message?: string; status?: number }> {
    try {
        // 发送 POST 请求进行延迟测试
        const response = await fetch('/api/latency_test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        // 检查 HTTP 状态码
        if (!response.ok) {
            // 尝试解析错误响应
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                message: errorData.error || `HTTP ${response.status}`,
                status: response.status
            };
        }

        // 返回测试结果（包含延迟时间）
        return await response.json();
    } catch (error) {
        console.error("延迟测试失败:", error);
        return { success: false, message: '网络请求失败' };
    }
}

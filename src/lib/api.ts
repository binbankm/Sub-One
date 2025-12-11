export async function fetchInitialData() {
    try {
        const response = await fetch('/api/data');
        if (!response.ok) {
            console.error("Session invalid or API error, status:", response.status);
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch initial data:", error);
        return null;
    }
}

export async function login(password: string) {
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password })
        });
        return response;
    } catch (error) {
        console.error("Login request failed:", error);
        return { ok: false, error: '网络请求失败' };
    }
}

export async function saveSubs(subs: any[], profiles: any[]) {
    try {
        if (!Array.isArray(subs) || !Array.isArray(profiles)) {
            return { success: false, message: '数据格式错误：subs 和 profiles 必须是数组' };
        }

        const response = await fetch('/api/subs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subs, profiles })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`;
            return { success: false, message: errorMessage };
        }

        return await response.json();
    } catch (error: any) {
        console.error('saveSubs 网络请求失败:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return { success: false, message: '网络连接失败，请检查网络连接' };
        } else if (error.name === 'SyntaxError') {
            return { success: false, message: '服务器响应格式错误' };
        } else {
            return { success: false, message: `网络请求失败: ${error.message}` };
        }
    }
}


export async function fetchSettings() {
    try {
        const response = await fetch('/api/settings');
        if (!response.ok) return {};
        return await response.json();
    } catch (error) {
        console.error("Failed to fetch settings:", error);
        return {};
    }
}

export async function saveSettings(settings: any) {
    try {
        const response = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(settings)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`;
            return { success: false, message: errorMessage };
        }

        return await response.json();
    } catch (error: any) {
        console.error('saveSettings 网络请求失败:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return { success: false, message: '网络连接失败，请检查网络连接' };
        } else if (error.name === 'SyntaxError') {
            return { success: false, message: '服务器响应格式错误' };
        } else {
            return { success: false, message: `网络请求失败: ${error.message}` };
        }
    }
}

export async function batchUpdateNodes(subscriptionIds: string[]) {
    try {
        const response = await fetch('/api/batch_update_nodes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ subscriptionIds })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.message || errorData.error || `服务器错误 (${response.status})`;
            return { success: false, message: errorMessage };
        }

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Failed to batch update nodes:", error);
        return { success: false, message: '网络请求失败，请检查网络连接' };
    }
}


/**
 * 新增函数: 后端直接解析订阅源
 * 解决前端拼接复杂、容易出错的问题
 * 
 * @param url 订阅源URL
 * @param options 可选参数
 * @param options.subscriptionName 订阅名称
 * @param options.exclude 排除规则
 * @param options.prependSubName 是否添加订阅名前缀
 * @returns 解析结果，包含节点列表和流量信息
 */
export async function parseSubscription(url: string, options?: {
    subscriptionName?: string;
    exclude?: string;
    prependSubName?: boolean;
}) {
    try {
        console.log(`[API] 调用后端解析订阅: ${url}`);

        const response = await fetch('/api/parse_subscription', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                url,
                subscriptionName: options?.subscriptionName,
                exclude: options?.exclude,
                prependSubName: options?.prependSubName
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || `服务器错误 (${response.status})`;
            return {
                success: false,
                message: errorMessage,
                nodes: [],
                userInfo: null,
                count: 0
            };
        }

        const result = await response.json();
        console.log(`[API] 后端解析成功，获取 ${result.count} 个节点`);
        return result;
    } catch (error: any) {
        console.error('parseSubscription 网络请求失败:', error);
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return {
                success: false,
                message: '网络连接失败，请检查网络连接',
                nodes: [],
                userInfo: null,
                count: 0
            };
        } else if (error.name === 'SyntaxError') {
            return {
                success: false,
                message: '服务器响应格式错误',
                nodes: [],
                userInfo: null,
                count: 0
            };
        } else {
            return {
                success: false,
                message: `网络请求失败: ${error.message}`,
                nodes: [],
                userInfo: null,
                count: 0
            };
        }
    }
}

import { subscriptionParser } from './subscription-parser';

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

export async function fetchNodeCount(subUrl: string) {
    try {
        const trafficResponse = await fetch('/api/fetch_external_url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: subUrl })
        });

        let userInfo = null;
        let text = '';

        if (trafficResponse.ok) {
            const data = await trafficResponse.json();
            text = data.content;

            if (data.headers) {
                const userInfoHeader = data.headers['subscription-userinfo'] || data.headers['Subscription-Userinfo'];
                if (userInfoHeader) {
                    const info: any = {};
                    userInfoHeader.split(';').forEach((part: string) => {
                        const [key, value] = part.trim().split('=');
                        if (key && value) info[key] = /^\d+$/.test(value) ? Number(value) : value;
                    });
                    userInfo = info;
                }
            }
        } else {
            return { count: 0, userInfo: null };
        }

        let nodeCount = 0;
        try {
            const nodes = subscriptionParser.parse(text);
            nodeCount = nodes.length;
        } catch (e) {
            console.error(`Local parse failed for ${subUrl}:`, e);
        }

        return { count: nodeCount, userInfo };
    } catch (e) {
        console.error('fetchNodeCount error:', e);
        return { count: 0, userInfo: null };
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

export async function testLatency(url: string) {
    try {
        const response = await fetch('/api/latency_test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return {
                success: false,
                message: errorData.error || `HTTP ${response.status}`,
                status: response.status
            };
        }

        return await response.json();
    } catch (error) {
        console.error("Latency test failed:", error);
        return { success: false, message: '网络请求失败' };
    }
}

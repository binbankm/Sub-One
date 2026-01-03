import { ShadowsocksNode } from '../types';
import { safeDecodeURIComponent } from './helper';

/**
 * 解析 Shadowsocks 链接
 * 支持 SIP002 (ss://user@host:port) 和 Legacy (ss://base64)
 */
export function parseShadowsocks(url: string): ShadowsocksNode | null {
    if (!url.startsWith('ss://')) return null;

    try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);
        const name = safeDecodeURIComponent(urlObj.hash.slice(1)) || 'SS节点';

        let method = '';
        let password = '';
        let server = '';
        let port = 0;

        // 格式 1: SIP002 (user info 在 username 部分)
        // case A: ss://base64(method:password)@host:port
        // case B: ss://method:password@host:port (非标准但常见)
        if (urlObj.hostname) {
            server = urlObj.hostname.replace(/^\[|\]$/g, '');
            port = Number(urlObj.port);

            let userInfo = safeDecodeURIComponent(urlObj.username);
            // 尝试 Base64 解码 userInfo
            try {
                // 如果解码后包含冒号且都是可打印字符，可能是 Base64
                // 简单的 heuristic: 如果原串不像 base64 (包含特殊符号)，就不解
                if (/^[A-Za-z0-9+/=]+$/.test(userInfo)) {
                    const decoded = atob(userInfo);
                    if (decoded.includes(':')) {
                        userInfo = decoded;
                    }
                }
            } catch { }

            if (userInfo.includes(':')) {
                [method, password] = userInfo.split(':');
            } else {
                // 有些非常规链接可能把 info 放在 password 字段？通常不会，暂忽略
                return null;
            }
        }
        // 格式 2: Legacy (整个部分都是 Base64)
        // ss://base64(method:password@host:port)
        else {
            const content = url.slice(5).split('#')[0].split('?')[0];
            try {
                const decoded = atob(content);
                // method:password@host:port
                const match = decoded.match(/^(.*?):(.*?)@(.*?):(\d+)$/);
                if (match) {
                    method = match[1];
                    password = match[2];
                    server = match[3];
                    port = Number(match[4]);
                } else {
                    return null;
                }
            } catch {
                return null;
            }
        }

        if (!server || !port || !method || !password) return null;

        // Plugin 解析
        let pluginName: string | undefined;
        let pluginOpts: Record<string, string> | undefined;

        const pluginParam = params.get('plugin');
        if (pluginParam) {
            // obfs-local;obfs=http;obfs-host=google.com
            const parts = safeDecodeURIComponent(pluginParam).split(';');
            pluginName = parts[0];
            if (parts.length > 1) {
                pluginOpts = {};
                for (let i = 1; i < parts.length; i++) {
                    const [k, v] = parts[i].split('=');
                    if (k && v) pluginOpts[k] = v;
                }
            }
        }

        const node: ShadowsocksNode = {
            type: 'ss',
            id: crypto.randomUUID(),
            name,
            server,
            port,
            cipher: method,
            password,
            udp: true,
            plugin: pluginName,
            pluginOpts
        };

        return node;

    } catch (e) {
        console.error('解析 SS 链接失败:', e);
        return null;
    }
}

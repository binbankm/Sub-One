import { ShadowsocksNode } from '../types';
import { safeDecodeURIComponent, generateId } from './helper';

import { decodeBase64 } from '../converter/base64';
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

        // 核心：判定是 SIP002 还是 Legacy
        // SIP002 必须包含 '@' 或者 host:port 结构
        const hasUserInfo = url.includes('@');

        if (hasUserInfo && urlObj.hostname) {
            // 格式 1: SIP002
            server = urlObj.hostname.replace(/^\[|\]$/g, '');
            port = Number(urlObj.port);

            let userInfo = safeDecodeURIComponent(urlObj.username);
            try {
                if (/^[A-Za-z0-9+/=_]+$/.test(userInfo)) {
                    const decoded = decodeBase64(userInfo);
                    if (decoded.includes(':')) {
                        userInfo = decoded;
                    }
                }
            } catch { }

            if (userInfo.includes(':')) {
                [method, password] = userInfo.split(':');
            }
        }

        // 如果 SIP002 解析失败（没有找到 method:password），尝试 Legacy
        if (!method || !password) {
            const content = url.slice(5).split('#')[0].split('?')[0];
            try {
                const decoded = decodeBase64(content);
                // method:password@host:port
                const match = decoded.match(/^(.*?):(.*?)@(.*?):(\d+)$/);
                if (match) {
                    method = match[1];
                    password = match[2];
                    server = match[3];
                    port = Number(match[4]);
                }
            } catch { }
        }

        if (!server || !port || !method || !password) return null;

        // Plugin 解析
        let pluginName: string | undefined;
        let pluginOpts: Record<string, string> | undefined;

        const pluginParam = params.get('plugin');
        if (pluginParam) {
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
            id: generateId(),
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

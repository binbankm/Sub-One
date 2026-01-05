import { ShadowsocksNode } from '../../shared/types';
import { safeDecodeURIComponent, generateId } from './helper';
import { decodeBase64 } from '../converter/base64';
import { parseSIP008Server, SIP008Server } from './sip008';

/**
 * 解析 Shadowsocks 链接
 * 支持 SIP002 (ss://user@host:port), Legacy (ss://base64), 和 JSON (ss://base64(json))
 */
export function parseShadowsocks(url: string): ShadowsocksNode | null {
    if (!url.startsWith('ss://')) return null;

    try {
        // 1. 提取 hash (name)
        const hashIndex = url.indexOf('#');
        const hash = hashIndex !== -1 ? url.slice(hashIndex + 1) : '';
        const name = safeDecodeURIComponent(hash) || 'SS节点';

        // 2. 截取核心内容 (协议后，备注前)
        let mainPart = url.slice(5);
        if (hashIndex !== -1) {
            mainPart = url.slice(5, hashIndex);
        }

        let method = '';
        let password = '';
        let server = '';
        let port = 0;

        // 3. 尝试解析为 JSON (某些工具会将 VMess-style JSON 放在 ss:// 后)
        try {
            let potentialBase64 = mainPart.split('?')[0];
            // 鲁棒性：移除可能的末尾省略号或其他非 Base64/JSON 字符
            potentialBase64 = potentialBase64.replace(/[^\w+/=]/g, '').trim();

            const decoded = decodeBase64(potentialBase64);
            // 鲁棒性：处理 JSON 末尾可能存在的杂质
            const jsonMatch = decoded.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const data = JSON.parse(jsonMatch[0]) as SIP008Server;
                const node = parseSIP008Server(data);
                if (node) {
                    if (hash && !data.remarks && !data.ps) node.name = name;
                    return node;
                }
            }
        } catch { }

        // 4. 尝试 SIP002 或其他带 @ 的格式
        const lastAt = mainPart.lastIndexOf('@');
        if (lastAt !== -1) {
            const userInfoPart = mainPart.slice(0, lastAt);
            const serverPart = mainPart.slice(lastAt + 1);

            // 如果 serverPart 为空，说明格式错误或被截断，跳过此逻辑进入 Legacy 尝试
            if (serverPart && serverPart !== '#' && !serverPart.startsWith('?')) {
                // serverPart 还是可能包含 ?params
                const qIdx = serverPart.indexOf('?');
                const hostPort = qIdx !== -1 ? serverPart.slice(0, qIdx) : serverPart;
                const colonIdx = hostPort.lastIndexOf(':');

                if (colonIdx !== -1) {
                    server = hostPort.slice(0, colonIdx).replace(/^\[|\]$/g, '');
                    port = parseInt(hostPort.slice(colonIdx + 1));
                } else {
                    server = hostPort.replace(/^\[|\]$/g, '');
                    port = 443;
                }

                // userinfo 可以是 Base64(method:pass) 或单纯的 method:pass
                let decodedUserInfo = userInfoPart;
                try {
                    if (/^[A-Za-z0-9+/=_]+$/.test(userInfoPart)) {
                        const decoded = decodeBase64(userInfoPart);
                        if (decoded.includes(':')) {
                            decodedUserInfo = decoded;
                        }
                    }
                } catch { }

                if (decodedUserInfo.includes(':')) {
                    const parts = decodedUserInfo.split(':');
                    if (parts.length >= 2 && parts[1]) {
                        method = parts[0];
                        password = parts.slice(1).join(':');
                    } else {
                        // 容错：如果是 "method:" 这种，把 method 当 password，套用默认 cipher
                        method = 'aes-256-gcm';
                        password = parts[0];
                    }
                } else {
                    method = 'aes-256-gcm';
                    password = decodedUserInfo;
                }
            }
        }

        // 5. 如果上面没拿到核心信息，尝试 Legacy (全内容 Base64)
        if (!method || !password || !server || !port) {
            const content = mainPart.split('?')[0];
            try {
                const decoded = decodeBase64(content);
                if (decoded.startsWith('ss://')) {
                    return parseShadowsocks(decoded + (hash ? '#' + hash : ''));
                }

                const match = decoded.match(/^(.*?):(.*?)@(.*?):(\d+)$/);
                if (match) {
                    method = match[1];
                    password = match[2];
                    server = match[3];
                    port = parseInt(match[4]);
                }
            } catch { }
        }

        // 最后的字段校验：哪怕没有 method，我们也给个默认的，只要有服务器和密码
        if (!server || !port || !password) return null;
        if (!method) method = 'aes-256-gcm';

        // 6. 解析参数 (Plugin 等)
        const qIdx = mainPart.indexOf('?');
        const search = qIdx !== -1 ? mainPart.slice(qIdx) : '';
        const params = new URLSearchParams(search);

        let pluginName: string | undefined;
        let pluginOpts: Record<string, string> | undefined;
        const pluginParam = params.get('plugin');
        if (pluginParam) {
            const parts = safeDecodeURIComponent(pluginParam).split(';');
            pluginName = parts[0];
            if (parts.length > 1) {
                pluginOpts = {};
                for (let i = 1; i < parts.length; i++) {
                    const pair = parts[i].split('=');
                    if (pair.length === 2) {
                        pluginOpts[pair[0]] = pair[1];
                    }
                }
            }
        }

        return {
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

    } catch (e) {
        return null;
    }
}

/**
 * Sub-One Loon Parser
 * 
 * 解析 Loon 格式的代理行
 * 包含对 WireGuard 复杂格式的支持
 */

import type { ProxyNode, ProxyType } from '../types';
import { randomId, parsePort } from '../utils';

/**
 * 解析 Loon 代理行
 */
export function parseLoon(line: string): ProxyNode | null {
    if (!line || !line.includes('=')) return null;

    try {
        const eqIdx = line.indexOf('=');
        const name = line.substring(0, eqIdx).trim();
        const content = line.substring(eqIdx + 1).trim();

        const parts = smartSplit(content);
        if (parts.length < 1) return null;

        const rawType = parts[0].toLowerCase();

        // 特殊处理 WireGuard
        if (rawType === 'wireguard') {
            return parseLoonWireGuard(name, content);
        }

        if (parts.length < 3) return null;

        const server = parts[1];
        const port = parsePort(parts[2]);

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            name,
            server,
            port,
        };

        // Loon 协议/位置参数映射
        if (rawType === 'shadowsocks' || rawType === 'ss') {
            proxy.type = 'ss';
            if (parts.length >= 5) {
                proxy.cipher = parts[3];
                proxy.password = parts[4];
            }
        } else if (rawType === 'shadowsocksr' || rawType === 'ssr') {
            proxy.type = 'ssr';
            if (parts.length >= 7) {
                proxy.cipher = parts[3];
                proxy.password = parts[4];
                proxy.protocol = parts[5];
                proxy.obfs = parts[6];
            }
        } else if (rawType === 'vmess' || rawType === 'vless') {
            proxy.type = rawType as ProxyType;
            if (parts.length >= 4) proxy.uuid = parts[3];
        } else if (rawType === 'trojan') {
            proxy.type = 'trojan';
            if (parts.length >= 4) proxy.password = parts[3];
        } else {
            proxy.type = rawType as ProxyType;
        }

        // 解析命名参数
        const params: Record<string, string> = {};
        for (let i = 3; i < parts.length; i++) {
            const part = parts[i];
            if (part.includes('=')) {
                const [key, ...valParts] = part.split('=');
                params[key.trim().toLowerCase()] = valParts.join('=').trim().replace(/^"(.*)"$/, '$1');
            }
        }

        mapLoonParams(proxy, params);

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseLoon] Error:', e);
        return null;
    }
}

/**
 * 解析 Loon 复杂的 WireGuard 格式
 * 示例: WG-Node = wireguard, interface-ip=10.0.0.1, private-key=xxx, mtu=1420, peers=[{public-key=yyy, endpoint=server:51820, allowed-ips="0.0.0.0/0", reserved=[1,2,3]}]
 */
function parseLoonWireGuard(name: string, content: string): ProxyNode | null {
    // 提取简单参数
    const getParam = (p: string) => {
        const m = content.match(new RegExp(`(?:,|^)\\s*${p}\\s*=\\s*([^,\\[]+)`, 'i'));
        return m ? m[1].trim().replace(/^"(.*)"$/, '$1') : undefined;
    };

    const privateKey = getParam('private-key');
    const ip = getParam('interface-ip');
    const ipv6 = getParam('interface-ipv6');
    const mtu = getParam('mtu');

    // 提取 peers 列表 (通常 Loon 只支持一个 peer 在这种简易模式下)
    const peersMatch = content.match(/peers\s*=\s*\[\s*\{\s*(.*?)\s*\}\s*\]/i);
    if (!peersMatch) return null;

    const peerContent = peersMatch[1];
    const getPeerParam = (p: string) => {
        const m = peerContent.match(new RegExp(`(?:,|^)\\s*${p}\\s*=\\s*([^,]+)`, 'i'));
        return m ? m[1].trim().replace(/^"(.*)"$/, '$1') : undefined;
    };

    const endpoint = getPeerParam('endpoint');
    const publicKey = getPeerParam('public-key');
    const psk = getPeerParam('preshared-key');
    const reservedStr = getPeerParam('reserved');

    if (!endpoint) return null;

    const [server, portStr] = endpoint.split(':');
    const port = parsePort(portStr);

    const proxy: ProxyNode = {
        id: randomId(),
        name,
        type: 'wireguard',
        server,
        port,
        'private-key': privateKey,
        'public-key': publicKey,
        'pre-shared-key': psk,
        ip,
        ipv6,
        mtu: mtu ? parseInt(mtu, 10) : undefined,
        udp: true,
    };

    if (reservedStr) {
        try {
            const reserved = JSON.parse(reservedStr.replace(/=/g, ':')); // 兼容 Loon 伪 JSON
            if (Array.isArray(reserved)) proxy.reserved = reserved;
        } catch {
            // 尝试正则解析 [1, 2, 3]
            const m = reservedStr.match(/\[(.*?)\]/);
            if (m) {
                proxy.reserved = m[1].split(',').map(n => parseInt(n.trim(), 10));
            }
        }
    }

    // 构造标准的 peers 数组
    proxy.peers = [{
        endpoint,
        'public-key': publicKey,
        'pre-shared-key': psk,
        reserved: proxy.reserved as number[]
    }];

    return proxy;
}

function smartSplit(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let inBrackets = 0; // 增加括号追踪，处理 peers=[{...}]

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"') inQuotes = !inQuotes;
        if (char === '[' && !inQuotes) inBrackets++;
        if (char === ']' && !inQuotes) inBrackets--;

        if (char === ',' && !inQuotes && inBrackets === 0) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.filter(s => s.length > 0);
}

function mapLoonParams(proxy: Partial<ProxyNode>, params: Record<string, string>) {
    if (params.password) proxy.password = params.password;
    if (params.username) proxy.username = params.username;
    if (params.encrypt || params['encrypt-method']) proxy.cipher = params.encrypt || params['encrypt-method'];

    proxy.tls = params.tls === 'true' || proxy.type === 'https';
    if (params.sni) proxy.sni = params.sni;
    if (params['skip-cert-verify']) proxy['skip-cert-verify'] = params['skip-cert-verify'] === 'true';
    if (params.udp) proxy.udp = params.udp === 'true';
    if (params['fast-open']) proxy.tfo = params['fast-open'] === 'true';

    // 传输层
    if (params.obfs === 'ws' || params.obfs === 'wss') {
        proxy.network = 'ws';
        proxy['ws-opts'] = {
            path: params['path'] || '/',
            headers: params['host'] ? { Host: params['host'] } : {}
        };
    }
}

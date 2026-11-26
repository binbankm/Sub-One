/**
 * Sub-One Quantumult X Parser
 *
 * 解析 Quantumult X 格式的代理行
 */
import type { ProxyNode, ProxyType } from '../types';
import { parseEndpoint, parsePort, randomId } from '../utils';

function safeDecodeURIComponent(str: string): string {
    try {
        return decodeURIComponent(str);
    } catch {
        return str;
    }
}

/**
 * 解析 Quantumult X 代理行
 */
export function parseQX(line: string): ProxyNode | null {
    if (!line || !line.includes('=')) return null;

    try {
        const eqIdx = line.indexOf('=');
        const rawType = line.substring(0, eqIdx).trim().toLowerCase();
        const content = line.substring(eqIdx + 1).trim();

        // QX 的 content 部分是以逗号分隔的参数，但第一项固定为 server:port
        const parts = smartSplit(content);
        if (parts.length < 1) return null;

        const serverPort = parts[0];
        const ep = parseEndpoint(serverPort);
        if (!ep.server || ep.port === undefined) return null;

        const server = ep.server;
        const port = parsePort(ep.port);

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            server,
            port
        };

        // QX 类型映射
        const typeMap: Record<string, ProxyType> = {
            shadowsocks: 'ss',
            ss: 'ss',
            shadowsocksr: 'ssr',
            ssr: 'ssr',
            vmess: 'vmess',
            vless: 'vless',
            trojan: 'trojan',
            http: 'http',
            https: 'https',
            socks5: 'socks5',
            socks: 'socks5',
            anytls: 'anytls',
            hysteria2: 'hysteria2',
            hy2: 'hysteria2'
        };
        proxy.type = typeMap[rawType] || (rawType as ProxyType);

        // 解析参数
        const params: Record<string, string> = {};
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            if (part.includes('=')) {
                const [key, ...valParts] = part.split('=');
                params[key.trim().toLowerCase()] = valParts
                    .join('=')
                    .trim()
                    .replace(/^"(.*)"$/, '$1');
            }
        }

        // QX 默认名称逻辑 (tag)
        proxy.name = params.tag
            ? safeDecodeURIComponent(params.tag)
            : `${proxy.type.toUpperCase()} ${server}:${port}`;

        mapQXParams(proxy, params);

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseQX] Error:', e);
        return null;
    }
}

/**
 * 智能分割 (支持引号)
 */
function smartSplit(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"') inQuotes = !inQuotes;
        if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.filter((s) => s.length > 0);
}

function decodeQxAlpn(raw: string): string[] {
    const trimmed = raw.trim();
    if (/^[0-9a-fA-F]{4,}$/.test(trimmed) && trimmed.length % 2 === 0) {
        const result: string[] = [];
        let offset = 0;
        while (offset + 2 <= trimmed.length) {
            const len = parseInt(trimmed.substring(offset, offset + 2), 16);
            offset += 2;
            if (len <= 0 || offset + len * 2 > trimmed.length) {
                return [trimmed];
            }
            const hexSlice = trimmed.substring(offset, offset + len * 2);
            const bytes = new Uint8Array(len);
            for (let i = 0; i < len; i++) {
                bytes[i] = parseInt(hexSlice.substring(i * 2, i * 2 + 2), 16);
            }
            result.push(new TextDecoder().decode(bytes));
            offset += len * 2;
        }
        if (result.length > 0 && offset === trimmed.length) {
            return result;
        }
    }
    return trimmed.split(',').map((s) => s.trim()).filter(Boolean);
}

function mapQXParams(proxy: Partial<ProxyNode>, params: Record<string, string>) {
    // 基础认证
    if (params.password) proxy.password = params.password;
    if (params.user || params.username) proxy.username = params.user || params.username;
    if (proxy.type === 'vmess' || proxy.type === 'vless') {
        if (params.password) proxy.uuid = params.password;
    }

    // 加密
    if (params.method) proxy.cipher = params.method;

    // TLS 处理
    if (
        params['over-tls'] === 'true' ||
        proxy.type === 'https' ||
        proxy.type === 'anytls' ||
        proxy.type === 'hysteria2' ||
        (proxy.type === 'trojan' && params['over-tls'] !== 'false')
    )
        proxy.tls = true;
    if (params['tls-verification'] === 'false') proxy['skip-cert-verify'] = true;
    else if (params['tls-verification'] === 'true') proxy['skip-cert-verify'] = false;
    if (params['tls-host']) proxy.sni = params['tls-host'];
    if (params['tls-cert-sha256']) proxy['tls-fingerprint'] = params['tls-cert-sha256'];
    if (params['tls-pubkey-sha256']) proxy['tls-pubkey-sha256'] = params['tls-pubkey-sha256'];
    if (params['tls-alpn']) proxy.alpn = decodeQxAlpn(params['tls-alpn']);

    // QX 特有的 TLS 选项
    if (params['tls-no-session-ticket'] === 'true') proxy['tls-no-session-ticket'] = true;
    if (params['tls-no-session-reuse'] === 'true') proxy['tls-no-session-reuse'] = true;

    // SSR 专属 (先判断 SSR，避免被通用 obfs=http/tls 误判为 SS 插件)
    if (params['ssr-protocol'] || proxy.type === 'ssr') {
        proxy.type = 'ssr';
        if (params['ssr-protocol']) proxy.protocol = params['ssr-protocol'];
        if (params['ssr-protocol-param']) proxy['protocol-param'] = params['ssr-protocol-param'];
        if (params.obfs) proxy.obfs = params.obfs;
        if (params['obfs-param']) proxy['obfs-param'] = params['obfs-param'];
    } else {
        // Obfs / 传输层
        const obfsType = params.obfs;
        if (obfsType === 'ws' || obfsType === 'wss') {
            if (obfsType === 'wss') proxy.tls = true;
            if (proxy.type === 'ss') {
                proxy.plugin = 'v2ray-plugin';
                proxy['plugin-opts'] = {
                    mode: 'websocket',
                    tls: obfsType === 'wss',
                    ...(params['obfs-host'] ? { host: params['obfs-host'] } : {}),
                    ...(params['obfs-uri'] ? { path: params['obfs-uri'] } : {})
                };
            } else {
                proxy.network = 'ws';
                proxy['ws-opts'] = {
                    path: params['obfs-uri'] || '/',
                    headers: params['obfs-host'] ? { Host: params['obfs-host'] } : {}
                };
            }
        } else if (obfsType === 'http') {
            if (proxy.type === 'ss') {
                proxy.plugin = 'obfs';
                proxy['plugin-opts'] = {
                    mode: 'http',
                    ...(params['obfs-host'] ? { host: params['obfs-host'] } : {}),
                    ...(params['obfs-uri'] ? { path: params['obfs-uri'] } : {})
                };
            } else {
                proxy.network = 'http';
                proxy['http-opts'] = {
                    path: params['obfs-uri'] || '/',
                    headers: params['obfs-host'] ? { Host: params['obfs-host'] } : {}
                };
            }
        } else if (obfsType === 'h2' || obfsType === 'h2-tls') {
            proxy.network = 'h2';
            if (obfsType === 'h2-tls') proxy.tls = true;
            proxy['h2-opts'] = {
                path: params['obfs-uri'] || '/',
                host: params['obfs-host'] ? [params['obfs-host']] : undefined
            };
        } else if (obfsType === 'tls' || obfsType === 'over-tls') {
            proxy.tls = true;
            if (proxy.type === 'ss') {
                proxy.plugin = 'obfs';
                proxy['plugin-opts'] = { mode: 'tls', host: params['obfs-host'] };
            }
        }
    }

    // UDP & TFO
    if (params['udp-relay'] === 'true') proxy.udp = true;
    if (params['fast-open'] === 'true') proxy.tfo = true;

    // UDP over TCP (QX 特有方式)
    if (params['udp-over-tcp']) {
        proxy['udp-over-tcp'] = true;
        if (params['udp-over-tcp'] === 'sp.v1') proxy['udp-over-tcp-version'] = 1;
        if (params['udp-over-tcp'] === 'sp.v2') proxy['udp-over-tcp-version'] = 2;
    }

    // VMess AEAD
    if (params.aead === 'false') {
        proxy.alterId = 1;
    } else if (proxy.type === 'vmess') {
        proxy.alterId = 0;
    }

    // Reality
    if (params['reality-base64-pubkey']) {
        proxy['reality-opts'] = {
            ...proxy['reality-opts'],
            'public-key': params['reality-base64-pubkey']
        };
        proxy.tls = true;
    }
    if (params['reality-hex-shortid']) {
        proxy['reality-opts'] = {
            ...proxy['reality-opts'],
            'short-id': params['reality-hex-shortid']
        };
    }
    if (!proxy.sni && params['obfs-host'] && (proxy.tls || proxy['reality-opts'])) {
        proxy.sni = params['obfs-host'];
    }

    // VLESS Flow
    if (params['vless-flow']) proxy.flow = params['vless-flow'];

    // Hysteria2 参数
    if (proxy.type === 'hysteria2') {
        if (params['salamander-password']) {
            proxy.obfs = 'salamander';
            proxy['obfs-password'] = params['salamander-password'];
        }
        if (params['port-hopping']) proxy.ports = params['port-hopping'];
        if (params.up) proxy.up = params.up;
        if (params.down) proxy.down = params.down;
    }

    // 测速
    if (params.server_check_url) proxy['test-url'] = params.server_check_url;
}

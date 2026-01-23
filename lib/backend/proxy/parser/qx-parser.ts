/**
 * Sub-One Quantumult X Parser
 * 
 * 解析 Quantumult X 格式的代理行
 * 参考 qx.peg 逻辑进行 1:1 甚至超集还原
 */

import type { ProxyNode, ProxyType } from '../types';
import { randomId, parsePort } from '../utils';

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
        const spIdx = serverPort.lastIndexOf(':');
        if (spIdx === -1) return null;

        const server = serverPort.substring(0, spIdx);
        const port = parsePort(serverPort.substring(spIdx + 1));

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            server,
            port,
        };

        // QX 类型映射
        const typeMap: Record<string, ProxyType> = {
            'shadowsocks': 'ss',
            'vmess': 'vmess',
            'vless': 'vless',
            'trojan': 'trojan',
            'http': 'http',
            'socks5': 'socks5'
        };
        proxy.type = typeMap[rawType] || (rawType as ProxyType);

        // 解析参数
        const params: Record<string, string> = {};
        for (let i = 1; i < parts.length; i++) {
            const part = parts[i];
            if (part.includes('=')) {
                const [key, ...valParts] = part.split('=');
                params[key.trim().toLowerCase()] = valParts.join('=').trim().replace(/^"(.*)"$/, '$1');
            }
        }

        // QX 默认名称逻辑 (tag)
        proxy.name = params.tag ? decodeURIComponent(params.tag) : `${proxy.type.toUpperCase()} ${server}:${port}`;

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
    return result.filter(s => s.length > 0);
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
    if (params['over-tls'] === 'true') proxy.tls = true;
    if (params['tls-verification'] === 'false') proxy['skip-cert-verify'] = true;
    if (params['tls-host']) proxy.sni = params['tls-host'];
    if (params['tls-cert-sha256']) proxy['tls-fingerprint'] = params['tls-cert-sha256'];
    if (params['tls-alpn']) proxy.alpn = params['tls-alpn'].split(',').map(s => s.trim());

    // QX 特有的 TLS 选项
    if (params['tls-no-session-ticket'] === 'true') proxy['tls-no-session-ticket'] = true;
    if (params['tls-no-session-reuse'] === 'true') proxy['tls-no-session-reuse'] = true;

    // Obfs / 传输层
    const obfsType = params.obfs;
    if (obfsType === 'ws' || obfsType === 'wss') {
        proxy.network = 'ws';
        if (obfsType === 'wss') proxy.tls = true;
        proxy['ws-opts'] = {
            path: params['obfs-uri'] || '/',
            headers: params['obfs-host'] ? { Host: params['obfs-host'] } : {}
        };
    } else if (obfsType === 'http') {
        proxy.network = 'http';
        proxy['http-opts'] = {
            path: params['obfs-uri'] || '/',
            headers: params['obfs-host'] ? { Host: params['obfs-host'] } : {}
        };
    } else if (obfsType === 'tls') {
        proxy.tls = true;
        if (proxy.type === 'ss') {
            proxy.plugin = 'obfs';
            proxy['plugin-opts'] = { mode: 'tls', host: params['obfs-host'] };
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

    // SSR 专属
    if (params['ssr-protocol']) {
        proxy.type = 'ssr';
        proxy.protocol = params['ssr-protocol'];
        proxy['protocol-param'] = params['ssr-protocol-param'];
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

    // VLESS Flow
    if (params['vless-flow']) proxy.flow = params['vless-flow'];

    // 测速
    if (params.server_check_url) proxy['test-url'] = params.server_check_url;
}

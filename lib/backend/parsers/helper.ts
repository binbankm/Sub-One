/**
 * 通用解析工具全集
 */

import { NetworkType, TransportOptions, TlsOptions } from '../../shared/types';

/**
 * 安全解码 URI 组件
 */
export function safeDecodeURIComponent(str: string): string {
    try {
        return decodeURIComponent(str);
    } catch (e) {
        return str;
    }
}

/**
 * 解析标准 URL 参数到 TransportOptions 和 TlsOptions
 * 适用于 VLESS, VMess, Trojan, Hysteria2 等遵循通用 Query 模式的协议
 */
export function parseStandardParams(params: URLSearchParams): { transport: TransportOptions, tls: TlsOptions } {
    const transport: TransportOptions = {
        type: (params.get('type') || params.get('net') || 'tcp') as NetworkType
    };

    const tls: TlsOptions = {
        enabled: false
    };

    // --- Transport 解析 ---
    const path = params.get('path') || params.get('ws-path') || params.get('serviceName');
    const host = params.get('host') || params.get('sni'); // 有些老客户端混用
    const headerType = params.get('headerType');

    if (headerType) transport.headerType = headerType;

    if (transport.type === 'ws') {
        if (path) transport.path = path;
        if (host) transport.headers = { Host: host };
    } else if (transport.type === 'grpc') {
        if (path) transport.serviceName = path;
        const mode = params.get('mode');
        if (mode) transport.mode = mode;
    } else if (transport.type === 'http' || transport.type === 'h2') {
        if (path) transport.path = path;
        if (host) transport.host = host.split(',');
    } else if (transport.type === 'quic' || transport.type === 'kcp') {
        const key = params.get('key');
        const security = params.get('quicSecurity');
        if (key) transport.quicKey = key;
        if (security) transport.quicSecurity = security;
    }

    // --- TLS 解析 ---
    const security = params.get('security');
    // Determine enabled state: explicit 'tls'/'reality' or 'tls=1'
    const isTls = security === 'tls' || security === 'reality' || params.get('tls') === '1';

    if (isTls) tls.enabled = true;

    // Always parse common TLS params (SNI, ALPN, Insecure, FP)
    // because some protocols (Hy2, TUIC) imply TLS without explicit 'security' param
    const sni = params.get('sni');
    if (sni) tls.serverName = sni;

    const alpn = params.get('alpn');
    if (alpn) tls.alpn = safeDecodeURIComponent(alpn).split(',');

    const fp = params.get('fp');
    if (fp) tls.fingerprint = fp;

    const insecureVal = params.get('allowInsecure') || params.get('insecure');
    const insecure = insecureVal === '1' || insecureVal === 'true';
    if (insecure) tls.insecure = true;

    // Reality
    if (security === 'reality') {
        tls.reality = {
            enabled: true,
            publicKey: params.get('pbk') || '',
            shortId: params.get('sid') || '',
            spiderX: params.get('spx') || params.get('spider-x') || ''
        };
        // Explicitly enable TLS for reality
        tls.enabled = true;
    }

    return { transport, tls };
}

/**
 * 构建标准查询参数字符串
 */
export function buildStandardQuery(transport?: TransportOptions, tls?: TlsOptions): URLSearchParams {
    const params = new URLSearchParams();

    // --- Transport ---
    if (transport) {
        if (transport.type !== 'tcp') params.set('type', transport.type);

        if (transport.headerType && transport.headerType !== 'none') {
            params.set('headerType', transport.headerType);
        }

        switch (transport.type) {
            case 'ws':
                if (transport.path) params.set('path', transport.path);
                if (transport.headers?.Host) params.set('host', transport.headers.Host);
                break;
            case 'grpc':
                if (transport.serviceName) params.set('serviceName', transport.serviceName);
                if (transport.mode) params.set('mode', transport.mode);
                break;
            case 'http':
            case 'h2':
                if (transport.path) params.set('path', transport.path);
                if (transport.host) params.set('host', transport.host.join(','));
                break;
            case 'quic':
            case 'kcp':
                if (transport.quicSecurity) params.set('quicSecurity', transport.quicSecurity);
                if (transport.quicKey) params.set('key', transport.quicKey);
                break;
        }
    }

    // --- TLS ---
    if (tls && tls.enabled) {
        // 部分协议 (如 VLESS) 明确需要 security 参数
        // 在具体 builder 里处理 security=tls/reality，这里只处理通用参数

        if (tls.serverName) params.set('sni', tls.serverName);
        if (tls.alpn && tls.alpn.length) params.set('alpn', tls.alpn.join(','));
        if (tls.fingerprint) params.set('fp', tls.fingerprint);
        if (tls.insecure === true) params.set('allowInsecure', '1');

        if (tls.reality?.enabled) {
            if (tls.reality.publicKey) params.set('pbk', tls.reality.publicKey);
            if (tls.reality.shortId) params.set('sid', tls.reality.shortId);
            if (tls.reality.spiderX) params.set('spx', tls.reality.spiderX);
        }
    }

    return params;
}

/**
 * 生成唯一 ID (安全回退)
 */
export function generateId(): string {
    try {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
    } catch (e) {
        // Fallback if crypto exists but throws
    }
    return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

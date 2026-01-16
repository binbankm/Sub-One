/**
 * =================================================================
 * 代理协议解析通用工具集
 * =================================================================
 * 
 * 提供所有协议解析器共用的工具函数
 * 基于 Xray-core、Clash Meta、V2Ray 等项目的参数规范
 * 
 * 核心功能:
 * 1. URI 安全解码
 * 2. Transport 传输层参数解析
 * 3. TLS/REALITY 安全层参数解析
 * 4. 参数构建和序列化
 * 5. UUID/ID 生成
 * 
 * 参考规范:
 * - Xray streamSettings: https://xtls.github.io/config/transport.html
 * - VLESS 分享链接: https://github.com/XTLS/Xray-core/discussions/716
 * - Clash Meta 配置: https://wiki.metacubex.one/config/proxies/
 * 
 * @module parsers/helper
 * =================================================================
 */

import { NetworkType, TransportOptions, TlsOptions } from '../../shared/types';

// =================================================================
// URI 编解码工具
// =================================================================

/**
 * 安全解码 URI 组件
 * 
 * 防止解码失败导致程序崩溃
 * 支持处理各种特殊字符和编码格式
 * 
 * @param str 需要解码的 URI 组件
 * @returns 解码后的字符串，解码失败时返回原字符串
 * 
 * @example
 * safeDecodeURIComponent("%E4%B8%AD%E6%96%87") // "中文"
 * safeDecodeURIComponent("invalid%")          // "invalid%"
 */
export function safeDecodeURIComponent(str: string): string {
    if (!str) return str;

    try {
        return decodeURIComponent(str);
    } catch (e) {
        // 解码失败，尝试部分解码
        try {
            // 移除无效的百分号编码
            const cleaned = str.replace(/%(?![0-9a-fA-F]{2})/g, '');
            return decodeURIComponent(cleaned);
        } catch {
            // 仍然失败，返回原字符串
            return str;
        }
    }
}

/**
 * 安全编码 URI 组件
 * 
 * @param str 需要编码的字符串
 * @returns 编码后的 URI 组件
 */
export function safeEncodeURIComponent(str: string): string {
    if (!str) return str;

    try {
        return encodeURIComponent(str);
    } catch (e) {
        return str;
    }
}

// =================================================================
// 传输层 & 安全层参数解析
// =================================================================

/**
 * 解析标准 URL 参数到 TransportOptions 和 TlsOptions
 * 
 * 完整支持 Xray-core 的 streamSettings 规范
 * 适用于: VLESS, VMess, Trojan, Hysteria2, TUIC 等协议
 * 
 * @param params URL 查询参数对象
 * @returns 包含 transport 和 tls 配置的对象
 * 
 * @example
 * const params = new URLSearchParams("type=ws&path=/&security=tls&sni=example.com");
 * const { transport, tls } = parseStandardParams(params);
 * // transport: { type: 'ws', path: '/' }
 * // tls: { enabled: true, serverName: 'example.com' }
 */
export function parseStandardParams(params: URLSearchParams): {
    transport: TransportOptions;
    tls: TlsOptions;
} {
    // ========== 1. 传输层配置 ==========
    const transport: TransportOptions = {
        type: (params.get('type') || params.get('net') || params.get('network') || 'tcp') as NetworkType
    };

    // 通用参数
    const path = params.get('path') || params.get('ws-path') || params.get('serviceName');
    const host = params.get('host');
    const headerType = params.get('headerType') || params.get('header');

    if (headerType && headerType !== 'none') {
        transport.headerType = headerType;
    }

    // 根据传输类型解析特定参数
    switch (transport.type) {
        case 'ws': // WebSocket
            if (path) transport.path = path;
            if (host) {
                transport.headers = { Host: host };
                // 支持额外的 headers
                const headersParam = params.get('headers');
                if (headersParam) {
                    try {
                        const additionalHeaders = JSON.parse(safeDecodeURIComponent(headersParam));
                        transport.headers = { ...transport.headers, ...additionalHeaders };
                    } catch { }
                }
            }
            // Early Data (0-RTT)
            const ed = params.get('ed');
            if (ed) transport.earlyData = parseInt(ed) || undefined;
            break;

        case 'grpc': // gRPC
            if (path) transport.serviceName = path;
            const mode = params.get('mode') || params.get('grpc-mode');
            if (mode) transport.mode = mode; // gun, multi, guna
            break;

        case 'http':
        case 'h2': // HTTP/2
            if (path) transport.path = path;
            if (host) transport.host = host.split(',').map(h => h.trim());
            const method = params.get('method');
            if (method) transport.method = method;
            break;

        case 'quic':
        case 'kcp': // mKCP / QUIC
            const key = params.get('key') || params.get('quic-key');
            const security = params.get('quicSecurity') || params.get('security');
            if (key) transport.quicKey = key;
            if (security && security !== 'tls' && security !== 'reality') {
                transport.quicSecurity = security;
            }
            // Seed (KCP)
            const seed = params.get('seed');
            if (seed) transport.seed = seed;
            break;

        case 'httpupgrade': // HTTPUpgrade
            if (path) transport.path = path;
            if (host) transport.headers = { Host: host };
            break;

        case 'splithttp': // SplitHTTP
            if (path) transport.path = path;
            if (host) transport.headers = { Host: host };
            break;
    }

    // ========== 2. TLS/安全层配置 ==========
    const tls: TlsOptions = {
        enabled: false
    };

    const security = params.get('security');
    const isTls = security === 'tls' || security === 'reality' || params.get('tls') === '1';

    if (isTls) tls.enabled = true;

    // 总是解析 TLS 参数（某些协议如 Hysteria2/TUIC 隐式启用 TLS）
    const sni = params.get('sni') || params.get('peer') || params.get('servername');
    if (sni) tls.serverName = sni;

    // ALPN (Application-Layer Protocol Negotiation)
    const alpn = params.get('alpn');
    if (alpn) {
        const alpnList = safeDecodeURIComponent(alpn).split(',').map(a => a.trim()).filter(a => a);
        if (alpnList.length > 0) tls.alpn = alpnList;
    }

    // Fingerprint (uTLS 指纹伪装)
    const fp = params.get('fp') || params.get('fingerprint');
    if (fp) tls.fingerprint = fp;

    // Skip Cert Verify
    const insecureVal = params.get('allowInsecure') || params.get('insecure') || params.get('skip-cert-verify');
    const insecure = insecureVal === '1' || insecureVal === 'true' || insecureVal === 'yes';
    if (insecure) tls.insecure = true;

    // ========== 3. REALITY 特殊处理 ==========
    if (security === 'reality') {
        const pbk = params.get('pbk') || params.get('publicKey');
        const sid = params.get('sid') || params.get('shortId');
        const spx = params.get('spx') || params.get('spider-x') || params.get('spiderX');

        tls.reality = {
            enabled: true,
            publicKey: pbk || '',
            shortId: sid || '',
            spiderX: spx || ''
        };

        // REALITY 必须启用 TLS
        tls.enabled = true;

        // 验证必需字段
        if (!tls.reality.publicKey) {
            console.warn('[Helper] REALITY 缺少 publicKey (pbk) 参数');
        }
    }

    return { transport, tls };
}

// =================================================================
// 参数构建 (反向操作)
// =================================================================

/**
 * 构建标准查询参数字符串
 * 
 * 将 TransportOptions 和 TlsOptions 转换为 URL 查询参数
 * 用于生成分享链接
 * 
 * @param transport 传输层配置
 * @param tls TLS 配置
 * @returns URLSearchParams 对象
 * 
 * @example
 * const params = buildStandardQuery(
 *     { type: 'ws', path: '/ws' },
 *     { enabled: true, serverName: 'example.com' }
 * );
 * // 结果: "type=ws&path=/ws&security=tls&sni=example.com"
 */
export function buildStandardQuery(
    transport?: TransportOptions,
    tls?: TlsOptions
): URLSearchParams {
    const params = new URLSearchParams();

    // ========== Transport 参数 ==========
    if (transport) {
        if (transport.type && transport.type !== 'tcp') {
            params.set('type', transport.type);
        }

        if (transport.headerType && transport.headerType !== 'none') {
            params.set('headerType', transport.headerType);
        }

        switch (transport.type) {
            case 'ws':
                if (transport.path) params.set('path', transport.path);
                if (transport.headers?.Host) params.set('host', transport.headers.Host);
                if (transport.earlyData) params.set('ed', transport.earlyData.toString());
                break;

            case 'grpc':
                if (transport.serviceName) params.set('serviceName', transport.serviceName);
                if (transport.mode) params.set('mode', transport.mode);
                break;

            case 'http':
            case 'h2':
                if (transport.path) params.set('path', transport.path);
                if (transport.host) params.set('host', transport.host.join(','));
                if (transport.method) params.set('method', transport.method);
                break;

            case 'quic':
            case 'kcp':
                if (transport.quicSecurity) params.set('quicSecurity', transport.quicSecurity);
                if (transport.quicKey) params.set('key', transport.quicKey);
                if (transport.seed) params.set('seed', transport.seed);
                break;

            case 'httpupgrade':
            case 'splithttp':
                if (transport.path) params.set('path', transport.path);
                if (transport.headers?.Host) params.set('host', transport.headers.Host);
                break;
        }
    }

    // ========== TLS 参数 ==========
    if (tls && tls.enabled) {
        // security 参数由调用方根据协议决定
        // 这里只处理通用 TLS 参数

        if (tls.serverName) params.set('sni', tls.serverName);
        if (tls.alpn && tls.alpn.length) params.set('alpn', tls.alpn.join(','));
        if (tls.fingerprint) params.set('fp', tls.fingerprint);
        if (tls.insecure === true) params.set('allowInsecure', '1');

        // REALITY
        if (tls.reality?.enabled) {
            if (tls.reality.publicKey) params.set('pbk', tls.reality.publicKey);
            if (tls.reality.shortId) params.set('sid', tls.reality.shortId);
            if (tls.reality.spiderX) params.set('spx', tls.reality.spiderX);
        }
    }

    return params;
}

// =================================================================
// ID 生成工具
// =================================================================

/**
 * 生成唯一 ID
 * 
 * 优先使用 Web Crypto API 的 randomUUID()
 * 降级方案使用伪随机字符串
 * 
 * @returns UUID v4 格式或随机字符串
 * 
 * @example
 * generateId() // "550e8400-e29b-41d4-a716-446655440000"
 */
export function generateId(): string {
    try {
        // Node.js 和现代浏览器
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
    } catch (e) {
        // Crypto API 不可用或抛出异常
    }

    // Fallback: 生成伪随机 UUID v4 格式
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * 生成随机字符串 (用于非 UUID 场景)
 * 
 * @param length 字符串长度，默认 16
 * @returns 随机字符串
 */
export function generateRandomString(length: number = 16): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';

    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    return result;
}

// =================================================================
// 验证工具
// =================================================================

/**
 * 验证 IPv4 地址
 * 
 * @param ip IP 地址字符串
 * @returns 是否为有效的 IPv4 地址
 */
export function isValidIPv4(ip: string): boolean {
    const ipv4Regex = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip);
}

/**
 * 验证 IPv6 地址
 * 
 * @param ip IP 地址字符串
 * @returns 是否为有效的 IPv6 地址
 */
export function isValidIPv6(ip: string): boolean {
    const ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return ipv6Regex.test(ip);
}

/**
 * 验证端口号
 * 
 * @param port 端口号
 * @returns 是否为有效端口 (1-65535)
 */
export function isValidPort(port: number): boolean {
    return Number.isInteger(port) && port >= 1 && port <= 65535;
}

/**
 * 验证 UUID v4 格式
 * 
 * @param uuid UUID 字符串
 * @returns 是否为有效的 UUID v4
 */
export function isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// =================================================================
// 导出所有工具函数
// =================================================================

export default {
    // URI 编解码
    safeDecodeURIComponent,
    safeEncodeURIComponent,

    // 参数解析与构建
    parseStandardParams,
    buildStandardQuery,

    // ID 生成
    generateId,
    generateRandomString,

    // 验证工具
    isValidIPv4,
    isValidIPv6,
    isValidPort,
    isValidUUID
};

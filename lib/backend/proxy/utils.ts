/**
 * Sub-One Proxy Utilities
 * 
 * 基础工具函数集合
 */

// ============================================================================
// IP 地址验证
// ============================================================================

/**
 * 验证是否为有效的 IPv4 地址
 */
export function isIPv4(ip: string): boolean {
    const ipv4Pattern = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Pattern.test(ip);
}

/**
 * 验证是否为有效的 IPv6 地址
 */
export function isIPv6(ip: string): boolean {
    // IPv6 正则表达式
    const ipv6Pattern = /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return ipv6Pattern.test(ip);
}

/**
 * 验证是否为有效的 IP 地址 (IPv4 或 IPv6)
 */
export function isIP(ip: string): boolean {
    return isIPv4(ip) || isIPv6(ip);
}

// ============================================================================
// UUID 验证
// ============================================================================

/**
 * 验证是否为有效的 UUID (用于 VMess/VLESS/TUIC)
 */
export function isValidUUID(uuid: string): boolean {
    const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidPattern.test(uuid);
}

// ============================================================================
// URL 处理
// ============================================================================

/**
 * 安全解析 URL参数
 */
export function safeParseURLParams(url: string): URLSearchParams {
    try {
        const urlObj = new URL(url);
        return urlObj.searchParams;
    } catch (e) {
        // 如果不是标准 URL，尝试从 ? 后面提取参数
        const queryIndex = url.indexOf('?');
        if (queryIndex !== -1) {
            return new URLSearchParams(url.substring(queryIndex + 1));
        }
        return new URLSearchParams();
    }
}

/**
 * 获取 URL 的 hostname
 */
export function getHostname(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return '';
    }
}

/**
 * 获取 URL 的端口
 */
export function getPort(url: string): number {
    try {
        const port = new URL(url).port;
        return port ? parseInt(port, 10) : 0;
    } catch {
        return 0;
    }
}

// ============================================================================
// 字符串处理
// ============================================================================

/**
 * 检查字符串是否只包含 ASCII 字符
 */
export function isAscii(str: string): boolean {
    // eslint-disable-next-line no-control-regex
    const asciiPattern = /^[\x00-\x7F]+$/;
    return asciiPattern.test(str);
}

/**
 * 移除字符串两端的空白字符
 */
export function trim(str: string): string {
    return str.trim();
}

/**
 * 判断字符串是否为空
 */
export function isEmpty(str: string | undefined | null): boolean {
    return !str || str.trim().length === 0;
}

/**
 * 判断字符串是否非空
 */
export function isNotEmpty(str: string | undefined | null): boolean {
    return !isEmpty(str);
}

// ============================================================================
// 对象处理
// ============================================================================

/**
 * 深拷贝对象
 */
export function clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}

/**
 * 检查是否为对象
 */
export function isObject(item: any): boolean {
    return item && typeof item === 'object' && !Array.isArray(item);
}

/**
 * 检查对象是否有指定属性且不为 undefined/null
 */
export function isPresent(obj: any, key: string): boolean {
    return obj[key] !== undefined && obj[key] !== null;
}

/**
 * 检查对象是否有指定属性且不为空字符串
 */
export function isNotBlank(obj: any, key: string): boolean {
    return isPresent(obj, key) && isNotEmpty(String(obj[key]));
}

// ============================================================================
// 数组处理
// ============================================================================

/**
 * 数组去重
 */
export function unique<T>(arr: T[]): T[] {
    return Array.from(new Set(arr));
}

/**
 * 随机打乱数组
 */
export function shuffle<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

// ============================================================================
// 正则表达式
// ============================================================================

/**
 * 构建正则表达式
 * 支持 (?i) 前缀表示忽略大小写
 */
export function buildRegex(str: string, ...flags: string[]): RegExp {
    const combinedFlags = flags.join('');

    // 检查是否有 (?i) 忽略大小写前缀
    if (str.startsWith('(?i)')) {
        const pattern = str.substring(4);
        return new RegExp(pattern, 'i' + combinedFlags);
    }

    return new RegExp(str, combinedFlags);
}

// ============================================================================
// Base64 处理
// ============================================================================

/**
 * 检查字符串是否为 Base64 编码
 */
export function isBase64(str: string): boolean {
    if (!str || str.length === 0) return false;

    // 移除空白字符
    str = str.replace(/\s/g, '');

    // Base64 正则: 只包含 A-Z, a-z, 0-9, +, /, =
    const base64Pattern = /^[A-Za-z0-9+/]+=*$/;
    if (!base64Pattern.test(str)) return false;

    // 长度必须是 4 的倍数
    if (str.length % 4 !== 0) return false;

    return true;
}

// ============================================================================
// 端口处理
// ============================================================================

/**
 * 验证端口号是否有效
 */
export function isValidPort(port: number | string): boolean {
    const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
    return !isNaN(portNum) && portNum > 0 && portNum <= 65535;
}

/**
 * 解析端口号
 */
export function parsePort(port: string | number): number {
    if (typeof port === 'number') return port;
    const parsed = parseInt(port, 10);
    return isValidPort(parsed) ? parsed : 0;
}

// ============================================================================
// 速度值处理 (用于 Hysteria)
// ============================================================================

/**
 * 解析速度值（支持单位：mbps, kbps, gbps）
 * 
 * @param speed - 速度字符串，如 "100mbps", "10gbps"
 * @returns 标准化的数值（单位 mbps）
 */
export function parseSpeed(speed: string | number): number {
    if (typeof speed === 'number') return speed;

    const str = speed.toLowerCase().trim();
    const match = str.match(/^([\d.]+)\s*(mbps|kbps|gbps)?$/);

    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2] || 'mbps';

    switch (unit) {
        case 'kbps':
            return value / 1000;
        case 'gbps':
            return value * 1000;
        case 'mbps':
        default:
            return value;
    }
}

// ============================================================================
// 节点指纹生成 (用于去重)
// ============================================================================

/**
 * 生成节点指纹用于去重
 * 指纹包括: 类型、服务器、端口、凭证
 */
export function getNodeFingerprint(node: {
    type: string;
    server: string;
    port: number;
    uuid?: string;
    password?: string;
    network?: string;
    [key: string]: any;
}): string {
    const parts = [
        node.type,
        node.server,
        String(node.port),
        node.uuid || node.password || '',
    ];

    // 添加传输方式
    if (node.network) {
        parts.push(node.network);

        // 添加路径 (ws/grpc/h2)
        if (node.network === 'ws' && node['ws-path']) {
            parts.push(node['ws-path']);
        } else if (node.network === 'grpc' && node['grpc-service-name']) {
            parts.push(node['grpc-service-name']);
        }
    }

    return parts.join('|');
}

// ============================================================================
// 随机ID生成
// ============================================================================

/**
 * 生成随机 ID
 */
export function randomId(): string {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}

/**
 * 生成 UUID v4
 */
export function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

// ============================================================================
// 错误处理
// ============================================================================

/**
 * 安全执行函数，捕获错误
 */
export function tryCatch<T>(
    fn: () => T,
    defaultValue: T,
    errorMsg?: string
): T {
    try {
        return fn();
    } catch (e) {
        if (errorMsg) {
            console.error(errorMsg, e);
        }
        return defaultValue;
    }
}

/**
 * 异步安全执行
 */
export async function tryCatchAsync<T>(
    fn: () => Promise<T>,
    defaultValue: T,
    errorMsg?: string
): Promise<T> {
    try {
        return await fn();
    } catch (e) {
        if (errorMsg) {
            console.error(errorMsg, e);
        }
        return defaultValue;
    }
}

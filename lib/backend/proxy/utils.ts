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
    const ipv4Pattern =
        /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Pattern.test(ip);
}

/**
 * 验证是否为有效的 IPv6 地址
 */
export function isIPv6(ip: string): boolean {
    // IPv6 正则表达式
    const ipv6Pattern =
        /^(([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
    return ipv6Pattern.test(ip);
}

/**
 * 验证是否为有效的 IP 地址 (IPv4 或 IPv6)
 */
export function isIP(ip: string): boolean {
    return isIPv4(ip) || isIPv6(ip);
}

// ============================================================================
// WireGuard 工具函数
// ============================================================================

/**
 * 标准化 WireGuard reserved 字段
 * 支持:
 * - 数组: [1, 2, 3] -> [1, 2, 3]
 * - 字符串: "[1, 2, 3]", "1,2,3", "1/2/3" -> [1, 2, 3]
 * - Base64 编码 (例如 "AQID" -> [1, 2, 3])
 */
export function normalizeReserved(value: any): number[] | undefined {
    if (value === undefined || value === null || value === '') return undefined;
    if (Array.isArray(value)) {
        const nums = value
            .map((n) => (typeof n === 'number' ? n : parseInt(String(n).trim(), 10)))
            .filter((n) => Number.isInteger(n) && n >= 0);
        return nums.length > 0 ? nums : undefined;
    }
    if (typeof value === 'string') {
        const cleaned = value.replace(/[[\]\s]/g, '').trim();
        if (!cleaned) return undefined;

        if (cleaned.includes(',') || cleaned.includes('/')) {
            const parts = cleaned.split(/[,/]/);
            const nums = parts
                .map((n) => (/^\d+$/.test(n) ? parseInt(n, 10) : NaN))
                .filter((n) => Number.isInteger(n) && n >= 0);
            if (nums.length === parts.length && nums.length > 0) {
                return nums;
            }
        } else if (/^\d+$/.test(cleaned)) {
            const n = parseInt(cleaned, 10);
            if (n >= 0) return [n];
        } else {
            try {
                const buf = Buffer.from(cleaned, 'base64');
                if (buf.length > 0 && buf.length <= 8) {
                    return Array.from(buf);
                }
            } catch {
                // ignore
            }
        }
    }
    return undefined;
}

/**
 * 解析 WireGuard CIDR
 */
function parseWireGuardCIDR(cidr: any, max: number): number | undefined {
    if (cidr == null) return undefined;
    const normalized = `${cidr}`.trim();
    if (!/^\d+$/.test(normalized)) return undefined;
    const parsed = parseInt(normalized, 10);
    if (parsed < 0 || parsed > max) return undefined;
    return parsed;
}

/**
 * 解析 WireGuard 接口地址
 */
function parseWireGuardInterfaceAddress(value: any, family: 'ipv4' | 'ipv6') {
    if (value == null) return null;
    const raw = `${value}`.trim();
    if (!raw) return null;
    const [, hostRaw = raw, cidrRaw] = /^(.*?)(?:\/(\d+))?$/.exec(raw) || [];
    const host = `${hostRaw}`.trim().replace(/^\[/, '').replace(/\]$/, '');
    const isIPv4Family = family === 'ipv4';
    const isValid = isIPv4Family ? isIPv4(host) : isIPv6(host);
    if (!isValid) return null;
    const max = isIPv4Family ? 32 : 128;
    return {
        address: host,
        cidr: parseWireGuardCIDR(cidrRaw, max)
    };
}

/**
 * 获取规范带 CIDR 的 WireGuard 接口地址 (例如 10.0.0.1/32 或 fd00::1/128)
 */
export function getWireGuardAddressWithCIDR(
    proxy: any = {},
    family: 'ipv4' | 'ipv6' = 'ipv4'
): string | undefined {
    const config =
        family === 'ipv6'
            ? { addressKey: 'ipv6', cidrKey: 'ipv6-cidr', defaultCIDR: 128 }
            : { addressKey: 'ip', cidrKey: 'ip-cidr', defaultCIDR: 32 };
    const parsed = parseWireGuardInterfaceAddress(proxy[config.addressKey], family);
    if (!parsed) return undefined;
    const normalizedCIDR = parseWireGuardCIDR(proxy[config.cidrKey], config.defaultCIDR);
    return `${parsed.address}/${normalizedCIDR ?? parsed.cidr ?? config.defaultCIDR}`;
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
    const parts = [node.type, node.server, String(node.port), node.uuid || node.password || ''];

    // 添加传输方式
    if (node.network) {
        parts.push(node.network);

        // 添加路径 (ws/grpc/h2/http)
        const wsPath = node['ws-opts']?.path || node['ws-path'];
        const grpcService =
            node['grpc-opts']?.['service-name'] ||
            node['grpc-opts']?.['grpc-service-name'] ||
            node['grpc-service-name'];
        const h2Path = node['h2-opts']?.path;
        const httpPath = node['http-opts']?.path;

        if (node.network === 'ws' && wsPath) {
            parts.push(wsPath);
        } else if (node.network === 'grpc' && grpcService) {
            parts.push(grpcService);
        } else if (node.network === 'h2' && h2Path) {
            parts.push(h2Path);
        } else if (node.network === 'http' && httpPath) {
            parts.push(httpPath);
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
    return (
        Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    );
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
export function tryCatch<T>(fn: () => T, defaultValue: T, errorMsg?: string): T {
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

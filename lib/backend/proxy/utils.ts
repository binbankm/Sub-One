/**
 * Sub-One Core Utils
 * 参考 Sub-Store 的工具函数
 */

import { Base64 } from 'js-base64';

// ==================== IP 地址验证 ====================

const IPV4_REGEX = /^((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)(\.(?!$)|$)){4}$/;

const IPV6_REGEX =
    /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;

export function isIPv4(ip: string): boolean {
    return IPV4_REGEX.test(ip);
}

export function isIPv6(ip: string): boolean {
    return IPV6_REGEX.test(ip);
}

export function isIP(ip: string): boolean {
    return isIPv4(ip) || isIPv6(ip);
}

// ==================== 端口验证 ====================

export function isValidPortNumber(port: string | number): boolean {
    const portNum = typeof port === 'string' ? parseInt(port, 10) : port;
    return !isNaN(portNum) && portNum >= 1 && portNum <= 65535;
}

// ==================== 字符串工具 ====================

export function isNotBlank(str: unknown): str is string {
    return typeof str === 'string' && str.trim().length > 0;
}

export function getIfNotBlank<T>(str: unknown, defaultValue?: T): string | T | undefined {
    return isNotBlank(str) ? str : defaultValue;
}

export function isPresent(obj: unknown): boolean {
    return typeof obj !== 'undefined' && obj !== null;
}

export function getIfPresent<T>(obj: T | undefined | null, defaultValue?: T): T | undefined {
    return isPresent(obj) ? obj! : defaultValue;
}

// ==================== UUID 验证 ====================

export function isValidUUID(uuid: string): boolean {
    return (
        typeof uuid === 'string' &&
        /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(
            uuid
        )
    );
}

// ==================== Base64 工具 ====================

/**
 * 安全的 Base64 解码
 * 支持 URL-safe Base64 和标准 Base64
 */
export function safeBase64Decode(str: string): string {
    try {
        // 替换 URL-safe 字符
        let normalized = str.replace(/-/g, '+').replace(/_/g, '/');
        // 补齐 padding
        const pad = normalized.length % 4;
        if (pad) {
            normalized += '='.repeat(4 - pad);
        }
        return Base64.decode(normalized);
    } catch {
        // 尝试直接解码
        try {
            return Base64.decode(str);
        } catch {
            return str;
        }
    }
}

/**
 * 检测内容是否是 Base64 编码
 */
export function isBase64(str: string): boolean {
    if (!str || str.length < 4) return false;

    // 检查是否包含明显的非 Base64 字符
    if (/^(vmess|vless|trojan|ss|ssr|hysteria|tuic|wireguard|http|https):\/\//.test(str)) {
        return false;
    }

    // Base64 正则 (包括 URL-safe)
    const base64Regex = /^[A-Za-z0-9+/\-_=]+$/;
    if (!base64Regex.test(str.trim())) return false;

    // 尝试解码验证
    try {
        const decoded = safeBase64Decode(str.trim());
        // 如果解码后包含有效的协议前缀
        if (/^(vmess|vless|trojan|ss|ssr|hysteria|tuic|wireguard):\/\//.test(decoded)) {
            return true;
        }
        // 如果解码后是有效的节点内容（包含换行或多个节点）
        if (decoded.includes('\n') || /^[\x20-\x7E\r\n]+$/.test(decoded)) {
            return true;
        }
    } catch {
        return false;
    }

    return false;
}

// ==================== URL 解析工具 ====================

/**
 * 解析 URL 查询参数
 */
export function parseQueryParams(query: string): Record<string, string> {
    const params: Record<string, string> = {};
    if (!query) return params;

    const queryStr = query.startsWith('?') ? query.slice(1) : query;
    for (const pair of queryStr.split('&')) {
        if (!pair) continue;
        const [key, ...valueParts] = pair.split('=');
        const value = valueParts.join('=');
        if (key) {
            params[key] = decodeURIComponent(value || '');
        }
    }
    return params;
}

/**
 * 安全解码 URI 组件
 */
export function safeDecode(str: string): string {
    try {
        return decodeURIComponent(str);
    } catch {
        return str;
    }
}

/**
 * 解析布尔字符串 (1, true, TRUE)
 */
export function parseBool(val: string | undefined): boolean {
    if (!val) return false;
    return /^(true|1|on|yes)$/i.test(val);
}

// ==================== 端口跳跃 ====================

/**
 * 从端口跳跃字符串中获取随机端口
 */
export function getRandomPort(portString: string): number {
    const portParts = portString.split(/,|\//);
    const randomPart = portParts[Math.floor(Math.random() * portParts.length)];
    if (randomPart.includes('-')) {
        const [min, max] = randomPart.split('-').map(Number);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return Number(randomPart);
}

// ==================== 数值工具 ====================

export function numberToString(value: number | bigint): string {
    return Number.isSafeInteger(value as number)
        ? String(value)
        : BigInt(value).toString();
}

export function safeParseInt(value: unknown, defaultValue = 0): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const parsed = parseInt(value, 10);
        return isNaN(parsed) ? defaultValue : parsed;
    }
    return defaultValue;
}

// ==================== 日志 ====================

export const logger = {
    info: (msg: string) => console.log(`[Sub-One] ${msg}`),
    warn: (msg: string) => console.warn(`[Sub-One] ${msg}`),
    error: (msg: string) => console.error(`[Sub-One] ${msg}`),
    debug: (msg: string) => {
        // Cloudflare Workers 环境下直接使用 console.debug
        console.debug(`[Sub-One] ${msg}`);
    },
};

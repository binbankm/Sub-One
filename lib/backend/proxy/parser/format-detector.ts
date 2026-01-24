/**
 * Sub-One Format Detector
 *
 * 检测内容格式：Clash, SIP008, URI List, Base64 等
 */
import { Base64 } from 'js-base64';

import { isNotEmpty } from '../utils';

export type ContentFormat =
    | 'clash'
    | 'sip008'
    | 'uri-list'
    | 'base64'
    | 'surge'
    | 'loon'
    | 'qx'
    | 'html'
    | 'unknown';

/**
 * 检测输入内容的格式
 */
export function detectFormat(content: string): ContentFormat {
    if (!isNotEmpty(content)) return 'unknown';

    const trimmed = content.trim();

    // 1. HTML 检测 (通常是运营商劫持或 404)
    if (trimmed.startsWith('<!DOCTYPE html>') || trimmed.startsWith('<html')) {
        return 'html';
    }

    // 2. SIP008 / JSON 检测
    if (trimmed.startsWith('{') && trimmed.includes('"version"') && trimmed.includes('"servers"')) {
        return 'sip008';
    }

    // 3. Clash YAML 检测
    // 特征：包含 proxies: 列表且符合 YAML 对象列表结构
    if (
        trimmed.includes('proxies:') &&
        (trimmed.includes('  - name:') || trimmed.includes('- {'))
    ) {
        return 'clash';
    }

    // 4. Base64 检测
    // 逻辑：尝试解码，如果解码后包含协议头，则是 Base64 订阅
    if (isLikelyBase64(trimmed)) {
        return 'base64';
    }

    // 5. Surge/Loon/QX 检测
    // 特征：通常每行包含 = 和 , 且不是 Clash
    if (isPlatformFormat(trimmed)) {
        if (
            /^.*=\s*(ss|shadowsocks|ssr|shadowsocksr|vmess|vless|trojan|http|https|snell|tuic|hysteria2|hy2|wireguard|wg),/i.test(
                trimmed
            )
        ) {
            return 'surge'; // or loon, they are similar enough to be distinguished later if needed
        }
        if (/^(shadowsocks|ss|vmess|vless|trojan|http|socks5)\s*=/i.test(trimmed)) {
            return 'qx';
        }
    }

    // 6. URI 列表检测
    // 逻辑：包含常见协议头
    if (
        /^(ss|ssr|vmess|vless|trojan|hysteria|hy2|tuic|wg|wireguard|socks|http|https|snell|anytls):\/\//im.test(
            trimmed
        )
    ) {
        return 'uri-list';
    }

    return 'unknown';
}

/**
 * 判断是否可能是平台特定的代理行格式 (Surge, Loon, QX)
 */
function isPlatformFormat(str: string): boolean {
    const lines = str
        .split(/\r?\n/)
        .filter(
            (l) => l.trim().length > 0 && !l.trim().startsWith('#') && !l.trim().startsWith('//')
        );
    if (lines.length === 0) return false;

    // 取第一行检测
    const firstLine = lines[0].trim();
    return firstLine.includes('=') && firstLine.includes(',');
}

/**
 * 判断是否可能是 Base64 编码的订阅
 */
function isLikelyBase64(str: string): boolean {
    // 简单的正则判断 Base64 字符集
    if (!/^[A-Za-z0-9+/=\s]+$/.test(str)) return false;
    if (str.length < 16) return false;

    try {
        const decoded = Base64.decode(str);
        // 解码后应该包含协议头
        return /^(ss|ssr|vmess|vless|trojan|hysteria|hy2|tuic|anytls|snell|wg|wireguard|socks|http|https):\/\//im.test(
            decoded
        );
    } catch {
        return false;
    }
}

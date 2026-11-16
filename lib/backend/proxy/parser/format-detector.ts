/**
 * Sub-One Format Detector
 *
 * 检测内容格式：Clash, SIP008, URI List, Base64 等
 */
import { Base64 } from 'js-base64';

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
    if (!content) return 'unknown';

    // 移除 UTF-8 BOM 或特殊空格
    const sanitized = content.replace(/^\uFEFF/, '').trim();
    if (sanitized.length === 0) return 'unknown';

    const trimmed = sanitized;

    // 1. HTML 检测 (通常是运营商劫持或 404)
    if (trimmed.startsWith('<!DOCTYPE html>') || trimmed.startsWith('<html')) {
        return 'html';
    }

    // 2. SIP008 / JSON 检测
    if (trimmed.startsWith('{') && trimmed.includes('"version"') && trimmed.includes('"servers"')) {
        return 'sip008';
    }

    // 3. Clash YAML 检测
    // 特征 1：包含 Clash 特有的顶层关键字
    const clashKeys = ['proxies:', 'proxy-groups:', 'rule-providers:', 'rules:', 'mixed-port:'];
    const hasClashKey = clashKeys.some((key) => trimmed.includes(key));

    // 特征 2：包含节点列表标志 (针对只有 proxies 列表的情况)
    const hasNodeMarkers =
        /^\s*-\s*name:/m.test(trimmed) ||
        /^\s*-\s*type:/m.test(trimmed) ||
        /^\s*-\s*server:/m.test(trimmed) ||
        trimmed.includes('- {');

    if (hasClashKey || hasNodeMarkers) {
        // 如果包含 Clash 关键字，或者既有 proxies 又符合列表特征，则判定为 clash
        // 注意：这里放宽了条件，只要包含关键 key 且不是 JSON/HTML，就优先尝试 clash 解析
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
            /^.*=\s*(ss|shadowsocks|ssr|shadowsocksr|vmess|vless|trojan|http|https|snell|tuic|tuic-v5|hysteria|hysteria2|hy|hy2|wireguard|wg|anytls),/i.test(
                trimmed
            )
        ) {
            if (
                trimmed.includes('peers=') ||
                trimmed.includes('interface-ip=') ||
                trimmed.includes('tls-profile=') ||
                trimmed.includes('over-tls=') ||
                trimmed.includes('transport=') ||
                trimmed.includes('tls-name=')
            ) {
                return 'loon';
            }
            return 'surge';
        }
        if (/^(shadowsocks|ss|vmess|vless|trojan|http|socks5|anytls)\s*=/i.test(trimmed)) {
            return 'qx';
        }
    }

    // 6. URI 列表检测
    // 逻辑：包含常见协议头
    if (
        /^(ss|ssr|vmess|vless|trojan|hysteria2|hysteria|hy|hy2|tuic|wg|wireguard|socks|socks5|http|https|snell|anytls|naive|naive\+https|naive\+http):\/\//im.test(
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
        .filter((l) => l.trim().length > 0 && !l.startsWith('#') && !l.startsWith('//'));
    if (lines.length === 0) return false;

    // 取第一行检测
    const firstLine = lines[0].trim();
    return firstLine.includes('=') && firstLine.includes(',');
}

/**
 * 判断是否可能是 Base64 编码的订阅
 */
function isLikelyBase64(str: string): boolean {
    // 先去除首尾空白字符
    const trimmed = str.trim();
    // 简单的正则判断 Base64 字符集 (支持 URL-Safe Base64 的 - 与 _)
    if (!/^[A-Za-z0-9+/_\-=\s]+$/.test(trimmed)) return false;
    if (trimmed.length < 16) return false;

    try {
        const decoded = Base64.decode(trimmed);
        // 解码后去除首尾空白，再检测是否包含协议头
        return /^(ss|ssr|vmess|vless|trojan|hysteria2|hysteria|hy2|tuic|anytls|snell|wg|wireguard|socks|http|https|naive|naive\+https|naive\+http):\/\//im.test(
            decoded.trim()
        );
    } catch {
        return false;
    }
}

/**
 * Sub-One Format Detector
 *
 * 检测内容格式：Clash, SIP008, URI List, Base64 等
 */
import { Base64 } from 'js-base64';

export type ContentFormat =
    | 'clash'
    | 'sip008'
    | 'singbox'
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

    // 2. SIP008 / sing-box JSON 检测
    if (trimmed.startsWith('{') && trimmed.includes('"version"') && trimmed.includes('"servers"')) {
        return 'sip008';
    }
    if (
        (trimmed.startsWith('{') && (trimmed.includes('"outbounds"') || trimmed.includes('"endpoints"'))) ||
        (trimmed.startsWith('[') && trimmed.includes('"type"') && trimmed.includes('"tag"'))
    ) {
        return 'singbox';
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
    // 特征：通常每行包含 = 和 , 且不是 Clash (忽略 [Proxy] 等 INI section header)
    const platformLine = getFirstPlatformLine(trimmed);
    if (platformLine) {
        if (
            /^[^=]*=\s*(ss|shadowsocks|ssr|shadowsocksr|vmess|vless|trojan|http|https|socks5|socks5-tls|snell|tuic|tuic-v5|hysteria|hysteria2|hy|hy2|wireguard|wg|anytls|mieru|ssh|naive|external|direct|reject)(\s*,|\s*$)/i.test(
                platformLine
            )
        ) {
            const isSurgeExplicit =
                /^\[WireGuard\s+/im.test(trimmed) ||
                trimmed.includes('section-name=') ||
                trimmed.includes('reality-public-key=') ||
                trimmed.includes('udp-relay=') ||
                trimmed.includes('ip-version=') ||
                trimmed.includes('server-cert-fingerprint-sha256=');
            if (
                !isSurgeExplicit &&
                (/^[^=]*=\s*mieru(\s*,|\s*$)/i.test(platformLine) ||
                    trimmed.includes('peers=') ||
                    trimmed.includes('interface-ip=') ||
                    trimmed.includes('tls-profile=') ||
                    trimmed.includes('over-tls=') ||
                    trimmed.includes('transport=') ||
                    trimmed.includes('tls-name=') ||
                    trimmed.includes('server-ports=') ||
                    trimmed.includes('ip-mode=') ||
                    trimmed.includes('server-dns=') ||
                    trimmed.includes('tls-cert-sha256=') ||
                    trimmed.includes('tls-pubkey-sha256=') ||
                    trimmed.includes('obfs-name=') ||
                    trimmed.includes('fast-open=') ||
                    /(?:^|,\s*)public-key\s*=/.test(platformLine) ||
                    /(?:^|,\s*)short-id\s*=/.test(platformLine) ||
                    /(?:^|,\s*)spider-x\s*=/.test(platformLine))
            ) {
                return 'loon';
            }
            return 'surge';
        }
        if (
            /^(shadowsocks|shadowsocksr|ss|ssr|vmess|vless|trojan|http|https|socks5|socks|anytls|hysteria2|hy2)\s*=/i.test(
                platformLine
            )
        ) {
            return 'qx';
        }
    }

    // 6. URI 列表检测
    // 逻辑：包含常见协议头
    if (
        /^(ss|ssr|vmess|vless|trojan|hysteria2|hysteria|hy|hy2|tuic|wg|wireguard|socks|socks5|http|https|snell|anytls|naive|naive\+https|naive\+http|ssh|mieru|juicity|sudoku|trusttunnel|tt):\/\//im.test(
            trimmed
        )
    ) {
        return 'uri-list';
    }

    return 'unknown';
}

/**
 * 获取第一条有效的平台代理配置行（优先定位 [Proxy]/[server_local] section，跳过空行与注释）
 */
function getFirstPlatformLine(str: string): string | null {
    const lines = str.split(/\r?\n/).map((l) => l.trim());
    const proxyLinePattern =
        /^(?:[^=]*=\s*(?:ss|shadowsocks|ssr|shadowsocksr|vmess|vless|trojan|http|https|socks5|socks5-tls|snell|tuic|tuic-v5|hysteria|hysteria2|hy|hy2|wireguard|wg|anytls|mieru|ssh|naive|external|direct|reject)(?:\s*,|\s*$)|(?:shadowsocks|shadowsocksr|ss|ssr|vmess|vless|trojan|http|https|socks5|socks|anytls|hysteria2|hy2)\s*=)/i;

    let hasProxySection = false;
    let inProxySection = false;

    for (const line of lines) {
        if (!line || line.startsWith('#') || line.startsWith('//') || line.startsWith(';')) continue;
        const secMatch = line.match(/^\[(.+)\]$/);
        if (secMatch) {
            const secName = secMatch[1].trim().toLowerCase();
            if (secName === 'proxy' || secName === 'server_local') {
                hasProxySection = true;
                inProxySection = true;
            } else {
                inProxySection = false;
            }
            continue;
        }
        if (hasProxySection && inProxySection && line.includes('=') && proxyLinePattern.test(line)) {
            return line;
        }
    }

    if (hasProxySection) return null;

    for (const line of lines) {
        if (
            !line ||
            line.startsWith('#') ||
            line.startsWith('//') ||
            line.startsWith(';') ||
            /^\[.*\]$/.test(line)
        ) {
            continue;
        }
        if (line.includes('=') && proxyLinePattern.test(line)) {
            return line;
        }
    }

    return null;
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
        let sanitized = trimmed.replace(/-/g, '+').replace(/_/g, '/');
        while (sanitized.length % 4) sanitized += '=';
        const decoded = Base64.decode(sanitized).trim();
        if (!decoded) return false;
        // 解码后检测是否包含常见订阅协议头、Clash YAML、JSON 或 INI 配置
        if (
            /^(ss|ssr|vmess|vless|trojan|hysteria2|hysteria|hy2|tuic|anytls|snell|wg|wireguard|socks|http|https|naive|naive\+https|naive\+http|ssh|mieru|juicity|sudoku|trusttunnel|tt):\/\//im.test(
                decoded
            )
        ) {
            return true;
        }
        if (/^(proxies:|proxy-groups:|\[Proxy\]|\[server_local\])/im.test(decoded)) {
            return true;
        }
        if (
            (decoded.startsWith('{') && (decoded.includes('"outbounds"') || decoded.includes('"servers"'))) ||
            getFirstPlatformLine(decoded) !== null
        ) {
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

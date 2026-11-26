export const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes || bytes < 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    // toFixed(dm) after dividing by pow(k, i) was producing large decimal numbers
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i < 0) return '0 B'; // Handle log(0) case
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]} `;
};

/**
 * 校验 URL 是否安全（防止针对私网/内网的 SSRF 探测）
 */
export function isSafePublicUrl(urlString?: string): boolean {
    if (!urlString || typeof urlString !== 'string') return false;
    try {
        const parsed = new URL(urlString.trim());
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return false;
        }
        const hostname = parsed.hostname.toLowerCase();

        // 1. 屏蔽常见保留主机名与本地网络后缀
        if (
            hostname === 'localhost' ||
            hostname.endsWith('.localhost') ||
            hostname.endsWith('.local') ||
            hostname.endsWith('.internal') ||
            hostname.endsWith('.lan') ||
            hostname.endsWith('.home.arpa')
        ) {
            return false;
        }

        // 2. IPv6 本地/私有/特殊地址检测
        const cleanHost = hostname.replace(/^\[|\]$/g, '');
        if (
            cleanHost === '::1' ||
            cleanHost === '::' ||
            cleanHost.startsWith('fe80:') ||
            cleanHost.startsWith('fc00:') ||
            cleanHost.startsWith('fd')
        ) {
            return false;
        }

        // 3. 通用点分十进制与私网/保留 IPv4 段匹配（支持 *.127.0.0.1.nip.io 等 DNS Rebinding 通配域名）
        if (
            /(^|\.)(127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0)$/.test(cleanHost) ||
            /(^|\.)172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+$/.test(cleanHost)
        ) {
            return false;
        }

        // 4. 数值型/特殊进制编码 IP 规避绕过（如 2130706433, 0177.0.0.1, 0x7f000001 等）
        if (/^(0x[0-9a-f]+|\d+)$/i.test(cleanHost) || /^0[0-7]+(\.[0-9a-f]+)*$/i.test(cleanHost)) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}

/**
 * 安全的 HTTP 请求封装：校验初始 URL 与所有重定向目标，防止 SSRF 绕过
 */
export async function safeFetch(
    url: string,
    init: RequestInit & { cf?: Record<string, unknown> } = {},
    maxRedirects = 5
): Promise<Response> {
    let currentUrl = url;
    for (let i = 0; i <= maxRedirects; i++) {
        if (!isSafePublicUrl(currentUrl)) {
            throw new Error(`Forbidden or unsafe URL: ${currentUrl}`);
        }
        const response = await fetch(
            new Request(currentUrl, {
                ...init,
                redirect: 'manual'
            } as RequestInit)
        );

        if (response.status >= 300 && response.status < 400) {
            const location = response.headers.get('location');
            if (!location) {
                return response;
            }
            currentUrl = new URL(location, currentUrl).toString();
            continue;
        }

        return response;
    }
    throw new Error(`Too many redirects (>${maxRedirects}) fetching ${url}`);
}

/**
 * 解析 subscription-userinfo 响应头
 */
export function parseUserInfoHeader(
    header: string | null
): { upload?: number; download?: number; total?: number; expire?: number } | null {
    if (!header) return null;
    const info: Record<string, number> = {};
    header.split(';').forEach((part) => {
        const eqIndex = part.indexOf('=');
        if (eqIndex === -1) return;
        const key = part.slice(0, eqIndex).trim();
        const value = part.slice(eqIndex + 1).trim();
        if (key && value) {
            const numValue = Number(value);
            if (!isNaN(numValue)) {
                info[key] = numValue;
            }
        }
    });
    return Object.keys(info).length > 0 ? info : null;
}

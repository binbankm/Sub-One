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

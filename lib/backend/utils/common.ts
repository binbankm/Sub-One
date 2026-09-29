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
        // 屏蔽 localhost 及常见私网/回环保留域名与 IP
        if (
            hostname === 'localhost' ||
            hostname.endsWith('.localhost') ||
            hostname.endsWith('.local') ||
            hostname.endsWith('.internal') ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('127.') ||
            hostname === '0.0.0.0' ||
            hostname.startsWith('10.') ||
            hostname.startsWith('192.168.') ||
            hostname === '169.254.169.254' ||
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(hostname)
        ) {
            return false;
        }
        return true;
    } catch {
        return false;
    }
}

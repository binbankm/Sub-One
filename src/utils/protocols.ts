/**
 * 从 URL 提取协议类型
 * @param url 节点链接
 * @returns 协议名称 (小写)
 */
export const getProtocol = (url?: string): string => {
    try {
        if (!url) return 'unknown';
        const lowerUrl = url.trim().toLowerCase();
        if (lowerUrl.startsWith('anytls://')) return 'anytls';
        if (lowerUrl.startsWith('hysteria2://') || lowerUrl.startsWith('hy2://')) return 'hysteria2';
        if (lowerUrl.startsWith('hysteria://') || lowerUrl.startsWith('hy://')) return 'hysteria';
        if (lowerUrl.startsWith('ssr://')) return 'ssr';
        if (lowerUrl.startsWith('tuic://')) return 'tuic';
        if (lowerUrl.startsWith('ss://')) return 'ss';
        if (lowerUrl.startsWith('vmess://')) return 'vmess';
        if (lowerUrl.startsWith('vless://')) return 'vless';
        if (lowerUrl.startsWith('trojan://')) return 'trojan';
        if (lowerUrl.startsWith('wireguard://') || lowerUrl.startsWith('wg://')) return 'wireguard';
        if (lowerUrl.startsWith('socks5://')) return 'socks5';
        if (lowerUrl.startsWith('snell://')) return 'snell';
        if (lowerUrl.startsWith('naive') || lowerUrl.startsWith('naive+')) return 'naive';
        if (lowerUrl.startsWith('http://') || lowerUrl.startsWith('https://')) return 'http';

    } catch {
        return 'unknown';
    }
    return 'unknown';
};

export interface ProtocolInfo {
    text: string;
    icon: string;
    gradient: string;
    bg: string;
    color: string;
}

/**
 * 获取协议的样式配置（颜色、图标等）
 * @param protocol 协议名称
 * @returns ProtocolInfo
 */
export const getProtocolInfo = (protocol: string): ProtocolInfo => {
    const p = (protocol || '').toLowerCase();
    switch (p) {
        case 'ss':
        case 'shadowsocks':
            return {
                text: 'SS',
                icon: '🔒',
                gradient: 'from-sky-400 to-blue-500',
                bg: 'bg-sky-100 dark:bg-sky-900/30',
                color: 'text-sky-600 dark:text-sky-400'
            };
        case 'ssr':
        case 'shadowsocksr':
            return {
                text: 'SSR',
                icon: '✈️',
                gradient: 'from-pink-400 to-rose-500',
                bg: 'bg-pink-100 dark:bg-pink-900/30',
                color: 'text-pink-600 dark:text-pink-400'
            };
        case 'vmess':
        case 'v2ray':
            return {
                text: 'VMess',
                icon: '💎',
                gradient: 'from-emerald-400 to-teal-500',
                bg: 'bg-emerald-100 dark:bg-emerald-900/30',
                color: 'text-emerald-600 dark:text-emerald-400'
            };
        case 'vless':
            return {
                text: 'VLESS',
                icon: '🚀',
                gradient: 'from-blue-400 to-indigo-500',
                bg: 'bg-blue-100 dark:bg-blue-900/30',
                color: 'text-blue-600 dark:text-blue-400'
            };
        case 'hysteria2':
        case 'hy2':
            return {
                text: 'HY2',
                icon: '🌩️',
                gradient: 'from-purple-400 to-violet-500',
                bg: 'bg-purple-100 dark:bg-purple-900/30',
                color: 'text-purple-600 dark:text-purple-400'
            };
        case 'hysteria':
        case 'hy':
            return {
                text: 'Hysteria',
                icon: '⚡',
                gradient: 'from-fuchsia-400 to-pink-500',
                bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/30',
                color: 'text-fuchsia-600 dark:text-fuchsia-400'
            };
        case 'tuic':
            return {
                text: 'TUIC',
                icon: '🛸',
                gradient: 'from-cyan-400 to-blue-500',
                bg: 'bg-cyan-100 dark:bg-cyan-900/30',
                color: 'text-cyan-600 dark:text-cyan-400'
            };
        case 'trojan':
            return {
                text: 'Trojan',
                icon: '🐴',
                gradient: 'from-amber-400 to-orange-500',
                bg: 'bg-amber-100 dark:bg-amber-900/30',
                color: 'text-amber-600 dark:text-amber-400'
            };
        case 'anytls':
            return {
                text: 'AnyTLS',
                icon: '🔓',
                gradient: 'from-slate-400 to-gray-500',
                bg: 'bg-slate-100 dark:bg-slate-900/30',
                color: 'text-slate-600 dark:text-slate-400'
            };
        case 'socks5':
        case 'socks':
            return {
                text: 'SOCKS5',
                icon: '🔌',
                gradient: 'from-orange-400 to-red-500',
                bg: 'bg-orange-100 dark:bg-orange-900/30',
                color: 'text-orange-600 dark:text-orange-400'
            };
        case 'wireguard':
        case 'wg':
            return {
                text: 'WireGuard',
                icon: '🛡️',
                gradient: 'from-red-700 to-rose-800',
                bg: 'bg-red-100 dark:bg-red-900/30',
                color: 'text-red-700 dark:text-red-300'
            };
        case 'snell':
            return {
                text: 'Snell',
                icon: '💡',
                gradient: 'from-blue-600 to-indigo-700',
                bg: 'bg-blue-100 dark:bg-blue-900/30',
                color: 'text-blue-700 dark:text-blue-300'
            };
        case 'naive':
            return {
                text: 'Naive',
                icon: '😺',
                gradient: 'from-emerald-600 to-green-700',
                bg: 'bg-emerald-100 dark:bg-emerald-900/30',
                color: 'text-emerald-700 dark:text-emerald-300'
            };
        case 'http':
        case 'https':
            return {
                text: 'HTTP',
                icon: '🌐',
                gradient: 'from-gray-300 to-gray-500',
                bg: 'bg-gray-100 dark:bg-gray-800',
                color: 'text-gray-600 dark:text-gray-400'
            };
        default:
            return {
                text: 'Unknown',
                icon: '❓',
                gradient: 'from-gray-400 to-slate-500',
                bg: 'bg-gray-100 dark:bg-gray-800',
                color: 'text-gray-600 dark:text-gray-400'
            };
    }
};

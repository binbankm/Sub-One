import { VlessNode } from '../../shared/types';
import { safeDecodeURIComponent, parseStandardParams, generateId } from './helper';

/**
 * 解析 VLESS 链接
 * 格式: vless://uuid@host:port?params#name
 */
export function parseVless(url: string): VlessNode | null {
    try {
        const urlObj = new URL(url);

        // 核心字段
        const uuid = urlObj.username;
        const server = urlObj.hostname.replace(/^\[|\]$/g, ''); // 去除 IPv6 方括号
        const port = Number(urlObj.port);
        const name = safeDecodeURIComponent(urlObj.hash.slice(1)) || 'VLESS节点';

        if (!uuid || !server || !port) {
            console.warn('VLESS URL 缺少必要字段:', url);
            return null;
        }

        const params = new URLSearchParams(urlObj.search);

        // 利用公共解析器提取 Transport 和 TLS
        const { transport, tls } = parseStandardParams(params);

        // VLESS 特有字段
        const flow = params.get('flow') || '';
        const encryption = params.get('encryption') || '';

        // 特殊处理: 如果是 Reality, TLS 必须启用
        if (tls.reality?.enabled) {
            tls.enabled = true;
        }

        const node: VlessNode = {
            type: 'vless',
            id: generateId(),
            name,
            server,
            port,
            uuid,
            udp: true, // VLESS 默认支持 UDP
            flow,
            encryption,
            transport,
            tls,
            originalUrl: url // ⭐ 保存原始URL，避免重建时丢失参数
        };

        return node;

    } catch (e) {
        console.error('解析 VLESS 链接失败:', e);
        return null;
    }
}

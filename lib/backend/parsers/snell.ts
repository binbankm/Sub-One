import { SnellNode } from '../../shared/types';
import { safeDecodeURIComponent, generateId } from './helper';

/**
 * 解析 Snell 链接
 * 常用格式: snell://PASSWORD@HOST:PORT?version=1&obfs=http#NAME
 */
export function parseSnell(url: string): SnellNode | null {
    if (!url.startsWith('snell://')) return null;

    try {
        const urlObj = new URL(url);
        const host = urlObj.hostname;
        const port = parseInt(urlObj.port);
        // PASSWORD 可能在 username 处，也可能在参数里
        let password = safeDecodeURIComponent(urlObj.username);
        const params = urlObj.searchParams;

        if (!password) {
            password = params.get('psk') || '';
        }

        const version = params.get('version') || '1';
        const obfsType = params.get('obfs') || params.get('obfs-type');
        const obfsHost = params.get('host') || params.get('obfs-host');

        const name = safeDecodeURIComponent(urlObj.hash.slice(1)) || 'Snell节点';

        if (!host || !port || !password) return null;

        const node: SnellNode = {
            id: generateId(),
            type: 'snell',
            name,
            server: host,
            port,
            password,
            version,
            udp: true
        };

        if (obfsType) {
            node.obfs = {
                type: obfsType,
                host: obfsHost || undefined
            };
        }

        return node;
    } catch (e) {
        return null;
    }
}

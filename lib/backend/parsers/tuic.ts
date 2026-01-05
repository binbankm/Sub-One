import { TuicNode } from '../../shared/types';
import { safeDecodeURIComponent, parseStandardParams, generateId } from './helper';

/**
 * 解析 TUIC 链接
 * 格式: tuic://uuid:password@host:port?params#name
 */
export function parseTuic(url: string): TuicNode | null {
    try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        // TUIC 5.0 / 1.0 
        const userInfo = safeDecodeURIComponent(urlObj.username); // uuid:password
        const [uuid, password] = userInfo.split(':');

        const server = urlObj.hostname.replace(/^\[|\]$/g, '');
        const port = Number(urlObj.port);
        const name = safeDecodeURIComponent(urlObj.hash.slice(1)) || 'TUIC节点';

        if (!server || !port || !uuid) return null;

        const { tls } = parseStandardParams(params);
        tls.enabled = true; // TUIC 强制 TLS

        const congestionControl = params.get('congestion_control');
        const udpRelayMode = params.get('udp_relay_mode');

        const node: TuicNode = {
            type: 'tuic',
            id: generateId(),
            name,
            server,
            port,
            uuid,
            password: password || '', // TUIC v5 可能只需要 UUID
            congestionControl: congestionControl || undefined,
            udpRelayMode: udpRelayMode || 'native',
            udp: true,
            tls
        };

        return node;

    } catch (e) {
        console.error('解析 TUIC 链接失败:', e);
        return null;
    }
}

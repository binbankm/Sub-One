import { HysteriaNode } from '../../shared/types';
import { safeDecodeURIComponent, parseStandardParams, generateId } from './helper';

/**
 * 解析 Hysteria (v1) 链接
 * 格式: hysteria://host:port?params#name
 */
export function parseHysteria(url: string): HysteriaNode | null {
    try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        const server = urlObj.hostname.replace(/^\[|\]$/g, '');
        const port = Number(urlObj.port);
        const name = safeDecodeURIComponent(urlObj.hash.slice(1)) || 'Hysteria节点';

        if (!server || !port) return null;

        // Hy1 参数
        const protocol = params.get('protocol') || 'udp';
        const upMbps = Number(params.get('upmbps')) || 100;
        const downMbps = Number(params.get('downmbps')) || 100;
        const auth = params.get('auth');
        const obfs = params.get('obfs');
        const obfsParam = params.get('obfsParam');

        const { tls } = parseStandardParams(params);
        // Hy1 默认通常也是 TLS，或者是 disable_mtu_discovery 等特性
        // 这里主要看 protocol 是否是 wechat-video 等伪装
        tls.enabled = true; // Hy1 默认走 QUIC/TLS

        const node: HysteriaNode = {
            type: 'hysteria',
            id: generateId(),
            name,
            server,
            port,
            auth: auth || undefined,
            upMbps,
            downMbps,
            protocol,
            obfs: obfs || undefined,
            obfsParam: obfsParam || undefined,
            udp: true,
            tls
        };

        return node;

    } catch (e) {
        console.error('解析 Hysteria v1 链接失败:', e);
        return null;
    }
}

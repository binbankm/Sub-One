import { WireGuardNode } from '../../shared/types';
import { safeDecodeURIComponent, generateId } from './helper';

/**
 * 解析 WireGuard 链接
 * 格式: wireguard://privateKey@host:port?params#name
 */
export function parseWireGuard(url: string): WireGuardNode | null {
    try {
        const urlObj = new URL(url);
        const params = new URLSearchParams(urlObj.search);

        // Private Key 通常在 username 位置
        const privateKey = safeDecodeURIComponent(urlObj.username);
        const server = urlObj.hostname.replace(/^\[|\]$/g, '');
        const port = Number(urlObj.port);
        const name = safeDecodeURIComponent(urlObj.hash.slice(1)) || 'WG节点';

        if (!server || !port || !privateKey) return null;

        const publicKey = params.get('public-key') || params.get('peer-public-key');
        if (!publicKey) return null;

        const ip = params.get('ip') || params.get('address'); // Local IPv4
        const ipv6 = params.get('ipv6'); // Local IPv6
        const mtu = Number(params.get('mtu')) || 1420;
        const preSharedKey = params.get('preshared-key') || params.get('psk');

        const node: WireGuardNode = {
            type: 'wireguard',
            id: generateId(),
            name,
            server,
            port,
            privateKey,
            publicKey,
            preSharedKey: preSharedKey || undefined,
            ip: ip || undefined,
            ipv6: ipv6 || undefined,
            mtu,
            udp: true // WG 本身就是 UDP
        };

        return node;

    } catch (e) {
        console.error('解析 WireGuard 链接失败:', e);
        return null;
    }
}

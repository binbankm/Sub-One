import { TrojanNode } from '../types';
import { safeDecodeURIComponent, parseStandardParams } from './helper';

/**
 * 解析 Trojan 链接
 * 格式: trojan://password@host:port?params#name
 */
export function parseTrojan(url: string): TrojanNode | null {
    try {
        const urlObj = new URL(url);

        const password = safeDecodeURIComponent(urlObj.username);
        const server = urlObj.hostname.replace(/^\[|\]$/g, '');
        const port = Number(urlObj.port);
        const name = safeDecodeURIComponent(urlObj.hash.slice(1)) || 'Trojan节点';

        if (!server || !port || !password) return null;

        const params = new URLSearchParams(urlObj.search);

        // 利用 helper 解析 Transport (ws/grpc) 和 TLS (sni/alpn)
        const { transport, tls } = parseStandardParams(params);

        // Trojan 默认必须开启 TLS (除非 cleartext，但通常订阅链接里隐含 TLS)
        // 不过有些实现支持 trojan-go 的 websocket 非 tls？
        // 标准 Trojan 是 TLS 的。我们默认开启 TLS，除非用户显式关闭？
        // 这里我们默认认为 Trojan 协议意味着 TLS。
        tls.enabled = true;

        const node: TrojanNode = {
            type: 'trojan',
            id: crypto.randomUUID(),
            name,
            server,
            port,
            password,
            udp: true,
            transport,
            tls
        };

        return node;

    } catch (e) {
        console.error('解析 Trojan 链接失败:', e);
        return null;
    }
}

import { Hysteria2Node } from '../../shared/types';
import { safeDecodeURIComponent, parseStandardParams, generateId } from './helper';

/**
 * 解析 Hysteria 2 链接
 * 格式: hysteria2://password@host:port?params#name
 * 兼容: hy2://
 */
export function parseHysteria2(url: string): Hysteria2Node | null {
    try {
        // 统一协议前缀以方便解析
        const normalizedUrl = url.replace(/^hy2:\/\//, 'hysteria2://');
        if (!normalizedUrl.startsWith('hysteria2://')) return null;

        const urlObj = new URL(normalizedUrl);

        const password = safeDecodeURIComponent(urlObj.username);
        const server = urlObj.hostname.replace(/^\[|\]$/g, '');
        const port = Number(urlObj.port);
        const name = safeDecodeURIComponent(urlObj.hash.slice(1)) || 'Hysteria2节点';

        if (!server || !port) return null;

        const params = new URLSearchParams(urlObj.search);

        // Hysteria 2 复用了很多标准 TLS 参数 (SNI, ALPN, Insecure)
        // 但它通常不使用 Transport 参数 (如 ws, grpc)，它是基于 UDP 的
        const { tls } = parseStandardParams(params);

        // Hy2 强制 TLS (除了特殊配置), 这里的 params 解析出的 tls.enabled 取决于 url 是否显式带了 security=tls? 
        // 通常 Hy2 URI 不带 security 参数，但也隐含 TLS。我们手动强制开启。
        tls.enabled = true;

        // Obfs
        const obfsType = params.get('obfs');
        const obfsPassword = params.get('obfs-password');

        let obfs = undefined;
        if (obfsType && obfsType !== 'none') {
            obfs = {
                type: obfsType,
                password: obfsPassword || ''
            };
        }

        const node: Hysteria2Node = {
            type: 'hysteria2',
            id: generateId(),
            name,
            server,
            port,
            password,
            udp: true,
            tls,
            obfs
        };

        return node;

    } catch (e) {
        console.error('解析 Hysteria2 链接失败:', e);
        return null;
    }
}

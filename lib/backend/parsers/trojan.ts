import { TrojanNode } from '../../shared/types';
import { safeDecodeURIComponent, parseStandardParams, generateId } from './helper';

/**
 * 解析 Trojan 链接
 * 格式: trojan://password@host:port?params#name
 */
export function parseTrojan(url: string): TrojanNode | null {
    if (!url.startsWith('trojan://')) return null;

    try {
        let password = '';
        let server = '';
        let port = 0;
        let name = 'Trojan节点';
        let search = '';

        // 尝试使用标准 URL 解析
        try {
            const urlObj = new URL(url);
            password = safeDecodeURIComponent(urlObj.username);
            server = urlObj.hostname.replace(/^\[|\]$/g, '');
            port = Number(urlObj.port);
            name = safeDecodeURIComponent(urlObj.hash.slice(1)) || name;
            search = urlObj.search;
        } catch {
            // URL 构造失败，手动解析
            const hashIdx = url.indexOf('#');
            name = hashIdx !== -1 ? safeDecodeURIComponent(url.slice(hashIdx + 1)) : name;

            const main = hashIdx !== -1 ? url.slice(9, hashIdx) : url.slice(9);
            const atIdx = main.lastIndexOf('@');
            if (atIdx !== -1) {
                password = safeDecodeURIComponent(main.slice(0, atIdx));
                const serverPart = main.slice(atIdx + 1);
                const qIdx = serverPart.indexOf('?');
                search = qIdx !== -1 ? serverPart.slice(qIdx) : '';
                const hostPort = qIdx !== -1 ? serverPart.slice(0, qIdx) : serverPart;
                const colonIdx = hostPort.lastIndexOf(':');
                if (colonIdx !== -1) {
                    server = hostPort.slice(0, colonIdx).replace(/^\[|\]$/g, '');
                    port = parseInt(hostPort.slice(colonIdx + 1));
                } else {
                    server = hostPort.replace(/^\[|\]$/g, '');
                    port = 443;
                }
            }
        }

        if (!server || !port || !password) return null;

        const params = new URLSearchParams(search);
        const { transport, tls } = parseStandardParams(params);

        // Trojan 默认启用 TLS
        tls.enabled = true;

        return {
            type: 'trojan',
            id: generateId(),
            name,
            server,
            port,
            password,
            udp: true,
            transport,
            tls
        };

    } catch (e) {
        return null;
    }
}

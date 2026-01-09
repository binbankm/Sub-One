import { Socks5Node } from '../../shared/types';
import { safeDecodeURIComponent, generateId } from './helper';
import { decodeBase64 } from '../converter/base64';

/**
 * 解析 Socks5 链接
 * 格式: socks5://user:pass@host:port#name 或 socks5://base64(...)
 */
export function parseSocks5(url: string): Socks5Node | null {
    let trimmedUrl = url.trim();
    if (!trimmedUrl.startsWith('socks5://')) return null;

    try {
        const hashIndex = trimmedUrl.indexOf('#');
        const hash = hashIndex !== -1 ? trimmedUrl.slice(hashIndex + 1) : '';
        const name = safeDecodeURIComponent(hash) || 'Socks5节点';

        // 截取 url 主体部分
        let mainPart = trimmedUrl.slice(9); // remove socks5://
        if (hashIndex !== -1) {
            mainPart = trimmedUrl.slice(9, hashIndex);
        }

        // 如果包含 ?，说明可能有参数（虽然标准 SOCKS5 URI 比较少见，但为了健壮性）
        const qIdx = mainPart.indexOf('?');
        if (qIdx !== -1) {
            mainPart = mainPart.slice(0, qIdx);
            // 这里可以解析 query 参数作为 tls 等扩展，目前暂时忽略
        }

        let username = '';
        let password = '';
        let server = '';
        let port = 0;

        // 尝试 Base64 解码 (socks5://base64(...)#remark)
        // 启发式：如果不包含 @ 且不包含 :（或者只有一个 : 且看起来像 base64），尝试解码
        if (!mainPart.includes('@') && !mainPart.includes(':')) {
            try {
                const decoded = decodeBase64(mainPart);
                // 解码后如果包含 :，则认为是有效的解码内容
                if (decoded && decoded.includes(':')) {
                    mainPart = decoded;
                }
            } catch { }
        }

        // 解析 server:port 或 user:pass@server:port
        const atIndex = mainPart.lastIndexOf('@');
        if (atIndex !== -1) {
            // 有认证信息
            const userPass = mainPart.slice(0, atIndex);
            const hostPort = mainPart.slice(atIndex + 1);

            const colonIndex = userPass.indexOf(':');
            if (colonIndex !== -1) {
                username = userPass.slice(0, colonIndex);
                password = userPass.slice(colonIndex + 1);
            } else {
                username = userPass;
            }

            // 处理 host:port
            const portIndex = hostPort.lastIndexOf(':');
            if (portIndex !== -1) {
                server = hostPort.slice(0, portIndex);
                port = parseInt(hostPort.slice(portIndex + 1), 10);
            } else {
                server = hostPort;
                port = 1080; // 默认端口
            }
        } else {
            // 无认证信息 host:port
            const portIndex = mainPart.lastIndexOf(':');
            if (portIndex !== -1) {
                server = mainPart.slice(0, portIndex);
                port = parseInt(mainPart.slice(portIndex + 1), 10);
            } else {
                server = mainPart;
                port = 1080;
            }
        }

        // 移除 IPv6 可能的方括号
        server = server.replace(/^\[|\]$/g, '');

        if (!server || isNaN(port) || port <= 0) return null;

        const node: Socks5Node = {
            type: 'socks5',
            id: generateId(),
            name,
            server,
            port,
            udp: true // SOCKS5 协议通常支持 UDP
        };

        if (username) node.username = safeDecodeURIComponent(username);
        if (password) node.password = safeDecodeURIComponent(password);

        return node;

    } catch (e) {
        return null; // 解析失败
    }
}

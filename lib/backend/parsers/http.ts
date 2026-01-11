import { HttpNode } from '../../shared/types';
import { safeDecodeURIComponent, generateId } from './helper';

/**
 * 解析 HTTP/HTTPS 代理链接
 * 格式: http://user:pass@host:port#name 或 https://user:pass@host:port#name
 */
export function parseHttp(url: string): HttpNode | null {
    let trimmedUrl = url.trim();
    const isHttps = trimmedUrl.startsWith('https://');

    if (!trimmedUrl.startsWith('http://') && !isHttps) return null;

    try {
        const hashIndex = trimmedUrl.indexOf('#');
        const hash = hashIndex !== -1 ? trimmedUrl.slice(hashIndex + 1) : '';
        const name = safeDecodeURIComponent(hash) || (isHttps ? 'HTTPS节点' : 'HTTP节点');

        // 截取 url 主体部分 (host:port or user:pass@host:port)
        const protocolLength = isHttps ? 8 : 7;
        let mainPart = trimmedUrl.slice(protocolLength);

        if (hashIndex !== -1) {
            mainPart = trimmedUrl.slice(protocolLength, hashIndex);
        }

        // 处理 query parameters (虽然 HTTP proxy 链接标准没有，但兼容性考虑)
        const qIdx = mainPart.indexOf('?');
        if (qIdx !== -1) {
            mainPart = mainPart.slice(0, qIdx);
        }

        let username = '';
        let password = '';
        let server = '';
        let port = 0;

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
                port = isHttps ? 443 : 80;
            }
        } else {
            // 无认证信息 host:port
            const portIndex = mainPart.lastIndexOf(':');
            if (portIndex !== -1) {
                server = mainPart.slice(0, portIndex);
                port = parseInt(mainPart.slice(portIndex + 1), 10);
            } else {
                server = mainPart;
                port = isHttps ? 443 : 80;
            }
        }

        // 移除 IPv6 可能的方括号
        server = server.replace(/^\[|\]$/g, '');

        if (!server || isNaN(port) || port <= 0) return null;

        // 严格检查 server 格式，防止将 URL (如规则订阅 https://...) 误识别为节点
        // Rule lists typically contain '/', ',', or 'policy='
        if (server.includes('/') || server.includes(',') || server.includes(' ') || server.includes('\\')) {
            return null;
        }

        // 额外的安全性检查：排除常见的规则文件后缀和域名特征
        // 防止某些极其特殊的情况下（如 URL 无参数且端口解析错误）误判
        const lowerServer = server.toLowerCase();
        if (lowerServer.includes('.list') || lowerServer.includes('.txt') || lowerServer.includes('.yaml') || lowerServer.includes('.yml') || lowerServer.includes('.conf')) {
            return null;
        }
        if (lowerServer.includes('raw.githubusercontent.com') || lowerServer.includes('gist.githubusercontent.com')) {
            return null;
        }

        const node: HttpNode = {
            type: 'http',
            id: generateId(),
            name,
            server,
            port,
            udp: false, // HTTP 代理通常不支持 UDP
            url: trimmedUrl // 保留原始链接
        };

        if (username) node.username = safeDecodeURIComponent(username);
        if (password) node.password = safeDecodeURIComponent(password);

        if (isHttps) {
            node.tls = {
                enabled: true
            };
        }

        return node;

    } catch (e) {
        return null; // 解析失败
    }
}

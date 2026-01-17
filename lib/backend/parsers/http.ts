import { HttpNode } from '../../shared/types';
import { safeDecodeURIComponent, generateId } from './helper';
import { Base64 } from 'js-base64';

/**
 * 解析 HTTP/HTTPS 链接
 * 格式: http://user:pass@host:port#name
 * 格式: https://user:pass@host:port#name
 */
export function parseHttp(url: string): HttpNode | null {
    let trimmedUrl = url.trim();
    let isHttps = false;

    if (trimmedUrl.startsWith('https://')) {
        isHttps = true;
    } else if (!trimmedUrl.startsWith('http://')) {
        return null;
    }

    try {
        const hashIndex = trimmedUrl.indexOf('#');
        const hash = hashIndex !== -1 ? trimmedUrl.slice(hashIndex + 1) : '';
        const name = safeDecodeURIComponent(hash) || (isHttps ? 'HTTPS节点' : 'HTTP节点');

        // 截取 url 主体部分
        const prefixLength = isHttps ? 8 : 7;
        let mainPart = trimmedUrl.slice(prefixLength);
        if (hashIndex !== -1) {
            mainPart = trimmedUrl.slice(prefixLength, hashIndex);
        }

        let username = '';
        let password = '';
        let server = '';
        let port = 0;

        // 尝试 Base64 解码 (http://base64(...)#remark)
        if (!mainPart.includes('@') && !mainPart.includes(':')) {
            try {
                const decoded = Base64.decode(mainPart);
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

        const node: HttpNode = {
            type: isHttps ? 'https' : 'http',
            id: generateId(),
            name,
            server,
            port,
            udp: false, // HTTP 代理通常不支持 UDP
            url: trimmedUrl
        };

        if (username) node.username = safeDecodeURIComponent(username);
        if (password) node.password = safeDecodeURIComponent(password);

        if (isHttps) {
            node.tls = { enabled: true };
        }

        return node;

    } catch (e) {
        console.error('[HTTP] 解析失败:', e instanceof Error ? e.message : e);
        return null;
    }
}

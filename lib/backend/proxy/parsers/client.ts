/**
 * Client Format Parsers (Surge, Loon, QX)
 * 参考 Sub-Store: peggy/surge.js, peggy/loon.js, peggy/qx.js
 */

import { Parser, Proxy } from '../types';

/**
 * Surge Line Parser
 * Format: Name = type, server, port, cipher, password, ...
 */
export function Surge_Line(): Parser {
    return {
        name: 'Surge Line Parser',
        test: (line: string) => /^\s*?.*?\s*?=\s*?(ss|vmess|trojan|snell|http|socks5|wireguard|hysteria2),/i.test(line),
        parse: (line: string) => {
            const [namePart, ...rest] = line.split('=');
            const name = namePart.trim();
            const config = rest.join('=').trim();
            const parts = config.split(',').map(p => p.trim());
            const type = parts[0].toLowerCase();

            const proxy: any = {
                name,
                type,
                server: parts[1],
                port: parseInt(parts[2], 10),
            };

            // Parse additional parameters
            for (let i = 3; i < parts.length; i++) {
                const part = parts[i];
                if (part.includes('=')) {
                    const [key, val] = part.split('=').map(s => s.trim().replace(/^"|"$/g, ''));
                    mapSurgeParam(proxy, key, val);
                } else if (i === 3 && type === 'ss') {
                    proxy.cipher = parts[3];
                } else if (i === 4 && type === 'ss') {
                    proxy.password = parts[4].replace(/^"|"$/g, '');
                }
            }
            return proxy as Proxy;
        }
    };
}

function mapSurgeParam(proxy: any, key: string, val: string) {
    switch (key) {
        case 'psk':
        case 'password': proxy.password = val; break;
        case 'username': proxy.uuid = val; proxy.username = val; break;
        case 'sni': proxy.sni = val; break;
        case 'skip-cert-verify': proxy['skip-cert-verify'] = val === 'true'; break;
        case 'tfo': proxy.tfo = val === 'true'; break;
        case 'udp-relay': proxy.udp = val === 'true'; break;
        case 'ws': if (val === 'true') proxy.network = 'ws'; break;
        case 'ws-path':
            proxy.network = 'ws';
            proxy['ws-opts'] = { ...proxy['ws-opts'], path: val };
            break;
    }
}

/**
 * QX Line Parser
 * Format: type=server:port, method=cipher, password=pass, tag=Name
 */
export function QX_Line(): Parser {
    return {
        name: 'QX Line Parser',
        test: (line: string) => /^(shadowsocks|vmess|trojan|http|socks5|shadowsocksr)=/i.test(line),
        parse: (line: string) => {
            const parts = line.split(',').map(p => p.trim());
            const firstPart = parts[0];
            const [typeStr, serverPort] = firstPart.split('=');
            const [server, port] = serverPort.split(':');

            let type = typeStr.toLowerCase();
            if (type === 'shadowsocks') type = 'ss';
            if (type === 'shadowsocksr') type = 'ssr';

            const proxy: any = {
                type,
                server,
                port: parseInt(port, 10),
            };

            parts.forEach(part => {
                const [key, val] = part.split('=').map(s => s.trim().replace(/^"|"$/g, ''));
                if (key === 'tag') proxy.name = val;
                if (key === 'method') proxy.cipher = val;
                if (key === 'password') proxy.password = val;
                if (key === 'fast-open') proxy.tfo = val === 'true';
                if (key === 'udp-relay') proxy.udp = val === 'true';
            });

            return proxy as Proxy;
        }
    };
}

/**
 * Loon Line Parser
 * Format: Name = type, server, port, cipher, "password", ...
 */
export function Loon_Line(): Parser {
    return {
        name: 'Loon Line Parser',
        test: (line: string) => /^\s*?.*?\s*?=\s*?(ss|vmess|trojan|http|socks5|wireguard|hysteria2),/i.test(line) && !line.includes('section-name='),
        parse: (line: string) => {
            const [namePart, ...rest] = line.split('=');
            const name = namePart.trim();
            const config = rest.join('=').trim();
            const parts = config.split(',').map(p => p.trim());
            const type = parts[0].toLowerCase();

            const proxy: any = {
                name,
                type,
                server: parts[1],
                port: parseInt(parts[2], 10),
            };

            // Loon 的参数处理 (注意: Hysteria2 在 Loon 里首字母大写)
            parts.forEach((part, index) => {
                if (part.includes('=')) {
                    const [key, val] = part.split('=').map(s => s.trim().replace(/^"|"$/g, ''));
                    mapLoonParam(proxy, key, val);
                } else if (index === 3) {
                    if (type === 'ss' || type === 'vmess') proxy.cipher = part;
                } else if (index === 4) {
                    if (['ss', 'trojan', 'vmess', 'hysteria2'].includes(type)) {
                        proxy.password = part.replace(/^"|"$/g, '');
                        if (type === 'vmess') proxy.uuid = proxy.password;
                    }
                }
            });

            return proxy as Proxy;
        }
    };
}

function mapLoonParam(proxy: any, key: string, val: string) {
    switch (key.toLowerCase()) {
        case 'psk':
        case 'password': proxy.password = val; break;
        case 'uuid': proxy.uuid = val; break;
        case 'sni':
        case 'tls-name': proxy.sni = val; break;
        case 'skip-cert-verify': proxy['skip-cert-verify'] = val === 'true'; break;
        case 'fast-open': proxy.tfo = val === 'true'; break;
        case 'udp': proxy.udp = val === 'true'; break;
        case 'transport': proxy.network = val; break;
        case 'path':
            if (!proxy['ws-opts']) proxy['ws-opts'] = {};
            proxy['ws-opts'].path = val;
            break;
        case 'host':
            if (!proxy['ws-opts']) proxy['ws-opts'] = {};
            proxy['ws-opts'].headers = { Host: val };
            break;
    }
}

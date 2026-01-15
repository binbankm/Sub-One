/**
 * WireGuard URI Parser
 * 参考 Sub-Store: URI_WireGuard
 *
 * 格式: wireguard://privatekey@server:port?params#name
 * 别名: wg://
 */

import { Parser, Proxy } from '../types';
import { safeDecode, parseQueryParams } from '../utils';

export function URI_WireGuard(): Parser {
    const name = 'URI WireGuard Parser';

    const test = (line: string): boolean => {
        return /^(wireguard|wg):\/\//.test(line);
    };

    const parse = (line: string): Proxy => {
        // 标准化协议头
        let content = line.replace(/^wg:\/\//, 'wireguard://');
        content = content.split('wireguard://')[1];

        // 解析: privatekey@server:port?params#name
        const parsed = /^(.*?)@(.*?):(\d+)\/?(\\?(.*?))?(?:#(.*?))?$/.exec(content);

        if (!parsed) {
            throw new Error(`Invalid WireGuard URI: ${line}`);
        }

        const privateKey = safeDecode(parsed[1]);
        const server = parsed[2];
        const port = parseInt(parsed[3], 10);
        const queryStr = parsed[5] || '';
        let nodeName = parsed[6];

        if (nodeName) {
            nodeName = safeDecode(nodeName);
        }

        const params = parseQueryParams(queryStr);

        const proxy: Proxy = {
            type: 'wireguard',
            name: nodeName || `WireGuard ${server}:${port}`,
            server,
            port,
            'private-key': privateKey,
        };

        // Public key
        if (params.publickey || params.pubkey) {
            proxy['public-key'] = params.publickey || params.pubkey;
        }

        // Pre-shared key
        if (params.presharedkey) {
            proxy['pre-shared-key'] = params.presharedkey;
        }

        // Local address (IP)
        if (params.address || params.ip) {
            const addresses = (params.address || params.ip)?.split(',') || [];
            for (const addr of addresses) {
                const trimmed = addr.trim();
                if (trimmed.includes(':')) {
                    // IPv6
                    proxy.ipv6 = trimmed.replace(/\/\d+$/, '');
                } else {
                    // IPv4
                    proxy.ip = trimmed.replace(/\/\d+$/, '');
                }
            }
        }

        // MTU
        if (params.mtu) {
            proxy.mtu = parseInt(params.mtu, 10);
        }

        // Reserved
        if (params.reserved) {
            const reservedParts = params.reserved.split(',').map((v: string) => parseInt(v.trim(), 10));
            proxy.reserved = reservedParts;
        }

        // UDP
        if (/(TRUE)|1/i.test(params.udp || '')) {
            proxy.udp = true;
        }

        // Keepalive
        if (params.keepalive) {
            proxy.keepalive = parseInt(params.keepalive, 10);
        }

        return proxy;
    };

    return { name, test, parse };
}

export default URI_WireGuard;

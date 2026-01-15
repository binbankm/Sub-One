/**
 * AnyTLS URI Parser
 *
 * 格式: anytls://password@server:port?params#name
 */

import { Parser, Proxy } from '../types';
import { safeDecode, parseQueryParams, parseBool } from '../utils';

export function URI_AnyTLS(): Parser {
    const name = 'URI AnyTLS Parser';

    const test = (line: string): boolean => {
        return /^anytls:\/\//.test(line);
    };

    const parse = (line: string): Proxy => {
        const content = line.split('anytls://')[1];

        // 解析: password@server:port?params#name
        const parsed = /^(.*?)@(.*?):(\d+)\/?(\\?(.*?))?(?:#(.*?))?$/.exec(content);

        if (!parsed) {
            throw new Error(`Invalid AnyTLS URI: ${line}`);
        }

        const password = safeDecode(parsed[1]);
        const server = parsed[2];
        const port = parseInt(parsed[3], 10);
        const queryStr = parsed[5] || '';
        let nodeName = parsed[6];

        if (nodeName) {
            nodeName = safeDecode(nodeName);
        }

        const params = parseQueryParams(queryStr);

        const proxy: Proxy = {
            type: 'anytls',
            name: nodeName || `AnyTLS ${server}:${port}`,
            server,
            port,
            password,
            tls: true,  // AnyTLS 默认启用 TLS
        };

        // SNI
        if (params.sni) {
            proxy.sni = params.sni;
        }

        // 跳过证书验证
        if (parseBool(params.insecure) || parseBool(params.allowInsecure)) {
            proxy['skip-cert-verify'] = true;
        }

        // ALPN
        if (params.alpn) {
            proxy.alpn = params.alpn.split(',');
        }

        // Client fingerprint
        if (params.fp) {
            proxy['client-fingerprint'] = params.fp;
        }

        // Idle timeout
        if (params.idle_timeout) {
            proxy['idle-timeout'] = parseInt(params.idle_timeout, 10);
        }

        // UDP
        if (/(TRUE)|1/i.test(params.udp || '')) {
            proxy.udp = true;
        }

        return proxy;
    };

    return { name, test, parse };
}

export default URI_AnyTLS;

/**
 * Hysteria (v1) URI Parser
 * 参考 Sub-Store: URI_Hysteria
 *
 * 格式: hysteria://server:port?params#name
 */

import { Parser, Proxy } from '../types';
import { safeDecode, parseQueryParams, parseBool } from '../utils';

export function URI_Hysteria(): Parser {
    const name = 'URI Hysteria Parser';

    const test = (line: string): boolean => {
        return /^(hysteria|hy1):\/\//.test(line) && !/^(hysteria2|hy2):\/\//.test(line);
    };

    const parse = (line: string): Proxy => {
        // 标准化协议头
        let content = line.replace(/^hy1:\/\//, 'hysteria://');
        content = content.split('hysteria://')[1];

        // 解析: server:port?params#name
        const parsed = /^(.*?):(\d+)\/?(\\?(.*?))?(?:#(.*?))?$/.exec(content);

        if (!parsed) {
            throw new Error(`Invalid Hysteria URI: ${line}`);
        }

        const server = parsed[1];
        const port = parseInt(parsed[2], 10);
        const queryStr = parsed[4] || '';
        let nodeName = parsed[5];

        if (nodeName) {
            nodeName = safeDecode(nodeName);
        }

        const params = parseQueryParams(queryStr);

        const proxy: Proxy = {
            type: 'hysteria',
            name: nodeName || `Hysteria ${server}:${port}`,
            server,
            port,
            tls: true,  // Hysteria 默认启用 TLS
        };

        // Auth
        if (params.auth) {
            proxy['auth-str'] = params.auth;
        }

        // 上下行速率
        if (params.upmbps) {
            proxy.up = params.upmbps;
        }
        if (params.downmbps) {
            proxy.down = params.downmbps;
        }

        // SNI (peer)
        if (params.peer) {
            proxy.sni = params.peer;
        }

        // 跳过证书验证
        if (parseBool(params.insecure) || parseBool(params.allowInsecure)) {
            proxy['skip-cert-verify'] = true;
        }

        // ALPN
        if (params.alpn) {
            proxy.alpn = [params.alpn];
        }

        // 混淆
        if (params.obfs) {
            proxy['_obfs' as keyof Proxy] = params.obfs as unknown;
        }
        if (params.obfsParam) {
            proxy.obfs = params.obfsParam;
        }

        // 端口跳跃
        if (params.mport) {
            proxy.ports = params.mport;
        }

        // TCP Fast Open
        if (/(TRUE)|1/i.test(params.fastopen || '')) {
            proxy.tfo = true;
        }

        // 协议
        if (params.protocol) {
            proxy.protocol = params.protocol;
        }

        return proxy;
    };

    return { name, test, parse };
}

export default URI_Hysteria;

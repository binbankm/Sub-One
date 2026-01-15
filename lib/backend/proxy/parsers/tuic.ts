/**
 * TUIC URI Parser
 * 参考 Sub-Store: URI_TUIC
 *
 * 格式: tuic://uuid:password@server:port?params#name
 */

import { Parser, Proxy } from '../types';
import { safeDecode, parseQueryParams, parseBool } from '../utils';

export function URI_TUIC(): Parser {
    const name = 'URI TUIC Parser';

    const test = (line: string): boolean => {
        return /^tuic:\/\//.test(line);
    };

    const parse = (line: string): Proxy => {
        const content = line.split('tuic://')[1];

        // 解析: uuid:password@server:port?params#name
        const parsed = /^(.*?):(.*?)@(.*?):(\d+)\/?(\\?(.*?))?(?:#(.*?))?$/.exec(content);

        if (!parsed) {
            throw new Error(`Invalid TUIC URI: ${line}`);
        }

        const uuid = safeDecode(parsed[1]);
        const password = safeDecode(parsed[2]);
        const server = parsed[3];
        const port = parseInt(parsed[4], 10);
        const queryStr = parsed[6] || '';
        let nodeName = parsed[7];

        if (nodeName) {
            nodeName = safeDecode(nodeName);
        }

        const params = parseQueryParams(queryStr);

        const proxy: Proxy = {
            type: 'tuic',
            name: nodeName || `TUIC ${server}:${port}`,
            server,
            port,
            uuid,
            password,
            version: params.version ? parseInt(params.version, 10) : 5,
            tls: true,  // TUIC 默认启用 TLS
        };

        // SNI
        if (params.sni) {
            proxy.sni = params.sni;
        }

        // 跳过证书验证
        if (parseBool(params.allow_insecure) || parseBool(params.allowInsecure) || parseBool(params.insecure)) {
            proxy['skip-cert-verify'] = true;
        }

        // ALPN
        if (params.alpn) {
            proxy.alpn = [params.alpn];
        }

        // 拥塞控制
        if (params.congestion_control || params.congestion) {
            proxy['congestion-controller'] = params.congestion_control || params.congestion;
        }

        // UDP 中继模式
        if (params.udp_relay_mode) {
            proxy['udp-relay-mode'] = params.udp_relay_mode;
        }

        // 禁用 SNI
        if (parseBool(params.disable_sni)) {
            proxy['disable-sni'] = true;
        }

        // 减少 RTT
        if (parseBool(params.reduce_rtt)) {
            proxy['reduce-rtt'] = true;
        }

        // TCP Fast Open
        if (parseBool(params.fast_open)) {
            proxy.tfo = true;
        }

        return proxy;
    };

    return { name, test, parse };
}

export default URI_TUIC;

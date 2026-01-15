/**
 * Trojan URI Parser
 * 参考 Sub-Store: URI_Trojan
 *
 * 格式: trojan://password@server:port?params#name
 */

import { Parser, Proxy } from '../types';
import { safeDecode, parseQueryParams, parseBool } from '../utils';

export function URI_Trojan(): Parser {
    const name = 'URI Trojan Parser';

    const test = (line: string): boolean => {
        return /^trojan:\/\//.test(line);
    };

    const parse = (line: string): Proxy => {
        const content = line.split('trojan://')[1];

        // 解析: password@server:port?params#name
        const parsed = /^(.*?)@(.*?):(\d+)\/?(\\?(.*?))?(?:#(.*?))?$/.exec(content);

        if (!parsed) {
            throw new Error(`Invalid Trojan URI: ${line}`);
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
            type: 'trojan',
            name: nodeName || `Trojan ${server}:${port}`,
            server,
            port,
            password,
            tls: true,  // Trojan 默认启用 TLS
        };

        // SNI
        proxy.sni = params.sni || params.peer || server;

        // Skip cert verify
        if (parseBool(params.allowInsecure) || parseBool(params.insecure)) {
            proxy['skip-cert-verify'] = true;
        }

        // ALPN
        if (params.alpn) {
            proxy.alpn = params.alpn.split(',');
        }

        // Client fingerprint
        proxy['client-fingerprint'] = params.fp;

        // 传输层
        let httpupgrade = false;
        if (params.type) {
            proxy.network = params.type as Proxy['network'];

            if (proxy.network === ('httpupgrade' as Proxy['network'])) {
                proxy.network = 'ws';
                httpupgrade = true;
            }

            // 传输层配置
            if (proxy.network && proxy.network !== ('tcp' as Proxy['network'])) {
                const opts: Record<string, unknown> = {};

                if (params.path) {
                    opts.path = safeDecode(params.path);
                }
                if (params.host) {
                    opts.headers = { Host: safeDecode(params.host) };
                }
                if (params.serviceName) {
                    opts[`${proxy.network}-service-name`] = params.serviceName;
                }

                if (proxy.network === 'grpc') {
                    if (params.mode) {
                        opts['_grpc-type'] = params.mode;
                    }
                    if (params.authority) {
                        opts['_grpc-authority'] = params.authority;
                    }
                }

                if (httpupgrade) {
                    opts['v2ray-http-upgrade'] = true;
                    opts['v2ray-http-upgrade-fast-open'] = true;
                }

                const optsKey = `${proxy.network}-opts` as keyof Proxy;
                (proxy as Record<string, unknown>)[optsKey] = opts;
            }
        }

        // Reality
        if (params.security === 'reality') {
            const opts: Proxy['reality-opts'] = {
                'public-key': params.pbk || '',
            };
            if (params.sid) {
                opts['short-id'] = params.sid;
            }
            if (params.spx) {
                opts['_spider-x'] = params.spx;
            }
            proxy['reality-opts'] = opts;

            if (params.mode) {
                proxy._mode = params.mode;
            }
            if (params.extra) {
                proxy._extra = params.extra;
            }
        }

        return proxy;
    };

    return { name, test, parse };
}

export default URI_Trojan;

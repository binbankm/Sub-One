/**
 * VLESS URI Parser
 * 参考 Sub-Store: URI_VLESS
 *
 * 格式: vless://uuid@server:port?params#name
 */

import { Parser, Proxy } from '../types';
import { Base64 } from 'js-base64';
import { safeDecode, parseQueryParams, parseBool } from '../utils';

export function URI_VLESS(): Parser {
    const name = 'URI VLESS Parser';

    const test = (line: string): boolean => {
        return /^vless:\/\//.test(line);
    };

    const parse = (line: string): Proxy => {
        let content = line.split('vless://')[1];
        let isShadowrocket = false;

        // 尝试标准格式
        let parsed = /^(.*?)@(.*?):(\d+)\/?(\\?(.*?))?(?:#(.*?))?$/.exec(content);

        if (!parsed) {
            // Shadowrocket 格式: BASE64(...)@server:port?params#name
            const match = /^(.*?)(\?.*?$)/.exec(content);
            if (match) {
                const decoded = Base64.decode(match[1]);
                content = `${decoded}${match[2]}`;
                parsed = /^(.*?)@(.*?):(\d+)\/?(\\?(.*?))?(?:#(.*?))?$/.exec(content);
                isShadowrocket = true;
            }
        }

        if (!parsed) {
            throw new Error(`Invalid VLESS URI: ${line}`);
        }

        let uuid = parsed[1];
        const server = parsed[2];
        let port = parseInt(parsed[3], 10);
        const addons = parsed[5] || '';
        let nodeName = parsed[6];

        if (isShadowrocket) {
            uuid = uuid.replace(/^.*?:/g, '');
        }

        uuid = safeDecode(uuid);
        if (nodeName) {
            nodeName = safeDecode(nodeName);
        }

        const proxy: Proxy = {
            type: 'vless',
            name: '',
            server,
            port,
            uuid,
        };

        // 解析查询参数
        const params = parseQueryParams(addons);

        proxy.name = nodeName || params.remarks || params.remark || `VLESS ${server}:${port}`;

        // TLS
        proxy.tls = params.security ? params.security !== 'none' : false;
        if (isShadowrocket && /TRUE|1/i.test(params.tls || '')) {
            proxy.tls = true;
            params.security = params.security || 'reality';
        }

        proxy.sni = params.sni || params.peer;
        proxy.flow = params.flow;

        // Shadowrocket XTLS
        if (!proxy.flow && isShadowrocket && params.xtls) {
            const flowMap: Record<string, string> = {
                '1': 'xtls-rprx-direct',
                '2': 'xtls-rprx-vision',
            };
            if (flowMap[params.xtls]) {
                proxy.flow = flowMap[params.xtls];
            }
        }

        proxy['client-fingerprint'] = params.fp;
        if (params.alpn) {
            proxy.alpn = params.alpn.split(',');
        }
        proxy['skip-cert-verify'] = parseBool(params.allowInsecure) || parseBool(params.insecure);

        // Reality 配置
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
        }

        // 传输层
        let httpupgrade = false;
        proxy.network = params.type as Proxy['network'];

        if (proxy.network === 'tcp' && params.headerType === 'http') {
            proxy.network = 'http';
        } else if (proxy.network === ('httpupgrade' as Proxy['network'])) {
            proxy.network = 'ws';
            httpupgrade = true;
        }

        // Shadowrocket obfs
        if (!proxy.network && isShadowrocket && params.obfs) {
            proxy.network = params.obfs as Proxy['network'];
            if (proxy.network === ('none' as Proxy['network'])) {
                proxy.network = 'tcp' as Proxy['network'];
            }
        }

        if (proxy.network === ('websocket' as Proxy['network'])) {
            proxy.network = 'ws';
        }

        // 传输层选项
        if (proxy.network && !['tcp', 'none'].includes(proxy.network)) {
            const opts: Record<string, unknown> = {};
            const host = params.host || params.obfsParam;

            if (host) {
                if (params.obfsParam) {
                    try {
                        opts.headers = JSON.parse(host);
                    } catch {
                        opts.headers = { Host: host };
                    }
                } else {
                    opts.headers = { Host: host };
                }
            }

            if (params.serviceName) {
                opts[`${proxy.network}-service-name`] = params.serviceName;
                if (proxy.network === 'grpc' && params.authority) {
                    opts['_grpc-authority'] = params.authority;
                }
            } else if (isShadowrocket && params.path) {
                if (['ws', 'http', 'h2'].includes(proxy.network)) {
                    opts.path = safeDecode(params.path);
                } else {
                    opts[`${proxy.network}-service-name`] = safeDecode(params.path);
                }
            }

            if (params.path && ['ws', 'http', 'h2'].includes(proxy.network)) {
                opts.path = safeDecode(params.path);
            }

            if (httpupgrade) {
                opts['v2ray-http-upgrade'] = true;
                opts['v2ray-http-upgrade-fast-open'] = true;
            }

            const optsKey = `${proxy.network}-opts` as keyof Proxy;
            (proxy as Record<string, unknown>)[optsKey] = opts;
        }

        // gRPC mode
        if (proxy.network === 'grpc' && params.mode) {
            if (!proxy['grpc-opts']) {
                proxy['grpc-opts'] = {};
            }
            proxy['grpc-opts']['_grpc-type'] = params.mode;
        }

        return proxy;
    };

    return { name, test, parse };
}

export default URI_VLESS;

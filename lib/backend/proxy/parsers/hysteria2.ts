/**
 * Hysteria2 URI Parser
 * 参考 Sub-Store: URI_Hysteria2
 *
 * 格式: hysteria2://password@server:port?params#name
 * 别名: hy2://
 */

import { Parser, Proxy } from '../types';
import { safeDecode, parseQueryParams, parseBool } from '../utils';

export function URI_Hysteria2(): Parser {
    const name = 'URI Hysteria2 Parser';

    const test = (line: string): boolean => {
        return /^(hysteria2|hy2):\/\//.test(line);
    };

    const parse = (line: string): Proxy => {
        // 标准化协议头
        let content = line.replace(/^hy2:\/\//, 'hysteria2://');
        content = content.split('hysteria2://')[1];

        // 解析: password@server:port?params#name
        const parsed = /^(.*?)@(.*?):(\d+)\/?(\\?(.*?))?(?:#(.*?))?$/.exec(content);

        if (!parsed) {
            throw new Error(`Invalid Hysteria2 URI: ${line}`);
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
            type: 'hysteria2',
            name: nodeName || `Hysteria2 ${server}:${port}`,
            server,
            port,
            password,
            tls: true,  // Hysteria2 默认启用 TLS
        };

        // SNI
        if (params.sni) {
            proxy.sni = params.sni;
        }

        // 跳过证书验证
        if (parseBool(params.insecure) || parseBool(params.allowInsecure)) {
            proxy['skip-cert-verify'] = true;
        }

        // 混淆
        if (params.obfs) {
            proxy.obfs = params.obfs;
            if (params['obfs-password']) {
                proxy['obfs-password'] = params['obfs-password'];
            }
        }

        // 端口跳跃
        if (params.mport) {
            proxy.ports = params.mport;
        }

        // TLS 指纹
        if (params.pinSHA256) {
            proxy['tls-fingerprint'] = params.pinSHA256;
        }

        // 跳跃间隔
        if (params['hop-interval']) {
            proxy['hop-interval' as keyof Proxy] = params['hop-interval'] as unknown;
        }

        // 保活
        if (params.keepalive) {
            proxy['keepalive' as keyof Proxy] = params.keepalive as unknown;
        }

        // TCP Fast Open
        if (/(TRUE)|1/i.test(params.fastopen || '')) {
            proxy.tfo = true;
        }

        return proxy;
    };

    return { name, test, parse };
}

export default URI_Hysteria2;

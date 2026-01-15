/**
 * ShadowsocksR URI Parser
 * 参考 Sub-Store: URI_SSR
 *
 * 格式: ssr://BASE64(server:port:protocol:method:obfs:password_base64/?params)
 */

import { Parser, Proxy } from '../types';
import { Base64 } from 'js-base64';
import { getIfNotBlank } from '../utils';

export function URI_SSR(): Parser {
    const name = 'URI SSR Parser';

    const test = (line: string): boolean => {
        return /^ssr:\/\//.test(line);
    };

    const parse = (line: string): Proxy => {
        let content = Base64.decode(line.split('ssr://')[1]);

        // 处理 IPv6 和 IPv4 格式
        let splitIdx = content.indexOf(':origin');
        if (splitIdx === -1) {
            splitIdx = content.indexOf(':auth_');
        }

        const serverAndPort = content.substring(0, splitIdx);
        const server = serverAndPort.substring(0, serverAndPort.lastIndexOf(':'));
        const port = parseInt(serverAndPort.substring(serverAndPort.lastIndexOf(':') + 1), 10);

        const params = content.substring(splitIdx + 1).split('/?')[0].split(':');

        const proxy: Proxy = {
            type: 'ssr',
            name: '',
            server,
            port,
            protocol: params[0],
            cipher: params[1],
            obfs: params[2],
            password: Base64.decode(params[3]),
        };

        // 解析额外参数
        const otherParams: Record<string, string> = {};
        const queryPart = content.split('/?')[1];

        if (queryPart) {
            const queryItems = queryPart.split('&');
            for (const item of queryItems) {
                const [key, val] = item.split('=');
                const trimmedVal = (val || '').trim();
                if (trimmedVal.length > 0 && trimmedVal !== '(null)') {
                    otherParams[key] = trimmedVal;
                }
            }
        }

        // 设置名称和其他参数
        proxy.name = otherParams.remarks
            ? Base64.decode(otherParams.remarks)
            : `SSR ${proxy.server}`;

        const protocolParam = getIfNotBlank(
            Base64.decode(otherParams.protoparam || '').replace(/\s/g, ''),
            ''
        );
        if (protocolParam) {
            proxy['protocol-param'] = protocolParam as string;
        }

        const obfsParam = getIfNotBlank(
            Base64.decode(otherParams.obfsparam || '').replace(/\s/g, ''),
            ''
        );
        if (obfsParam) {
            proxy['obfs-param'] = obfsParam as string;
        }

        return proxy;
    };

    return { name, test, parse };
}

export default URI_SSR;

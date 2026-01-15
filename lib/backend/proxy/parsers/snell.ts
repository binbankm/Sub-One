/**
 * Snell URI Parser
 * 格式: snell://[user@]server:port?psk=xxx&version=xxx#name
 */

import { Parser, Proxy } from '../types';
import { safeDecode, parseQueryParams } from '../utils';

export function URI_Snell(): Parser {
    const name = 'URI Snell Parser';

    const test = (line: string): boolean => {
        return /^snell:\/\//.test(line);
    };

    const parse = (line: string): Proxy => {
        const content = line.split('snell://')[1];

        // 解析: [user@]server:port?params#name
        const parsed = /^(?:(.*?)@)?(.*?):(\d+)([^#]*?)(?:#(.*?))?$/.exec(content);

        if (!parsed) {
            throw new Error(`Invalid Snell URI: ${line}`);
        }

        const server = parsed[2];
        const port = parseInt(parsed[3], 10);
        let nodeName = parsed[5];

        if (nodeName) {
            nodeName = safeDecode(nodeName);
        }

        const queryStr = (parsed[4] || '').split('?')[1] || '';
        const params = parseQueryParams(queryStr);

        const psk = params.psk || params.key || safeDecode(parsed[1] || '');

        const proxy: Proxy = {
            type: 'snell',
            name: nodeName || `Snell ${server}:${port}`,
            server,
            port,
            psk,
            version: params.version ? parseInt(params.version, 10) : 2
        };

        if (params.obfs) {
            proxy.obfs = params.obfs;
            proxy['obfs-host'] = params.host || params['obfs-host'] || '';
        }

        return proxy;
    };

    return { name, test, parse };
}

export default URI_Snell;

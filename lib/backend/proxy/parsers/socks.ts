/**
 * SOCKS5 / HTTP Proxy URI Parser
 * 参考 Sub-Store: URI_PROXY, URI_SOCKS
 *
 * 格式:
 * - socks5://[user:pass@]server:port#name
 * - socks5+tls://[user:pass@]server:port#name
 * - http://[user:pass@]server:port#name
 * - https://[user:pass@]server:port#name
 */

import { Parser, Proxy } from '../types';
import { Base64 } from 'js-base64';
import { safeDecode } from '../utils';

export function URI_Socks5(): Parser {
    const name = 'URI SOCKS5 Parser';

    const test = (line: string): boolean => {
        return /^socks5(\+tls)?:\/\//.test(line);
    };

    const parse = (line: string): Proxy => {
        const hasTls = /^socks5\+tls:\/\//.test(line);
        const content = line.replace(/^socks5(\+tls)?:\/\//, '');

        // 解析: [user:pass@]server:port[?query]#name
        const parsed = /^(?:(.*?):(.*?)@)?(.*?):(\d+)\/?(\?.*?)?(?:#(.*?))?$/.exec(content);

        if (!parsed) {
            throw new Error(`Invalid SOCKS5 URI: ${line}`);
        }

        const username = parsed[1] ? safeDecode(parsed[1]) : undefined;
        const password = parsed[2] ? safeDecode(parsed[2]) : undefined;
        const server = parsed[3];
        const port = parseInt(parsed[4], 10);
        let nodeName = parsed[6];

        if (nodeName) {
            nodeName = safeDecode(nodeName);
        }

        const proxy: Proxy = {
            type: 'socks5',
            name: nodeName || `SOCKS5 ${server}:${port}`,
            server,
            port,
            tls: hasTls,
        };

        if (username) {
            proxy.username = username;
        }
        if (password) {
            proxy.password = password;
        }

        return proxy;
    };

    return { name, test, parse };
}

export function URI_Socks(): Parser {
    const name = 'URI SOCKS Parser';

    const test = (line: string): boolean => {
        return /^socks:\/\//.test(line);
    };

    const parse = (line: string): Proxy => {
        const content = line.replace(/^socks:\/\//, '');

        // 解析: [base64(user:pass)@]server:port#name
        const parsed = /^(?:(.*)@)?(.*?):(\d+)(\?.*?)?(?:#(.*?))?$/.exec(content);

        if (!parsed) {
            throw new Error(`Invalid SOCKS URI: ${line}`);
        }

        const auth = parsed[1];
        const server = parsed[2];
        const port = parseInt(parsed[3], 10);
        let nodeName = parsed[5];

        if (nodeName) {
            nodeName = safeDecode(nodeName);
        }

        let username: string | undefined;
        let password: string | undefined;

        if (auth) {
            const decoded = Base64.decode(safeDecode(auth));
            const parts = decoded.split(':');
            username = parts[0];
            password = parts[1];
        }

        const proxy: Proxy = {
            type: 'socks5',
            name: nodeName || `SOCKS5 ${server}:${port}`,
            server,
            port,
        };

        if (username) {
            proxy.username = username;
        }
        if (password) {
            proxy.password = password;
        }

        return proxy;
    };

    return { name, test, parse };
}

export function URI_HTTP(): Parser {
    const name = 'URI HTTP Proxy Parser';

    const test = (line: string): boolean => {
        return /^https?:\/\//.test(line) && /^https?:\/\/[^/]+:\d+/.test(line);
    };

    const parse = (line: string): Proxy => {
        const hasTls = /^https:\/\//.test(line);
        const content = line.replace(/^https?:\/\//, '');

        // 解析: [user:pass@]server:port[/path]#name
        const parsed = /^(?:(.*?):(.*?)@)?(.*?):(\d+)\/?.*?(?:#(.*?))?$/.exec(content);

        if (!parsed) {
            throw new Error(`Invalid HTTP Proxy URI: ${line}`);
        }

        const username = parsed[1] ? safeDecode(parsed[1]) : undefined;
        const password = parsed[2] ? safeDecode(parsed[2]) : undefined;
        const server = parsed[3];
        const port = parseInt(parsed[4], 10);
        let nodeName = parsed[5];

        if (nodeName) {
            nodeName = safeDecode(nodeName);
        }

        const proxy: Proxy = {
            type: 'http',
            name: nodeName || `HTTP ${server}:${port}`,
            server,
            port,
            tls: hasTls,
        };

        if (username) {
            proxy.username = username;
        }
        if (password) {
            proxy.password = password;
        }

        return proxy;
    };

    return { name, test, parse };
}

export default URI_Socks5;

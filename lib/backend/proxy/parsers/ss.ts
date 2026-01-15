/**
 * Shadowsocks URI Parser
 * 参考 Sub-Store: URI_SS
 *
 * 支持格式:
 * - SIP002: ss://BASE64(method:password)@server:port#name
 * - SIP002: ss://method:password@server:port#name (2022-blake3-*)
 * - Legacy: ss://BASE64(method:password@server:port)#name
 */

import { Parser, Proxy } from '../types';
import { Base64 } from 'js-base64';
import { getIfNotBlank, getIfPresent, safeDecode, parseQueryParams } from '../utils';

export function URI_SS(): Parser {
    const name = 'URI SS Parser';

    const test = (line: string): boolean => {
        return /^ss:\/\//.test(line);
    };

    const parse = (line: string): Proxy => {
        let content = line.split('ss://')[1];
        let nodeName = line.split('#')[1];
        if (nodeName) {
            nodeName = safeDecode(nodeName);
        }

        const proxy: Proxy = {
            type: 'ss',
            name: '',
            server: '',
            port: 0,
        };

        content = content.split('#')[0]; // 移除节点名

        // 处理 IPv4 和 IPv6
        let serverAndPortArray = content.match(/@([^/?]*)(\/?|\?|$)/);
        let rawUserInfoStr = safeDecode(content.split('@')[0]);
        let userInfoStr: string;

        // 2022-blake3-* 加密不使用 Base64
        if (rawUserInfoStr?.startsWith('2022-blake3-')) {
            userInfoStr = rawUserInfoStr;
        } else {
            userInfoStr = Base64.decode(rawUserInfoStr);
        }

        let query = '';

        if (!serverAndPortArray) {
            // Legacy 格式: ss://BASE64(全部内容)
            if (content.includes('?')) {
                const parsed = content.match(/^(.*?)(\?.*)$/);
                if (parsed) {
                    content = parsed[1];
                    query = parsed[2];
                }
            }
            content = Base64.decode(content);

            // 处理 v2ray-plugin 查询参数
            if (query && /(&|\?)v2ray-plugin=/.test(query)) {
                const parsed = query.match(/(&|\?)v2ray-plugin=(.*?)(&|$)/);
                if (parsed?.[2]) {
                    proxy.plugin = 'v2ray-plugin';
                    proxy['plugin-opts'] = JSON.parse(Base64.decode(parsed[2]));
                }
            }

            if (query) {
                content = `${content}${query}`;
            }

            userInfoStr = content.match(/(^.*)@/)?.[1] || '';
            serverAndPortArray = content.match(/@([^/@]*)(\/?|$)/);
        } else if (content.includes('?')) {
            const parsed = content.match(/(\?.*)$/);
            query = parsed?.[1] || '';
        }

        // 解析查询参数
        const params = parseQueryParams(query);

        // TLS 配置
        proxy.tls = params.security ? params.security !== 'none' : false;
        proxy['skip-cert-verify'] = !!params.allowInsecure;
        proxy.sni = params.sni || params.peer;
        proxy['client-fingerprint'] = params.fp;

        if (params.alpn) {
            proxy.alpn = safeDecode(params.alpn).split(',');
        }

        // WebSocket 传输
        if (params.ws) {
            proxy.network = 'ws';
            if (params.wspath) {
                proxy['ws-opts'] = { path: params.wspath };
            }
        }

        // 传输层类型
        if (params.type) {
            let httpupgrade = false;
            proxy.network = params.type as Proxy['network'];

            if (proxy.network === 'httpupgrade' as unknown) {
                proxy.network = 'ws';
                httpupgrade = true;
            }

            if (proxy.network === 'grpc') {
                proxy['grpc-opts'] = {
                    'grpc-service-name': params.serviceName,
                    '_grpc-type': params.mode,
                    '_grpc-authority': params.authority,
                };
            } else {
                if (params.path || params.host) {
                    const opts: Proxy['ws-opts'] = {};
                    if (params.path) {
                        opts.path = safeDecode(params.path);
                    }
                    if (params.host) {
                        opts.headers = { Host: safeDecode(params.host) };
                    }
                    if (httpupgrade) {
                        opts['v2ray-http-upgrade'] = true;
                        opts['v2ray-http-upgrade-fast-open'] = true;
                    }
                    proxy[`${proxy.network}-opts` as keyof Proxy] = opts as unknown;
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
        }

        proxy.udp = !!params.udp;

        // 解析服务器和端口
        if (serverAndPortArray) {
            const serverAndPort = serverAndPortArray[1];
            const portIdx = serverAndPort.lastIndexOf(':');
            proxy.server = serverAndPort.substring(0, portIdx);
            const portMatch = serverAndPort.substring(portIdx + 1).match(/\d+/);
            proxy.port = portMatch ? parseInt(portMatch[0], 10) : 0;
        }

        // 解析用户信息 (method:password)
        const userInfo = userInfoStr.match(/(^.*?):(.*$)/);
        proxy.cipher = userInfo?.[1];
        proxy.password = userInfo?.[2];

        // 处理插件
        const pluginMatch = content.match(/[?&]plugin=([^&]+)/);
        const shadowTlsMatch = content.match(/[?&]shadow-tls=([^&]+)/);

        if (pluginMatch) {
            const pluginInfo = ('plugin=' + safeDecode(pluginMatch[1])).split(';');
            const pluginParams: Record<string, string | boolean> = {};

            for (const item of pluginInfo) {
                const [key, val] = item.split('=');
                if (key) pluginParams[key] = val || true;
            }

            switch (pluginParams.plugin) {
                case 'obfs-local':
                case 'simple-obfs':
                    proxy.plugin = 'obfs';
                    proxy['plugin-opts'] = {
                        mode: pluginParams.obfs,
                        host: getIfNotBlank(pluginParams['obfs-host'] as string),
                    };
                    break;
                case 'v2ray-plugin':
                    proxy.plugin = 'v2ray-plugin';
                    proxy['plugin-opts'] = {
                        mode: 'websocket',
                        host: getIfNotBlank(pluginParams['obfs-host'] as string),
                        path: getIfNotBlank(pluginParams.path as string),
                        tls: getIfPresent(pluginParams.tls),
                    };
                    break;
                case 'shadow-tls': {
                    proxy.plugin = 'shadow-tls';
                    const versionStr = pluginParams.version as string | undefined;
                    proxy['plugin-opts'] = {
                        host: getIfNotBlank(pluginParams.host as string),
                        password: getIfNotBlank(pluginParams.password as string),
                        version: versionStr ? parseInt(versionStr, 10) : undefined,
                    };
                    break;
                }
            }
        }

        // Shadowrocket shadow-tls 格式
        if (shadowTlsMatch) {
            const stParams = JSON.parse(Base64.decode(shadowTlsMatch[1]));
            const versionStr = stParams.version as string | undefined;
            proxy.plugin = 'shadow-tls';
            proxy['plugin-opts'] = {
                host: getIfNotBlank(stParams.host),
                password: getIfNotBlank(stParams.password),
                version: versionStr ? parseInt(versionStr, 10) : undefined,
            };
            if (stParams.address) {
                proxy.server = stParams.address;
            }
            if (stParams.port) {
                proxy.port = parseInt(stParams.port, 10);
            }
        }

        // UDP over TCP
        if (/(&|\?)uot=(1|true)/i.test(query)) {
            proxy['udp-over-tcp'] = true;
        }

        // TCP Fast Open
        if (/(&|\?)tfo=(1|true)/i.test(query)) {
            proxy.tfo = true;
        }

        proxy.name = nodeName || `SS ${proxy.server}:${proxy.port}`;

        return proxy;
    };

    return { name, test, parse };
}

export default URI_SS;

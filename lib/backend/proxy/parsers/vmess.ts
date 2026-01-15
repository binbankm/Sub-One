/**
 * VMess URI Parser
 * 参考 Sub-Store: URI_VMess
 *
 * 支持格式:
 * - V2rayN: vmess://BASE64(JSON)
 * - Quantumult: vmess://BASE64(name = vmess, server, port, ...)
 * - Shadowrocket: vmess://BASE64(method:uuid@server:port)?params
 */

import { Parser, Proxy } from '../types';
import { Base64 } from 'js-base64';
import { getIfNotBlank, getIfPresent, isPresent, isNotBlank, safeDecode } from '../utils';

export function URI_VMess(): Parser {
    const name = 'URI VMess Parser';

    const test = (line: string): boolean => {
        return /^vmess:\/\//.test(line);
    };

    const parse = (line: string): Proxy => {
        let content = line.split('vmess://')[1];
        let decodedContent = Base64.decode(content.replace(/\?.*?$/, ''));

        // Quantumult 格式检测
        if (/=\s*vmess/.test(decodedContent)) {
            return parseQuantumultVMess(decodedContent);
        }

        // V2rayN 或 Shadowrocket 格式
        return parseV2rayNVMess(content, decodedContent);
    };

    return { name, test, parse };
}

/**
 * 解析 Quantumult VMess 格式
 */
function parseQuantumultVMess(content: string): Proxy {
    const partitions = content.split(',').map((p) => p.trim());
    const params: Record<string, string> = {};

    for (const part of partitions) {
        if (part.indexOf('=') !== -1) {
            const [key, val] = part.split('=');
            params[key.trim()] = val.trim();
        }
    }

    const proxy: Proxy = {
        name: partitions[0].split('=')[0].trim(),
        type: 'vmess',
        server: partitions[1],
        port: parseInt(partitions[2], 10),
        cipher: getIfNotBlank(partitions[3], 'auto') as string,
        uuid: partitions[4].match(/^"(.*)"$/)?.[1] || partitions[4],
        tls: params.obfs === 'wss',
        udp: getIfPresent(params['udp-relay']) as boolean | undefined,
        tfo: getIfPresent(params['fast-open']) as boolean | undefined,
        'skip-cert-verify': isPresent(params['tls-verification'])
            ? !params['tls-verification']
            : undefined,
    };

    // 处理 WebSocket
    if (isPresent(params.obfs)) {
        if (params.obfs === 'ws' || params.obfs === 'wss') {
            proxy.network = 'ws';
            const pathMatch = (getIfNotBlank(params['obfs-path'], '') as string || '"/\"').match(/^"(.*)"$/);
            const path = pathMatch?.[1] || '/';

            proxy['ws-opts'] = { path };

            let obfsHost = params['obfs-header'];
            if (obfsHost && obfsHost.indexOf('Host') !== -1) {
                const hostMatch = obfsHost.match(/Host:\s*([a-zA-Z0-9\-.]*)/);
                if (hostMatch) {
                    obfsHost = hostMatch[1];
                }
            }
            if (isNotBlank(obfsHost)) {
                proxy['ws-opts'].headers = { Host: obfsHost };
            }
        }
    }

    return proxy;
}

/**
 * 解析 V2rayN / Shadowrocket VMess 格式
 */
function parseV2rayNVMess(rawContent: string, decodedContent: string): Proxy {
    let params: Record<string, unknown> = {};

    try {
        // 尝试解析 V2rayN JSON 格式
        params = JSON.parse(decodedContent);
    } catch {
        // Shadowrocket 格式: BASE64(method:uuid@server:port)?querystring
        const match = /(^[^?]+?)\/?(\?.*)?$/.exec(rawContent);
        if (match) {
            const base64Line = match[1];
            const qs = match[2] || '';
            const decoded = Base64.decode(base64Line);

            // 解析查询参数
            for (const addon of qs.replace(/^\?/, '').split('&')) {
                if (!addon) continue;
                const [key, valueRaw] = addon.split('=');
                const value = safeDecode(valueRaw || '');
                if (value.indexOf(',') === -1) {
                    params[key] = value;
                } else {
                    params[key] = value.split(',');
                }
            }

            // 解析 method:uuid@server:port
            const authMatch = /(^[^:]+?):([^:]+?)@(.*):(\\d+)$/.exec(decoded);
            if (authMatch) {
                params.scy = authMatch[1];
                params.id = authMatch[2];
                params.add = authMatch[3];
                params.port = authMatch[4];
            }
        }
    }

    const server = params.add as string;
    const port = parseInt(getIfPresent(params.port, 0) as string, 10);

    const proxy: Proxy = {
        name: (params.ps ?? params.remarks ?? params.remark ?? `VMess ${server}:${port}`) as string,
        type: 'vmess',
        server,
        port,
        cipher: ['auto', 'aes-128-gcm', 'chacha20-poly1305', 'none'].includes(params.scy as string)
            ? (params.scy as string)
            : 'auto',
        uuid: params.id as string,
        alterId: parseInt(getIfPresent(params.aid ?? params.alterId, 0) as string, 10),
        tls: ['tls', true, 1, '1'].includes(params.tls as string | boolean | number),
        'skip-cert-verify': isPresent(params.verify_cert)
            ? !(params.verify_cert as boolean)
            : undefined,
    };

    // allowInsecure
    if (!proxy['skip-cert-verify'] && isPresent(params.allowInsecure)) {
        proxy['skip-cert-verify'] = /(TRUE)|1/i.test(params.allowInsecure as string);
    }

    // SNI
    if (proxy.tls) {
        if (params.sni && params.sni !== '') {
            proxy.sni = params.sni as string;
        } else if (params.peer && params.peer !== '') {
            proxy.sni = params.peer as string;
        }
    }

    // 处理传输层
    let httpupgrade = false;
    const net = params.net as string;
    const obfs = params.obfs as string;
    const headerType = params.type as string;

    if (net === 'ws' || obfs === 'websocket') {
        proxy.network = 'ws';
    } else if (['http'].includes(net) || ['http'].includes(obfs) || ['http'].includes(headerType)) {
        proxy.network = 'http';
    } else if (['grpc', 'kcp', 'quic'].includes(net)) {
        proxy.network = net as Proxy['network'];
    } else if (net === 'httpupgrade') {
        proxy.network = 'ws';
        httpupgrade = true;
    } else if (net === 'h2') {
        proxy.network = 'h2';
    }

    // 传输层配置
    if (proxy.network) {
        let transportHost = (params.host ?? params.obfsParam) as string;
        let transportPath = params.path as string;

        // 尝试解析 JSON 格式的 host
        try {
            const parsedObfs = JSON.parse(transportHost);
            if (parsedObfs?.Host) {
                transportHost = parsedObfs.Host;
            }
        } catch { /* ignore */ }

        // 补上默认 path
        if (proxy.network === 'ws') {
            transportPath = transportPath || '/';
        }

        if (proxy.network === 'http') {
            if (transportHost) {
                transportHost = transportHost.split(',').map((i: string) => i.trim())[0];
            }
            transportPath = transportPath || '/';
        }

        // 配置传输层选项
        if (transportPath || transportHost || ['kcp', 'quic'].includes(proxy.network)) {
            if (proxy.network === 'grpc') {
                proxy['grpc-opts'] = {
                    'grpc-service-name': getIfNotBlank(transportPath),
                    '_grpc-type': getIfNotBlank(headerType),
                    '_grpc-authority': getIfNotBlank(params.authority as string),
                };
            } else if (['kcp', 'quic'].includes(proxy.network)) {
                // KCP/QUIC opts (带下划线前缀)
                const optsKey = `${proxy.network}-opts` as keyof Proxy;
                (proxy as Record<string, unknown>)[optsKey] = {
                    [`_${proxy.network}-type`]: getIfNotBlank(headerType),
                    [`_${proxy.network}-host`]: getIfNotBlank(transportHost),
                    [`_${proxy.network}-path`]: getIfNotBlank(transportPath),
                };
            } else {
                const opts: Proxy['ws-opts'] = {
                    path: getIfNotBlank(transportPath),
                    headers: transportHost ? { Host: transportHost } : undefined,
                };
                if (httpupgrade) {
                    opts['v2ray-http-upgrade'] = true;
                    opts['v2ray-http-upgrade-fast-open'] = true;
                }
                const optsKey = `${proxy.network}-opts` as keyof Proxy;
                (proxy as Record<string, unknown>)[optsKey] = opts;
            }
        } else {
            delete proxy.network;
        }
    }

    proxy['client-fingerprint'] = params.fp as string;
    if (params.alpn) {
        proxy.alpn = (params.alpn as string).split(',');
    }

    return proxy;
}

export default URI_VMess;

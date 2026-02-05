/**
 * Sub-One URI Parsers
 *
 * URI 协议解析器集合
 * 支持: SS, SSR, VMess, VLESS, Trojan, Hysteria2, TUIC, WireGuard, SOCKS5, HTTP, Naive
 */
import { Base64 } from 'js-base64';

import type { ProxyNode } from '../types';
import { isIPv4, isIPv6, isPresent, parsePort, parseSpeed, randomId } from '../utils';

/**
 * 处理 Surge 风格的端口跳跃参数
 */
function parseSurgePortHopping(raw: string): { port_hopping?: string; line: string } {
    const match = raw.match(
        /,\s*?port-hopping\s*?=\s*?["']?\s*?((\d+(-\d+)?)([,;]\d+(-\d+)?)*)\s*?["']?\s*?/
    );
    if (match) {
        return {
            port_hopping: match[1].replace(/;/g, ','),
            line: raw.replace(match[0], '')
        };
    }
    return { line: raw };
}

// ============================================================================
// Shadowsocks URI Parser
// ============================================================================

/**
 * 解析 Shadowsocks URI
 * 格式: ss://base64(method:password)@server:port#name
 * 或: ss://base64(method:password@server:port)#name
 * 参考: https://github.com/shadowsocks/shadowsocks-org/wiki/SIP002-URI-Scheme
 */
export function parseShadowsocks(uri: string): ProxyNode | null {
    if (!uri.startsWith('ss://')) return null;

    try {
        let content = uri.split('ss://')[1];
        const name = uri.split('#')[1];

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            type: 'ss'
        };

        content = content.split('#')[0];

        const serverMatch = content.match(/@([^/?]*)(\/|\?|$)/);
        let query = '';

        const rawUserInfoStr = decodeURIComponent(content.split('@')[0]);
        let userInfoStr: string;

        if (rawUserInfoStr?.startsWith('2022-blake3-')) {
            userInfoStr = rawUserInfoStr;
        } else if (rawUserInfoStr) {
            userInfoStr = Base64.decode(rawUserInfoStr);
        } else {
            userInfoStr = '';
        }

        if (!serverMatch) {
            if (content.includes('?')) {
                const parsed = content.match(/^(.*)(\?.*)$/);
                if (parsed) {
                    content = parsed[1];
                    query = parsed[2];
                }
            }

            content = Base64.decode(content);

            userInfoStr = content.match(/(^.*)@/)?.[1] || '';
            const serverAndPortMatch = content.match(/@([^/@]*)(\/|$)/);

            if (serverAndPortMatch) {
                const serverAndPort = serverAndPortMatch[1];
                const portIdx = serverAndPort.lastIndexOf(':');
                proxy.server = serverAndPort.substring(0, portIdx);
                proxy.port = parsePort(serverAndPort.substring(portIdx + 1));
            }
        } else {
            const serverAndPort = serverMatch[1];
            const portIdx = serverAndPort.lastIndexOf(':');
            proxy.server = serverAndPort.substring(0, portIdx);
            const portStr = serverAndPort.substring(portIdx + 1).match(/\d+/)?.[0];
            proxy.port = portStr ? parsePort(portStr) : 0;

            if (content.includes('?')) {
                const parsed = content.match(/(\?.*)$/);
                if (parsed) query = parsed[1];
            }
        }

        const userInfo = userInfoStr.match(/(^.*?):(.*$)/);
        if (userInfo) {
            proxy.cipher = userInfo[1];
            proxy.password = userInfo[2];
        }

        const params: Record<string, any> = {};
        for (const addon of query.replace(/^\?/, '').split('&')) {
            if (addon) {
                const [key, valueRaw] = addon.split('=');
                const value = decodeURIComponent(valueRaw);
                params[key] = value;
            }
        }

        proxy.tls = params.security && params.security !== 'none';
        proxy['skip-cert-verify'] = !!params['allowInsecure'];
        proxy.sni = params['sni'] || params['peer'];
        proxy['client-fingerprint'] = params.fp;
        proxy.alpn = params.alpn ? decodeURIComponent(params.alpn).split(',') : undefined;

        if (params['type']) {
            const netType = params['type'] as string;
            proxy.network = netType as any;

            if (netType === 'httpupgrade') {
                proxy.network = 'ws';
            }

            if (proxy.network === 'grpc') {
                proxy['grpc-opts'] = {
                    'service-name': params['serviceName']
                };
            } else if (proxy.network === 'ws' || proxy.network === 'h2') {
                proxy[`${proxy.network}-opts`] = {} as any;

                if (params['path']) {
                    (proxy[`${proxy.network}-opts`] as any).path = decodeURIComponent(
                        params['path']
                    );
                }
                if (params['host']) {
                    if (!proxy[`${proxy.network}-opts`]) {
                        proxy[`${proxy.network}-opts`] = {} as any;
                    }
                    (proxy[`${proxy.network}-opts`] as any).headers = {
                        Host: decodeURIComponent(params['host'])
                    };
                }
            }
        }

        proxy.udp = !!params['udp'];

        if (/(&|\?)uot=(1|true)/i.test(query)) {
            proxy['udp-over-tcp'] = true;
        }

        if (/(&|\?)tfo=(1|true)/i.test(query)) {
            proxy.tfo = true;
        }

        // 处理 Shadowrocket 的插件格式
        if (query.includes('plugin=')) {
            const pluginStr = params.plugin;
            if (pluginStr) {
                const pluginParts = pluginStr.split(';');
                const pluginName = pluginParts[0];
                const pluginOpts: Record<string, any> = {};
                for (let i = 1; i < pluginParts.length; i++) {
                    const [k, v] = pluginParts[i].split('=');
                    if (k) pluginOpts[k] = v || true;
                }

                if (pluginName === 'obfs-local' || pluginName === 'simple-obfs') {
                    proxy.plugin = 'obfs';
                    proxy['plugin-opts'] = {
                        mode: pluginOpts.obfs,
                        host: pluginOpts['obfs-host']
                    };
                } else if (pluginName === 'v2ray-plugin') {
                    proxy.plugin = 'v2ray-plugin';
                    proxy['plugin-opts'] = {
                        mode: 'websocket',
                        host: pluginOpts['obfs-host'],
                        path: pluginOpts.path,
                        tls: !!pluginOpts.tls
                    };
                } else if (pluginName === 'shadow-tls') {
                    proxy.plugin = 'shadow-tls';
                    proxy['plugin-opts'] = {
                        host: pluginOpts.host,
                        password: pluginOpts.password,
                        version: pluginOpts.version ? parseInt(pluginOpts.version, 10) : undefined
                    };
                }
            }
        }

        proxy.name = name ? decodeURIComponent(name) : `SS ${proxy.server}:${proxy.port}`;

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseShadowsocks] Error:', e);
        return null;
    }
}

// ============================================================================
// ShadowsocksR URI Parser
// ============================================================================

export function parseShadowsocksR(uri: string): ProxyNode | null {
    if (!uri.startsWith('ssr://')) return null;

    try {
        const line = Base64.decode(uri.split('ssr://')[1]);

        let splitIdx = line.indexOf(':origin');
        if (splitIdx === -1) {
            splitIdx = line.indexOf(':auth_');
        }

        const serverAndPort = line.substring(0, splitIdx);
        const server = serverAndPort.substring(0, serverAndPort.lastIndexOf(':'));
        const port = parsePort(serverAndPort.substring(serverAndPort.lastIndexOf(':') + 1));

        const params = line
            .substring(splitIdx + 1)
            .split('/?')[0]
            .split(':');

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            type: 'ssr',
            server,
            port,
            protocol: params[0],
            cipher: params[1],
            obfs: params[2],
            password: Base64.decode(params[3])
        };

        const otherParams: Record<string, string> = {};
        const lines = line.split('/?')[1]?.split('&') || [];

        for (const item of lines) {
            const [key, val] = item.split('=');
            const trimmedVal = val?.trim();
            if (trimmedVal && trimmedVal.length > 0 && trimmedVal !== '(null)') {
                otherParams[key] = trimmedVal;
            }
        }

        proxy.name = otherParams.remarks
            ? Base64.decode(otherParams.remarks)
            : `SSR ${server}:${port}`;

        if (otherParams.protoparam) {
            const decoded = Base64.decode(otherParams.protoparam).replace(/\s/g, '');
            if (decoded) proxy['protocol-param'] = decoded;
        }

        if (otherParams.obfsparam) {
            const decoded = Base64.decode(otherParams.obfsparam).replace(/\s/g, '');
            if (decoded) proxy['obfs-param'] = decoded;
        }

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseShadowsocksR] Error:', e);
        return null;
    }
}

// ============================================================================
// Trojan URI Parser
// ============================================================================

export function parseTrojan(uri: string): ProxyNode | null {
    if (!uri.startsWith('trojan://')) return null;

    try {
        const line = uri.split('trojan://')[1];
        const parsed = /^(.*?)@(.*?)(?::(\d+))?\/?(?:\?([^#]*))?(?:#(.*))?$/.exec(line);

        if (!parsed) return null;

        const [, password, server, portStr, query = '', name] = parsed;
        const port = portStr ? parsePort(portStr) : 443;

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            type: 'trojan',
            server,
            port,
            password: decodeURIComponent(password),
            name: name ? decodeURIComponent(name) : `Trojan ${server}:${port}`
        };

        const params: Record<string, any> = {};
        for (const addon of query.split('&')) {
            if (addon) {
                const [key, valueRaw] = addon.split('=');
                params[key] = decodeURIComponent(valueRaw || '');
            }
        }

        proxy.tls = params.security !== 'none';
        proxy.sni = params.sni || params.peer;
        proxy['skip-cert-verify'] = /TRUE|1/i.test(params.allowInsecure);
        proxy['client-fingerprint'] = params.fp;
        proxy.alpn = params.alpn ? params.alpn.split(',') : undefined;

        if (params.type) {
            proxy.network = params.type;

            if (proxy.network === 'grpc') {
                proxy['grpc-opts'] = {
                    'service-name': String(params.serviceName || params.path || '')
                };
            } else if (proxy.network && ['ws', 'h2'].includes(proxy.network)) {
                proxy[`${proxy.network}-opts`] = {
                    path: params.path ? decodeURIComponent(params.path as string) : '/',
                    headers: params.host ? { Host: decodeURIComponent(params.host as string) } : {}
                } as any;
            }
        }

        proxy.udp = /TRUE|1/i.test(params.udp);

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseTrojan] Error:', e);
        return null;
    }
}

// ============================================================================
// SOCKS5 URI Parser
// ============================================================================

export function parseSOCKS5(uri: string): ProxyNode | null {
    if (!/^(socks5|socks)(\+tls)?:\/\//.test(uri)) return null;

    try {
        const parsed =
            /^(socks5|socks)(\+tls)?:\/\/(?:(.*)@)?(.*?)(?::(\d+?))?(\?.*?)?(?:#(.*?))?$/.exec(uri);

        if (!parsed) return null;

        const [, , tls, auth, server, portStr, query = '', name] = parsed;

        let port = 0;
        if (portStr) {
            port = parsePort(portStr);
        } else {
            console.error(`[parseSOCKS5] port is not present in line: ${uri}`);
            return null;
        }

        let username: string | undefined;
        let password: string | undefined;

        if (auth) {
            let decoded = '';
            try {
                decoded = Base64.decode(decodeURIComponent(auth));
            } catch {
                decoded = decodeURIComponent(auth);
            }

            // 尝试检测双重 Base64 编码 (Double Encoding Heuristic)
            // 如果解码后没有冒号(即不是 user:pass)，但看起来还是 Base64，尝试再次解码
            if (!decoded.includes(':')) {
                try {
                    // 简单的 Base64 检测: 长度是4的倍数，且只包含合法字符
                    // 这里直接尝试解码，如果不报错且解出了带冒号的字符串，均视为双重编码
                    const deepDecoded = Base64.decode(decoded);
                    if (deepDecoded.includes(':')) {
                        decoded = deepDecoded;
                    }
                } catch (e) {
                    // 忽略第二次解码失败，说明不是双重编码
                }
            }

            const [user, pass] = decoded.split(':');
            username = user;
            password = pass;
        }

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            type: 'socks5',
            server,
            port,
            username,
            password,
            tls: !!tls,
            name: name ? decodeURIComponent(name) : `SOCKS5 ${server}:${port}`
        };

        if (query) {
            const params = new URLSearchParams(query);
            if (params.get('tls') === '1' || params.get('tls') === 'true') proxy.tls = true;
            if (params.get('sni')) proxy.sni = params.get('sni')!;
            if (params.get('skip-cert-verify') === 'true') proxy['skip-cert-verify'] = true;
        }

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseSOCKS5] Error:', e);
        return null;
    }
}

// ============================================================================
// HTTP/HTTPS URI Parser
// ============================================================================

export function parseHTTP(uri: string): ProxyNode | null {
    if (!/^https?:\/\//.test(uri)) return null;

    try {
        const parsed = /^(https?):\/\/(?:(.*?):(.*?)@)?(.*?)(?::(\d+))?(\?.*?)?(?:#(.*))?$/.exec(
            uri
        );

        if (!parsed) return null;

        const [, protocol, username, password, server, portStr, query = '', name] = parsed;

        let port = parsePort(portStr);
        if (!port) {
            port = protocol === 'https' ? 443 : 80;
        }

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            type: protocol === 'https' ? 'https' : 'http',
            server,
            port,
            username: username ? decodeURIComponent(username) : undefined,
            password: password ? decodeURIComponent(password) : undefined,
            tls: protocol === 'https',
            name: name ? decodeURIComponent(name) : `${protocol.toUpperCase()} ${server}:${port}`
        };

        if (query) {
            const params = new URLSearchParams(query);
            if (params.get('sni')) proxy.sni = params.get('sni')!;
        }

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseHTTP] Error:', e);
        return null;
    }
}

// ============================================================================
// VMess URI Parser
// ============================================================================

export function parseVMess(uri: string): ProxyNode | null {
    if (!uri.startsWith('vmess://')) return null;

    try {
        const line = uri.split('vmess://')[1];
        let content = Base64.decode(line.replace(/\?.*?$/, ''));

        if (/=\s*vmess/.test(content)) {
            return parseQuantumultVMess(content);
        }

        let params: any = {};

        try {
            params = JSON.parse(content);
        } catch {
            const match = /(^[^?]+?)\/?\?(.*)$/.exec(line);
            if (match) {
                const [, base64Line, qs] = match;
                content = Base64.decode(base64Line);

                for (const addon of qs.split('&')) {
                    const [key, valueRaw] = addon.split('=');
                    const value = decodeURIComponent(valueRaw);
                    params[key] = value.indexOf(',') === -1 ? value : value.split(',');
                }

                const contentMatch = /(^[^:]+?):([^:]+?)@(.*):(\d+)$/.exec(content);
                if (contentMatch) {
                    const [, cipher, uuid, server, port] = contentMatch;
                    params.scy = cipher;
                    params.id = uuid;
                    params.port = port;
                    params.add = server;
                }
            }
        }

        const server = params.add;
        const port = parseInt(params.port, 10);

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            type: 'vmess',
            server,
            port,
            name: params.ps || params.remarks || params.remark || `VMess ${server}:${port}`,
            cipher: ['auto', 'aes-128-gcm', 'chacha20-poly1305', 'none'].includes(params.scy)
                ? params.scy
                : 'auto',
            uuid: params.id,
            alterId: parseInt(params.aid || params.alterId || '0', 10),
            tls: ['tls', true, 1, '1'].includes(params.tls)
        };

        if (isPresent(params, 'verify_cert')) {
            proxy['skip-cert-verify'] = !params.verify_cert;
        } else if (isPresent(params, 'allowInsecure')) {
            proxy['skip-cert-verify'] = /(TRUE)|1/i.test(params.allowInsecure);
        }

        if (proxy.tls) {
            proxy.sni = params.sni || params.peer;
        }

        let httpupgrade = false;
        if (params.net === 'ws' || params.obfs === 'websocket') {
            proxy.network = 'ws';
        } else if (['http'].includes(params.net) || ['http'].includes(params.obfs)) {
            proxy.network = 'http';
        } else if (['grpc', 'kcp', 'quic'].includes(params.net)) {
            proxy.network = params.net;
        } else if (params.net === 'httpupgrade') {
            proxy.network = 'ws';
            httpupgrade = true;
        } else if (params.net === 'h2') {
            proxy.network = 'h2';
        }

        if (proxy.network) {
            let transportHost = params.host || params.obfsParam;
            let transportPath = params.path;

            if (['ws'].includes(proxy.network)) {
                transportPath = transportPath || '/';
            }

            if (proxy.network === 'http') {
                if (transportHost) {
                    transportHost = Array.isArray(transportHost)
                        ? transportHost[0]
                        : transportHost.split(',')[0].trim();
                }
                if (transportPath) {
                    transportPath = Array.isArray(transportPath) ? transportPath[0] : transportPath;
                } else {
                    transportPath = '/';
                }
            }

            if (
                transportPath ||
                transportHost ||
                (proxy.network && ['kcp', 'quic'].includes(proxy.network))
            ) {
                if (proxy.network === 'grpc') {
                    proxy['grpc-opts'] = {
                        'service-name': transportPath
                    };
                } else if (['kcp', 'quic'].includes(proxy.network)) {
                    proxy[`${proxy.network}-opts`] = {
                        [`_${proxy.network}-type`]: params.type,
                        [`_${proxy.network}-host`]: transportHost,
                        [`_${proxy.network}-path`]: transportPath
                    } as any;
                } else {
                    const opts: any = {
                        path: transportPath,
                        headers: { Host: transportHost }
                    };

                    if (httpupgrade) {
                        opts['v2ray-http-upgrade'] = true;
                        opts['v2ray-http-upgrade-fast-open'] = true;
                    }

                    proxy[`${proxy.network}-opts`] = opts;
                }
            } else {
                delete proxy.network;
            }
        }

        proxy['client-fingerprint'] = params.fp;
        proxy.alpn = params.alpn ? params.alpn.split(',') : undefined;

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseVMess] Error:', e);
        return null;
    }
}

function parseQuantumultVMess(content: string): ProxyNode | null {
    const partitions = content.split(',').map((p) => p.trim());
    const params: Record<string, any> = {};

    for (const part of partitions) {
        if (part.indexOf('=') !== -1) {
            const [key, val] = part.split('=');
            params[key.trim()] = val.trim();
        }
    }

    const proxy: Partial<ProxyNode> = {
        id: randomId(),
        name: partitions[0].split('=')[0].trim(),
        type: 'vmess',
        server: partitions[1],
        port: parseInt(partitions[2], 10),
        cipher: partitions[3] || 'auto',
        uuid: partitions[4].match(/^"(.*)"$/)?.[1] || partitions[4],
        tls: params.obfs === 'wss',
        udp: isPresent(params, 'udp-relay') ? params['udp-relay'] : undefined,
        tfo: isPresent(params, 'fast-open') ? params['fast-open'] : undefined
    };

    if (isPresent(params, 'tls-verification')) {
        proxy['skip-cert-verify'] = !params['tls-verification'];
    }

    if (params.obfs === 'ws' || params.obfs === 'wss') {
        proxy.network = 'ws';
        proxy['ws-opts'] = {
            path: params['obfs-path']?.match(/^"(.*)"$/)?.[1] || '/',
            headers: {}
        };

        let obfsHost = params['obfs-header'];
        if (obfsHost && obfsHost.indexOf('Host') !== -1) {
            obfsHost = obfsHost.match(/Host:\s*([a-zA-Z0-9-.]*)/)?.[1];
        }
        if (obfsHost) {
            proxy['ws-opts']!.headers = { Host: obfsHost };
        }
    }

    return proxy as ProxyNode;
}

// ============================================================================
// VLESS URI Parser
// ============================================================================

export function parseVLESS(uri: string): ProxyNode | null {
    if (!uri.startsWith('vless://')) return null;

    try {
        let line = uri.split('vless://')[1];
        let isShadowrocket = false;

        let parsed = /^(.*?)@(.*?):(\d+)\/?(?:\?([^#]*))?(?:#(.*))?$/.exec(line);

        if (!parsed) {
            const match = /^(.*?)(\?.*?$)/.exec(line);
            if (match) {
                const [, base64, other] = match;
                line = `${Base64.decode(base64)}${other}`;
                parsed = /^(.*?)@(.*?):(\d+)\/?(?:\?([^#]*))?(?:#(.*))?$/.exec(line);
                isShadowrocket = true;
            }
        }

        if (!parsed) return null;

        const [, rawUuid, server, portStr, query = '', name] = parsed;
        let uuid = rawUuid;

        if (isShadowrocket) {
            uuid = uuid.replace(/^.*?:/g, '');
        }

        const port = parsePort(portStr);
        uuid = decodeURIComponent(uuid);

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            type: 'vless',
            server,
            port,
            uuid,
            name: name ? decodeURIComponent(name) : `VLESS ${server}:${port}`
        };

        const params: Record<string, any> = {};
        for (const addon of query.split('&')) {
            if (addon) {
                const [key, valueRaw] = addon.split('=');
                params[key] = decodeURIComponent(valueRaw || '');
            }
        }

        /*
        // [FIX-ED] 显式捕获 'ed' (Early Data) 参数，防止在部分客户端中丢失
        if (params.ed) {
            proxy['ed'] = params.ed;
        }
        */

        proxy.tls = params.security && params.security !== 'none';
        if (isShadowrocket && /TRUE|1/i.test(params.tls)) {
            proxy.tls = true;
            params.security = params.security || 'reality';
        }

        proxy.sni = params.sni || params.peer;
        proxy.flow = params.flow;

        if (!proxy.flow && isShadowrocket && params.xtls) {
            const flows = [undefined, 'xtls-rprx-direct', 'xtls-rprx-vision'];
            proxy.flow = flows[params.xtls];
        }

        proxy['client-fingerprint'] = params.fp;
        proxy.alpn = params.alpn ? params.alpn.split(',') : undefined;
        proxy['skip-cert-verify'] = /(TRUE)|1/i.test(params.allowInsecure);

        // Enhance with additional fields
        if (params.encryption) proxy.encryption = params.encryption;
        if (params.headerType) proxy.headerType = params.headerType;
        if (params.ech) proxy._ech = params.ech;
        if (params.pcs) proxy._pcs = params.pcs;
        if (/(TRUE)|1/i.test(params.h2)) proxy._h2 = true;

        if (params.reality === 'reality' || params.security === 'reality' || params.pbk) {
            const opts: any = {};
            // Existing reality logic...
            if (params.pbk || params.publicKey) opts['public-key'] = params.pbk || params.publicKey;
            if (params.sid || params.shortId) opts['short-id'] = params.sid || params.shortId;
            if (params.spx) opts['_spider-x'] = params.spx;

            // Extra fields
            if (params.extra) proxy._extra = params.extra;
            if (params.mode) proxy._mode = params.mode;
            if (params.pqv) proxy._pqv = params.pqv;

            if (Object.keys(opts).length > 0) {
                proxy['reality-opts'] = opts;
                proxy.tls = true;
                params.security = 'reality';
            }
        }

        // Clean up empty reality-opts
        if (proxy['reality-opts'] && Object.keys(proxy['reality-opts']).length === 0) {
            delete proxy['reality-opts'];
        }

        // Clean up invalid flow if not reality
        if (
            (!proxy['reality-opts'] && !proxy.flow) ||
            proxy.flow === 'null' ||
            proxy.flow === null
        ) {
            delete proxy.flow;
        }

        let httpupgrade = false;
        const netType = params.type as string;
        proxy.network = netType as any;

        if (proxy.network === 'tcp' && params.headerType === 'http') {
            proxy.network = 'http';
        } else if (netType === 'httpupgrade') {
            proxy.network = 'ws';
            httpupgrade = true;
        } else if (netType === 'websocket') {
            proxy.network = 'ws';
        }

        if (!proxy.network && isShadowrocket && params.obfs) {
            proxy.network = params.obfs === 'none' ? undefined : params.obfs;
        }

        if (proxy.network && proxy.network !== 'tcp') {
            const opts: any = {};
            const host = params.host || params.obfsParam;

            if (host) {
                opts.headers = { Host: host };
            }

            if (params.serviceName) {
                opts[`${proxy.network}-service-name`] = params.serviceName;
            }

            if (params.path) {
                opts.path = params.path;
            }

            if (proxy.network === 'grpc') {
                opts['_grpc-type'] = params.mode || 'gun';
            }

            if (proxy.network === 'kcp') {
                // mKCP 特殊参数
                if (params.seed) opts.seed = params.seed;
                if (params.headerType) opts['header-type'] = params.headerType;
            }

            if (proxy.network === 'quic') {
                // QUIC 特殊参数
                if (params.quicSecurity) opts.security = params.quicSecurity;
                if (params.key) opts.key = params.key;
                if (params.headerType) opts['header-type'] = params.headerType;
            }

            if (httpupgrade) {
                opts['v2ray-http-upgrade'] = true;
                opts['v2ray-http-upgrade-fast-open'] = true;
            }

            if (Object.keys(opts).length > 0) {
                proxy[`${proxy.network}-opts`] = opts;
            }
        }

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseVLESS] Error:', e);
        return null;
    }
}

// ============================================================================
// Hysteria URI Parser (v1)
// ============================================================================

export function parseHysteria(uri: string): ProxyNode | null {
    if (!uri.startsWith('hysteria://')) return null;

    try {
        const line = uri.split('hysteria://')[1];
        const parsed = /^(.*?):(\d+)\/?(?:\?([^#]*))?(?:#(.*))?$/.exec(line);

        if (!parsed) return null;

        const [, server, portStr, query = '', name] = parsed;
        const port = parsePort(portStr);

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            type: 'hysteria',
            server,
            port,
            name: name ? decodeURIComponent(name) : `Hysteria ${server}:${port}`
        };

        const params: Record<string, string> = {};
        for (const addon of query.split('&')) {
            if (addon) {
                const [key, valueRaw] = addon.split('=');
                params[key] = decodeURIComponent(valueRaw || '');
            }
        }

        proxy.auth = params.auth || params['auth-str'] || '';
        proxy.up = params.upmbps ? parseInt(params.upmbps, 10) : undefined;
        proxy.down = params.downmbps ? parseInt(params.downmbps, 10) : undefined;
        proxy.sni = params.peer || params.sni;
        proxy.obfs = params.obfs;
        proxy.tls = true;
        proxy['skip-cert-verify'] = /TRUE|1/i.test(params.insecure);
        proxy.alpn = params.alpn ? params.alpn.split(',') : undefined;
        proxy.ports = params.mport || params.ports;
        proxy.tfo = params['fast-open'] === 'true' || params['fast-open'] === '1';

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseHysteria] Error:', e);
        return null;
    }
}

// ============================================================================
// Snell URI Parser
// ============================================================================

export function parseSnell(uri: string): ProxyNode | null {
    if (!uri.startsWith('snell://')) return null;

    try {
        const line = uri.split('snell://')[1];
        const parsed = /^(.*?)@(.*?):(\d+)\/?(?:\?([^#]*))?(?:#(.*))?$/.exec(line);

        if (!parsed) return null;

        const [, psk, server, portStr, query = '', name] = parsed;
        const port = parsePort(portStr);

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            type: 'snell',
            server,
            port,
            password: decodeURIComponent(psk),
            name: name ? decodeURIComponent(name) : `Snell ${server}:${port}`
        };

        const params: Record<string, string> = {};
        for (const addon of query.split('&')) {
            if (addon) {
                const [key, valueRaw] = addon.split('=');
                params[key] = decodeURIComponent(valueRaw || '');
            }
        }

        if (params.version) {
            proxy.version = parseInt(params.version, 10);
        }

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseSnell] Error:', e);
        return null;
    }
}

// ============================================================================
// AnyTLS URI Parser
// ============================================================================

export function parseAnyTLS(uri: string): ProxyNode | null {
    if (!uri.startsWith('anytls://')) return null;

    try {
        const line = uri.split('anytls://')[1];
        const parsed = /^(.*?)@(.*?):(\d+)\/?(?:\?([^#]*))?(?:#(.*))?$/.exec(line);

        if (!parsed) return null;

        const [, password, server, portStr, query = '', name] = parsed;
        const port = parsePort(portStr);

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            type: 'anytls',
            server,
            port,
            password: decodeURIComponent(password),
            name: name ? decodeURIComponent(name) : `AnyTLS ${server}:${port}`,
            tls: true
        };

        const params: Record<string, string> = {};
        for (const addon of query.split('&')) {
            if (addon) {
                const [key, valueRaw] = addon.split('=');
                params[key] = decodeURIComponent(valueRaw || '');
            }
        }

        proxy.sni = params.sni;
        proxy['client-fingerprint'] = params.fp || params.fingerprint;
        if (params.idle_timeout) {
            proxy.idleTimeout = parseInt(params.idle_timeout, 10);
        }

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseAnyTLS] Error:', e);
        return null;
    }
}

// ============================================================================
// Hysteria2 URI Parser
// ============================================================================

export function parseHysteria2(uri: string): ProxyNode | null {
    if (!/^(hysteria2|hy2):\/\//.test(uri)) return null;

    try {
        const rawLine = uri.split(/(hysteria2|hy2):\/\//)[2];
        const { port_hopping, line: newLine } = parseSurgePortHopping(rawLine);
        const parsed =
            /^(.*?)@(.*?)(?::((\d+(-\d+)?)([,;]\d+(-\d+)?)*))?\/?(?:\?([^#]*))?(?:#(.*))?$/.exec(
                newLine
            );

        if (!parsed) return null;

        const matched = parsed as RegExpExecArray;
        const password = matched[1];
        const server = matched[2];
        const portPart = matched[4]; // The ports string without the leading colon
        const query = matched[8] || '';
        const name = matched[9];

        // 端口处理
        let port = 443;
        let ports: string | undefined = port_hopping;

        if (portPart) {
            if (/^\d+$/.test(portPart)) {
                port = parsePort(portPart);
            } else {
                ports = portPart;
                // 从端口跳跃字符串中随机选一个作为主端口
                const portMatches = portPart.split(/[,;]/);
                if (portMatches.length > 0) {
                    const first = portMatches[0].split('-')[0];
                    port = parsePort(first);
                }
            }
        }

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            type: 'hysteria2',
            server,
            port,
            ports,
            password: decodeURIComponent(password),
            name: name ? decodeURIComponent(name) : `Hysteria2 ${server}:${port}`
        };

        for (const addon of query.split('&')) {
            if (addon) {
                const [key, valueRaw] = addon.split('=');
                const value = decodeURIComponent(valueRaw || '');
                const normalizedKey = key.replace(/_/g, '-');

                if (normalizedKey === 'insecure') {
                    proxy['skip-cert-verify'] = /(TRUE)|1/i.test(value);
                } else if (normalizedKey === 'alpn') {
                    proxy.alpn = value ? value.split(',') : undefined;
                } else if (normalizedKey === 'obfs') {
                    proxy.obfs = value || 'salamander';
                } else if (normalizedKey === 'obfs-password') {
                    proxy['obfs-password'] = value;
                } else if (normalizedKey === 'mport' || normalizedKey === 'ports') {
                    proxy.ports = value;
                } else if (normalizedKey === 'sni') {
                    proxy.sni = value;
                } else if (normalizedKey.match(/^(up|down)(-?mbps)?$/)) {
                    const speedKey = normalizedKey.startsWith('up') ? 'up' : 'down';
                    proxy[speedKey] = parseSpeed(value);
                } else if (!Object.keys(proxy).includes(normalizedKey)) {
                    proxy[normalizedKey] = value;
                }
            }
        }

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseHysteria2] Error:', e);
        return null;
    }
}

// ============================================================================
// TUIC URI Parser
// ============================================================================

export function parseTUIC(uri: string): ProxyNode | null {
    if (!uri.startsWith('tuic://')) return null;

    try {
        const line = uri.split(/tuic:\/\//)[1];
        const parsed = /^(.*?)@(.*?)(?::(\d+))?\/?(?:\?([^#]*))?(?:#(.*))?$/.exec(line);

        if (!parsed) return null;

        const [, auth, server, portStr, query = '', name] = parsed;
        const port = portStr ? parsePort(portStr) : 443;

        const authDecoded = decodeURIComponent(auth);
        const [uuid, ...passwordParts] = authDecoded.split(':');
        const password = passwordParts.join(':');

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            type: 'tuic',
            server,
            port,
            uuid,
            password: decodeURIComponent(password),
            name: name ? decodeURIComponent(name) : `TUIC ${server}:${port}`
        };

        for (const addon of query.split('&')) {
            if (addon) {
                const [key, valueRaw] = addon.split('=');
                const value = decodeURIComponent(valueRaw || '');
                const normalizedKey = key.replace(/_/g, '-');

                if (['allow-insecure', 'insecure'].includes(normalizedKey)) {
                    proxy['skip-cert-verify'] = /(TRUE)|1/i.test(value);
                } else if (normalizedKey === 'alpn') {
                    proxy.alpn = value ? value.split(',') : undefined;
                } else if (normalizedKey === 'fast-open') {
                    proxy.tfo = true;
                } else if (['disable-sni', 'reduce-rtt'].includes(normalizedKey)) {
                    proxy[normalizedKey] = /(TRUE)|1/i.test(value);
                } else if (normalizedKey === 'congestion-control') {
                    proxy['congestion-controller'] = value;
                } else if (!Object.keys(proxy).includes(normalizedKey)) {
                    proxy[normalizedKey] = value;
                }
            }
        }

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseTUIC] Error:', e);
        return null;
    }
}

// ============================================================================
// WireGuard URI Parser
// ============================================================================

export function parseWireGuard(uri: string): ProxyNode | null {
    if (!/^(wireguard|wg):\/\//.test(uri)) return null;

    try {
        const line = uri.split(/(wireguard|wg):\/\//)[2];
        const parsed = /^((.*?)@)?(.*?)(?::(\d+))?\/?(?:\?([^#]*))?(?:#(.*))?$/.exec(line);

        if (!parsed) return null;

        const [, , privateKey, server, portStr, query = '', name] = parsed;
        const port = portStr ? parsePort(portStr) : 51820;

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            type: 'wireguard',
            server,
            port,
            'private-key': privateKey ? decodeURIComponent(privateKey) : '',
            udp: true,
            name: name ? decodeURIComponent(name) : `WireGuard ${server}:${port}`
        };

        for (const addon of query.split('&')) {
            if (addon) {
                const [key, valueRaw] = addon.split('=');
                const value = decodeURIComponent(valueRaw || '');
                const normalizedKey = key.replace(/_/g, '-');

                if (normalizedKey === 'reserved') {
                    const parsed = value
                        .split(',')
                        .map((i) => parseInt(i.trim(), 10))
                        .filter((i) => Number.isInteger(i));
                    if (parsed.length === 3) {
                        proxy.reserved = parsed;
                    }
                } else if (['address', 'ip'].includes(normalizedKey)) {
                    value.split(',').forEach((i) => {
                        const ip = i
                            .trim()
                            .replace(/\/\d+$/, '')
                            .replace(/^\[/, '')
                            .replace(/\]$/, '');
                        if (isIPv4(ip)) {
                            proxy.ip = ip;
                        } else if (isIPv6(ip)) {
                            proxy.ipv6 = ip;
                        }
                    });
                } else if (normalizedKey === 'mtu') {
                    const parsedMtu = parseInt(value.trim(), 10);
                    if (Number.isInteger(parsedMtu)) {
                        proxy.mtu = parsedMtu;
                    }
                } else if (normalizedKey === 'public-key' || normalizedKey === 'publickey') {
                    proxy['public-key'] = value;
                } else if (
                    normalizedKey === 'pre-shared-key' ||
                    normalizedKey === 'preshared-key'
                ) {
                    proxy['pre-shared-key'] = value;
                } else if (!Object.keys(proxy).includes(normalizedKey)) {
                    proxy[normalizedKey] = value;
                }
            }
        }

        // 补全 peers
        if (proxy['public-key'] && !proxy.peers) {
            proxy.peers = [
                {
                    endpoint: `${server}:${port}`,
                    'public-key': proxy['public-key'],
                    'pre-shared-key': proxy['pre-shared-key'],
                    reserved: proxy.reserved as number[]
                }
            ];
        }

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseWireGuard] Error:', e);
        return null;
    }
}

// ============================================================================
// Naive URI Parser
// ============================================================================

export function parseNaive(uri: string): ProxyNode | null {
    if (!uri.startsWith('naive+')) return null;

    try {
        const line = uri.split('://')[1];
        const parsed = /^(?:(.*?):(.*?)@)?(.*?):(\d+)\/?(?:\?([^#]*))?(?:#(.*))?$/.exec(line);

        if (!parsed) return null;

        const [, username, password, server, portStr, query = '', name] = parsed;
        const port = parsePort(portStr);

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            type: 'naive',
            server,
            port,
            username: username ? decodeURIComponent(username) : undefined,
            password: password ? decodeURIComponent(password) : undefined,
            name: name ? decodeURIComponent(name) : `Naive ${server}:${port}`,
            tls: true
        };

        const params: Record<string, string> = {};
        for (const addon of query.split('&')) {
            if (addon) {
                const [key, valueRaw] = addon.split('=');
                params[key] = decodeURIComponent(valueRaw || '');
            }
        }

        proxy.sni = params.sni;
        proxy.padding = params.padding === 'true' || params.padding === '1';

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseNaive] Error:', e);
        return null;
    }
}

// ============================================================================
// 导出所有解析器
// ============================================================================

export const URI_PARSERS = {
    ss: parseShadowsocks,
    ssr: parseShadowsocksR,
    vmess: parseVMess,
    vless: parseVLESS,
    trojan: parseTrojan,
    hysteria: parseHysteria,
    hysteria2: parseHysteria2,
    hy2: parseHysteria2,
    tuic: parseTUIC,
    snell: parseSnell,
    anytls: parseAnyTLS,
    naive: parseNaive,
    'naive+https': parseNaive,
    'naive+http': parseNaive,
    wireguard: parseWireGuard,
    wg: parseWireGuard,
    socks5: parseSOCKS5,
    socks: parseSOCKS5,
    http: parseHTTP,
    https: parseHTTP
};

/**
 * 统一 URI 解析入口
 */
export function parseNodeURI(uri: string): ProxyNode | null {
    const protocol = uri.split('://')[0].toLowerCase();
    const parser = URI_PARSERS[protocol as keyof typeof URI_PARSERS];

    if (!parser) {
        console.warn(`[parseNodeURI] Unknown protocol: ${protocol}`);
        return null;
    }

    return parser(uri);
}

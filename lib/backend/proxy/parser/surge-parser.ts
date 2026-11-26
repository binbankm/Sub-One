/**
 * Sub-One Surge Parser
 *
 * 增强型 Surge 格式解析器
 * 1. 支持带引号和逗号的名称/参数
 * 2. 支持端口跳跃 (port-hopping)
 * 3. 支持 Direct, Reject 等特殊类型
 */
import type { ProxyNode, ProxyType } from '../types';
import { parsePort, randomId } from '../utils';

/**
 * 解析 Surge 代理行
 */
export function parseSurge(line: string): ProxyNode | null {
    if (!line || !line.includes('=')) return null;

    try {
        // 1. 处理端口跳跃 (如果存在)
        const hoppingMatch = line.match(
            /,\s*?port-hopping\s*?=\s*?["']?\s*?((\d+(-\d+)?)([,;]\d+(-\d+)?)*)\s*?["']?\s*?/i
        );
        let portHopping: string | undefined;
        let cleanLine = line;
        if (hoppingMatch) {
            portHopping = hoppingMatch[1].replace(/;/g, ',');
            cleanLine = line.replace(hoppingMatch[0], '');
        }

        // 2. 分割名称和内容 (处理可能带引号的名称)
        const eqIdx = cleanLine.indexOf('=');
        let name = cleanLine.substring(0, eqIdx).trim();
        if (name.startsWith('"') && name.endsWith('"')) {
            name = name.substring(1, name.length - 1);
        }

        const content = cleanLine.substring(eqIdx + 1).trim();

        // 3. 健壮的逗号分割 (忽略引号内的逗号)
        const parts = smartSplit(content);
        if (parts.length < 1) return null;

        const rawType = parts[0].toLowerCase();

        // 处理特殊类型
        if (rawType === 'direct' || rawType === 'reject') {
            return {
                id: randomId(),
                name,
                type: rawType as any,
                server: '127.0.0.1',
                port: 0
            } as ProxyNode;
        }

        if (rawType === 'wireguard') {
            const server = parts.length >= 2 && !parts[1].includes('=') ? parts[1] : '127.0.0.1';
            const port = parts.length >= 3 && !parts[2].includes('=') ? parsePort(parts[2]) : 51820;
            const proxy: Partial<ProxyNode> = {
                id: randomId(),
                name,
                type: 'wireguard',
                server,
                port,
                ports: portHopping,
                udp: true
            };
            const params: Record<string, string> = {};
            for (let i = 1; i < parts.length; i++) {
                const part = parts[i];
                if (part.includes('=')) {
                    const [key, ...valParts] = part.split('=');
                    params[key.trim().toLowerCase()] = valParts
                        .join('=')
                        .trim()
                        .replace(/^"(.*)"$/, '$1');
                }
            }
            if (params['section-name']) {
                proxy._sectionName = params['section-name'];
            }
            mapSurgeParams(proxy, params);
            return proxy as ProxyNode;
        }

        if (parts.length < 3) return null;

        const server = parts[1];
        const port = parsePort(parts[2]);

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            name,
            type: normalizeSurgeType(rawType),
            server,
            port,
            ports: portHopping
        };
        if (rawType === 'tuic-v5') {
            proxy.version = 5;
        }
        if (rawType === 'socks5-tls') {
            proxy.tls = true;
        }

        // 4. 解析命名参数 (以及 http/https/socks5 的位置认证参数)
        const params: Record<string, string> = {};
        for (let i = 3; i < parts.length; i++) {
            const part = parts[i];
            if (part.includes('=')) {
                const [key, ...valParts] = part.split('=');
                params[key.trim().toLowerCase()] = valParts
                    .join('=')
                    .trim()
                    .replace(/^"(.*)"$/, '$1');
            } else if (
                ['http', 'https', 'socks5'].includes(proxy.type || '') &&
                (i === 3 || i === 4)
            ) {
                const unquoted = part.trim().replace(/^"(.*)"$/, '$1');
                if (i === 3 && !params.username) params.username = unquoted;
                else if (i === 4 && !params.password) params.password = unquoted;
            } else if (proxy.type === 'snell' && i === 3 && !params.psk) {
                params.psk = part.trim().replace(/^"(.*)"$/, '$1');
            } else {
                params[part.trim().toLowerCase()] = 'true';
            }
        }

        mapSurgeParams(proxy, params);

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseSurge] Error:', e);
        return null;
    }
}

/**
 * 智能分割: 只有不在引号内的逗号才作为分隔符
 */
function smartSplit(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let quoteChar = '';

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if ((char === '"' || char === "'") && (i === 0 || str[i - 1] !== '\\')) {
            if (!inQuotes) {
                inQuotes = true;
                quoteChar = char;
            } else if (char === quoteChar) {
                inQuotes = false;
            }
            current += char;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.filter((s) => s.length > 0);
}

function normalizeSurgeType(type: string): ProxyType {
    if (type === 'https') return 'https';
    if (type === 'custom') return 'ss';
    if (type === 'socks5-tls') return 'socks5';
    if (type === 'tuic-v5') return 'tuic';
    return type as ProxyType;
}

function mapSurgeParams(proxy: Partial<ProxyNode>, params: Record<string, string>) {
    if (params.password) proxy.password = params.password;
    if (params.username) proxy.username = params.username;
    if (params.psk) proxy.password = params.psk;
    if (params['encrypt-method']) proxy.cipher = params['encrypt-method'];

    // TLS - https/anytls/trojan/tuic/hysteria2 协议默认使用 TLS
    const implicitTls = ['https', 'anytls', 'trojan', 'tuic', 'hysteria2'].includes(proxy.type || '');
    proxy.tls =
        params.tls === 'true' ||
        proxy.tls === true ||
        (implicitTls && params.tls !== 'false');
    if (params.sni) proxy.sni = params.sni;
    if (params['skip-cert-verify'])
        proxy['skip-cert-verify'] = params['skip-cert-verify'] === 'true';
    if (params['server-cert-fingerprint-sha256'])
        proxy['tls-fingerprint'] = params['server-cert-fingerprint-sha256'];
    if (params['server-cert-verify-name'])
        proxy['name-cert-verify'] = params['server-cert-verify-name'];
    if (params['client-fingerprint']) proxy['client-fingerprint'] = params['client-fingerprint'];
    if (params['ech-config']) {
        proxy['ech-opts'] = {
            enable: true,
            'config-list': [params['ech-config']]
        };
    }
    if (params.alpn) {
        proxy.alpn = params.alpn.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    }

    // TCP / UDP / TFO / 通用平台参数
    if (params.tfo || params['fast-open'])
        proxy.tfo = (params.tfo || params['fast-open']) === 'true';
    if (params.udp || params['udp-relay'])
        proxy.udp = (params.udp || params['udp-relay']) === 'true';
    if (params['underlying-proxy']) proxy['underlying-proxy'] = params['underlying-proxy'];
    if (params.interface) proxy['interface-name'] = params.interface;
    if (params['test-url']) proxy['test-url'] = params['test-url'];
    if (params['test-timeout']) {
        const tt = parseInt(params['test-timeout'], 10);
        if (!isNaN(tt)) proxy['test-timeout'] = tt;
    }
    if (params['block-quic']) {
        if (params['block-quic'] === 'true' || params['block-quic'] === 'on') proxy['block-quic'] = true;
        else if (params['block-quic'] === 'false' || params['block-quic'] === 'off') proxy['block-quic'] = false;
        else proxy['block-quic'] = params['block-quic'];
    }
    if (params['ip-version']) {
        const surgeIpMap: Record<string, string> = {
            dual: 'dual',
            'v4-only': 'ipv4',
            'v6-only': 'ipv6',
            'prefer-v4': 'ipv4-prefer',
            'prefer-v6': 'ipv6-prefer'
        };
        proxy['ip-version'] = surgeIpMap[params['ip-version']] || params['ip-version'];
    }
    if (params['port-hopping-interval']) {
        const hi = parseInt(params['port-hopping-interval'], 10);
        if (!isNaN(hi)) proxy['hop-interval'] = hi;
    }

    // 传输层
    if (params.ws === 'true' || params.obfs === 'ws' || params.obfs === 'wss') {
        const isHttpUpgrade = params['ws-http-upgrade'] === 'true';
        proxy.network = isHttpUpgrade ? 'httpupgrade' : 'ws';
        let headers: Record<string, string> = {};
        if (params['ws-headers']) {
            for (const item of params['ws-headers'].split('|')) {
                const cIdx = item.indexOf(':');
                if (cIdx > 0) {
                    const hk = item.substring(0, cIdx).trim();
                    const hv = item.substring(cIdx + 1).trim().replace(/^"(.*)"$/, '$1');
                    headers[hk] = hv;
                }
            }
        } else if (params['obfs-host']) {
            headers = { Host: params['obfs-host'] };
        }
        const opts = {
            path: params['ws-path'] || params['obfs-path'] || '/',
            headers
        };
        if (isHttpUpgrade) {
            proxy['httpupgrade-opts'] = opts;
        } else {
            proxy['ws-opts'] = opts;
        }
        if (params.obfs === 'wss') proxy.tls = true;
        if (proxy.type === 'ss') {
            proxy.plugin = 'v2ray-plugin';
            proxy['plugin-opts'] = {
                mode: 'websocket',
                host: headers.Host || proxy.sni,
                path: opts.path,
                tls: proxy.tls
            };
        }
    } else if (params.obfs === 'http' && proxy.type !== 'snell' && proxy.type !== 'ss') {
        proxy.network = 'http';
        proxy['http-opts'] = {
            path: params['obfs-path'] || '/',
            headers: params['obfs-host'] ? { Host: params['obfs-host'] } : {}
        };
    } else if (params.grpc === 'true' || params.network === 'grpc') {
        proxy.network = 'grpc';
        proxy['grpc-opts'] = {
            'grpc-service-name': params['grpc-service-name'] || params.servicename || ''
        } as any;
    } else if (params.xhttp === 'true' || params.network === 'xhttp') {
        proxy.network = 'xhttp';
        proxy['xhttp-opts'] = {
            path: params['xhttp-path'] || params.path || '/',
            host: params['xhttp-host'] || params.host,
            mode: params['xhttp-mode'] || params.mode
        } as any;
    }

    // 协议特定
    switch (proxy.type) {
        case 'ss':
            if (params['shadow-tls-password']) {
                proxy.plugin = 'shadow-tls';
                proxy['plugin-opts'] = {
                    password: params['shadow-tls-password'],
                    ...(params['shadow-tls-sni'] ? { host: params['shadow-tls-sni'] } : {}),
                    ...(params['shadow-tls-version']
                        ? { version: parseInt(params['shadow-tls-version'], 10) }
                        : {})
                };
                if (params['udp-port']) proxy['udp-port'] = parseInt(params['udp-port'], 10);
            } else if (params.obfs === 'http' || params.obfs === 'tls') {
                proxy.plugin = 'obfs';
                proxy['plugin-opts'] = {
                    mode: params.obfs,
                    ...(params['obfs-host'] ? { host: params['obfs-host'] } : {}),
                    ...(params['obfs-uri'] ? { path: params['obfs-uri'] } : {})
                };
            }
            if (params['udp-over-tcp'] === 'true') proxy['udp-over-tcp'] = true;
            break;
        case 'vmess':
            proxy.uuid = params.username;
            proxy.alterId = 0; // Surge 始终使用 AEAD 模式
            break;
        case 'vless':
            proxy.uuid = params.username;
            if (params.flow) proxy.flow = params.flow;
            if (params.encryption) proxy.encryption = params.encryption;
            if (params['reality-public-key'] || params['public-key']) {
                const realityOpts: Record<string, any> = {
                    'public-key': params['reality-public-key'] || params['public-key'],
                    'short-id': params['reality-short-id'] || params['short-id'] || ''
                };
                const spx = params['reality-spider-x'] || params['spider-x'];
                if (spx) {
                    realityOpts['spider-x'] = spx;
                    realityOpts['_spider-x'] = spx;
                }
                const mlkem = params['support-x25519mlkem768'] ?? params.support_x25519mlkem768 ?? params['support-x25519-mlkem768'] ?? params.mlkem;
                if (mlkem !== undefined && ['1', 't', 'T', 'true', 'TRUE', 'True', true].includes(mlkem)) {
                    realityOpts['support-x25519mlkem768'] = true;
                }
                proxy['reality-opts'] = realityOpts as any;
                proxy.tls = true;
            }
            if (proxy['packet-encoding'] == null) {
                proxy['packet-encoding'] = 'xudp';
            }
            break;
        case 'tuic':
            proxy.uuid = params.uuid || params.username;
            if (params['congestion-controller'])
                proxy['congestion-controller'] = params['congestion-controller'];
            if (params['udp-relay-mode']) proxy['udp-relay-mode'] = params['udp-relay-mode'];
            if (params['reduce-rtt'] === 'true') proxy['reduce-rtt'] = true;
            if (params['disable-sni'] === 'true') proxy['disable-sni'] = true;
            break;
        case 'hysteria2':
            // password 已由通用逻辑处理
            if (params.up || params['upload-bandwidth'])
                proxy.up = params['upload-bandwidth'] || params.up;
            if (params.down || params['download-bandwidth'])
                proxy.down = params['download-bandwidth'] || params.down;
            if (params['salamander-password']) {
                proxy.obfs = 'salamander';
                proxy['obfs-password'] = params['salamander-password'];
            } else if (params['gecko-password']) {
                proxy.obfs = 'gecko';
                proxy['obfs-password'] = params['gecko-password'];
            }
            break;
        case 'snell':
            if (params.version) proxy.version = parseInt(params.version, 10);
            if (params.mode) proxy.mode = params.mode;
            if (params['quic-proxy-mode'] === 'true') proxy['quic-proxy-mode'] = true;
            if (params.userkey) proxy.userkey = params.userkey;
            if (params.reuse !== undefined) proxy.reuse = params.reuse === 'true';
            if (params.obfs) proxy.obfs = params.obfs;
            if (params['obfs-host']) proxy['obfs-host'] = params['obfs-host'];
            if (proxy.obfs || proxy['obfs-host'] || params['obfs-uri']) {
                proxy['obfs-opts'] = {
                    mode: proxy.obfs,
                    host: proxy['obfs-host'],
                    ...(params['obfs-uri'] ? { path: params['obfs-uri'] } : {})
                };
            }
            break;
        case 'anytls':
            if (params.reuse !== undefined) proxy.reuse = params.reuse === 'true';
            // AnyTLS session 相关参数
            if (params['idle-session-check-interval']) {
                const v = parseInt(params['idle-session-check-interval'], 10);
                if (!isNaN(v)) proxy['idle-session-check-interval'] = v;
            }
            if (params['idle-session-timeout']) {
                const v = parseInt(params['idle-session-timeout'], 10);
                if (!isNaN(v)) proxy['idle-session-timeout'] = v;
            }
            if (params['max-stream-count']) {
                const v = parseInt(params['max-stream-count'], 10);
                if (!isNaN(v)) proxy['max-stream-count'] = v;
            }
            break;
        case 'external':
            proxy.exec = params.exec;
            proxy.localPort = params['local-port'];
            if (params.args) proxy.args = smartSplit(params.args);
            if (params.addresses) proxy.addresses = smartSplit(params.addresses);
            break;
    }
}

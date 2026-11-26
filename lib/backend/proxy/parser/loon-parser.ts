/**
 * Sub-One Loon Parser
 *
 * 解析 Loon 格式的代理行
 * 包含对 WireGuard 复杂格式的支持
 */
import type { ProxyNode, ProxyType } from '../types';
import { normalizeReserved, parseEndpoint, parsePort, randomId } from '../utils';

/**
 * 解析 Loon 代理行
 */
export function parseLoon(line: string): ProxyNode | null {
    if (!line || !line.includes('=')) return null;

    try {
        const eqIdx = line.indexOf('=');
        let name = line.substring(0, eqIdx).trim();
        if (name.startsWith('"') && name.endsWith('"')) {
            name = name.substring(1, name.length - 1);
        }
        const content = line.substring(eqIdx + 1).trim();

        const parts = smartSplit(content);
        if (parts.length < 1) return null;

        const rawType = parts[0].toLowerCase();

        // 特殊处理 WireGuard
        if (rawType === 'wireguard') {
            return parseLoonWireGuard(name, content);
        }

        if (parts.length < 3) return null;

        const server = parts[1];
        const port = parsePort(parts[2]);

        const proxy: Partial<ProxyNode> = {
            id: randomId(),
            name,
            server,
            port
        };

        // Loon 协议/位置参数映射
        if (rawType === 'shadowsocks' || rawType === 'ss') {
            proxy.type = 'ss';
            if (parts.length >= 5) {
                proxy.cipher = parts[3];
                proxy.password = parts[4];
            }
        } else if (rawType === 'shadowsocksr' || rawType === 'ssr') {
            proxy.type = 'ssr';
            if (parts.length >= 7) {
                proxy.cipher = parts[3];
                proxy.password = parts[4];
                proxy.protocol = parts[5];
                proxy.obfs = parts[6];
            }
        } else if (rawType === 'vmess') {
            proxy.type = 'vmess';
            // Loon 格式: vmess,server,port,cipher,"uuid",...
            if (parts.length >= 4) proxy.cipher = parts[3].replace(/^"(.*)"$/, '$1');
            if (parts.length >= 5) proxy.uuid = parts[4].replace(/^"(.*)"$/, '$1');
        } else if (rawType === 'vless') {
            proxy.type = 'vless';
            if (parts.length >= 4) proxy.uuid = parts[3].replace(/^"(.*)"$/, '$1');
        } else if (rawType === 'tuic') {
            proxy.type = 'tuic';
            // Loon 格式: tuic,server,port,"uuid","password",...
            if (parts.length >= 4) proxy.uuid = parts[3].replace(/^"(.*)"$/, '$1');
            if (parts.length >= 5) proxy.password = parts[4].replace(/^"(.*)"$/, '$1');
        } else if (rawType === 'hysteria2') {
            proxy.type = 'hysteria2';
            // Loon 格式: Hysteria2,server,port,"password",...
            if (parts.length >= 4) proxy.password = parts[3].replace(/^"(.*)"$/, '$1');
        } else if (rawType === 'hysteria') {
            proxy.type = 'hysteria';
            // auth token at pos 3
            if (parts.length >= 4) proxy['auth'] = parts[3].replace(/^"(.*)"$/, '$1');
        } else if (rawType === 'trojan') {
            proxy.type = 'trojan';
            if (parts.length >= 4) proxy.password = parts[3];
        } else if (rawType === 'anytls') {
            proxy.type = 'anytls';
            if (parts.length >= 4) proxy.password = parts[3].replace(/^"(.*)"$/, '$1');
            proxy.tls = true; // AnyTLS 始终使用 TLS
        } else if (rawType === 'snell') {
            proxy.type = 'snell';
            if (parts.length >= 4 && !parts[3].includes('=')) {
                proxy.psk = parts[3].replace(/^"(.*)"$/, '$1');
                proxy.password = proxy.psk;
            }
        } else if (rawType === 'mieru') {
            proxy.type = 'mieru';
            if (parts.length >= 4 && !parts[3].includes('=')) {
                proxy.username = parts[3].replace(/^"(.*)"$/, '$1');
            }
            if (parts.length >= 5 && !parts[4].includes('=')) {
                proxy.password = parts[4].replace(/^"(.*)"$/, '$1');
            }
        } else if (rawType === 'http' || rawType === 'https' || rawType === 'socks5') {
            proxy.type = rawType as ProxyType;
            if (rawType === 'https') proxy.tls = true;
            if (parts.length >= 4 && !parts[3].includes('=')) {
                proxy.username = parts[3].replace(/^"(.*)"$/, '$1');
            }
            if (parts.length >= 5 && !parts[4].includes('=')) {
                proxy.password = parts[4].replace(/^"(.*)"$/, '$1');
            }
        } else {
            proxy.type = rawType as ProxyType;
        }

        // 解析命名参数
        const params: Record<string, string> = {};
        for (let i = 3; i < parts.length; i++) {
            const part = parts[i];
            if (part.includes('=')) {
                const [key, ...valParts] = part.split('=');
                params[key.trim().toLowerCase()] = valParts
                    .join('=')
                    .trim()
                    .replace(/^"(.*)"$/, '$1');
            }
        }

        mapLoonParams(proxy, params);

        return proxy as ProxyNode;
    } catch (e) {
        console.error('[parseLoon] Error:', e);
        return null;
    }
}

/**
 * 解析 Loon 复杂的 WireGuard 格式
 * 示例: WG-Node = wireguard, interface-ip=10.0.0.1, private-key=xxx, mtu=1420, peers=[{public-key=yyy, endpoint=server:51820, allowed-ips="0.0.0.0/0", reserved=[1,2,3]}]
 */
function parseLoonWireGuard(name: string, content: string): ProxyNode | null {
    // 提取简单参数
    const getParam = (p: string) => {
        const m = content.match(new RegExp(`(?:,|^)\\s*${p}\\s*=\\s*([^,\\[]+)`, 'i'));
        return m ? m[1].trim().replace(/^"(.*)"$/, '$1') : undefined;
    };

    const privateKey = getParam('private-key');
    const ip = getParam('interface-ip');
    const ipv6 = getParam('interface-ipv6');
    const mtu = getParam('mtu');
    const keepalive = getParam('keepalive');
    const dns = getParam('dns');
    const dnsv6 = getParam('dnsv6');

    // 提取 peers 列表 (通常 Loon 只支持一个 peer 在这种简易模式下)
    const peersMatch = content.match(/peers\s*=\s*\[\s*\{\s*(.*?)\s*\}\s*\]/i);
    if (!peersMatch) return null;

    const peerContent = peersMatch[1];
    const getPeerParam = (p: string) => {
        const m = peerContent.match(new RegExp(`(?:,|^)\\s*${p}\\s*=\\s*(\\[[^\\]]*\\]|"[^"]*"|[^,]+)`, 'i'));
        return m ? m[1].trim().replace(/^"(.*)"$/, '$1') : undefined;
    };

    const endpoint = getPeerParam('endpoint');
    const publicKey = getPeerParam('public-key');
    const psk = getPeerParam('preshared-key');
    const reservedStr = getPeerParam('reserved');
    const allowedIpsStr = getPeerParam('allowed-ips');

    if (!endpoint) return null;

    const ep = parseEndpoint(endpoint);
    const server = ep.server;
    const port = parsePort(ep.port ?? 51820);

    const proxy: ProxyNode = {
        id: randomId(),
        name,
        type: 'wireguard',
        server,
        port,
        'private-key': privateKey,
        'public-key': publicKey,
        'pre-shared-key': psk,
        ip,
        ipv6,
        mtu: mtu ? parseInt(mtu, 10) : undefined,
        keepalive: keepalive ? parseInt(keepalive, 10) : undefined,
        'persistent-keepalive': keepalive ? parseInt(keepalive, 10) : undefined,
        udp: true
    };

    if (dns || dnsv6) {
        const dnsList: string[] = [];
        if (dns) dnsList.push(dns);
        if (dnsv6) dnsList.push(dnsv6);
        proxy.dns = dnsList.length === 1 ? dnsList[0] : dnsList;
    }

    if (allowedIpsStr) {
        proxy['allowed-ips'] = allowedIpsStr.split(',').map((s) => s.trim().replace(/^"(.*)"$/, '$1')).filter(Boolean);
    }

    if (reservedStr) {
        proxy.reserved = normalizeReserved(reservedStr);
    }

    // 构造标准的 peers 数组
    proxy.peers = [
        {
            server,
            port,
            endpoint,
            'public-key': publicKey,
            'pre-shared-key': psk,
            'allowed-ips': proxy['allowed-ips'] || ['0.0.0.0/0', '::/0'],
            reserved: proxy.reserved as number[]
        }
    ];

    return proxy;
}

function smartSplit(str: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    let inBrackets = 0; // 增加括号追踪，处理 peers=[{...}]

    for (let i = 0; i < str.length; i++) {
        const char = str[i];
        if (char === '"') inQuotes = !inQuotes;
        if (char === '[' && !inQuotes) inBrackets++;
        if (char === ']' && !inQuotes) inBrackets--;

        if (char === ',' && !inQuotes && inBrackets === 0) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result.filter((s) => s.length > 0);
}

function mapLoonParams(proxy: Partial<ProxyNode>, params: Record<string, string>) {
    if (params.password) proxy.password = params.password;
    if (params.psk) proxy.password = params.psk;
    if (params.version) proxy.version = parseInt(params.version, 10);
    if (params.username) proxy.username = params.username;
    if (params.encrypt || params['encrypt-method'])
        proxy.cipher = params.encrypt || params['encrypt-method'];
    if (params['salamander-password']) {
        proxy.obfs = 'salamander';
        proxy['obfs-password'] = params['salamander-password'];
    }
    if (params.alpn) {
        proxy.alpn = params.alpn.split(',').map((s) => s.trim().replace(/^"(.*)"$/, '$1'));
    }

    const implicitTls = ['https', 'anytls', 'trojan', 'tuic', 'hysteria', 'hysteria2'].includes(
        proxy.type || ''
    );
    proxy.tls =
        params.tls === 'true' ||
        params['over-tls'] === 'true' ||
        proxy.tls === true ||
        (implicitTls && params.tls !== 'false' && params['over-tls'] !== 'false');
    if (params.sni || params['tls-name']) proxy.sni = params.sni || params['tls-name'];
    if (params['skip-cert-verify'])
        proxy['skip-cert-verify'] = params['skip-cert-verify'] === 'true';
    if (params['tls-cert-sha256']) proxy['tls-fingerprint'] = params['tls-cert-sha256'];
    if (params['tls-pubkey-sha256']) proxy['tls-pubkey-sha256'] = params['tls-pubkey-sha256'];
    if (params.udp) proxy.udp = params.udp === 'true';
    if (params['fast-open']) proxy.tfo = params['fast-open'] === 'true';
    if (params['underlying-proxy']) proxy['underlying-proxy'] = params['underlying-proxy'];
    if (params['server-ports']) proxy.ports = params['server-ports'];
    if (params['hop-interval']) {
        const hi = parseInt(params['hop-interval'], 10);
        if (!isNaN(hi)) proxy['hop-interval'] = hi;
    }
    if (params['download-bandwidth']) proxy.down = params['download-bandwidth'];
    if (params['upload-bandwidth']) proxy.up = params['upload-bandwidth'];
    if (params['block-quic']) {
        if (params['block-quic'] === 'true' || params['block-quic'] === 'on') proxy['block-quic'] = true;
        else if (params['block-quic'] === 'false' || params['block-quic'] === 'off') proxy['block-quic'] = false;
        else proxy['block-quic'] = params['block-quic'];
    }
    if (params['ip-mode']) {
        const loonIpMap: Record<string, string> = {
            dual: 'dual',
            'v4-only': 'ipv4',
            'v6-only': 'ipv6',
            'prefer-v4': 'ipv4-prefer',
            'prefer-v6': 'ipv6-prefer'
        };
        proxy['ip-version'] = loonIpMap[params['ip-mode']] || params['ip-mode'];
    }
    if (params['server-dns']) {
        proxy['server-dns'] = params['server-dns']
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }

    // Reality 参数解析
    if (params['public-key'] || params.pbk) {
        if (!proxy['reality-opts']) proxy['reality-opts'] = {};
        proxy['reality-opts']['public-key'] = (params['public-key'] || params.pbk).replace(/^"(.*)"$/, '$1');
        if (params['short-id'] || params.sid) {
            proxy['reality-opts']['short-id'] = (params['short-id'] || params.sid).replace(/^"(.*)"$/, '$1');
        }
        if (params['spider-x'] || params.spx) {
            const spx = (params['spider-x'] || params.spx).replace(/^"(.*)"$/, '$1');
            proxy['reality-opts']['spider-x'] = spx;
            proxy['reality-opts']['_spider-x'] = spx;
        }
        proxy.tls = true;
    }

    // TLS Profile
    if (params['tls-profile']) {
        const tp = params['tls-profile'].trim();
        proxy._loon_tls_profile = tp;
        if (['chrome', 'chrome147'].includes(tp)) {
            proxy['client-fingerprint'] = 'chrome';
        } else if (['safari-ios18', 'safari-ios-26'].includes(tp)) {
            proxy['client-fingerprint'] = 'safari';
        }
        if (['chrome147', 'safari-ios-26'].includes(tp)) {
            if (proxy['reality-opts']) {
                proxy['reality-opts']['support-x25519mlkem768'] = true;
            }
        }
    }

    // Flow & VLESS Encryption
    if (params.flow || params['vless-flow']) {
        proxy.flow = params.flow || params['vless-flow'];
    }
    if (params['encryption-public-keys']) {
        const encMode = params['encryption-mode'] || 'native';
        const encRtt = params['encryption-rtt'] || '0rtt';
        const encKeys = params['encryption-public-keys'].replace(/^"(.*)"$/, '$1');
        proxy.encryption = `mlkem768x25519plus.${encMode}.${encRtt}.${encKeys}`;
    } else if (params.encryption) {
        proxy.encryption = params.encryption;
    }

    // Packet Encoding
    if (params['packet-encoding'] || params.packetencoding) {
        proxy['packet-encoding'] = params['packet-encoding'] || params.packetencoding;
    }

    // VMess alterId 命名参数
    if (params.alterid !== undefined) proxy.alterId = parseInt(params.alterid, 10);
    else if (params['alter-id'] !== undefined) proxy.alterId = parseInt(params['alter-id'], 10);

    // 传输层: transport=ws/grpc/xhttp/http (Loon VMess/Trojan/VLESS 格式)
    if (params.transport === 'ws' || params.transport === 'wss') {
        proxy.network = 'ws';
        proxy['ws-opts'] = {
            path: params.path || '/',
            headers: params.host ? { Host: params.host } : {}
        };
        if (params.transport === 'wss') proxy.tls = true;
    } else if (params.transport === 'xhttp' || params.transport === 'splithttp') {
        proxy.network = 'xhttp';
        const xmux: Record<string, any> = {};
        const xmuxKeys = [
            ['xhttp-xmux-max-connections', 'max-connections'],
            ['xhttp-xmux-max-concurrency', 'max-concurrency'],
            ['xhttp-xmux-c-max-reuse-times', 'c-max-reuse-times'],
            ['xhttp-xmux-h-max-request-times', 'h-max-request-times'],
            ['xhttp-xmux-h-max-reusable-secs', 'h-max-reusable-secs'],
            ['xhttp-xmux-h-keep-alive-period', 'h-keep-alive-period']
        ] as const;
        for (const [paramKey, xmuxKey] of xmuxKeys) {
            if (params[paramKey] !== undefined) {
                const num = parseInt(params[paramKey], 10);
                xmux[xmuxKey] = isNaN(num) ? params[paramKey] : num;
            }
        }
        proxy['xhttp-opts'] = {
            path: params.path || '/',
            ...(params.host ? { host: params.host } : {}),
            ...(params['xhttp-mode'] || params.mode ? { mode: params['xhttp-mode'] || params.mode } : {}),
            ...(Object.keys(xmux).length > 0 ? { xmux } : {})
        } as any;
    } else if (params.transport === 'grpc') {
        proxy.network = 'grpc';
        const svcName = params['grpc-service-name'] || params.servicename || params.path || '';
        proxy['grpc-opts'] = {
            'grpc-service-name': svcName,
            'service-name': svcName
        } as any;
    } else if (params.transport === 'http') {
        proxy.network = 'http';
        proxy['http-opts'] = {
            path: params.path || '/',
            headers: params.host ? { Host: params.host } : {}
        } as any;
    }

    // TUIC 特有参数
    if (proxy.type === 'tuic') {
        if (params['congestion-controller']) {
            proxy['congestion-controller'] = params['congestion-controller'];
        }
        if (params['udp-relay-mode']) proxy['udp-relay-mode'] = params['udp-relay-mode'];
        if (params['reduce-rtt'] === 'true') proxy['reduce-rtt'] = true;
        if (params['disable-sni'] === 'true') proxy['disable-sni'] = true;
    }

    // AnyTLS session 参数
    if (proxy.type === 'anytls') {
        if (params.reuse !== undefined) proxy.reuse = params.reuse === 'true';
        if (params['idle-session-check-interval']) {
            const v = parseInt(params['idle-session-check-interval'], 10);
            if (Number.isInteger(v)) proxy['idle-session-check-interval'] = v;
        }
        if (params['idle-session-timeout']) {
            const v = parseInt(params['idle-session-timeout'], 10);
            if (Number.isInteger(v)) proxy['idle-session-timeout'] = v;
        }
        if (params['min-idle-session']) {
            const v = parseInt(params['min-idle-session'], 10);
            if (Number.isInteger(v)) proxy['min-idle-session'] = v;
        }
        if (params['max-stream-count']) {
            const v = parseInt(params['max-stream-count'], 10);
            if (Number.isInteger(v)) proxy['max-stream-count'] = v;
        }
    }

    // Shadowsocks obfs / shadow-tls 插件参数
    if (proxy.type === 'ss') {
        if (params['obfs-name']) {
            proxy.plugin = 'obfs';
            proxy['plugin-opts'] = {
                mode: params['obfs-name'],
                ...(params['obfs-host'] ? { host: params['obfs-host'] } : {}),
                ...(params['obfs-uri'] ? { path: params['obfs-uri'] } : {})
            };
        } else if (params['shadow-tls-password']) {
            proxy.plugin = 'shadow-tls';
            proxy['plugin-opts'] = {
                password: params['shadow-tls-password'],
                ...(params['shadow-tls-sni'] ? { host: params['shadow-tls-sni'] } : {}),
                ...(params['shadow-tls-version']
                    ? { version: parseInt(params['shadow-tls-version'], 10) }
                    : {})
            };
            if (params['udp-port']) proxy['udp-port'] = parseInt(params['udp-port'], 10);
        }
        if (params['udp-over-tcp'] === 'true') {
            proxy['udp-over-tcp'] = true;
        }
    }

    // 传输层
    if (params.obfs === 'ws' || params.obfs === 'wss') {
        proxy.network = 'ws';
        if (params.obfs === 'wss') proxy.tls = true;
        proxy['ws-opts'] = {
            path: params['path'] || '/',
            headers: params['host'] ? { Host: params['host'] } : {}
        };
    }

    // Snell 协议特有参数
    if (params.obfs && params.obfs !== 'ws' && params.obfs !== 'wss') proxy.obfs = params.obfs;
    if (params['obfs-host']) proxy['obfs-host'] = params['obfs-host'];
    if (params.reuse !== undefined && proxy.type === 'snell') proxy.reuse = params.reuse === 'true';
    if (proxy.type === 'snell' && (proxy.obfs || proxy['obfs-host'] || params['obfs-uri'])) {
        proxy['obfs-opts'] = {
            mode: proxy.obfs,
            host: proxy['obfs-host'],
            ...(params['obfs-uri'] ? { path: params['obfs-uri'] } : {})
        };
    }
}

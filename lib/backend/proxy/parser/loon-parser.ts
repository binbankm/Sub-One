/**
 * Sub-One Loon Parser
 *
 * 解析 Loon 格式的代理行
 * 包含对 WireGuard 复杂格式的支持
 */
import type { ProxyNode, ProxyType } from '../types';
import { normalizeReserved, parsePort, randomId } from '../utils';

/**
 * 解析 Loon 代理行
 */
export function parseLoon(line: string): ProxyNode | null {
    if (!line || !line.includes('=')) return null;

    try {
        const eqIdx = line.indexOf('=');
        const name = line.substring(0, eqIdx).trim();
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
            if (parts.length >= 4) proxy.password = parts[3];
            proxy.tls = true; // AnyTLS 始终使用 TLS
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

    const [server, portStr] = endpoint.split(':');
    const port = parsePort(portStr);

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

    proxy.tls =
        params.tls === 'true' ||
        params['over-tls'] === 'true' ||
        proxy.type === 'https' ||
        proxy.type === 'anytls';
    if (params.sni || params['tls-name']) proxy.sni = params.sni || params['tls-name'];
    if (params['skip-cert-verify'])
        proxy['skip-cert-verify'] = params['skip-cert-verify'] === 'true';
    if (params['tls-cert-sha256']) proxy['tls-fingerprint'] = params['tls-cert-sha256'];
    if (params['tls-pubkey-sha256']) proxy['tls-pubkey-sha256'] = params['tls-pubkey-sha256'];
    if (params.udp) proxy.udp = params.udp === 'true';
    if (params['fast-open']) proxy.tfo = params['fast-open'] === 'true';

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

    // Flow
    if (params.flow || params['vless-flow']) {
        proxy.flow = params.flow || params['vless-flow'];
    }

    // Packet Encoding
    if (params['packet-encoding'] || params.packetencoding) {
        proxy['packet-encoding'] = params['packet-encoding'] || params.packetencoding;
    }

    // VMess alterId 命名参数
    if (params.alterid !== undefined) proxy.alterId = parseInt(params.alterid, 10);
    else if (params['alter-id'] !== undefined) proxy.alterId = parseInt(params['alter-id'], 10);

    // 传输层: transport=ws/grpc (Loon VMess/Trojan/VLESS 格式)
    if (params.transport === 'ws' || params.transport === 'wss') {
        proxy.network = 'ws';
        proxy['ws-opts'] = {
            path: params.path || '/',
            headers: params.host ? { Host: params.host } : {}
        };
        if (params.transport === 'wss') proxy.tls = true;
    } else if (params.transport === 'grpc') {
        proxy.network = 'grpc';
        proxy['grpc-opts'] = {
            'grpc-service-name': params['grpc-service-name'] || params.servicename || ''
        } as any;
    }

    // AnyTLS session 参数
    if (proxy.type === 'anytls') {
        if (params['idle-session-timeout']) {
            const v = parseInt(params['idle-session-timeout'], 10);
            if (Number.isInteger(v)) proxy['idle-session-timeout'] = v;
        }
        if (params['max-stream-count']) {
            const v = parseInt(params['max-stream-count'], 10);
            if (Number.isInteger(v)) proxy['max-stream-count'] = v;
        }
    }

    // 传输层
    if (params.obfs === 'ws' || params.obfs === 'wss') {
        proxy.network = 'ws';
        proxy['ws-opts'] = {
            path: params['path'] || '/',
            headers: params['host'] ? { Host: params['host'] } : {}
        };
    }

    // Snell 协议特有参数
    if (params.obfs) proxy.obfs = params.obfs;
    if (params['obfs-host']) proxy['obfs-host'] = params['obfs-host'];
    if (proxy.type === 'snell' && (proxy.obfs || proxy['obfs-host'])) {
        proxy['obfs-opts'] = {
            mode: proxy.obfs,
            host: proxy['obfs-host']
        };
    }
}

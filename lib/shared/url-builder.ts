import { Node } from './types';
import { buildStandardQuery } from './parsers/helper';
import { encodeBase64 } from './converter/base64'; // We reuse the base64 util

/**
 * 将节点对象还原为 URL 链接
 */
export function buildNodeUrl(node: Node): string {
    try {
        switch (node.type) {
            case 'vless':
                return buildVlessUrl(node);
            case 'vmess':
                return buildVmessUrl(node);
            case 'trojan':
                return buildTrojanUrl(node);
            case 'ss':
                return buildShadowsocksUrl(node);
            case 'ssr':
                return buildSSRUrl(node);
            case 'hysteria':
                return buildHysteriaUrl(node);
            case 'hysteria2':
                return buildHysteria2Url(node);
            case 'tuic':
                return buildTuicUrl(node);
            case 'wireguard':
                return buildWireGuardUrl(node);
            case 'anytls':
                return buildAnyTLSUrl(node);
            case 'snell':
                return buildSnellUrl(node);
            default:
                // 如果是未知类型但有 originalUrl，则返回之
                if ('originalUrl' in node && node.originalUrl) {
                    return node.originalUrl as string;
                }
                return '';
        }
    } catch (e) {
        console.error(`构建节点 URL 失败 (${node.name}):`, e);
        return '';
    }
}

function buildVlessUrl(node: import('./types').VlessNode): string {
    const params = buildStandardQuery(node.transport, node.tls);

    if (node.flow) params.set('flow', node.flow);

    if (node.tls?.reality?.enabled) {
        params.set('security', 'reality');
    } else if (node.tls?.enabled) {
        params.set('security', 'tls');
    } else {
        params.set('security', 'none');
    }

    // Explicitly avoid some defaults that might be added by mistake or by some platforms
    if (params.get('type') === 'tcp') params.delete('type');
    if (params.get('headerType') === 'none') params.delete('headerType');

    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    // 使用 decodeURIComponent(encodeURIComponent(node.name)) 保证即使有双重转义也能正确处理？不，
    // 我们直接用 node.name. 
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `vless://${node.uuid}@${host}:${node.port}?${params.toString()}${hash}`;
}

function buildVmessUrl(node: import('./types').VmessNode): string {
    // 优先构建 Base64 JSON 格式 (V2rayN)
    const config: any = {
        v: '2',
        ps: node.name,
        add: node.server,
        port: node.port,
        id: node.uuid,
        aid: node.alterId,
        scy: node.cipher,
        net: node.transport?.type || 'tcp',
        type: 'none',
        tls: node.tls?.enabled ? 'tls' : ''
    };

    if (node.tls) {
        if (node.tls.serverName) config.sni = node.tls.serverName;
        if (node.tls.alpn) config.alpn = node.tls.alpn.join(',');
        if (node.tls.fingerprint) config.fp = node.tls.fingerprint;
        if (node.tls.insecure) config.allowInsecure = true;
    }

    if (node.transport) {
        if (node.transport.type === 'ws') {
            config.host = node.transport.headers?.Host || '';
            config.path = node.transport.path || '/';
        } else if (node.transport.type === 'grpc') {
            config.path = node.transport.serviceName || '';
            if (node.transport.mode === 'multi') config.type = 'multi';
        } else if (node.transport.type === 'h2') {
            config.path = node.transport.path || '/';
            config.host = node.transport.host ? node.transport.host.join(',') : '';
        }
    }

    return `vmess://${encodeBase64(JSON.stringify(config))}`;
}

function buildTrojanUrl(node: import('./types').TrojanNode): string {
    const params = buildStandardQuery(node.transport, node.tls);
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    // Trojan 默认 TLS
    if (node.tls?.insecure) params.set('allowInsecure', '1');

    return `trojan://${encodeURIComponent(node.password)}@${host}:${node.port}?${params.toString()}${hash}`;
}

function buildShadowsocksUrl(node: import('./types').ShadowsocksNode): string {
    const userInfo = `${node.cipher}:${node.password}`;
    const base64Info = encodeBase64(userInfo);
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    let url = `ss://${base64Info}@${host}:${node.port}`;

    // Plugin
    if (node.plugin) {
        let pluginStr = node.plugin;
        if (node.pluginOpts) {
            const opts = Object.entries(node.pluginOpts)
                .map(([k, v]) => `${k}=${v}`)
                .join(';');
            pluginStr += `;${opts}`;
        }
        url += `?plugin=${encodeURIComponent(pluginStr)}`;
    }

    return url + hash;
}

function buildHysteriaUrl(node: import('./types').HysteriaNode): string {
    const params = buildStandardQuery(undefined, node.tls);

    if (node.auth) params.set('auth', node.auth);
    if (node.upMbps) params.set('upmbps', String(node.upMbps));
    if (node.downMbps) params.set('downmbps', String(node.downMbps));
    if (node.obfs) params.set('obfs', node.obfs);
    if (node.obfsParam) params.set('obfsParam', node.obfsParam);
    if (node.protocol) params.set('protocol', node.protocol);

    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `hysteria://${host}:${node.port}?${params.toString()}${hash}`;
}

function buildHysteria2Url(node: import('./types').Hysteria2Node): string {
    const params = buildStandardQuery(undefined, node.tls);
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    if (node.obfs) {
        params.set('obfs', node.obfs.type);
        params.set('obfs-password', node.obfs.password);
    }

    // Hy2 password is in user info
    return `hysteria2://${encodeURIComponent(node.password || '')}@${host}:${node.port}?${params.toString()}${hash}`;
}

function buildTuicUrl(node: import('./types').TuicNode): string {
    const params = buildStandardQuery(undefined, node.tls);
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    if (node.congestionControl) params.set('congestion_control', node.congestionControl);
    if (node.udpRelayMode) params.set('udp_relay_mode', node.udpRelayMode);

    const userInfo = node.password ? `${node.uuid}:${node.password}` : node.uuid;

    return `tuic://${encodeURIComponent(userInfo)}@${host}:${node.port}?${params.toString()}${hash}`;
}

function buildWireGuardUrl(node: import('./types').WireGuardNode): string {
    const params = new URLSearchParams();
    if (node.publicKey) params.set('public-key', node.publicKey);
    if (node.ip) params.set('ip', node.ip);
    if (node.ipv6) params.set('ipv6', node.ipv6);
    if (node.preSharedKey) params.set('preshared-key', node.preSharedKey);
    if (node.mtu) params.set('mtu', String(node.mtu));

    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `wireguard://${encodeURIComponent(node.privateKey)}@${host}:${node.port}?${params.toString()}${hash}`;
}

function buildAnyTLSUrl(node: import('./types').AnyTLSNode): string {
    const params = buildStandardQuery(undefined, node.tls);

    if (node.clientFingerprint) params.set('fp', node.clientFingerprint);
    if (node.idleTimeout) params.set('idle_timeout', String(node.idleTimeout));
    if (node.tls?.enabled) params.set('tls', '1');

    const userInfo = node.password ? `${encodeURIComponent(node.password)}@` : '';
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `anytls://${userInfo}${host}:${node.port}?${params.toString()}${hash}`;
}

function buildSSRUrl(node: import('./types').ShadowsocksRNode): string {
    const server = node.server;
    const port = node.port;
    const protocol = node.protocol || 'origin';
    const method = node.cipher;
    const obfs = node.obfs || 'plain';
    const passwordBase64 = encodeBase64(node.password);

    const mainPart = `${server}:${port}:${protocol}:${method}:${obfs}:${passwordBase64}`;

    const params = new URLSearchParams();
    if (node.name) params.set('remarks', encodeBase64(node.name));
    if (node.protocolParam) params.set('protoparam', encodeBase64(node.protocolParam));
    if (node.obfsParam) params.set('obfsparam', encodeBase64(node.obfsParam));

    const queryStr = params.toString();
    const fullContent = queryStr ? `${mainPart}/?${queryStr}` : mainPart;

    return `ssr://${encodeBase64(fullContent)}`;
}

function buildSnellUrl(node: import('./types').SnellNode): string {
    const params = new URLSearchParams();
    if (node.version) params.set('version', node.version);
    if (node.obfs) {
        params.set('obfs', node.obfs.type);
        if (node.obfs.host) params.set('host', node.obfs.host);
    }

    // Some implementations prefer psk in query
    params.set('psk', node.password);

    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `snell://${host}:${node.port}?${params.toString()}${hash}`;
}

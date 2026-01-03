import { Node, ConverterOptions, VmessNode, VlessNode, TrojanNode, ShadowsocksNode, Hysteria2Node, TuicNode, WireGuardNode } from '../types';

/**
 * 转换为 Sing-Box JSON 配置
 */
export function toSingBox(nodes: Node[], _options: ConverterOptions = {}): string {
    const outbounds = nodes
        .map(node => nodeToSingBoxOutbound(node))
        .filter(o => o !== null);

    const config = {
        log: { level: 'info' },
        dns: {
            servers: [
                { tag: 'google', address: '8.8.8.8', strategy: 'prefer_ipv4' },
                { tag: 'local', address: '223.5.5.5', detour: 'direct', strategy: 'prefer_ipv4' }
            ],
            rules: [
                { geosite: 'cn', server: 'local' },
                { outbound: 'any', server: 'local' }
            ]
        },
        inbounds: [
            {
                type: 'mixed',
                tag: 'mixed-in',
                listen: '127.0.0.1',
                listen_port: 2080,
                sniff: true
            }
        ],
        outbounds: [
            {
                type: 'selector',
                tag: 'proxy',
                outbounds: ['auto', 'direct', ...outbounds.map(o => o.tag)],
                default: 'auto'
            },
            {
                type: 'urltest',
                tag: 'auto',
                outbounds: outbounds.map(o => o.tag),
                url: 'http://www.gstatic.com/generate_204',
                interval: '10m',
                tolerance: 50
            },
            { type: 'direct', tag: 'direct' },
            { type: 'block', tag: 'block' },
            { type: 'dns', tag: 'dns-out' },
            ...outbounds
        ],
        route: {
            rules: [
                { protocol: 'dns', outbound: 'dns-out' },
                { geosite: 'cn', outbound: 'direct' },
                { geoip: 'cn', outbound: 'direct' }
            ],
            auto_detect_interface: true
        }
    };

    return JSON.stringify(config, null, 2);
}

function nodeToSingBoxOutbound(node: Node): any {
    try {
        switch (node.type) {
            case 'vmess': return buildVmess(node as VmessNode);
            case 'vless': return buildVless(node as VlessNode);
            case 'trojan': return buildTrojan(node as TrojanNode);
            case 'ss': return buildShadowsocks(node as ShadowsocksNode);
            case 'hysteria2': return buildHysteria2(node as Hysteria2Node);
            case 'tuic': return buildTuic(node as TuicNode);
            case 'wireguard': return buildWireGuard(node as WireGuardNode);
            default:
                console.warn(`[SingBox] Unsupported node type: ${node.type}`);
                return null;
        }
    } catch (e) {
        console.error(`[SingBox] Failed to convert node ${node.name}:`, e);
        return null;
    }
}

// --- Specific Builders ---

function buildBase(node: Node) {
    return {
        tag: node.name,
        server: node.server,
        server_port: node.port
    };
}

function assignTransport(outbound: any, node: { transport?: import('../types').TransportOptions }) {
    const t = node.transport;
    if (!t || t.type === 'tcp') return;

    if (t.type === 'ws') {
        outbound.transport = {
            type: 'ws',
            path: t.path,
            headers: t.headers
        };
    } else if (t.type === 'grpc') {
        outbound.transport = {
            type: 'grpc',
            service_name: t.serviceName
        };
    } else if (t.type === 'http' || t.type === 'h2') {
        outbound.transport = {
            type: 'http',
            path: t.path,
            host: t.host
        };
    } else if (t.type === 'quic') {
        outbound.transport = {
            type: 'quic'
        };
    }
}

function assignTls(outbound: any, node: { tls?: import('../types').TlsOptions }) {
    const tls = node.tls;
    if (!tls || !tls.enabled) return;

    outbound.tls = {
        enabled: true,
        server_name: tls.serverName,
        insecure: tls.insecure,
        alpn: tls.alpn
    };

    if (tls.reality?.enabled) {
        outbound.tls.reality = {
            enabled: true,
            public_key: tls.reality.publicKey,
            short_id: tls.reality.shortId
        };
    }
}

function buildVmess(node: VmessNode): any {
    const outbound: any = {
        type: 'vmess',
        ...buildBase(node),
        uuid: node.uuid,
        alter_id: node.alterId,
        security: node.cipher
    };
    // SingBox VMess TLS structure is inside 'tls', handled by assignTls
    assignTls(outbound, node);
    assignTransport(outbound, node);
    return outbound;
}

function buildVless(node: VlessNode): any {
    const outbound: any = {
        type: 'vless',
        ...buildBase(node),
        uuid: node.uuid,
        flow: node.flow
    };
    assignTls(outbound, node);
    assignTransport(outbound, node);
    return outbound;
}

function buildTrojan(node: TrojanNode): any {
    const outbound: any = {
        type: 'trojan',
        ...buildBase(node),
        password: node.password
    };
    assignTls(outbound, node);
    assignTransport(outbound, node);
    return outbound;
}

function buildShadowsocks(node: ShadowsocksNode): any {
    const outbound: any = {
        type: 'shadowsocks',
        ...buildBase(node),
        method: node.cipher,
        password: node.password
    };
    if (node.plugin) {
        outbound.plugin = node.plugin;
        outbound.plugin_opts = ""; // SingBox plugin options string format?
        // TODO: Map plugin opts object to string if needed
    }
    return outbound;
}

function buildHysteria2(node: Hysteria2Node): any {
    const outbound: any = {
        type: 'hysteria2',
        ...buildBase(node),
        password: node.password
    };
    if (node.obfs) {
        outbound.obfs = {
            type: node.obfs.type,
            password: node.obfs.password
        };
    }
    assignTls(outbound, node);
    return outbound;
}

function buildTuic(node: TuicNode): any {
    const outbound: any = {
        type: 'tuic',
        ...buildBase(node),
        uuid: node.uuid,
        password: node.password,
        congestion_control: node.congestionControl
    };
    if (node.udpRelayMode) outbound.udp_relay_mode = node.udpRelayMode;
    assignTls(outbound, node);
    return outbound;
}

function buildWireGuard(node: WireGuardNode): any {
    const outbound: any = {
        type: 'wireguard',
        tag: node.name,
        server: node.server,
        server_port: node.port,
        private_key: node.privateKey,
        peer_public_key: node.publicKey,
        local_address: [node.ip, node.ipv6].filter(Boolean),
        mtu: node.mtu
    };
    if (node.preSharedKey) outbound.pre_shared_key = node.preSharedKey;
    return outbound;
}

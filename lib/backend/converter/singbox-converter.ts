
import { ProxyNode, ConverterOptions, VmessNode, VlessNode, TrojanNode, ShadowsocksNode, HysteriaNode, Hysteria2Node, TuicNode, WireGuardNode, AnyTLSNode, Socks5Node, TransportOptions, TlsOptions, SingBoxOutbound } from '../../shared/types';



/**
 * 转换为 Sing-Box JSON 配置
 */
export function toSingBox(nodes: ProxyNode[], _options: ConverterOptions = {}): string {


    const outbounds = nodes
        .map(node => nodeToSingBoxOutbound(node))
        .filter((o): o is SingBoxOutbound => o !== null);

    return JSON.stringify({
        outbounds: outbounds,
        // Minimize other fields but keep basic structure valid
        route: {
            rules: [],
            final: undefined
        }
    }, null, 2);


}

function nodeToSingBoxOutbound(node: ProxyNode): SingBoxOutbound | null {
    try {
        switch (node.type) {
            case 'vmess': return buildVmess(node as VmessNode);
            case 'vless': return buildVless(node as VlessNode);
            case 'trojan': return buildTrojan(node as TrojanNode);
            case 'ss': return buildShadowsocks(node as ShadowsocksNode);
            case 'hysteria': return buildHysteria(node as HysteriaNode);
            case 'hysteria2': return buildHysteria2(node as Hysteria2Node);
            case 'tuic': return buildTuic(node as TuicNode);
            case 'wireguard': return buildWireGuard(node as WireGuardNode);
            case 'anytls': return buildAnyTLS(node as AnyTLSNode);

            case 'socks5': return buildSocks5(node as Socks5Node);
            default:
                console.warn(`[SingBox] Unsupported node type: ${node.type} `);
                return null;
        }
    } catch (e) {
        console.error(`[SingBox] Failed to convert node ${node.name}: `, e);
        return null;
    }
}

// --- Specific Builders ---

function buildBase(node: ProxyNode) {
    return {
        tag: node.name,
        server: node.server,
        server_port: node.port
    };
}

function assignTransport(outbound: SingBoxOutbound, node: { transport?: TransportOptions }) {
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

function assignTls(outbound: SingBoxOutbound, node: { tls?: TlsOptions }) {
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

function buildVmess(node: VmessNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
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

function buildVless(node: VlessNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'vless',
        ...buildBase(node),
        uuid: node.uuid,
        flow: node.flow
    };
    assignTls(outbound, node);
    assignTransport(outbound, node);
    return outbound;
}

function buildTrojan(node: TrojanNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'trojan',
        ...buildBase(node),
        password: node.password
    };
    assignTls(outbound, node);
    assignTransport(outbound, node);
    return outbound;
}

function buildShadowsocks(node: ShadowsocksNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
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

function buildHysteria(node: HysteriaNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'hysteria',
        ...buildBase(node),
        auth_str: node.auth,
        up_mbps: node.upMbps,
        down_mbps: node.downMbps,
        obfs: node.obfs,
        protocol: node.protocol
    };
    assignTls(outbound, node);
    return outbound;
}

function buildHysteria2(node: Hysteria2Node): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
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

function buildTuic(node: TuicNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
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

function buildWireGuard(node: WireGuardNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'wireguard',
        tag: node.name,
        server: node.server,
        server_port: node.port,
        private_key: node.privateKey,
        peer_public_key: node.publicKey,
        local_address: [node.ip, node.ipv6].filter((i): i is string => !!i),
        mtu: node.mtu
    };
    if (node.preSharedKey) outbound.pre_shared_key = node.preSharedKey;
    return outbound;
}

function buildAnyTLS(node: AnyTLSNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'anytls',
        ...buildBase(node),
        password: node.password,
        idle_timeout: node.idleTimeout
    };

    if (node.clientFingerprint) {
        outbound.client_fingerprint = node.clientFingerprint;
    }

    assignTls(outbound, node);
    return outbound;
}



function buildSocks5(node: Socks5Node): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'socks5',
        ...buildBase(node),
        username: node.username,
        password: node.password
    };
    // SingBox socks5 outbound does not support TLS typically for standard socks5, but let's keep it consistent if singbox supports socks5+tls (unlikely standard, but maybe over tls transport?)
    // Actually standard socks5 in sing-box is just tcp/udp. If it's over TLS it might be different structure. 
    // But for basic compatibility:
    return outbound;
}

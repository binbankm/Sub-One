/**
 * =================================================================
 * Sing-Box 转换器 - 完整参数增强版
 * =================================================================
 * 
 * 设计原则:
 * 1. 参数完整性优先
 * 2. 符合 Sing-Box 最新规范
 * 3. 零参数丢失
 * 
 * 参考规范:
 * - Sing-Box: https://sing-box.sagernet.org/
 * - GitHub: https://github.com/SagerNet/sing-box
 * 
 * @module converter/singbox-enhanced
 * =================================================================
 */

import {
    ProxyNode, ConverterOptions, VmessNode, VlessNode, TrojanNode,
    ShadowsocksNode, HysteriaNode, Hysteria2Node, TuicNode,
    WireGuardNode, AnyTLSNode, Socks5Node,
    TransportOptions, TlsOptions, SingBoxOutbound
} from '../../shared/types';

const DEBUG = typeof process !== 'undefined' && process.env?.DEBUG_CONVERTER === '1';

/**
 * 转换为 Sing-Box JSON 配置
 */
export function toSingBox(nodes: ProxyNode[], options: ConverterOptions = {}): string {
    const outbounds = nodes
        .map(node => {
            const outbound = nodeToSingBoxOutbound(node);

            if (outbound && options.skipCertVerify && outbound.tls) {
                outbound.tls.insecure = true;
            }

            return outbound;
        })
        .filter((o): o is SingBoxOutbound => o !== null);

    if (DEBUG) {
        console.log(`[Sing-Box] 成功转换 ${outbounds.length}/${nodes.length} 个节点`);
    }

    return JSON.stringify({
        outbounds: outbounds,
        route: {
            rules: [],
            final: 'direct'
        }
    }, null, 2);
}

export function nodeToSingBoxOutbound(node: ProxyNode): SingBoxOutbound | null {
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
                if (DEBUG) console.warn(`[Sing-Box] 不支持的协议: ${node.type}`);
                return null;
        }
    } catch (e) {
        console.error(`[Sing-Box] 转换失败 (${node.name}):`, e);
        return null;
    }
}

// =================================================================
// 辅助函数
// =================================================================

function buildBase(node: ProxyNode): Pick<SingBoxOutbound, 'tag' | 'server' | 'server_port'> {
    return {
        tag: node.name || 'Unnamed',
        server: node.server || '',
        server_port: node.port || 0
    };
}

function assignTransport(outbound: SingBoxOutbound, node: { transport?: TransportOptions }): void {
    const t = node.transport;
    if (!t || t.type === 'tcp') return;

    switch (t.type) {
        case 'ws':
            outbound.transport = {
                type: 'ws',
                path: t.path,
                headers: t.headers
            } as { type: string; path?: string; headers?: Record<string, string> };
            break;

        case 'grpc':
            outbound.transport = {
                type: 'grpc',
                service_name: t.serviceName
            };
            break;

        case 'http':
        case 'h2':
            outbound.transport = {
                type: 'http',
                path: t.path,
                host: t.host
            };
            break;

        case 'quic':
            outbound.transport = {
                type: 'quic'
            };
            break;

        case 'httpupgrade':
            outbound.transport = {
                type: 'httpupgrade',
                path: t.path,
                headers: t.headers
            };
            break;
    }
}

function assignTls(outbound: SingBoxOutbound, node: { tls?: TlsOptions }): void {
    const tls = node.tls;
    if (!tls || !tls.enabled) return;

    outbound.tls = {
        enabled: true,
        server_name: tls.serverName,
        insecure: tls.insecure,
        alpn: tls.alpn
    };

    // ✅ uTLS 指纹
    if (tls.fingerprint) {
        outbound.tls.utls = {
            enabled: true,
            fingerprint: tls.fingerprint
        };
    }

    // ✅ REALITY 完整支持
    if (tls.reality?.enabled) {
        outbound.tls.reality = {
            enabled: true,
            public_key: tls.reality.publicKey,
            short_id: tls.reality.shortId
        };
    }

    // ✅ ECH
    if (tls.ech?.enabled) {
        outbound.tls.ech = {
            enabled: true,
            config: tls.ech.config
        };
    }
}

// =================================================================
// 协议构建函数
// =================================================================

function buildVmess(node: VmessNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'vmess',
        ...buildBase(node),
        uuid: node.uuid,
        alter_id: node.alterId,
        security: node.cipher,
        packet_encoding: node.packetEncoding
    };

    assignTls(outbound, node);
    assignTransport(outbound, node);

    return outbound;
}

function buildVless(node: VlessNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'vless',
        ...buildBase(node),
        uuid: node.uuid,
        flow: node.flow,
        packet_encoding: node.packetEncoding
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

    // ✅ 插件处理
    if (node.plugin) {
        if (node.plugin === 'v2ray-plugin') {
            const mode = node.pluginOpts?.mode || 'websocket';
            if (mode === 'websocket' || mode === 'ws') {
                assignTransport(outbound, {
                    transport: {
                        type: 'ws',
                        path: node.pluginOpts?.path,
                        headers: node.pluginOpts?.host ? { Host: node.pluginOpts.host } : undefined
                    }
                });
            }

            if (node.pluginOpts?.tls === 'tls' || node.pluginOpts?.tls === '1') {
                outbound.tls = {
                    enabled: true,
                    server_name: node.pluginOpts?.host,
                    insecure: true
                };
            }
        } else {
            outbound.plugin = node.plugin;
            if (node.pluginOpts) {
                outbound.plugin_opts = Object.entries(node.pluginOpts)
                    .map(([k, v]) => `${k}=${v}`)
                    .join(';');
            }
        }
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
        tag: node.name || 'Unnamed',
        server: node.server || '',
        server_port: node.port || 0,
        password: node.password,
        ports: node.ports,
        masquerade: node.masquerade
    };

    // ✅ 混淆
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
        congestion_control: node.congestionControl,
        udp_relay_mode: node.udpRelayMode
    };

    assignTls(outbound, node);

    return outbound;
}

function buildWireGuard(node: WireGuardNode): SingBoxOutbound {
    const localAddresses = [node.ip, node.ipv6].filter((i): i is string => !!i);

    const outbound: SingBoxOutbound = {
        type: 'wireguard',
        tag: node.name,
        server: node.server,
        server_port: node.port,
        private_key: node.privateKey,
        peer_public_key: node.publicKey,
        local_address: localAddresses,
        mtu: node.mtu
    };

    if (node.preSharedKey) {
        outbound.pre_shared_key = node.preSharedKey;
    }

    return outbound;
}

function buildAnyTLS(node: AnyTLSNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'anytls',
        ...buildBase(node),
        password: node.password,
        idle_timeout: node.idleTimeout,
        client_fingerprint: node.clientFingerprint
    };

    assignTls(outbound, node);

    return outbound;
}

function buildSocks5(node: Socks5Node): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'socks',
        ...buildBase(node),
        username: node.username,
        password: node.password
    };

    return outbound;
}

export default {
    toSingBox,
    nodeToSingBoxOutbound
};

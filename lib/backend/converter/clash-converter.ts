
import * as yaml from 'js-yaml';
import { ProxyNode, VmessNode, VlessNode, TrojanNode, ShadowsocksNode, Hysteria2Node, TuicNode, AnyTLSNode, SnellNode, TransportOptions, TlsOptions, Socks5Node, ClashProxyConfig, ConverterOptions } from '../../shared/types';


/**
 * 转换为 Clash Meta YAML 配置
 * 纯粹的数据映射，不解析 URL
 */
export function toClash(nodes: ProxyNode[], _options?: ConverterOptions): string {
    const proxies = nodes
        .map(node => {
            const proxy = nodeToClashProxy(node);
            if (proxy && _options) {
                // Apply global overrides
                if (_options.udp !== undefined) {
                    proxy.udp = _options.udp;
                }
                if (_options.skipCertVerify) {
                    proxy['skip-cert-verify'] = true;
                }
            }
            return proxy;
        })
        .filter(p => p !== null);

    const config = {
        proxies: proxies
    };
    return yaml.dump(config, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
        flowLevel: 2
    });
}

function nodeToClashProxy(node: ProxyNode): ClashProxyConfig | null {
    try {
        switch (node.type) {
            case 'vmess': return buildVmess(node as VmessNode);
            case 'vless': return buildVless(node as VlessNode);
            case 'trojan': return buildTrojan(node as TrojanNode);
            case 'ss': return buildShadowsocks(node as ShadowsocksNode);
            case 'hysteria2': return buildHysteria2(node as Hysteria2Node);
            case 'anytls': return buildAnyTLS(node as AnyTLSNode);
            case 'tuic': return buildTuic(node as TuicNode);
            case 'snell': return buildSnell(node as SnellNode);
            // 兼容性

            case 'socks5': return buildSocks5(node as Socks5Node);
            default:
                // 如果是未知类型但有 originalProxy (例如直接从 YAML 解析来的 Snell), 直接返回
                if (node.originalProxy) return node.originalProxy as unknown as ClashProxyConfig;
                console.warn(`[Clash] Unsupported node type: ${node.type} `);
                return null;
        }
    } catch (e) {
        console.error(`[Clash] Failed to convert node ${node.name}: `, e);
        return null;
    }
}

// --- Specific Builders ---

function buildCommon(node: ProxyNode) {
    return {
        name: node.name,
        server: node.server,
        port: node.port,
        udp: node.udp
    };
}

function assignTransport(proxy: ClashProxyConfig, node: { transport?: TransportOptions }) {
    const t = node.transport;
    if (!t) return;

    proxy.network = t.type;

    if (t.type === 'ws') {
        proxy['ws-opts'] = {
            path: t.path || '/',
            headers: t.headers
        };
    } else if (t.type === 'grpc') {
        proxy['grpc-opts'] = {
            'grpc-service-name': t.serviceName || ''
        };
        if (t.mode === 'multi') proxy['grpc-opts'].mode = 'multi';
    } else if (t.type === 'h2' || t.type === 'http') {
        proxy['h2-opts'] = {
            path: t.path || '/',
            host: t.host || []
        };
    }
}

function assignTls(proxy: ClashProxyConfig, node: { tls?: TlsOptions }) {
    const tls = node.tls;
    if (!tls || !tls.enabled) return;

    proxy.tls = true;
    if (tls.serverName) proxy.servername = tls.serverName;
    if (tls.alpn) proxy.alpn = tls.alpn;
    if (tls.fingerprint) proxy['client-fingerprint'] = tls.fingerprint;
    if (tls.insecure) proxy['skip-cert-verify'] = true;

    // Reality
    if (tls.reality?.enabled) {
        // Clash Meta Reality syntax
        // meta uses 'tls: true' but also 'reality-opts' logic usually implies stream security
        // Wait, standard Clash Meta checks 'network' and 'tls' boolean
        // For Reality, we usually set tls=true + network options
        // But let's check standard Meta config:
        proxy.tls = true;
        const realityOpts: NonNullable<ClashProxyConfig['reality-opts']> = {
            'public-key': tls.reality.publicKey
        };
        if (tls.reality.shortId) realityOpts['short-id'] = tls.reality.shortId;
        if (tls.reality.spiderX) realityOpts['spider-x'] = tls.reality.spiderX;

        proxy['reality-opts'] = realityOpts;
    }
}

function buildVmess(node: VmessNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'vmess',
        uuid: node.uuid,
        alterId: node.alterId,
        cipher: node.cipher
    };
    assignTransport(proxy, node);
    assignTls(proxy, node);
    return proxy;
}

function buildVless(node: VlessNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'vless',
        uuid: node.uuid,
        flow: node.flow
    };
    assignTransport(proxy, node);
    assignTls(proxy, node);
    return proxy;
}

function buildTrojan(node: TrojanNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'trojan',
        password: node.password
    };
    assignTransport(proxy, node);
    assignTls(proxy, node);
    return proxy;
}

function buildShadowsocks(node: ShadowsocksNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'ss',
        cipher: node.cipher,
        password: node.password
    };
    if (node.plugin) {
        proxy.plugin = node.plugin;
        proxy['plugin-opts'] = node.pluginOpts;
    }
    return proxy;
}

function buildHysteria2(node: Hysteria2Node): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'hysteria2',
        password: node.password,
    };
    if (node.obfs) {
        proxy.obfs = node.obfs.type;
        proxy['obfs-password'] = node.obfs.password;
    }
    // Hysteria2 隐含 TLS, 但 Meta 显式参数
    if (node.tls) {
        if (node.tls.serverName) proxy.sni = node.tls.serverName;
        if (node.tls.insecure) proxy['skip-cert-verify'] = true;
        if (node.tls.alpn) proxy.alpn = node.tls.alpn;
        if (node.tls.fingerprint) proxy['client-fingerprint'] = node.tls.fingerprint;
    }
    return proxy;
}


function buildAnyTLS(node: AnyTLSNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'anytls',
        password: node.password,
        'client-fingerprint': node.clientFingerprint,
        'idle-timeout': node.idleTimeout
    };

    if (node.tls) {
        if (node.tls.serverName) proxy.sni = node.tls.serverName;
        if (node.tls.insecure) proxy['skip-cert-verify'] = true;
        if (node.tls.alpn) proxy.alpn = node.tls.alpn;
        if (node.tls.fingerprint) proxy['client-fingerprint'] = node.tls.fingerprint;
    }

    return proxy;
}

function buildTuic(node: TuicNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'tuic',
        uuid: node.uuid,
        password: node.password,
        'congestion-controller': node.congestionControl,
        'udp-relay-mode': node.udpRelayMode
    };
    if (node.tls) {
        if (node.tls.serverName) proxy.sni = node.tls.serverName;
        if (node.tls.insecure) proxy['skip-cert-verify'] = true;
        if (node.tls.alpn) proxy.alpn = node.tls.alpn;
        if (node.tls.fingerprint) proxy['client-fingerprint'] = node.tls.fingerprint;
    }
    return proxy;
}



function buildSocks5(node: Socks5Node): ClashProxyConfig {
    return {
        ...buildCommon(node),
        type: 'socks5',
        username: node.username,
        password: node.password
    };
}

function buildSnell(node: SnellNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'snell',
        psk: node.password,
        version: node.version || '4'
    };
    if (node.obfs) {
        proxy['obfs-opts'] = {
            mode: node.obfs.type,
            host: node.obfs.host
        };
    }
    return proxy;
}

/**
 * =================================================================
 * Clash Meta 转换器 - 完整参数增强版
 * =================================================================
 * 
 * 设计原则:
 * 1. 参数完整性优先 - 支持所有 Clash Meta 参数
 * 2. 零数据丢失 - 保留所有可用字段
 * 3. 规范兼容 - 符合 Clash Meta 最新规范
 * 4. 详细日志 - 追踪转换过程
 * 
 * 参考规范:
 * - Clash Meta (mihomo): https://github.com/MetaCubeX/mihomo
 * - Clash Meta 文档: https://wiki.metacubex.one/
 * 
 * 支持的协议:
 * - VMess, VLESS (支持 REALITY)
 * - Trojan, Shadowsocks
 * - Hysteria, Hysteria2
 * - TUIC, WireGuard
 * - Snell, SOCKS5
 * 
 * @module converter/clash-meta-enhanced
 * =================================================================
 */

import * as yaml from 'js-yaml';
import {
    ProxyNode, VmessNode, VlessNode, TrojanNode, ShadowsocksNode,
    Hysteria2Node, HysteriaNode, TuicNode, AnyTLSNode, SnellNode,
    WireGuardNode, Socks5Node, ShadowsocksRNode,
    TransportOptions, TlsOptions, ClashProxyConfig, ConverterOptions
} from '../../shared/types';

// 调试模式
const DEBUG = process.env.DEBUG_CONVERTER === '1';

/**
 * 转换为 Clash Meta YAML 配置
 * 
 * @param nodes 节点数组
 * @param options 转换选项
 * @returns Clash YAML 字符串
 */
export function toClash(nodes: ProxyNode[], options?: ConverterOptions): string {
    const proxies = nodes
        .map(node => {
            const proxy = nodeToClashProxy(node);

            if (proxy && options) {
                // 全局覆盖选项
                if (options.udp !== undefined) {
                    proxy.udp = options.udp;
                }
                if (options.skipCertVerify) {
                    proxy['skip-cert-verify'] = true;
                }
            }

            return proxy;
        })
        .filter((p): p is ClashProxyConfig => p !== null);

    if (DEBUG) {
        console.log(`[Clash] 成功转换 ${proxies.length}/${nodes.length} 个节点`);
    }

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

/**
 * 节点到 Clash 代理配置的转换
 */
export function nodeToClashProxy(node: ProxyNode): ClashProxyConfig | null {
    try {
        switch (node.type) {
            case 'vmess':
                return buildVmess(node as VmessNode);
            case 'vless':
                return buildVless(node as VlessNode);
            case 'trojan':
                return buildTrojan(node as TrojanNode);
            case 'ss':
                return buildShadowsocks(node as ShadowsocksNode);
            case 'ssr':
                return buildSSR(node as ShadowsocksRNode);
            case 'hysteria':
                return buildHysteria(node as HysteriaNode);
            case 'hysteria2':
                return buildHysteria2(node as Hysteria2Node);
            case 'anytls':
                return buildAnyTLS(node as AnyTLSNode);
            case 'tuic':
                return buildTuic(node as TuicNode);
            case 'wireguard':
                return buildWireGuard(node as WireGuardNode);
            case 'snell':
                return buildSnell(node as SnellNode);
            case 'socks5':
                return buildSocks5(node as Socks5Node);
            default:
                // 降级：使用原始代理对象
                if ('originalProxy' in node && node.originalProxy) {
                    return node.originalProxy as ClashProxyConfig;
                }
                if (DEBUG) console.warn(`[Clash] 不支持的协议类型: ${node.type}`);
                return null;
        }
    } catch (e) {
        console.error(`[Clash] 转换节点失败 (${node.name}):`, e);
        return null;
    }
}

// =================================================================
// 通用辅助函数
// =================================================================

/**
 * 构建通用字段
 */
function buildCommon(node: ProxyNode): Pick<ClashProxyConfig, 'name' | 'server' | 'port' | 'udp'> {
    return {
        name: node.name || 'Unnamed',
        server: node.server || '',
        port: node.port || 0,
        udp: node.udp
    };
}

/**
 * 分配传输层参数
 */
function assignTransport(proxy: ClashProxyConfig, node: { transport?: TransportOptions }): void {
    const t = node.transport;
    if (!t) return;

    proxy.network = t.type;

    switch (t.type) {
        case 'ws': {
            const wsOpts: NonNullable<ClashProxyConfig['ws-opts']> = {
                path: t.path || '/'
            };

            if (t.headers) {
                wsOpts.headers = t.headers;
            }

            // ✅ Early Data 支持
            if (t.earlyData) {
                wsOpts['max-early-data'] = t.earlyData;
                wsOpts['early-data-header-name'] = 'Sec-WebSocket-Protocol';
            }

            proxy['ws-opts'] = wsOpts;
            break;
        }

        case 'grpc': {
            const grpcOpts: NonNullable<ClashProxyConfig['grpc-opts']> = {
                'grpc-service-name': t.serviceName || ''
            };

            if (t.mode) {
                grpcOpts.mode = t.mode;
            }

            proxy['grpc-opts'] = grpcOpts;
            break;
        }

        case 'h2':
        case 'http': {
            proxy['h2-opts'] = {
                path: t.path || '/',
                host: t.host || []
            };
            break;
        }

        case 'httpupgrade': {
            // Clash Meta 的 HTTPUpgrade 支持
            proxy.network = 'httpupgrade';
            if (t.path) proxy['path'] = t.path;
            if (t.headers?.Host) proxy['host'] = t.headers.Host;
            break;
        }

        default:
            if (DEBUG && !['tcp', 'udp'].includes(t.type)) {
                console.warn(`[Clash] 未处理传输类型: ${t.type}`);
            }
    }
}

/**
 * 分配 TLS 参数
 */
function assignTls(proxy: ClashProxyConfig, node: { tls?: TlsOptions }): void {
    const tls = node.tls;
    if (!tls || !tls.enabled) return;

    proxy.tls = true;

    // 基础 TLS 参数
    if (tls.serverName) proxy.servername = tls.serverName;
    if (tls.alpn && tls.alpn.length > 0) proxy.alpn = tls.alpn;
    if (tls.fingerprint) proxy['client-fingerprint'] = tls.fingerprint;
    if (tls.insecure === true) proxy['skip-cert-verify'] = true;

    // ✅ REALITY 支持
    if (tls.reality?.enabled) {
        const realityOpts: NonNullable<ClashProxyConfig['reality-opts']> = {
            'public-key': tls.reality.publicKey
        };

        if (tls.reality.shortId) {
            realityOpts['short-id'] = tls.reality.shortId;
        }
        if (tls.reality.spiderX) {
            realityOpts['spider-x'] = tls.reality.spiderX;
        }

        proxy['reality-opts'] = realityOpts;
    }
}

// =================================================================
// 协议专用构建函数
// =================================================================

/**
 * VMess 代理
 */
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

/**
 * VLESS 代理（支持 REALITY）
 */
function buildVless(node: VlessNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'vless',
        uuid: node.uuid
    };

    // ✅ Flow 控制
    if (node.flow) {
        proxy.flow = node.flow;
    }

    assignTransport(proxy, node);
    assignTls(proxy, node);

    return proxy;
}

/**
 * Trojan 代理
 */
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

/**
 * Shadowsocks 代理
 */
function buildShadowsocks(node: ShadowsocksNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'ss',
        cipher: node.cipher,
        password: node.password
    };

    // ✅ 插件支持
    if (node.plugin) {
        proxy.plugin = node.plugin;
        if (node.pluginOpts) {
            proxy['plugin-opts'] = node.pluginOpts;
        }
    }

    return proxy;
}

/**
 * ShadowsocksR 代理
 */
function buildSSR(node: ShadowsocksRNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'ssr',
        cipher: node.cipher,
        password: node.password,
        protocol: node.protocol,
        obfs: node.obfs
    };

    if (node.protocolParam) {
        proxy['protocol-param'] = node.protocolParam;
    }
    if (node.obfsParam) {
        proxy['obfs-param'] = node.obfsParam;
    }

    return proxy;
}

/**
 * Hysteria v1 代理
 */
function buildHysteria(node: HysteriaNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'hysteria'
    };

    // ✅ 认证
    if (node.auth) {
        proxy.auth_str = node.auth; // Clash 使用 auth_str
    }

    // ✅ 速度限制
    if (node.upMbps) proxy.up_mbps = node.upMbps;
    if (node.downMbps) proxy.down_mbps = node.downMbps;

    // ✅ 混淆
    if (node.obfs) {
        proxy.obfs = node.obfs;
    }

    // ✅ 协议伪装
    if (node.protocol) {
        proxy.protocol = node.protocol;
    }

    // TLS 参数
    if (node.tls) {
        if (node.tls.serverName) proxy.sni = node.tls.serverName;
        if (node.tls.insecure) proxy['skip-cert-verify'] = true;
        if (node.tls.alpn) proxy.alpn = node.tls.alpn;
        if (node.tls.fingerprint) proxy['client-fingerprint'] = node.tls.fingerprint;
    }

    return proxy;
}

/**
 * Hysteria v2 代理
 */
function buildHysteria2(node: Hysteria2Node): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'hysteria2',
        password: node.password
    };

    // ✅ 混淆
    if (node.obfs) {
        proxy.obfs = node.obfs.type;
        proxy['obfs-password'] = node.obfs.password;
    }

    // ✅ 拥塞控制
    if (node.congestionControl) {
        proxy['congestion-controller'] = node.congestionControl;
    }

    // TLS 参数
    if (node.tls) {
        if (node.tls.serverName) proxy.sni = node.tls.serverName;
        if (node.tls.insecure) proxy['skip-cert-verify'] = true;
        if (node.tls.alpn) proxy.alpn = node.tls.alpn;
        if (node.tls.fingerprint) proxy['client-fingerprint'] = node.tls.fingerprint;
    }

    return proxy;
}

/**
 * TUIC 代理
 */
function buildTuic(node: TuicNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'tuic',
        uuid: node.uuid,
        password: node.password
    };

    // ✅ 拥塞控制
    if (node.congestionControl) {
        proxy['congestion-controller'] = node.congestionControl;
    }

    // ✅ UDP 中继模式
    if (node.udpRelayMode) {
        proxy['udp-relay-mode'] = node.udpRelayMode;
    }

    // TLS 参数
    if (node.tls) {
        if (node.tls.serverName) proxy.sni = node.tls.serverName;
        if (node.tls.insecure) proxy['skip-cert-verify'] = true;
        if (node.tls.alpn) proxy.alpn = node.tls.alpn;
        if (node.tls.fingerprint) proxy['client-fingerprint'] = node.tls.fingerprint;
    }

    return proxy;
}

/**
 * WireGuard 代理
 */
function buildWireGuard(node: WireGuardNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'wireguard',
        'private-key': node.privateKey,
        'public-key': node.publicKey
    };

    if (node.ip) proxy['ip'] = node.ip;
    if (node.ipv6) proxy['ipv6'] = node.ipv6;
    if (node.preSharedKey) proxy['preshared-key'] = node.preSharedKey;
    if (node.mtu) proxy['mtu'] = node.mtu;
    if (node.reserved) proxy['reserved'] = node.reserved;

    return proxy;
}

/**
 * AnyTLS 代理
 */
function buildAnyTLS(node: AnyTLSNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'anytls',
        password: node.password
    };

    if (node.clientFingerprint) {
        proxy['client-fingerprint'] = node.clientFingerprint;
    }
    if (node.idleTimeout) {
        proxy['idle-timeout'] = node.idleTimeout;
    }

    // TLS 参数
    if (node.tls) {
        if (node.tls.serverName) proxy.sni = node.tls.serverName;
        if (node.tls.insecure) proxy['skip-cert-verify'] = true;
        if (node.tls.alpn) proxy.alpn = node.tls.alpn;
    }

    return proxy;
}

/**
 * Snell 代理
 */
function buildSnell(node: SnellNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'snell',
        psk: node.password,
        version: node.version || '4'
    };

    if (node.obfs) {
        proxy['obfs-opts'] = {
            mode: node.obfs.type
        };
        if (node.obfs.host) {
            proxy['obfs-opts'].host = node.obfs.host;
        }
    }

    return proxy;
}

/**
 * SOCKS5 代理
 */
function buildSocks5(node: Socks5Node): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'socks5'
    };

    if (node.username) proxy.username = node.username;
    if (node.password) proxy.password = node.password;

    // SOCKS5 over TLS
    if (node.tls?.enabled) {
        proxy.tls = true;
        if (node.tls.serverName) proxy.servername = node.tls.serverName;
        if (node.tls.insecure) proxy['skip-cert-verify'] = true;
    }

    return proxy;
}

// =================================================================
// 导出
// =================================================================

export default {
    toClash,
    nodeToClashProxy
};

import { ProxyNode, TlsOptions, TransportOptions, Socks5Node, ClashProxyConfig, VmessNode, VlessNode, TrojanNode, ShadowsocksNode, Hysteria2Node, TuicNode, AnyTLSNode, SnellNode } from '../../shared/types';
import { generateId } from './helper';

/**
 * 将 Clash 代理对象转换为标准 Node
 */
export function parseClashProxy(proxy: ClashProxyConfig): ProxyNode | null {
    if (!proxy || !proxy.server || !proxy.port) return null;

    const baseConfig = {
        name: proxy.name || proxy.remarks || '未命名',
        server: proxy.server,
        port: Number(proxy.port),
        udp: proxy.udp !== false, // Clash 默认 true
        originalProxy: proxy as unknown as Record<string, unknown> // 保留原始对象以备不时之需
    };

    // 提取通用 TLS/Transport
    const { tls, transport } = extractClashCommon(proxy);

    const type = proxy.type ? proxy.type.toLowerCase() : '';

    try {
        if (type === 'vmess') {
            return {
                ...baseConfig,
                id: generateId(),
                type: 'vmess',
                uuid: (proxy.uuid || proxy.id || '') as string,
                alterId: Number(proxy.alterId || proxy.aid || 0),
                cipher: (proxy.cipher || 'auto') as string,
                tls,
                transport
            } as VmessNode;
        }

        if (type === 'vless') {
            // 检查 Reality
            if (proxy.servername && proxy['reality-opts']) {
                tls.reality = {
                    enabled: true,
                    publicKey: (proxy['reality-opts'] as Record<string, unknown>)['public-key'] as string,
                    shortId: (proxy['reality-opts'] as Record<string, unknown>)['short-id'] as string,
                    spiderX: (proxy['reality-opts'] as Record<string, unknown>)['spider-x'] as string
                };
                // Reality 下的 fp 和 sni
                if (proxy['client-fingerprint']) tls.fingerprint = proxy['client-fingerprint'];
                if (proxy.servername) tls.serverName = proxy.servername;
            }

            return {
                ...baseConfig,
                id: generateId(),
                type: 'vless',
                uuid: (proxy.uuid || proxy.id || '') as string,
                flow: proxy.flow as string | undefined, // xtls-rprx-vision
                tls,
                transport
            } as VlessNode;
        }

        if (type === 'trojan') {
            return {
                ...baseConfig,
                id: generateId(),
                type: 'trojan',
                password: (proxy.password || '') as string,
                tls,
                transport
            } as TrojanNode;
        }

        if (type === 'ss' || type === 'shadowsocks') {
            return {
                ...baseConfig,
                id: generateId(),
                type: 'ss',
                cipher: (proxy.cipher || '') as string,
                password: (proxy.password || '') as string,
                plugin: proxy.plugin as string | undefined,
                pluginOpts: proxy['plugin-opts'] as Record<string, string> | undefined
            } as ShadowsocksNode;
        }

        if (type === 'hysteria2' || type === 'hy2') {
            // Hysteria2 specific
            let obfs: { type: string; password: string; } | undefined = undefined;
            if (proxy.obfs) {
                obfs = { type: proxy.obfs as string, password: (proxy['obfs-password'] || '') as string };
            }

            // Hy2 通常隐含 TLS
            tls.enabled = true;

            return {
                ...baseConfig,
                id: generateId(),
                type: 'hysteria2',
                password: (proxy.password || '') as string,
                obfs: obfs as { type: string; password: string; } | undefined,
                tls
            } as Hysteria2Node;
        }

        if (type === 'tuic') {
            return {
                ...baseConfig,
                id: generateId(),
                type: 'tuic',
                uuid: (proxy.uuid || '') as string,
                password: (proxy.password || '') as string,
                congestionControl: proxy['congestion-controller'] as string | undefined,
                udpRelayMode: proxy['udp-relay-mode'] as string | undefined,
                tls
            } as TuicNode;
        }

        if (type === 'anytls') {
            return {
                ...baseConfig,
                id: generateId(),
                type: 'anytls',
                password: proxy.password as string | undefined,
                tls,
                clientFingerprint: (proxy['client-fingerprint'] || proxy.fingerprint) as string | undefined,
                idleTimeout: Number(proxy['idle-timeout'] || 0) || undefined
            } as AnyTLSNode;
        }

        if (type === 'socks5') {
            return {
                ...baseConfig,
                id: generateId(),
                type: 'socks5',
                username: proxy.username as string | undefined,
                password: proxy.password as string | undefined,
                tls: tls.enabled ? tls : undefined
            } as Socks5Node;
        }



        if (type === 'snell') {
            // Snell 混淆配置
            let obfs: { type: string; host?: string; } | undefined = undefined;
            if (proxy.obfs) {
                obfs = {
                    type: proxy.obfs as string,
                    host: proxy['obfs-opts']?.host as string | undefined
                };
            }

            return {
                ...baseConfig,
                id: generateId(),
                type: 'snell',
                password: (proxy.psk || proxy.password || '') as string,
                version: proxy.version as string | undefined,
                obfs: obfs as { type: string; host?: string; } | undefined
            } as SnellNode;
        }

        // TODO: Support more types if needed (WireGuard...)

    } catch (e) {
        console.warn('Clash Proxy 转换失败:', proxy.name, e);
        return null;
    }

    return null;
}


function extractClashCommon(proxy: ClashProxyConfig): { tls: TlsOptions, transport: TransportOptions } {
    const tls: TlsOptions = {
        enabled: proxy.tls || proxy.markup === 'tls' || proxy.security === 'tls' || proxy.ssl === true
    };

    // SNI
    if (proxy.servername || proxy.sni) {
        tls.serverName = proxy.servername || proxy.sni;
    }
    // ALPN
    if (proxy.alpn && Array.isArray(proxy.alpn)) {
        tls.alpn = proxy.alpn;
    }
    // Insecure
    if (proxy['skip-cert-verify'] === true) {
        tls.insecure = true;
    }
    // Fingerprint
    if (proxy['client-fingerprint'] || proxy.fingerprint) {
        tls.fingerprint = proxy['client-fingerprint'] || proxy.fingerprint;
    }

    // Transport
    const net = proxy.network || 'tcp';
    const transport: TransportOptions = { type: net };

    if (net === 'ws') {
        if (proxy['ws-opts']) {
            transport.path = proxy['ws-opts'].path as string;
            transport.headers = proxy['ws-opts'].headers as Record<string, string>;
        } else if (proxy['ws-path']) { // 兼容旧写法
            transport.path = proxy['ws-path'] as string;
            transport.headers = proxy['ws-headers'] as Record<string, string>;
        }
    }
    else if (net === 'grpc') {
        if (proxy['grpc-opts']) {
            transport.serviceName = proxy['grpc-opts']['grpc-service-name'] as string;
        }
    }
    else if (net === 'h2' || net === 'http') {
        if (proxy['h2-opts']) {
            transport.path = proxy['h2-opts'].path as string;
            transport.host = proxy['h2-opts'].host as string[];
        }
    }

    return { tls, transport };
}

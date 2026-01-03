import { Node, TlsOptions, TransportOptions } from '../types';

/**
 * 将 Clash 代理对象转换为标准 Node
 */
export function parseClashProxy(proxy: any): Node | null {
    if (!proxy || !proxy.server || !proxy.port) return null;

    const baseConfig = {
        name: proxy.name || proxy.remarks || '未命名',
        server: proxy.server,
        port: Number(proxy.port),
        udp: proxy.udp !== false, // Clash 默认 true
        originalProxy: proxy // 保留原始对象以备不时之需
    };

    // 提取通用 TLS/Transport
    const { tls, transport } = extractClashCommon(proxy);

    const type = proxy.type ? proxy.type.toLowerCase() : '';

    try {
        if (type === 'vmess') {
            return {
                ...baseConfig,
                id: crypto.randomUUID(),
                type: 'vmess',
                uuid: proxy.uuid || proxy.id,
                alterId: Number(proxy.alterId || proxy.aid || 0),
                cipher: proxy.cipher || 'auto',
                tls,
                transport
            };
        }

        if (type === 'vless') {
            // 检查 Reality
            if (proxy.servername && proxy['reality-opts']) {
                tls.enabled = true;
                tls.reality = {
                    enabled: true,
                    publicKey: proxy['reality-opts']['public-key'],
                    shortId: proxy['reality-opts']['short-id'],
                    spiderX: proxy['reality-opts']['spider-x']
                };
                // Reality 下的 fp 和 sni
                if (proxy['client-fingerprint']) tls.fingerprint = proxy['client-fingerprint'];
                if (proxy.servername) tls.serverName = proxy.servername;
            }

            return {
                ...baseConfig,
                id: crypto.randomUUID(),
                type: 'vless',
                uuid: proxy.uuid || proxy.id,
                flow: proxy.flow, // xtls-rprx-vision
                tls,
                transport
            };
        }

        if (type === 'trojan') {
            return {
                ...baseConfig,
                id: crypto.randomUUID(),
                type: 'trojan',
                password: proxy.password,
                tls,
                transport
            };
        }

        if (type === 'ss' || type === 'shadowsocks') {
            // Plugin
            let plugin = proxy.plugin;
            let pluginOpts = proxy['plugin-opts'];

            return {
                ...baseConfig,
                id: crypto.randomUUID(),
                type: 'ss',
                cipher: proxy.cipher,
                password: proxy.password,
                plugin,
                pluginOpts
            };
        }

        if (type === 'hysteria2' || type === 'hy2') {
            // Hysteria2 specific
            let obfs = undefined;
            if (proxy.obfs) {
                obfs = { type: proxy.obfs, password: proxy['obfs-password'] || '' };
            }

            // Hy2 通常隐含 TLS
            tls.enabled = true;

            return {
                ...baseConfig,
                id: crypto.randomUUID(),
                type: 'hysteria2',
                password: proxy.password || '',
                obfs,
                tls
            };
        }

        if (type === 'tuic') {
            return {
                ...baseConfig,
                id: crypto.randomUUID(),
                type: 'tuic',
                uuid: proxy.uuid,
                password: proxy.password,
                congestionControl: proxy['congestion-controller'],
                udpRelayMode: proxy['udp-relay-mode'],
                tls
            };
        }

        // TODO: Support more types if needed (Snell, WG...)

    } catch (e) {
        console.warn('Clash Proxy 转换失败:', proxy.name, e);
        return null;
    }

    return null;
}


function extractClashCommon(proxy: any): { tls: TlsOptions, transport: TransportOptions } {
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
            transport.path = proxy['ws-opts'].path;
            transport.headers = proxy['ws-opts'].headers;
        } else if (proxy['ws-path']) { // 兼容旧写法
            transport.path = proxy['ws-path'];
            transport.headers = proxy['ws-headers'];
        }
    }
    else if (net === 'grpc') {
        if (proxy['grpc-opts']) {
            transport.serviceName = proxy['grpc-opts']['grpc-service-name'];
        }
    }
    else if (net === 'h2' || net === 'http') {
        if (proxy['h2-opts']) {
            transport.path = proxy['h2-opts'].path;
            transport.host = proxy['h2-opts'].host;
        }
    }

    return { tls, transport };
}

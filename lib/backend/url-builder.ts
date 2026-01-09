import { Node, VlessNode, VmessNode, TrojanNode, ShadowsocksNode, ShadowsocksRNode, HysteriaNode, Hysteria2Node, TuicNode, WireGuardNode, AnyTLSNode, SnellNode, V2rayNConfig, Socks5Node, HttpNode } from '../shared/types';
import { buildStandardQuery } from './parsers/helper';
import { encodeBase64 } from './converter/base64';

/**
 * 将节点对象还原为 URL 链接
 */
export function buildNodeUrl(node: Node): string {
    try {
        // ⭐ 优先使用原始URL，避免不必要的重建导致参数丢失
        // 只有在以下情况才重建URL：
        // 1. 没有原始URL
        // 2. 节点名被修改过（需要更新hash）
        if ('originalUrl' in node && node.originalUrl) {
            // 检查节点名是否被修改（通过比较URL中的hash和当前name）
            try {
                const originalUrlObj = new URL(node.originalUrl);
                const originalHash = decodeURIComponent(originalUrlObj.hash.slice(1));
                // 如果节点名未改变，直接返回原始URL
                if (originalHash === node.name) {
                    return node.originalUrl as string;
                }
                // 节点名改变了，需要重建URL以更新hash
            } catch (e) {
                // URL解析失败，继续重建
            }
        }

        // 根据协议类型重建URL
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
            case 'socks5':
                return buildSocks5Url(node);
            case 'http':
                return buildHttpUrl(node);
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



function buildSocks5Url(node: Socks5Node): string {
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    // 标准格式: socks5://[user:pass@]host:port#name
    // 使用 URL 编码处理特殊字符，兼容性最好
    let userInfo = '';
    if (node.username && node.password) {
        // 同时有用户名和密码
        userInfo = `${encodeURIComponent(node.username)}:${encodeURIComponent(node.password)}@`;
    } else if (node.username) {
        // 只有用户名
        userInfo = `${encodeURIComponent(node.username)}@`;
    } else if (node.password) {
        // 只有密码（罕见但支持）
        userInfo = `:${encodeURIComponent(node.password)}@`;
    }

    return `socks5://${userInfo}${host}:${node.port}${hash}`;
}

function buildHttpUrl(node: HttpNode): string {
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';
    let userInfo = '';

    if (node.username || node.password) {
        userInfo = `${encodeURIComponent(node.username || '')}:${encodeURIComponent(node.password || '')}@`;
    }

    // HTTP Proxy 格式通常也支持 http://user:pass@host:port
    return `http://${userInfo}${host}:${node.port}${hash}`;
}

function buildVlessUrl(node: VlessNode): string {
    const params = buildStandardQuery(node.transport, node.tls);

    if (node.flow) params.set('flow', node.flow);

    const encryption = node.encryption || 'none';
    params.set('encryption', encryption);

    if (node.tls?.reality?.enabled) {
        params.set('security', 'reality');
    } else if (node.tls?.enabled) {
        params.set('security', 'tls');
    } else {
        params.set('security', 'none');
    }

    // Preserve transport defaults if they exist in the model
    if (node.transport?.type === 'tcp' && !params.has('type')) {
        params.set('type', 'tcp');
    }

    // Explicitly clean up loose security params if not strictly enabled
    // Explicitly clean up loose security params if not strictly enabled
    if (node.tls?.insecure !== true) {
        params.delete('allowInsecure');
        params.delete('insecure');
    }

    // VLESS standard: explicitly set headerType=none if not present but implied
    // VLESS standard: explicitly set headerType=none if not present but implied
    if ((!node.transport?.headerType || node.transport.headerType === 'none') && !params.has('headerType')) {
        params.set('headerType', 'none');
    }

    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `vless://${node.uuid}@${host}:${node.port}?${params.toString()}${hash}`;
}

function buildVmessUrl(node: VmessNode): string {
    // 优先构建 Base64 JSON 格式 (V2rayN)
    const config: V2rayNConfig = {
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

function buildTrojanUrl(node: TrojanNode): string {
    const params = buildStandardQuery(node.transport, node.tls);
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    // Trojan 默认 TLS
    if (node.tls?.insecure) params.set('allowInsecure', '1');

    return `trojan://${encodeURIComponent(node.password)}@${host}:${node.port}?${params.toString()}${hash}`;
}

function buildShadowsocksUrl(node: ShadowsocksNode): string {
    const userInfo = `${node.cipher}:${node.password}`;
    const base64Info = encodeBase64(userInfo);
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${node.name}` : '';

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

function buildHysteriaUrl(node: HysteriaNode): string {
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

function buildHysteria2Url(node: Hysteria2Node): string {
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

function buildTuicUrl(node: TuicNode): string {
    const params = buildStandardQuery(undefined, node.tls);
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    if (node.congestionControl) params.set('congestion_control', node.congestionControl);
    if (node.udpRelayMode) params.set('udp_relay_mode', node.udpRelayMode);

    const userInfo = node.password ? `${node.uuid}:${node.password}` : node.uuid;

    return `tuic://${encodeURIComponent(userInfo)}@${host}:${node.port}?${params.toString()}${hash}`;
}

function buildWireGuardUrl(node: WireGuardNode): string {
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

function buildAnyTLSUrl(node: AnyTLSNode): string {
    const params = buildStandardQuery(undefined, node.tls);

    if (node.clientFingerprint) params.set('fp', node.clientFingerprint);
    if (node.idleTimeout) params.set('idle_timeout', String(node.idleTimeout));
    if (node.tls?.enabled) params.set('tls', '1');

    const userInfo = node.password ? `${encodeURIComponent(node.password)}@` : '';
    const host = node.server.includes(':') ? `[${node.server}]` : node.server;
    const hash = node.name ? `#${encodeURIComponent(node.name)}` : '';

    return `anytls://${userInfo}${host}:${node.port}?${params.toString()}${hash}`;
}

function buildSSRUrl(node: ShadowsocksRNode): string {
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

function buildSnellUrl(node: SnellNode): string {
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

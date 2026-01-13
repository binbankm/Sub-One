import { ProxyNode, ConverterOptions, VmessNode, VlessNode, TrojanNode, ShadowsocksNode, Hysteria2Node, TuicNode, WireGuardNode, SnellNode, Socks5Node } from '../../shared/types';



/**
 * 转换为 Loon 配置
 */
export function toLoon(nodes: ProxyNode[], _options: ConverterOptions = {}): string {
    // 只返回节点列表
    const lines: string[] = ['[Proxy]'];
    for (const node of nodes) {
        const line = nodeToLoonLine(node);
        if (line) {
            lines.push(line);
        }
    }
    return lines.join('\n');
}

function nodeToLoonLine(node: ProxyNode): string | null {
    try {
        switch (node.type) {
            case 'vmess': return buildVmess(node as VmessNode);
            case 'vless': return buildVless(node as VlessNode);
            case 'trojan': return buildTrojan(node as TrojanNode);
            case 'ss': return buildShadowsocks(node as ShadowsocksNode);
            case 'hysteria2': return buildHysteria2(node as Hysteria2Node);
            case 'tuic': return buildTuic(node as TuicNode);
            case 'wireguard': return buildWireGuard(node as WireGuardNode);
            case 'snell': return buildSnell(node as SnellNode);
            case 'socks5': return buildSocks5(node as Socks5Node);

            default:
                return null;
        }
    } catch (e) {
        console.warn(`Loon 转换失败: ${node.name}`, e);
        return null;
    }
}

function buildVmess(node: VmessNode): string {
    const parts = [
        'VMess',
        node.server,
        node.port,
        node.cipher || 'auto',
        `"${node.uuid}"`,
    ];

    if (node.transport?.type === 'ws') {
        parts.push(`transport:ws`);
        if (node.transport.path) parts.push(`path:${node.transport.path}`);
        if (node.transport.headers?.Host) parts.push(`host:${node.transport.headers.Host}`);
    }

    if (node.tls?.enabled) {
        parts.push('over-tls:true');
        if (node.tls.serverName) parts.push(`tls-name:${node.tls.serverName}`);
        if (node.tls.insecure) parts.push('skip-cert-verify:true');
    }

    return `${node.name} = ${parts.join(',')}`;
}

function buildVless(node: VlessNode): string {
    const parts = [
        'VLESS',
        node.server,
        node.port,
        node.uuid,
    ];

    if (node.flow) {
        parts.push(`flow:${node.flow}`);
    }

    // TLS / Reality
    const tls = node.tls;
    if (tls?.enabled) {
        parts.push('over-tls:true');
        if (tls.serverName) parts.push(`tls-name:${tls.serverName}`);
        if (tls.alpn) parts.push(`alpn:${tls.alpn.join(',')}`);
        if (tls.insecure) parts.push('skip-cert-verify:true');

        if (tls.reality?.enabled) {
            parts.push('reality:true');
            parts.push(`public-key:${tls.reality.publicKey}`);
            if (tls.reality.shortId) parts.push(`short-id:${tls.reality.shortId}`);
            if (tls.reality.spiderX) parts.push(`spider-x:${tls.reality.spiderX}`);
            if (tls.fingerprint) parts.push(`fingerprint:${tls.fingerprint}`);
        }
    }

    const t = node.transport;
    if (t) {
        if (t.type === 'ws') {
            parts.push('transport:ws');
            if (t.path) parts.push(`path:${t.path}`);
            if (t.headers?.Host) parts.push(`host:${t.headers.Host}`);
        } else if (t.type === 'grpc') {
            parts.push('transport:grpc');
            if (t.serviceName) parts.push(`serviceName:${t.serviceName}`);
        } else if (t.type === 'http' || t.type === 'h2') {
            parts.push('transport:http'); // or h2
        }
    }

    return `${node.name} = ${parts.join(',')}`;
}

function buildTrojan(node: TrojanNode): string {
    const parts = [
        'Trojan',
        node.server,
        node.port,
        `"${node.password}"`,
    ];

    // Trojan is always TLS in Loon usually
    if (node.tls) {
        if (node.tls.serverName) parts.push(`tls-name:${node.tls.serverName}`);
        if (node.tls.insecure) parts.push('skip-cert-verify:true');
    }

    if (node.transport?.type === 'ws') {
        parts.push('transport:ws');
        if (node.transport.path) parts.push(`path:${node.transport.path}`);
        if (node.transport.headers?.Host) parts.push(`host:${node.transport.headers.Host}`);
    }

    return `${node.name} = ${parts.join(',')}`;
}

function buildShadowsocks(node: ShadowsocksNode): string {
    const parts = [
        'Shadowsocks',
        node.server,
        node.port,
        node.cipher,
        `"${node.password}"`,
    ];

    if (node.plugin) {
        if (node.plugin.includes('obfs')) {
            parts.push('obfs-name:http'); // Simplify
            if (node.pluginOpts?.['obfs-host']) {
                parts.push(`obfs-host:${node.pluginOpts['obfs-host']}`);
            }
        }
    }

    return `${node.name} = ${parts.join(',')}`;
}

function buildHysteria2(node: Hysteria2Node): string {
    const parts = [
        'Hysteria2',
        node.server,
        node.port,
        node.password || '',

    ];


    if (node.tls) {
        if (node.tls.serverName) parts.push(`sni:${node.tls.serverName}`);
        if (node.tls.insecure) parts.push('skip-cert-verify:true');
    }

    // Loon Hysteria2 obfs 配置
    // 根据官方文档，使用 salamander-password 参数
    // 示例: salamander-password=bbb
    if (node.obfs) {
        if (node.obfs.type === 'salamander' && node.obfs.password) {
            parts.push(`salamander-password=${node.obfs.password}`);
        }
    }

    return `${node.name} = ${parts.join(',')}`;
}

function buildTuic(node: TuicNode): string {
    const parts = [
        'TUIC',
        node.server,
        node.port,
    ];

    parts.push(`uuid=${node.uuid}`);
    parts.push(`password=${node.password}`);

    if (node.tls) {
        if (node.tls.serverName) parts.push(`sni=${node.tls.serverName}`);
        if (node.tls.alpn) parts.push(`alpn=${node.tls.alpn.join(',')}`);
        if (node.tls.insecure) parts.push('skip-cert-verify:true');
    }

    return `${node.name} = ${parts.join(',')}`;
}

function buildWireGuard(node: WireGuardNode): string {
    const parts = [
        'WireGuard',
    ];

    if (node.ip) parts.push(`interface-ip:${node.ip}`);
    parts.push(`private-key:${node.privateKey}`);
    if (node.mtu) parts.push(`mtu:${node.mtu}`);
    parts.push(`peer:(public-key:${node.publicKey},endpoint:${node.server}:${node.port})`);

    return `${node.name} = ${parts.join(',')}`;
}

function buildSnell(node: SnellNode): string {
    const parts = [
        'Snell',
        node.server,
        node.port,
        `psk=${node.password}`,
        `version=${node.version || '4'}`
    ];
    if (node.obfs) {
        parts.push(`obfs-name:${node.obfs.type}`);
        if (node.obfs.host) parts.push(`obfs-host:${node.obfs.host}`);
    }
    return `${node.name} = ${parts.join(',')}`;
}

function buildSocks5(node: Socks5Node): string {
    // Loon SOCKS5 format: NodeName = socks5, server, port, username, password
    const parts = [
        'socks5',
        node.server,
        node.port.toString(),
    ];

    // Add authentication if present
    if (node.username) {
        parts.push(node.username);
        if (node.password) {
            parts.push(node.password);
        }
    }

    return `${node.name} = ${parts.join(', ')}`;
}



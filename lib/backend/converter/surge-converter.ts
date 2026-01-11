import { ProxyNode, ConverterOptions, VmessNode, TrojanNode, ShadowsocksNode, Hysteria2Node, TuicNode, WireGuardNode, SnellNode, Socks5Node } from '../../shared/types';




/**
 * 转换为 Surge 配置
 */
export function toSurge(nodes: ProxyNode[], _options: ConverterOptions = {}): string {
    // 只返回节点列表，Surge 的 Managed Config 格式
    const lines: string[] = ['[Proxy]'];
    for (const node of nodes) {
        const line = nodeToSurgeLine(node);
        if (line) {
            lines.push(line);
        }
    }
    return lines.join('\n');
}

/**
 * 将 Node 转换为 Surge 配置行
 */
function nodeToSurgeLine(node: ProxyNode): string | null {
    try {
        switch (node.type) {
            case 'vmess': return buildVmess(node as VmessNode);
            case 'trojan': return buildTrojan(node as TrojanNode);
            case 'ss': return buildShadowsocks(node as ShadowsocksNode);
            case 'hysteria2': return buildHysteria2(node as Hysteria2Node);
            case 'tuic': return buildTuic(node as TuicNode);
            case 'wireguard': return buildWireGuard(node as WireGuardNode);
            // Surge 对 VLESS 支持有限或者通常使用外部模块，此处暂不原生支持 VLESS
            // 或者如果 Surge 5 支持的话可以添加
            case 'snell': return buildSnell(node as SnellNode);
            case 'socks5': return buildSocks5(node as Socks5Node);

            default:
                // console.warn(`Surge 不原生支持或暂未实现: ${node.type}`);
                return null;
        }
    } catch (e) {
        console.warn(`Surge 转换失败: ${node.name}`, e);
        return null;
    }
}

function buildVmess(node: VmessNode): string {
    const parts = [
        'vmess',
        node.server,
        node.port,
        `username=${node.uuid}`,
    ];

    if (node.tls?.enabled) {
        parts.push('tls=true');
        if (node.tls.serverName) parts.push(`sni=${node.tls.serverName}`);
        if (node.tls.insecure) parts.push('skip-cert-verify=true');
    }

    if (node.transport) {
        if (node.transport.type === 'ws') {
            parts.push('ws=true');
            if (node.transport.path) parts.push(`ws-path=${node.transport.path}`);
            if (node.transport.headers?.Host) parts.push(`ws-headers=Host:${node.transport.headers.Host}`);
        }
    }

    // Surge VMess AEAD usually defaults to auto, but we can specify if needed
    // if (node.cipher === 'auto' || !node.cipher) ...

    return `${node.name} = ${parts.join(', ')}`;
}

function buildTrojan(node: TrojanNode): string {
    const parts = [
        'trojan',
        node.server,
        node.port,
        `password=${node.password}`,
    ];

    if (node.tls) {
        if (node.tls.serverName) parts.push(`sni=${node.tls.serverName}`);
        if (node.tls.insecure) parts.push('skip-cert-verify=true');
    }

    if (node.transport?.type === 'ws') {
        parts.push('ws=true');
        if (node.transport.path) parts.push(`ws-path=${node.transport.path}`);
        if (node.transport.headers?.Host) parts.push(`ws-headers=Host:${node.transport.headers.Host}`);
    }

    return `${node.name} = ${parts.join(', ')}`;
}

function buildShadowsocks(node: ShadowsocksNode): string {
    const parts = [
        'ss',
        node.server,
        node.port,
        `encrypt-method=${node.cipher}`,
        `password=${node.password}`,
    ];

    if (node.plugin) {
        if (node.plugin.includes('obfs')) {
            parts.push('obfs=http'); // Simplified, assumes http obfs
            if (node.pluginOpts?.['obfs-host']) {
                parts.push(`obfs-host=${node.pluginOpts['obfs-host']}`);
            }
        }
    }

    if (node.udp) parts.push('udp-relay=true');

    return `${node.name} = ${parts.join(', ')}`;
}

function buildHysteria2(node: Hysteria2Node): string {
    const parts = [
        'hysteria2',
        node.server,
        node.port,
        `password=${node.password}`,
    ];

    if (node.tls) {
        if (node.tls.serverName) parts.push(`sni=${node.tls.serverName}`);
        if (node.tls.insecure) parts.push('skip-cert-verify=true');
    }

    if (node.obfs) {
        parts.push(`obfs=${node.obfs.type}`);
        if (node.obfs.password) parts.push(`obfs-password=${node.obfs.password}`);
    }

    // Surge Hysteria2 options might differ slightly, checking standard docs
    // download-bandwidth=...

    return `${node.name} = ${parts.join(', ')}`;
}

function buildTuic(node: TuicNode): string {
    const parts = [
        'tuic',
        node.server,
        node.port,
        `uuid=${node.uuid}`,
        `password=${node.password}`,
    ];

    if (node.tls) {
        if (node.tls.serverName) parts.push(`sni=${node.tls.serverName}`);
        if (node.tls.alpn) parts.push(`alpn=${node.tls.alpn.join(',')}`);
        if (node.tls.insecure) parts.push('skip-cert-verify=true');
    }

    // Surge TUIC usually v5
    parts.push('version=5');

    return `${node.name} = ${parts.join(', ')}`;
}

function buildWireGuard(node: WireGuardNode): string {
    // Surge WireGuard uses section based definition which is complex in a single line output context
    // Usually Surge users prefer external dconf or section based. 
    // This inline format: 'Name = wireguard, ...' works in modern Surge

    // const parts = [ ... ]; // removed unused

    // But wait, the previous code used:
    // section-name = ...
    // Surge Inline WG is: ProxyName = wireguard, section-name=... (referring to a [WireGuard MyNode] section)
    // Generating a separate section inline is hard in this line-based generator structure without refactoring the whole writer.
    // For now we might skip or use a placeholder if we can't append sections easily.
    // However, modern Surge might support inline parameters?
    // Let's stick to the previous logic if possible, but previous logic generated `[WireGuard NodeName]` lines? 
    // No, previous logic generated: `Name = wireguard, section-name = Name_clean`
    // But where was the section body generated? 
    // Looking at the previous file content... it ONLY generated the proxy line, but NOT the section.
    // That means the previous code was incomplete or expected the user to fill sections.
    // Let's produce a warning comment instead of broken config.

    return `# WireGuard node '${node.name}' omitted (Inline WG config requires separate section generator)`;
}

function buildSnell(node: SnellNode): string {
    const parts = [
        'snell',
        node.server,
        node.port,
        `psk=${node.password}`,
        `version=${node.version || '4'}`
    ];
    if (node.obfs) {
        parts.push(`obfs=${node.obfs.type}`);
        if (node.obfs.host) parts.push(`obfs-host=${node.obfs.host}`);
    }
    return `${node.name} = ${parts.join(', ')}`;
}

function buildSocks5(node: Socks5Node): string {
    // Surge SOCKS5 format: ProxyName = socks5, server, port, username, password
    const parts = [
        'socks5',
        node.server,
        node.port.toString(),
    ];

    // Add authentication if present
    if (node.username && node.password) {
        parts.push(node.username);
        parts.push(node.password);
    }

    // Add TLS support if enabled (SOCKS5-TLS)
    if (node.tls?.enabled) {
        parts.push('tls=true');
        if (node.tls.serverName) parts.push(`sni=${node.tls.serverName}`);
        if (node.tls.insecure) parts.push('skip-cert-verify=true');
    }

    return `${node.name} = ${parts.join(', ')}`;
}



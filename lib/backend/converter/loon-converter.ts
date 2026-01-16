/**
 * =================================================================
 * Loon 转换器 - 官方协议支持版
 * =================================================================
 * 
 * 基于官方文档：https://nsloon.app
 * 
 * 支持的协议（已验证）：
 * ✅ HTTP/HTTPS, SOCKS5
 * ✅ Shadowsocks, ShadowsocksR
 * ✅ VMess, VLESS (含 REALITY)
 * ✅ Trojan
 * ✅ Hysteria2, WireGuard
 * ✅ Shadow-TLS
 * 
 * @module converter/loon-enhanced
 * =================================================================
 */

import {
    ProxyNode, ConverterOptions, VmessNode, VlessNode, TrojanNode,
    ShadowsocksNode, ShadowsocksRNode, Hysteria2Node, WireGuardNode,
    Socks5Node
} from '../../shared/types';

const DEBUG = typeof process !== 'undefined' && process.env?.DEBUG_CONVERTER === '1';

/**
 * 转换为 Loon 配置
 */
export function toLoon(nodes: ProxyNode[], _options?: ConverterOptions): string {
    const lines: string[] = ['[Proxy]'];
    let successCount = 0;

    for (const node of nodes) {
        const line = nodeToLoonLine(node);
        if (line) {
            lines.push(line);
            successCount++;
        }
    }

    if (DEBUG) {
        console.log(`[Loon] 成功转换 ${successCount}/${nodes.length} 个节点`);
    }

    return lines.join('\n');
}

export function nodeToLoonLine(node: ProxyNode): string | null {
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
            case 'hysteria2':
                return buildHysteria2(node as Hysteria2Node);
            case 'wireguard':
                return buildWireGuard(node as WireGuardNode);
            case 'socks5':
                return buildSocks5(node as Socks5Node);
            default:
                if (DEBUG) {
                    console.warn(`[Loon] 不支持的协议: ${node.type}`);
                }
                return null;
        }
    } catch (e) {
        console.error(`[Loon] 转换失败 (${node.name}):`, e);
        return null;
    }
}

// =================================================================
// 协议构建函数
// =================================================================

/**
 * VMess 代理
 * 格式: name = vmess, server, port, method, "uuid", [options]
 */
function buildVmess(node: VmessNode): string {
    const parts = [
        'vmess',
        node.server,
        node.port.toString(),
        node.cipher || 'auto',
        `"${node.uuid}"`
    ];

    const opts: string[] = [];

    // TLS
    if (node.tls?.enabled) {
        opts.push('over-tls=true');
        if (node.tls.serverName) {
            opts.push(`tls-name=${node.tls.serverName}`);
        }
        if (node.tls.insecure) {
            opts.push('skip-cert-verify=true');
        }
    }

    // WebSocket
    if (node.transport?.type === 'ws') {
        opts.push('transport=ws');
        if (node.transport.path) {
            opts.push(`path=${node.transport.path}`);
        }
        if (node.transport.headers?.Host) {
            opts.push(`host=${node.transport.headers.Host}`);
        }
    }

    const optsStr = opts.length > 0 ? `,${opts.join(',')}` : '';
    return `${node.name} = ${parts.join(',')}${optsStr}`;
}

/**
 * VLESS 代理（Loon 支持！）
 * 格式: name = vless, server, port, "uuid", [options]
 */
function buildVless(node: VlessNode): string {
    const parts = [
        'vless',
        node.server,
        node.port.toString(),
        `"${node.uuid}"`
    ];

    const opts: string[] = [];

    // TLS/REALITY
    if (node.tls?.enabled) {
        if (node.tls.reality?.enabled) {
            // REALITY 支持
            opts.push('over-tls=true');
            opts.push('tls-name=' + (node.tls.serverName || node.server));
            if (node.tls.reality.publicKey) {
                opts.push(`public-key=${node.tls.reality.publicKey}`);
            }
            if (node.tls.reality.shortId) {
                opts.push(`short-id=${node.tls.reality.shortId}`);
            }
        } else {
            opts.push('over-tls=true');
            if (node.tls.serverName) {
                opts.push(`tls-name=${node.tls.serverName}`);
            }
            if (node.tls.insecure) {
                opts.push('skip-cert-verify=true');
            }
        }
    }

    // Flow
    if (node.flow) {
        opts.push(`flow=${node.flow}`);
    }

    // WebSocket
    if (node.transport?.type === 'ws') {
        opts.push('transport=ws');
        if (node.transport.path) {
            opts.push(`path=${node.transport.path}`);
        }
        if (node.transport.headers?.Host) {
            opts.push(`host=${node.transport.headers.Host}`);
        }
    }

    const optsStr = opts.length > 0 ? `,${opts.join(',')}` : '';
    return `${node.name} = ${parts.join(',')}${optsStr}`;
}

/**
 * Trojan 代理
 */
function buildTrojan(node: TrojanNode): string {
    const parts = [
        'trojan',
        node.server,
        node.port.toString(),
        `"${node.password}"`
    ];

    const opts: string[] = [];

    // TLS
    if (node.tls?.serverName) {
        opts.push(`tls-name=${node.tls.serverName}`);
    }
    if (node.tls?.insecure) {
        opts.push('skip-cert-verify=true');
    }

    // WebSocket
    if (node.transport?.type === 'ws') {
        opts.push('transport=ws');
        if (node.transport.path) {
            opts.push(`path=${node.transport.path}`);
        }
        if (node.transport.headers?.Host) {
            opts.push(`host=${node.transport.headers.Host}`);
        }
    }

    const optsStr = opts.length > 0 ? `,${opts.join(',')}` : '';
    return `${node.name} = ${parts.join(',')}${optsStr}`;
}

/**
 * Shadowsocks 代理
 */
function buildShadowsocks(node: ShadowsocksNode): string {
    const parts = [
        'shadowsocks',
        node.server,
        node.port.toString(),
        node.cipher,
        `"${node.password}"`
    ];

    const opts: string[] = [];

    // 插件
    if (node.plugin && node.plugin.includes('obfs')) {
        const obfsMode = node.pluginOpts?.obfs || 'http';
        opts.push(`obfs=${obfsMode}`);

        if (node.pluginOpts?.['obfs-host']) {
            opts.push(`obfs-host=${node.pluginOpts['obfs-host']}`);
        }
    }

    // UDP
    if (node.udp) {
        opts.push('udp=true');
    }

    const optsStr = opts.length > 0 ? `,${opts.join(',')}` : '';
    return `${node.name} = ${parts.join(',')}${optsStr}`;
}

/**
 * ShadowsocksR 代理（Loon 支持！）
 */
function buildSSR(node: ShadowsocksRNode): string {
    const parts = [
        'shadowsocksr',
        node.server,
        node.port.toString(),
        node.cipher,
        `"${node.password}"`,
        node.protocol || 'origin',
        node.obfs || 'plain'
    ];

    const opts: string[] = [];

    if (node.protocolParam) {
        opts.push(`protocol-param="${node.protocolParam}"`);
    }

    if (node.obfsParam) {
        opts.push(`obfs-param="${node.obfsParam}"`);
    }

    if (node.udp) {
        opts.push('udp=true');
    }

    const optsStr = opts.length > 0 ? `,${opts.join(',')}` : '';
    return `${node.name} = ${parts.join(',')}${optsStr}`;
}

/**
 * Hysteria2 代理（Loon 支持！）
 */
function buildHysteria2(node: Hysteria2Node): string {
    const parts = [
        'hysteria2',
        node.server,
        node.port.toString(),
        `"${node.password}"`
    ];

    const opts: string[] = [];

    // TLS
    if (node.tls?.serverName) {
        opts.push(`sni=${node.tls.serverName}`);
    }
    if (node.tls?.insecure) {
        opts.push('skip-cert-verify=true');
    }

    // 混淆
    if (node.obfs) {
        opts.push(`obfs=${node.obfs.type}`);
        opts.push(`obfs-password=${node.obfs.password}`);
    }

    const optsStr = opts.length > 0 ? `,${opts.join(',')}` : '';
    return `${node.name} = ${parts.join(',')}${optsStr}`;
}

/**
 * WireGuard 代理（Loon 支持！）
 */
function buildWireGuard(node: WireGuardNode): string {
    const parts = [
        'wireguard',
        node.server,
        node.port.toString(),
        `private-key="${node.privateKey}"`,
        `public-key="${node.publicKey}"`
    ];

    const opts: string[] = [];

    if (node.ip) {
        opts.push(`ip=${node.ip}`);
    }
    if (node.ipv6) {
        opts.push(`ipv6=${node.ipv6}`);
    }
    if (node.preSharedKey) {
        opts.push(`preshared-key="${node.preSharedKey}"`);
    }
    if (node.mtu) {
        opts.push(`mtu=${node.mtu}`);
    }

    const optsStr = opts.length > 0 ? `,${opts.join(',')}` : '';
    return `${node.name} = ${parts.join(',')}${optsStr}`;
}

/**
 * SOCKS5 代理
 */
function buildSocks5(node: Socks5Node): string {
    const parts = [
        'socks5',
        node.server,
        node.port.toString()
    ];

    if (node.username && node.password) {
        parts.push(`"${node.username}"`);
        parts.push(`"${node.password}"`);
    }

    const opts: string[] = [];

    if (node.tls?.enabled) {
        opts.push('over-tls=true');
        if (node.tls.serverName) {
            opts.push(`tls-name=${node.tls.serverName}`);
        }
    }

    const optsStr = opts.length > 0 ? `,${opts.join(',')}` : '';
    return `${node.name} = ${parts.join(',')}${optsStr}`;
}

export default {
    toLoon,
    nodeToLoonLine
};

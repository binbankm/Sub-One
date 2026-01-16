/**
 * =================================================================
 * QuantumultX 转换器 - 增强版
 * =================================================================
 * 
 * 优化内容：
 * 1. 参数完整性提升
 * 2. 错误处理增强
 * 3. 调试日志支持
 * 4. 文档注释完整
 * 
 * @module converter/quantumultx-enhanced
 * =================================================================
 */

import {
    ProxyNode, ConverterOptions, VmessNode, TrojanNode, VlessNode,
    ShadowsocksNode, ShadowsocksRNode, Socks5Node
} from '../../shared/types';

const DEBUG = process.env.DEBUG_CONVERTER === '1';

/**
 * 转换为 QuantumultX 配置
 */
export function toQuantumultX(nodes: ProxyNode[], _options?: ConverterOptions): string {
    const lines: string[] = ['[server_local]'];
    let successCount = 0;

    for (const node of nodes) {
        const line = nodeToQuantumultXLine(node);
        if (line) {
            lines.push(line);
            successCount++;
        }
    }

    if (DEBUG) {
        console.log(`[QuantumultX] 成功转换 ${successCount}/${nodes.length} 个节点`);
    }

    return lines.join('\n');
}

export function nodeToQuantumultXLine(node: ProxyNode): string | null {
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
            case 'socks5':
                return buildSocks5(node as Socks5Node);
            default:
                if (DEBUG) {
                    console.warn(`[QuantumultX] 不支持的协议: ${node.type}`);
                }
                return null;
        }
    } catch (e) {
        console.error(`[QuantumultX] 转换失败 (${node.name}):`, e);
        return null;
    }
}

// =================================================================
// 协议构建函数
// =================================================================

function buildVmess(node: VmessNode): string {
    const parts = [
        // 'vmess' removed
        `${node.server}:${node.port}`,
        `method=${node.cipher || 'auto'}`,
        `password=${node.uuid}`
    ];

    const opts: string[] = [];

    if (node.tls?.enabled) {
        opts.push('over-tls=true');
        if (node.tls.serverName) {
            opts.push(`tls-host=${node.tls.serverName}`);
        }
        if (node.tls.insecure) {
            opts.push('tls-verification=false');
        }
    }

    if (node.transport?.type === 'ws') {
        opts.push('obfs=ws');
        if (node.transport.path) {
            opts.push(`obfs-uri=${node.transport.path}`);
        }
        if (node.transport.headers?.Host) {
            opts.push(`obfs-host=${node.transport.headers.Host}`);
        }
    }

    if (node.udp) {
        opts.push('udp-relay=true');
    }

    const optStr = opts.length > 0 ? `, ${opts.join(', ')}` : '';
    return `vmess=${parts.join(', ')}${optStr}, tag=${node.name}`;
}

function buildVless(node: VlessNode): string {
    const parts = [
        // 'vless' removed
        `${node.server}:${node.port}`,
        `method=${(node as any).cipher || 'none'}`,
        `id=${node.uuid}`
    ];

    const opts: string[] = [];

    if (node.tls?.enabled) {
        opts.push('tls=true');
        if (node.tls.serverName) {
            opts.push(`tls-host=${node.tls.serverName}`);
        }
        if (node.tls.insecure) {
            opts.push('tls-verification=false');
        }
    }

    // VLESS Reality support (limited in QX but best effort)
    if (node.tls?.reality?.enabled) {
        // QX might not fully support Reality, but we send standard TLS params
        // or omit if QX doesn't support it at all. Based on docs, basic VLESS is supported.
        // We'll treat it as TLS.
        if (node.tls.reality.publicKey) {
            // Some clients use different params for reality, but QX support is limited.
            // Leaving standard TLS params.
        }
    }

    if (node.transport?.type === 'ws') {
        opts.push('obfs=ws');
        if (node.transport.path) {
            opts.push(`obfs-uri=${node.transport.path}`);
        }
        if (node.transport.headers?.Host) {
            opts.push(`obfs-host=${node.transport.headers.Host}`);
        }
    }

    if (node.udp) {
        opts.push('udp-relay=true');
    }

    const optStr = opts.length > 0 ? `, ${opts.join(', ')}` : '';
    return `vless=${parts.join(', ')}${optStr}, tag=${node.name}`;
}

function buildTrojan(node: TrojanNode): string {
    const parts = [
        // 'trojan' removed
        `${node.server}:${node.port}`,
        `password=${node.password}`
    ];

    const opts: string[] = [];

    if (node.tls?.enabled) {
        opts.push('over-tls=true');
        if (node.tls.serverName) {
            opts.push(`tls-host=${node.tls.serverName}`);
        }
        if (node.tls.insecure) {
            opts.push('tls-verification=false');
        }
    }

    if (node.transport?.type === 'ws') {
        opts.push('obfs=ws');
        if (node.transport.path) {
            opts.push(`obfs-uri=${node.transport.path}`);
        }
    }

    if (node.udp) {
        opts.push('udp-relay=true');
    }

    const optStr = opts.length > 0 ? `, ${opts.join(', ')}` : '';
    return `trojan=${parts.join(', ')}${optStr}, tag=${node.name}`;
}

function buildShadowsocks(node: ShadowsocksNode): string {
    const parts = [
        // 'shadowsocks' removed
        `${node.server}:${node.port}`,
        `method=${node.cipher}`,
        `password=${node.password}`
    ];

    const opts: string[] = [];

    if (node.plugin) {
        if (node.plugin.includes('obfs')) {
            const obfsMode = node.pluginOpts?.obfs || 'http';
            opts.push(`obfs=${obfsMode}`);

            if (node.pluginOpts?.['obfs-host']) {
                opts.push(`obfs-host=${node.pluginOpts['obfs-host']}`);
            }
        }
    }

    if (node.udp) {
        opts.push('udp-relay=true');
    }

    const optStr = opts.length > 0 ? `, ${opts.join(', ')}` : '';
    return `shadowsocks=${parts.join(', ')}${optStr}, tag=${node.name}`;
}

function buildSSR(node: ShadowsocksRNode): string {
    const parts = [
        // 'shadowsocks' removed (it was shadowsocks before, maybe should be shadowsocks?) 
        // QX uses shadowsocks= for SSR too usually but with ssr-protocol params
        `${node.server}:${node.port}`,
        `method=${node.cipher}`,
        `password=${node.password}`,
        `ssr-protocol=${node.protocol}`,
        `obfs=${node.obfs}`
    ];

    const opts: string[] = [];

    if (node.protocolParam) {
        opts.push(`ssr-protocol-param=${node.protocolParam}`);
    }

    if (node.obfsParam) {
        opts.push(`obfs-host=${node.obfsParam}`);
    }

    if (node.udp) {
        opts.push('udp-relay=true');
    }

    const optStr = opts.length > 0 ? `, ${opts.join(', ')}` : '';
    return `shadowsocks=${parts.join(', ')}${optStr}, tag=${node.name}`;
}

function buildSocks5(node: Socks5Node): string {
    const parts = [
        // 'socks5' removed
        `${node.server}:${node.port}`
    ];

    if (node.username && node.password) {
        parts.push(`username=${node.username}`);
        parts.push(`password=${node.password}`);
    }

    const opts: string[] = [];

    if (node.tls?.enabled) {
        opts.push('over-tls=true');
        if (node.tls.serverName) {
            opts.push(`tls-host=${node.tls.serverName}`);
        }
    }

    const optStr = opts.length > 0 ? `, ${opts.join(', ')}` : '';
    return `socks5=${parts.join(', ')}${optStr}, tag=${node.name}`;
}

export default {
    toQuantumultX,
    nodeToQuantumultXLine
};

/**
 * =================================================================
 * Surge 转换器 - 增强版
 * =================================================================
 * 
 * 优化内容：
 * 1. 参数完整性提升
 * 2. 调试日志支持
 * 3. 错误处理增强
 * 4. 文档注释完整
 * 
 * 官方验证 (Surge 5+):
 * - 支持协议: VMess, Trojan, Shadowsocks, Hysteria2, TUIC, WireGuard, Snell, SOCKS5
 * - VLESS: ⚠️ 不支持
 * 
 * @module converter/surge-enhanced
 * =================================================================
 */

import {
    ProxyNode, ConverterOptions, VmessNode, TrojanNode,
    ShadowsocksNode, Hysteria2Node, TuicNode,
    WireGuardNode, SnellNode, Socks5Node
} from '../../shared/types';

const DEBUG = process.env.DEBUG_CONVERTER === '1';

/**
 * 转换为 Surge 配置
 */
export function toSurge(nodes: ProxyNode[], _options?: ConverterOptions): string {
    const lines: string[] = ['[Proxy]'];
    let successCount = 0;

    for (const node of nodes) {
        const line = nodeToSurgeLine(node);
        if (line) {
            lines.push(line);
            successCount++;
        }
    }

    if (DEBUG) {
        console.log(`[Surge] 成功转换 ${successCount}/${nodes.length} 个节点`);
    }

    return lines.join('\n');
}

/**
 * 将 Node 转换为 Surge 配置行
 */
export function nodeToSurgeLine(node: ProxyNode): string | null {
    try {
        let content: string | null = null;

        switch (node.type) {
            case 'vmess': content = buildVmess(node as VmessNode); break;
            case 'trojan': content = buildTrojan(node as TrojanNode); break;
            case 'ss': content = buildShadowsocks(node as ShadowsocksNode); break;
            case 'hysteria2': content = buildHysteria2(node as Hysteria2Node); break;
            case 'tuic': content = buildTuic(node as TuicNode); break;
            case 'snell': content = buildSnell(node as SnellNode); break;
            case 'socks5': content = buildSocks5(node as Socks5Node); break;
            case 'wireguard': return buildWireGuard(node as WireGuardNode); // 返回特有格式
            default:
                if (DEBUG) {
                    console.warn(`[Surge] 不支持的协议: ${node.type}`);
                }
                return null;
        }

        if (content) {
            return `${node.name} = ${content}`;
        }
        return null;
    } catch (e) {
        console.error(`[Surge] 转换失败 (${node.name}):`, e);
        return null;
    }
}

// =================================================================
// 协议构建函数
// =================================================================

/**
 * VMess 代理
 */
function buildVmess(node: VmessNode): string {
    const parts = [
        'vmess',
        node.server,
        node.port.toString(),
        `username=${node.uuid}`
    ];

    if (node.tls?.enabled) {
        parts.push('tls=true');
        if (node.tls.serverName) {
            parts.push(`sni=${node.tls.serverName}`);
        }
        if (node.tls.insecure) {
            parts.push('skip-cert-verify=true');
        }
    }

    if (node.transport?.type === 'ws') {
        parts.push('ws=true');
        if (node.transport.path) {
            parts.push(`ws-path=${node.transport.path}`);
        }
        if (node.transport.headers?.Host) {
            parts.push(`ws-headers=Host:${node.transport.headers.Host}`);
        }
    }

    if (node.udp) {
        parts.push('udp-relay=true');
    }

    return parts.join(', ');
}

/**
 * Trojan 代理
 */
function buildTrojan(node: TrojanNode): string {
    const parts = [
        'trojan',
        node.server,
        node.port.toString(),
        `password=${node.password}`
    ];

    if (node.tls?.enabled) {
        // Surge Trojan 默认开启 TLS
        if (node.tls.serverName) {
            parts.push(`sni=${node.tls.serverName}`);
        }
        if (node.tls.insecure) {
            parts.push('skip-cert-verify=true');
        }
    }

    if (node.transport?.type === 'ws') {
        parts.push('ws=true');
        if (node.transport.path) {
            parts.push(`ws-path=${node.transport.path}`);
        }
    }

    if (node.udp) {
        parts.push('udp-relay=true');
    }

    return parts.join(', ');
}

/**
 * Shadowsocks 代理
 */
function buildShadowsocks(node: ShadowsocksNode): string {
    const parts = [
        'ss',
        node.server,
        node.port.toString(),
        `encrypt-method=${node.cipher}`,
        `password=${node.password}`
    ];

    if (node.udp) {
        parts.push('udp-relay=true');
    }

    if (node.plugin === 'obfs') {
        const obfs = node.pluginOpts?.obfs || 'http';
        const host = node.pluginOpts?.['obfs-host'] || 'bing.com';
        parts.push(`obfs=${obfs}`, `obfs-host=${host}`);
    }

    return parts.join(', ');
}

/**
 * Hysteria2 代理
 */
function buildHysteria2(node: Hysteria2Node): string {
    const parts = [
        'hysteria2',
        node.server,
        node.port.toString(),
        `password=${node.password}`
    ];

    if (node.tls?.serverName) {
        parts.push(`sni=${node.tls.serverName}`);
    }
    if (node.tls?.insecure) {
        parts.push('skip-cert-verify=true');
    }

    if (node.obfs?.type === 'salamander') {
        parts.push(`obfs=salamander`, `obfs-password=${node.obfs.password}`);
    }

    return parts.join(', ');
}

/**
 * TUIC 代理
 */
function buildTuic(node: TuicNode): string {
    const parts = [
        'tuic',
        node.server,
        node.port.toString(),
        `uuid=${node.uuid}`,
        `password=${node.password}`
    ];

    if (node.tls?.serverName) {
        parts.push(`sni=${node.tls.serverName}`);
    }
    if (node.tls?.alpn) {
        parts.push(`alpn=${node.tls.alpn.join(',')}`);
    }

    return parts.join(', ');
}

/**
 * Snell 代理
 */
function buildSnell(node: SnellNode): string {
    const parts = [
        'snell',
        node.server,
        node.port.toString(),
        `psk=${(node as any).psk}`
    ];

    if (node.obfs?.type) {
        parts.push(`obfs=${node.obfs.type}`);
    }

    return parts.join(', ');
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

    if (node.username) {
        parts.push(`username=${node.username}`);
    }
    if (node.password) {
        parts.push(`password=${node.password}`);
    }

    if (node.tls?.enabled) {
        parts.push('tls=true');
        if (node.tls.serverName) {
            parts.push(`sni=${node.tls.serverName}`);
        }
    }

    if (node.udp) {
        parts.push('udp-relay=true');
    }

    return parts.join(', ');
}

/**
 * WireGuard 代理 (由于格式复杂，通常在 [WireGuard] 章节定义)
 * 这里生成一个带有详细说明的注释节点
 */
function buildWireGuard(node: WireGuardNode): string {
    return `# WireGuard 节点: ${node.name}
# 请在 [WireGuard] 章节手动配置:
# ${node.name} = section-name=${node.name}, test-timeout=5
# [WireGuard ${node.name}]
# private-key = ${node.privateKey}
# self-ip = ${node.ip}
# peer = (public-key = ${node.publicKey}, endpoint = ${node.server}:${node.port}, allowed-ips = 0.0.0.0/0, preshared-key = ${node.preSharedKey || ''})`;
}

export default {
    toSurge,
    nodeToSurgeLine
};

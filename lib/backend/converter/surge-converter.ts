import { ProxyNode, ConverterOptions, VmessNode, TrojanNode, ShadowsocksNode, Hysteria2Node, TuicNode, WireGuardNode, SnellNode } from '../../shared/types';
import { SURGE_CONFIG, DEFAULT_TEST_URL } from '../config/config';
import { getTemplate, RuleTemplate } from '../config/rule-templates';


/**
 * 转换为 Surge 配置
 */
export function toSurge(nodes: ProxyNode[], options: ConverterOptions = {}): string {
    const tpl: RuleTemplate = getTemplate(options.ruleTemplate || 'advanced');

    // 如果选择了"仅节点"模板，只返回节点列表
    if (tpl.id === 'none') {
        const lines: string[] = ['[Proxy]'];
        for (const node of nodes) {
            const line = nodeToSurgeLine(node);
            if (line) {
                lines.push(line);
            }
        }
        return lines.join('\n');
    }

    // 完整配置模式
    const lines: string[] = [];

    lines.push(SURGE_CONFIG.managedConfig);
    lines.push('');
    lines.push('[General]');
    Object.entries(SURGE_CONFIG.general).forEach(([key, value]) => {
        lines.push(`${key} = ${value}`);
    });
    lines.push('');
    lines.push('[Proxy]');

    const nodeNames: string[] = [];
    for (const node of nodes) {
        const line = nodeToSurgeLine(node);
        if (line) {
            lines.push(line);
            nodeNames.push(node.name);
        }
    }


    lines.push('');
    lines.push('[Proxy Group]');

    // 基础策略组
    // Proxy: 入口选择 (自动，手动，直连)
    lines.push(`${SURGE_CONFIG.groupNames.proxy} = select, ${SURGE_CONFIG.groupNames.auto}, ${SURGE_CONFIG.groupNames.manual}, ${SURGE_CONFIG.groupNames.direct}, icon-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Proxy.png`);
    // Auto: 自动测速
    lines.push(`${SURGE_CONFIG.groupNames.auto} = url-test, ${nodeNames.join(', ')}, url=${DEFAULT_TEST_URL}, interval=600, icon-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png`);
    // Manual: 手动选择
    lines.push(`${SURGE_CONFIG.groupNames.manual} = select, ${nodeNames.join(', ')}, icon-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Static.png`);

    // Template Groups
    tpl.groups.forEach(g => {
        const type = g.type === 'url-test' ? 'url-test' : 'select';
        // 包含 Proxy, Auto, Manual, Direct
        let content = `${g.name} = ${type}, ${SURGE_CONFIG.groupNames.proxy}, ${SURGE_CONFIG.groupNames.auto}, ${SURGE_CONFIG.groupNames.manual}, ${SURGE_CONFIG.groupNames.direct}`;
        if (g.type === 'url-test') {
            content += `, url=${DEFAULT_TEST_URL}, interval=600`;
        }
        if (g.iconUrl) {
            content += `, icon-url=${g.iconUrl}`;
        }
        lines.push(content);
    });

    lines.push('');
    lines.push('[Rule]');

    // Template Rules
    tpl.rules.forEach(r => {
        let target = r.target;
        // Map target names
        if (target === 'Proxy') target = SURGE_CONFIG.groupNames.proxy;
        if (target === 'Direct') target = 'DIRECT';
        if (target === 'Reject') target = 'REJECT';
        if (target === 'Auto') target = SURGE_CONFIG.groupNames.proxy; // Surge auto usually implies url-test group or load-balance

        if (r.type === 'domain') lines.push(`DOMAIN,${r.value},"${target}"`);
        else if (r.type === 'domain_suffix') lines.push(`DOMAIN-SUFFIX,${r.value},"${target}"`);
        else if (r.type === 'domain_keyword') lines.push(`DOMAIN-KEYWORD,${r.value},"${target}"`);
        else if (r.type === 'ip_cidr') lines.push(`IP-CIDR,${r.value},"${target}"${r.noResolve ? ',no-resolve' : ''}`);
        else if (r.type === 'geoip') lines.push(`GEOIP,${r.value},"${target}"${r.noResolve ? ',no-resolve' : ''}`);

        else if (r.type === 'process_name') lines.push(`PROCESS-NAME,${r.value},"${target}"`);
        else if (r.type === 'rule_set') {
            // Add comment based on rule value filename for better readability
            // const filename = r.value.split('/').pop()?.split('.')[0] || 'Rule';
            // lines.push(`# > ${filename}`);
            lines.push(`RULE-SET,${r.value},"${target}"`);
        }
    });

    lines.push('GEOIP,CN,"DIRECT"');
    lines.push(`FINAL,"${SURGE_CONFIG.groupNames.proxy}",dns-failed`);

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

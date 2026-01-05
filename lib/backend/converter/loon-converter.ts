import { ProxyNode, ConverterOptions, VmessNode, VlessNode, TrojanNode, ShadowsocksNode, Hysteria2Node, TuicNode, WireGuardNode, SnellNode } from '../../shared/types';
import { LOON_CONFIG, DEFAULT_TEST_URL } from '../config/config';
import { getTemplate, RuleTemplate } from '../config/rule-templates';

/**
 * 转换为 Loon 配置
 */
export function toLoon(nodes: ProxyNode[], options: ConverterOptions = {}): string {
    const tpl: RuleTemplate = getTemplate(options.ruleTemplate || 'advanced');

    // 如果选择了"仅节点"模板，只返回节点列表
    if (tpl.id === 'none') {
        const lines: string[] = ['[Proxy]'];
        for (const node of nodes) {
            const line = nodeToLoonLine(node);
            if (line) {
                lines.push(line);
            }
        }
        return lines.join('\n');
    }

    // 完整配置模式
    const lines: string[] = [];

    lines.push('[General]');
    Object.entries(LOON_CONFIG.general).forEach(([key, value]) => {
        lines.push(`${key} = ${value}`);
    });
    lines.push('');
    lines.push('[Proxy]');

    const nodeNames: string[] = [];
    for (const node of nodes) {
        const line = nodeToLoonLine(node);
        if (line) {
            lines.push(line);
            nodeNames.push(node.name);
        }
    }


    lines.push('');
    lines.push('[Proxy Group]');

    // 基础策略组
    // Proxy: 入口
    lines.push(`${LOON_CONFIG.groupNames.proxy} = select, ${LOON_CONFIG.groupNames.auto}, ${LOON_CONFIG.groupNames.manual}, ${LOON_CONFIG.groupNames.direct}, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Proxy.png`);
    // Auto: 自动
    lines.push(`${LOON_CONFIG.groupNames.auto} = url-test, ${nodeNames.join(', ')}, url=${DEFAULT_TEST_URL}, interval=600, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png`);
    // Manual: 手动
    lines.push(`${LOON_CONFIG.groupNames.manual} = select, ${nodeNames.join(', ')}, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Static.png`);

    // Template Groups
    tpl.groups.forEach(g => {
        const type = g.type === 'url-test' ? 'url-test' : 'select';
        // 包含 Proxy, Auto, Manual, Direct
        let content = `${g.name} = ${type}, ${LOON_CONFIG.groupNames.proxy}, ${LOON_CONFIG.groupNames.auto}, ${LOON_CONFIG.groupNames.manual}, ${LOON_CONFIG.groupNames.direct}`;
        if (g.type === 'url-test') {
            content += `, url=${DEFAULT_TEST_URL}, interval=600`;
        }
        if (g.iconUrl) {
            content += `, img-url=${g.iconUrl}`;
        }
        lines.push(content);
    });

    lines.push('');
    lines.push('');

    // 分离本地规则和远程规则
    const localRules: string[] = [];
    const remoteRules: string[] = [];

    tpl.rules.forEach(r => {
        let target = r.target;
        // Map target names
        if (target === 'Proxy') target = LOON_CONFIG.groupNames.proxy;
        if (target === 'Direct') target = 'DIRECT';
        if (target === 'Reject') target = 'REJECT';
        if (target === 'Auto') target = LOON_CONFIG.groupNames.proxy;

        if (r.type === 'rule_set') {
            // [Remote Rule] Format: URL, policy=PolicyName, tag=TagName, enabled=true
            const tagName = r.value.split('/').pop()?.replace(/\.(list|txt|yaml|yml|wb)$/i, '') || 'Rule';
            // Sanitize tag: allow alphanumeric, hyphen, underscore, and Chinese characters
            const safeTag = tagName.replace(/[^a-zA-Z0-9_\-\u4e00-\u9fa5]/g, '');
            remoteRules.push(`${r.value}, policy=${target}, tag=${safeTag}, enabled=true`);
        } else {
            // [Rule] Format
            if (r.type === 'domain') localRules.push(`DOMAIN,${r.value},${target}`);
            else if (r.type === 'domain_suffix') localRules.push(`DOMAIN-SUFFIX,${r.value},${target}`);
            else if (r.type === 'domain_keyword') localRules.push(`DOMAIN-KEYWORD,${r.value},${target}`);
            else if (r.type === 'ip_cidr') localRules.push(`IP-CIDR,${r.value},${target}${r.noResolve ? ',no-resolve' : ''}`);
            else if (r.type === 'geoip') localRules.push(`GEOIP,${r.value},${target}${r.noResolve ? ',no-resolve' : ''}`);
            else if (r.type === 'process_name') localRules.push(`PROCESS-NAME,${r.value},${target}`);
        }
    });

    // Output [Rule]
    lines.push('[Rule]');
    lines.push(...localRules);
    // Add default rules at the end of [Rule]
    lines.push('GEOIP,CN,DIRECT');
    lines.push(`FINAL,${LOON_CONFIG.groupNames.proxy}`);

    lines.push('');
    // Output [Remote Rule]
    lines.push('[Remote Rule]');
    lines.push(...remoteRules);


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
            parts.push(`short-id:${tls.reality.shortId}`);
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

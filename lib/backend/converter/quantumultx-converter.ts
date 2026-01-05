import { ProxyNode, ConverterOptions, VmessNode, VlessNode, TrojanNode, ShadowsocksNode } from '../../shared/types';
import { QX_CONFIG, DEFAULT_TEST_URL } from '../config/config';
import { getTemplate, RuleTemplate } from '../config/rule-templates';


export function toQuantumultX(nodes: ProxyNode[], options: ConverterOptions = {}): string {
    const lines: string[] = [];
    const tpl: RuleTemplate = getTemplate(options.ruleTemplate || 'advanced');

    lines.push('[general]');
    lines.push(`server_check_url=${DEFAULT_TEST_URL}`);
    lines.push(`dns_server=${QX_CONFIG.dns}`);
    lines.push('');
    lines.push('[server_local]');

    const nodeNames: string[] = [];
    for (const node of nodes) {
        const line = nodeToQuantumultXLine(node);
        if (line) {
            lines.push(line);
            nodeNames.push(node.name);
        }
    }

    // 如果选择了"仅节点"模板，只返回节点配置
    if (tpl.id === 'none') {
        return lines.join('\n');
    }

    lines.push('');
    lines.push('[policy]');

    // QX Policies
    // static=Proxy, direct, proxy, img-url=...
    // url-latency-benchmark=Auto,…


    // 基础策略组
    // Manual: 手动选择 (所有节点)
    lines.push(`static=${QX_CONFIG.groupNames.manual}, ${nodeNames.join(', ')}, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Static.png`);
    // Auto: 自动选择 (所有节点, 测速)
    lines.push(`url-latency-benchmark=${QX_CONFIG.groupNames.auto}, ${nodeNames.join(', ')}, url=${DEFAULT_TEST_URL}, interval=600, tolerance=50, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png`);
    // Proxy: 节点选择 (Auto, Manual, Direct) - 注意 QX 引用策略组不需要特殊前缀，直接写名字
    lines.push(`static=${QX_CONFIG.groupNames.proxy}, ${QX_CONFIG.groupNames.auto}, ${QX_CONFIG.groupNames.manual}, ${QX_CONFIG.groupNames.direct}, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Proxy.png`);

    // Template Groups
    tpl.groups.forEach(g => {
        if (g.type === 'url-test') {
            lines.push(`url-latency-benchmark=${g.name}, ${QX_CONFIG.groupNames.proxy}, ${QX_CONFIG.groupNames.manual}, ${QX_CONFIG.groupNames.direct}, url=${DEFAULT_TEST_URL}, interval=600, tolerance=50${g.iconUrl ? `, img-url=${g.iconUrl}` : ''}`);
        } else {
            // select / fallback
            lines.push(`static=${g.name}, ${QX_CONFIG.groupNames.proxy}, ${QX_CONFIG.groupNames.auto}, ${QX_CONFIG.groupNames.manual}, ${QX_CONFIG.groupNames.direct}${g.iconUrl ? `, img-url=${g.iconUrl}` : ''}`);
        }
    });

    lines.push('');
    const filterRemote: string[] = [];
    const filterLocal: string[] = [];

    // Template Rules
    tpl.rules.forEach(r => {
        let target = r.target;
        // Map target names
        if (target === 'Proxy') target = QX_CONFIG.groupNames.proxy;
        if (target === 'Direct') target = QX_CONFIG.groupNames.direct;
        if (target === 'Reject') target = 'reject';
        if (target === 'Auto') target = QX_CONFIG.groupNames.auto;
        if (target === 'Manual') target = QX_CONFIG.groupNames.manual;

        if (r.type === 'domain') filterLocal.push(`host, ${r.value}, ${target}`);
        else if (r.type === 'domain_suffix') filterLocal.push(`host-suffix, ${r.value}, ${target}`);
        else if (r.type === 'domain_keyword') filterLocal.push(`host-keyword, ${r.value}, ${target}`);
        else if (r.type === 'ip_cidr') filterLocal.push(`ip-cidr, ${r.value}, ${target}${r.noResolve ? ', no-resolve' : ''}`);
        else if (r.type === 'geoip') filterLocal.push(`geoip, ${r.value}, ${target}`);
        else if (r.type === 'rule_set') {
            const tagName = r.value.split('/').pop()?.replace('.list', '') || 'RuleSet';
            filterRemote.push(`${r.value}, tag=${tagName}, force-policy=${target}, update-interval=86400, enabled=true`);
        }
    });

    if (filterRemote.length > 0) {
        lines.push('[filter_remote]');
        lines.push(...filterRemote);
        lines.push('');
    }

    lines.push('[filter_local]');
    lines.push(...filterLocal);

    lines.push(`host-suffix, local, ${QX_CONFIG.groupNames.direct}`);
    lines.push(`geoip, cn, ${QX_CONFIG.groupNames.direct}`);
    lines.push(`final, ${QX_CONFIG.groupNames.proxy}`);

    return lines.join('\n');
}

function nodeToQuantumultXLine(node: ProxyNode): string | null {
    try {
        switch (node.type) {
            case 'vmess': return buildVmess(node as VmessNode);
            case 'vless': return buildVless(node as VlessNode);
            case 'trojan': return buildTrojan(node as TrojanNode);
            case 'ss': return buildShadowsocks(node as ShadowsocksNode);
            default:
                // QX 不支持 Hy2, Tuic, WG 原生配置行格式 (或者比较非标准)
                return null;
        }
    } catch (e) {
        console.warn(`QuantumultX 转换失败: ${node.name}`, e);
        return null;
    }
}

function buildVmess(node: VmessNode): string {
    const parts: string[] = [];
    parts.push(`vmess=${node.server}:${node.port}`);
    parts.push(`method=${node.cipher || 'none'}`);
    parts.push(`password=${node.uuid}`);

    const hasTLS = node.tls?.enabled;
    const network = node.transport?.type || 'tcp';

    if (network === 'ws') {
        parts.push(hasTLS ? 'obfs=wss' : 'obfs=ws');
        if (node.transport?.headers?.Host) parts.push(`obfs-host=${node.transport.headers.Host}`);
        if (node.transport?.path) parts.push(`obfs-uri=${node.transport.path}`);
    } else if (network === 'tcp') {
        if (hasTLS) {
            parts.push('obfs=over-tls');
            if (node.tls?.serverName) parts.push(`obfs-host=${node.tls.serverName}`);
        }
    }

    parts.push('fast-open=false');
    parts.push('udp-relay=true');
    parts.push(`tag=${node.name}`);

    return parts.join(', ');
}

function buildVless(node: VlessNode): string {
    // QX VLESS support is limited or requires specific syntax
    const parts: string[] = [];
    parts.push(`vless=${node.server}:${node.port}`);
    parts.push('method=none');
    parts.push(`password=${node.uuid}`);

    const hasTLS = node.tls?.enabled;
    // Reality not supported in QX standard config yet? QX handles XTLS/TLS. 
    // We treat Reality as TLS here but it might fail connection in QX if QX lacks Reality support.

    const network = node.transport?.type || 'tcp';

    if (network === 'ws') {
        parts.push(hasTLS ? 'obfs=wss' : 'obfs=ws');
        if (node.transport?.headers?.Host) parts.push(`obfs-host=${node.transport.headers.Host}`);
        if (node.transport?.path) parts.push(`obfs-uri=${node.transport.path}`);
    } else if (network === 'tcp') {
        if (hasTLS) {
            parts.push('obfs=over-tls');
            if (node.tls?.serverName) parts.push(`obfs-host=${node.tls.serverName}`);
        }
    }

    if (hasTLS && node.tls?.insecure) {
        parts.push('tls-verification=false');
    }

    parts.push('fast-open=false');
    parts.push('udp-relay=false');
    parts.push(`tag=${node.name}`);

    return parts.join(', ');
}

function buildTrojan(node: TrojanNode): string {
    const parts: string[] = [];
    parts.push(`trojan=${node.server}:${node.port}`);
    parts.push(`password=${node.password}`);
    parts.push('over-tls=true');

    if (node.tls?.serverName) parts.push(`tls-host=${node.tls.serverName}`);
    if (node.tls?.insecure) parts.push('tls-verification=false');
    else parts.push('tls-verification=true');

    parts.push('fast-open=false');
    parts.push('udp-relay=true');
    parts.push(`tag=${node.name}`);

    return parts.join(', ');
}

function buildShadowsocks(node: ShadowsocksNode): string {
    const parts: string[] = [];
    parts.push(`shadowsocks=${node.server}:${node.port}`);
    parts.push(`method=${node.cipher}`);
    parts.push(`password=${node.password}`);

    if (node.plugin && node.plugin.includes('obfs')) {
        const opts = node.pluginOpts || {};
        if (opts.obfs) parts.push(`obfs=${opts.obfs}`);
        if (opts['obfs-host']) parts.push(`obfs-host=${opts['obfs-host']}`);
    }

    parts.push('fast-open=false');
    parts.push('udp-relay=true');
    parts.push(`tag=${node.name}`);

    return parts.join(', ');
}

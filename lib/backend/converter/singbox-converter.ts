import { ProxyNode, ConverterOptions, VmessNode, VlessNode, TrojanNode, ShadowsocksNode, HysteriaNode, Hysteria2Node, TuicNode, WireGuardNode, AnyTLSNode, TransportOptions, TlsOptions, HttpNode, Socks5Node, SingBoxOutbound } from '../../shared/types';
import { SING_BOX_CONFIG } from '../config/config';
import { getTemplate, RuleTemplate } from '../config/rule-templates';

/**
 * 转换为 Sing-Box JSON 配置
 */
export function toSingBox(nodes: ProxyNode[], options: ConverterOptions = {}): string {
    const outbounds = nodes
        .map(node => nodeToSingBoxOutbound(node))
        .filter((o): o is SingBoxOutbound => o !== null);

    // 获取规则模板
    const tpl: RuleTemplate = getTemplate(options.ruleTemplate || 'advanced');

    // 如果选择了"仅节点"模板，只返回节点列表
    if (tpl.id === 'none') {
        return JSON.stringify({ outbounds: outbounds }, null, 2);
    }

    // 基础 Tag 映射
    const baseGroupMap: Record<string, string> = {
        'Proxy': SING_BOX_CONFIG.groupNames.proxy,
        'Auto': SING_BOX_CONFIG.groupNames.auto,
        'Manual': SING_BOX_CONFIG.groupNames.manual,
        'Direct': SING_BOX_CONFIG.groupNames.direct,
        'Reject': 'block'
    };

    // 1. 构建出站 (Outbounds)
    // 基础出站
    // 1. 构建出站 (Outbounds)
    // 基础出站
    const generatedOutbounds: any[] = [
        {
            tag: SING_BOX_CONFIG.groupNames.proxy,
            type: 'selector',
            // 核心变动：只包含入口 (Auto, Manual, Direct)
            outbounds: [SING_BOX_CONFIG.groupNames.auto, SING_BOX_CONFIG.groupNames.manual, SING_BOX_CONFIG.groupNames.direct]
        },
        {
            tag: SING_BOX_CONFIG.groupNames.auto,
            type: 'urltest',
            outbounds: outbounds.map(o => o.tag),
            url: 'http://www.gstatic.com/generate_204',
            interval: '10m',
            tolerance: 50
        },
        {
            tag: SING_BOX_CONFIG.groupNames.manual,
            type: 'selector',
            outbounds: outbounds.map(o => o.tag)
        },
        { type: 'direct', tag: SING_BOX_CONFIG.groupNames.direct },
        { type: 'block', tag: 'block' },
        { type: 'dns', tag: 'dns-out' },
        ...outbounds
    ];

    // 添加模板定义的额外策略组
    tpl.groups.forEach(g => {
        generatedOutbounds.splice(3, 0, { // 插入到 Direct 之前 (Manual 之后)
            tag: g.name,
            type: g.type === 'url-test' ? 'urltest' : 'selector',
            outbounds: [SING_BOX_CONFIG.groupNames.proxy, SING_BOX_CONFIG.groupNames.auto, SING_BOX_CONFIG.groupNames.manual, SING_BOX_CONFIG.groupNames.direct],
            // 如果是 urltest 类型，需要添加检测配置
            ...(g.type === 'url-test' ? { url: 'http://www.gstatic.com/generate_204', interval: '10m', tolerance: 50 } : {})
        });
    });

    // 2. 构建路由规则 (Route Rules)
    const ruleSets: any[] = [];
    const rules: any[] = [
        { protocol: 'dns', outbound: 'dns-out' }
    ];

    // 遍历模板规则
    tpl.rules.forEach(r => {
        let outbound = r.target;
        if (baseGroupMap[outbound]) {
            outbound = baseGroupMap[outbound];
        }

        const ruleBase = { outbound };

        if (r.type === 'domain') rules.push({ ...ruleBase, domain: [r.value] });
        else if (r.type === 'domain_suffix') rules.push({ ...ruleBase, domain_suffix: [r.value] });
        else if (r.type === 'domain_keyword') rules.push({ ...ruleBase, domain_keyword: [r.value] });
        else if (r.type === 'ip_cidr') rules.push({ ...ruleBase, ip_cidr: [r.value] });
        else if (r.type === 'geoip') rules.push({ ...ruleBase, geoip: [r.value] });
        else if (r.type === 'process_name') rules.push({ ...ruleBase, process_name: [r.value] });
        else if (r.type === 'rule_set') {
            // 生成可读的 Tag
            let baseName = r.value.split('/').pop()?.replace(/\.(json|srs|list)$/i, '') || `rs-${rules.length}`;
            baseName = baseName.replace(/[^a-zA-Z0-9_\-]/g, ''); // Sanitize

            // 简单的唯一性处理：如果已存在同名 Tag，追加 index (虽然在转换器内部目前 ruleSets 数组主要靠 push，但为了严谨)
            // 由于 SingBox `rule_set` 数组是独立的，我们需要避免 tag 重复。
            // 这里简单策略：先生成 baseName。如果这里有重名隐患，可以加上 index。
            // 考虑到标准模板几乎没有重名文件(不同目录同名文件除外)，为了绝对安全，我们可以 append index 或者检查已存在的 tags。
            // 让我们检查 ruleSets 中是否已有该 tag。
            let tag = baseName;
            let counter = 1;
            while (ruleSets.some(rs => rs.tag === tag)) {
                tag = `${baseName}_${counter++}`;
            }

            ruleSets.push({
                tag: tag,
                type: 'remote',
                format: 'source',
                url: r.value,
                download_detour: SING_BOX_CONFIG.groupNames.proxy
            });
            rules.push({ rule_set: tag, outbound: outbound });
        }
    });

    // 兜底规则（Clash 的 MATCH 在 Singbox 里通常是利用 auto_detect_interface 或默认最后的 outbound，
    // 但为了明确，我们可以不加最后一条，让 Singbox 默认回退到第一个 outbound 也就是 Proxy）

    // Sing-Box 总是会自动使用第一个 outbound 作为默认，所以 Proxy 放在第一个很重要。

    // 查找国内域名规则集的 Tag (用于 DNS 分流)
    // 匹配包含 'China' 的规则集 (例如 China.list, ChinaDomain.list)
    const chinaDomainRule = ruleSets.find(rs => rs.url.includes('China') && !rs.url.includes('Ip') && !rs.url.includes('IP'));
    const cnDnsRule: any = chinaDomainRule
        ? { rule_set: [chinaDomainRule.tag], server: 'local' }
        : null;

    const dnsConfig: any = {
        servers: [
            { tag: 'google', address: '8.8.8.8', strategy: 'prefer_ipv4' },
            { tag: 'local', address: '223.5.5.5', detour: 'direct', strategy: 'prefer_ipv4' }
        ],
        rules: [
            // 如果找到了国内域名规则集，优先使用它
            ...(cnDnsRule ? [cnDnsRule] : []),
            // 兜底：如果没有匹配规则（或没有国内规则集），所有请求走 local DNS (223.5.5.5)，
            // 或者我们可以让国外域名走 google? 
            // 现在的逻辑是：如果不在 ChinaDomain 里 -> 走下面？
            // 更好的逻辑：
            // 1. rule_set: [Item1, Item2...] (Proxy items) -> server: google
            // 2. rule_set: [ChinaDomain] -> server: local
            // 3. final -> google

            // 但为了简单和稳健（且避免下载大量 srs），目前的策略是：
            // 1. ChinaDomain -> local
            // 2. outbound: any -> local (兜底用国内DNS，防止无法解析国内域名，国外域名由FakeIP或远端解析)
            // Wait, SingBox DNS strategy matters. 
            // Let's stick to the previous simple logic but with rule_set.
            { outbound: 'any', server: 'local' }
        ]
    };

    // 如果我们使用了 advanced 模板，通常会有很多规则集。
    // 为了更好的 DNS 体验，也许应该让 Proxy 规则集走 Google DNS？
    // { rule_set: ruleSets.filter(r => !r.url.includes('China')).map(r => r.tag), server: 'google' }
    // 把非国内的规则集都丢给 Google DNS 解析。

    const proxyRuleSets = ruleSets.filter(rs => !rs.url.includes('China') && !rs.url.includes('Direct'));
    if (proxyRuleSets.length > 0) {
        dnsConfig.rules.unshift({
            rule_set: proxyRuleSets.map(rs => rs.tag),
            server: 'google'
        });
    }

    const config = {
        log: { level: 'info' },
        dns: dnsConfig,
        inbounds: [
            {
                type: 'mixed',
                tag: 'mixed-in',
                listen: '127.0.0.1',
                listen_port: 2080,
                sniff: true
            }
        ],
        outbounds: generatedOutbounds,
        route: {
            rule_set: ruleSets.length > 0 ? ruleSets : undefined,
            rules: rules,
            auto_detect_interface: true,
            final: SING_BOX_CONFIG.groupNames.proxy
        }
    };

    return JSON.stringify(config, null, 2);
}

function nodeToSingBoxOutbound(node: ProxyNode): SingBoxOutbound | null {
    try {
        switch (node.type) {
            case 'vmess': return buildVmess(node as VmessNode);
            case 'vless': return buildVless(node as VlessNode);
            case 'trojan': return buildTrojan(node as TrojanNode);
            case 'ss': return buildShadowsocks(node as ShadowsocksNode);
            case 'hysteria': return buildHysteria(node as HysteriaNode);
            case 'hysteria2': return buildHysteria2(node as Hysteria2Node);
            case 'tuic': return buildTuic(node as TuicNode);
            case 'wireguard': return buildWireGuard(node as WireGuardNode);
            case 'anytls': return buildAnyTLS(node as AnyTLSNode);
            case 'http': return buildHttp(node as HttpNode);
            case 'socks5': return buildSocks5(node as Socks5Node);
            default:
                console.warn(`[SingBox] Unsupported node type: ${node.type}`);
                return null;
        }
    } catch (e) {
        console.error(`[SingBox] Failed to convert node ${node.name}:`, e);
        return null;
    }
}

// --- Specific Builders ---

function buildBase(node: ProxyNode) {
    return {
        tag: node.name,
        server: node.server,
        server_port: node.port
    };
}

function assignTransport(outbound: SingBoxOutbound, node: { transport?: TransportOptions }) {
    const t = node.transport;
    if (!t || t.type === 'tcp') return;

    if (t.type === 'ws') {
        outbound.transport = {
            type: 'ws',
            path: t.path,
            headers: t.headers
        };
    } else if (t.type === 'grpc') {
        outbound.transport = {
            type: 'grpc',
            service_name: t.serviceName
        };
    } else if (t.type === 'http' || t.type === 'h2') {
        outbound.transport = {
            type: 'http',
            path: t.path,
            host: t.host
        };
    } else if (t.type === 'quic') {
        outbound.transport = {
            type: 'quic'
        };
    }
}

function assignTls(outbound: SingBoxOutbound, node: { tls?: TlsOptions }) {
    const tls = node.tls;
    if (!tls || !tls.enabled) return;

    outbound.tls = {
        enabled: true,
        server_name: tls.serverName,
        insecure: tls.insecure,
        alpn: tls.alpn
    };

    if (tls.reality?.enabled) {
        outbound.tls.reality = {
            enabled: true,
            public_key: tls.reality.publicKey,
            short_id: tls.reality.shortId
        };
    }
}

function buildVmess(node: VmessNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'vmess',
        ...buildBase(node),
        uuid: node.uuid,
        alter_id: node.alterId,
        security: node.cipher
    };
    // SingBox VMess TLS structure is inside 'tls', handled by assignTls
    assignTls(outbound, node);
    assignTransport(outbound, node);
    return outbound;
}

function buildVless(node: VlessNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'vless',
        ...buildBase(node),
        uuid: node.uuid,
        flow: node.flow
    };
    assignTls(outbound, node);
    assignTransport(outbound, node);
    return outbound;
}

function buildTrojan(node: TrojanNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'trojan',
        ...buildBase(node),
        password: node.password
    };
    assignTls(outbound, node);
    assignTransport(outbound, node);
    return outbound;
}

function buildShadowsocks(node: ShadowsocksNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'shadowsocks',
        ...buildBase(node),
        method: node.cipher,
        password: node.password
    };
    if (node.plugin) {
        outbound.plugin = node.plugin;
        outbound.plugin_opts = ""; // SingBox plugin options string format?
        // TODO: Map plugin opts object to string if needed
    }
    return outbound;
}

function buildHysteria(node: HysteriaNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'hysteria',
        ...buildBase(node),
        auth_str: node.auth,
        up_mbps: node.upMbps,
        down_mbps: node.downMbps,
        obfs: node.obfs,
        protocol: node.protocol
    };
    assignTls(outbound, node);
    return outbound;
}

function buildHysteria2(node: Hysteria2Node): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'hysteria2',
        ...buildBase(node),
        password: node.password
    };
    if (node.obfs) {
        outbound.obfs = {
            type: node.obfs.type,
            password: node.obfs.password
        };
    }
    assignTls(outbound, node);
    return outbound;
}

function buildTuic(node: TuicNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'tuic',
        ...buildBase(node),
        uuid: node.uuid,
        password: node.password,
        congestion_control: node.congestionControl
    };
    if (node.udpRelayMode) outbound.udp_relay_mode = node.udpRelayMode;
    assignTls(outbound, node);
    return outbound;
}

function buildWireGuard(node: WireGuardNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'wireguard',
        tag: node.name,
        server: node.server,
        server_port: node.port,
        private_key: node.privateKey,
        peer_public_key: node.publicKey,
        local_address: [node.ip, node.ipv6].filter((i): i is string => !!i),
        mtu: node.mtu
    };
    if (node.preSharedKey) outbound.pre_shared_key = node.preSharedKey;
    return outbound;
}

function buildAnyTLS(node: AnyTLSNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'anytls',
        ...buildBase(node),
        password: node.password,
        idle_timeout: node.idleTimeout
    };

    if (node.clientFingerprint) {
        outbound.client_fingerprint = node.clientFingerprint;
    }

    assignTls(outbound, node);
    return outbound;
}

function buildHttp(node: HttpNode): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'http',
        ...buildBase(node),
        username: node.username,
        password: node.password
    };
    assignTls(outbound, node);
    return outbound;
}

function buildSocks5(node: Socks5Node): SingBoxOutbound {
    const outbound: SingBoxOutbound = {
        type: 'socks5',
        ...buildBase(node),
        username: node.username,
        password: node.password
    };
    // SingBox socks5 outbound does not support TLS typically for standard socks5, but let's keep it consistent if singbox supports socks5+tls (unlikely standard, but maybe over tls transport?)
    // Actually standard socks5 in sing-box is just tcp/udp. If it's over TLS it might be different structure. 
    // But for basic compatibility:
    return outbound;
}

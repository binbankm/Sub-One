import * as yaml from 'js-yaml';
import { ProxyNode, ConverterOptions, VmessNode, VlessNode, TrojanNode, ShadowsocksNode, Hysteria2Node, TuicNode, AnyTLSNode, SnellNode, TransportOptions, TlsOptions, HttpNode, Socks5Node, ClashProxyConfig } from '../../shared/types';
import { CLASH_CONFIG } from '../config/config';
import { getTemplate, RuleTemplate } from '../config/rule-templates';

/**
 * 转换为 Clash Meta YAML 配置
 * 纯粹的数据映射，不解析 URL
 */
export function toClash(nodes: ProxyNode[], options: ConverterOptions = {}): string {
    const proxies = nodes
        .map(node => nodeToClashProxy(node))
        .filter(p => p !== null);

    // 获取选择的规则模板，默认为 Minimal
    const tpl: RuleTemplate = getTemplate(options.ruleTemplate || 'advanced');

    // 如果选择了"仅节点"模板，只返回节点列表
    if (tpl.id === 'none') {
        const config = {
            proxies: proxies
        };
        return yaml.dump(config, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
            flowLevel: 2
        });
    }

    // 基础策略组名称映射 (用于 UniversalRule target 映射)
    const baseGroupMap: Record<string, string> = {
        'Proxy': CLASH_CONFIG.groupNames.select,
        'Auto': CLASH_CONFIG.groupNames.auto,
        'Direct': CLASH_CONFIG.groupNames.direct,
        'Reject': 'REJECT'
    };

    // 1. 构建所有策略组
    // 始终包含基础的 Select, Auto, Manual, Direct
    const proxyGroups: any[] = [
        {
            name: CLASH_CONFIG.groupNames.select,
            type: 'select',
            proxies: [CLASH_CONFIG.groupNames.auto, CLASH_CONFIG.groupNames.manual, CLASH_CONFIG.groupNames.direct],
            icon: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Proxy.png'
        },
        {
            name: CLASH_CONFIG.groupNames.auto,
            type: 'url-test',
            proxies: proxies.map(p => p.name),
            url: CLASH_CONFIG.testUrl,
            interval: 300,
            tolerance: 50,
            icon: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Auto.png'
        },
        {
            name: CLASH_CONFIG.groupNames.manual,
            type: 'select',
            proxies: proxies.map(p => p.name),
            icon: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Static.png'
        },
        {
            name: CLASH_CONFIG.groupNames.direct,
            type: 'select',
            proxies: ['DIRECT'],
            icon: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Direct.png'
        }
    ];

    // 添加模板定义的额外策略组
    // 添加模板定义的额外策略组
    tpl.groups.forEach(g => {
        const group: any = {
            name: g.name,
            type: g.type,
            proxies: [CLASH_CONFIG.groupNames.select, CLASH_CONFIG.groupNames.auto, CLASH_CONFIG.groupNames.manual, CLASH_CONFIG.groupNames.direct]
        };

        if (g.type === 'url-test') {
            group.url = CLASH_CONFIG.testUrl;
            group.interval = 300;
            group.tolerance = 50;
        }

        if (g.iconUrl) {
            group.icon = g.iconUrl;
        }

        proxyGroups.push(group);
    });

    // 2. 构建规则列表
    const rules: string[] = [];

    // 遍历模板规则
    // 规则集提供者存储
    const ruleProviders: Record<string, any> = {};

    // 遍历模板规则
    tpl.rules.forEach((r, index) => {
        let target = r.target;
        // 映射 Target (Proxy/Direct -> 具体组名)
        if (baseGroupMap[target]) {
            target = baseGroupMap[target];
        }

        // 转换规则类型
        if (r.type === 'domain') rules.push(`DOMAIN,${r.value},${target}`);
        else if (r.type === 'domain_suffix') rules.push(`DOMAIN-SUFFIX,${r.value},${target}`);
        else if (r.type === 'domain_keyword') rules.push(`DOMAIN-KEYWORD,${r.value},${target}`);
        else if (r.type === 'ip_cidr') {
            rules.push(`IP-CIDR,${r.value},${target}${r.noResolve ? ',no-resolve' : ''}`);
        }
        else if (r.type === 'geoip') {
            rules.push(`GEOIP,${r.value},${target}${r.noResolve ? ',no-resolve' : ''}`);
        }

        else if (r.type === 'process_name') {
            rules.push(`PROCESS-NAME,${r.value},${target}`);
        }
        else if (r.type === 'rule_set') {
            // 生成唯一的 Provider 名称 (从 URL 提取文件名，如 Netflix, YouTube)
            let baseName = r.value.split('/').pop()?.replace(/\.(list|yaml|yml)$/i, '') || `rule_${index}`;
            // 简单处理非法字符
            baseName = baseName.replace(/[^a-zA-Z0-9_\-]/g, '');

            // 防止重名 (虽然在标准模板里不太可能，但为了健壮性)
            let providerName = baseName;
            let counter = 1;
            while (ruleProviders[providerName]) {
                providerName = `${baseName}_${counter++}`;
            }
            ruleProviders[providerName] = {
                type: 'http',
                behavior: 'classical',
                url: r.value,
                path: `./rules/${providerName}.yaml`,
                interval: 86400
            };
            rules.push(`RULE-SET,${providerName},${target}`);
        }
    });

    // 最终兜底规则
    rules.push(`MATCH,${CLASH_CONFIG.groupNames.select}`);

    // 构建配置结构
    // 构建配置结构
    const config = {
        // 基础配置
        port: CLASH_CONFIG.port,
        'socks-port': CLASH_CONFIG['socks-port'],
        'mixed-port': CLASH_CONFIG['mixed-port'],
        'allow-lan': CLASH_CONFIG['allow-lan'],
        'bind-address': CLASH_CONFIG['bind-address'],
        mode: CLASH_CONFIG.mode,
        'log-level': CLASH_CONFIG['log-level'],
        ipv6: CLASH_CONFIG.ipv6,
        'external-controller': CLASH_CONFIG['external-controller'],

        // DNS 配置
        dns: CLASH_CONFIG.dns,

        // 代理与策略
        proxies: proxies,
        'proxy-groups': proxyGroups,
        'rule-providers': Object.keys(ruleProviders).length > 0 ? ruleProviders : undefined,
        rules: rules
    };

    return yaml.dump(config, {
        indent: 2,
        lineWidth: -1,
        noRefs: true, // 禁止 YAML 引用
        flowLevel: 2  // 使用紧凑的 Flow (JSON-like) 格式输出节点和策略组
    });
}

function nodeToClashProxy(node: ProxyNode): ClashProxyConfig | null {
    try {
        switch (node.type) {
            case 'vmess': return buildVmess(node as VmessNode);
            case 'vless': return buildVless(node as VlessNode);
            case 'trojan': return buildTrojan(node as TrojanNode);
            case 'ss': return buildShadowsocks(node as ShadowsocksNode);
            case 'hysteria2': return buildHysteria2(node as Hysteria2Node);
            case 'anytls': return buildAnyTLS(node as AnyTLSNode);
            case 'tuic': return buildTuic(node as TuicNode);
            case 'snell': return buildSnell(node as SnellNode);
            // 兼容性
            case 'http': return buildHttp(node as HttpNode);
            case 'socks5': return buildSocks5(node as Socks5Node);
            default:
                // 如果是未知类型但有 originalProxy (例如直接从 YAML 解析来的 Snell), 直接返回
                if (node.originalProxy) return node.originalProxy as unknown as ClashProxyConfig;
                console.warn(`[Clash] Unsupported node type: ${node.type}`);
                return null;
        }
    } catch (e) {
        console.error(`[Clash] Failed to convert node ${node.name}:`, e);
        return null;
    }
}

// --- Specific Builders ---

function buildCommon(node: ProxyNode) {
    return {
        name: node.name,
        server: node.server,
        port: node.port,
        udp: node.udp
    };
}

function assignTransport(proxy: ClashProxyConfig, node: { transport?: TransportOptions }) {
    const t = node.transport;
    if (!t) return;

    proxy.network = t.type;

    if (t.type === 'ws') {
        proxy['ws-opts'] = {
            path: t.path || '/',
            headers: t.headers
        };
    } else if (t.type === 'grpc') {
        proxy['grpc-opts'] = {
            'grpc-service-name': t.serviceName || ''
        };
        if (t.mode === 'multi') proxy['grpc-opts'].mode = 'multi';
    } else if (t.type === 'h2' || t.type === 'http') {
        proxy['h2-opts'] = {
            path: t.path || '/',
            host: t.host || []
        };
    }
}

function assignTls(proxy: ClashProxyConfig, node: { tls?: TlsOptions }) {
    const tls = node.tls;
    if (!tls || !tls.enabled) return;

    proxy.tls = true;
    if (tls.serverName) proxy.servername = tls.serverName;
    if (tls.alpn) proxy.alpn = tls.alpn;
    if (tls.fingerprint) proxy['client-fingerprint'] = tls.fingerprint;
    if (tls.insecure) proxy['skip-cert-verify'] = true;

    // Reality
    if (tls.reality?.enabled) {
        // Clash Meta Reality syntax
        // meta uses 'tls: true' but also 'reality-opts' logic usually implies stream security
        // Wait, standard Clash Meta checks 'network' and 'tls' boolean
        // For Reality, we usually set tls=true + network options
        // But let's check standard Meta config:
        proxy.tls = true;
        proxy['reality-opts'] = {
            'public-key': tls.reality.publicKey,
            'short-id': tls.reality.shortId
        };
        if (tls.reality.spiderX) proxy['reality-opts']['spider-x'] = tls.reality.spiderX;
    }
}

function buildVmess(node: VmessNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'vmess',
        uuid: node.uuid,
        alterId: node.alterId,
        cipher: node.cipher
    };
    assignTransport(proxy, node);
    assignTls(proxy, node);
    return proxy;
}

function buildVless(node: VlessNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'vless',
        uuid: node.uuid,
        flow: node.flow
    };
    assignTransport(proxy, node);
    assignTls(proxy, node);
    return proxy;
}

function buildTrojan(node: TrojanNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'trojan',
        password: node.password
    };
    assignTransport(proxy, node);
    assignTls(proxy, node);
    return proxy;
}

function buildShadowsocks(node: ShadowsocksNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'ss',
        cipher: node.cipher,
        password: node.password
    };
    if (node.plugin) {
        proxy.plugin = node.plugin;
        proxy['plugin-opts'] = node.pluginOpts;
    }
    return proxy;
}

function buildHysteria2(node: Hysteria2Node): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'hysteria2',
        password: node.password,
    };
    if (node.obfs) {
        proxy.obfs = node.obfs.type;
        proxy['obfs-password'] = node.obfs.password;
    }
    // Hysteria2 隐含 TLS, 但 Meta 显式参数
    if (node.tls) {
        if (node.tls.serverName) proxy.sni = node.tls.serverName;
        if (node.tls.insecure) proxy['skip-cert-verify'] = true;
        if (node.tls.alpn) proxy.alpn = node.tls.alpn;
        if (node.tls.fingerprint) proxy.fingerprint = node.tls.fingerprint;
    }
    return proxy;
}


function buildAnyTLS(node: AnyTLSNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'anytls',
        password: node.password,
        'client-fingerprint': node.clientFingerprint,
        'idle-timeout': node.idleTimeout
    };

    if (node.tls) {
        if (node.tls.serverName) proxy.sni = node.tls.serverName;
        if (node.tls.insecure) proxy['skip-cert-verify'] = true;
        if (node.tls.alpn) proxy.alpn = node.tls.alpn;
        if (node.tls.fingerprint) proxy.fingerprint = node.tls.fingerprint;
    }

    return proxy;
}

function buildTuic(node: TuicNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'tuic',
        uuid: node.uuid,
        password: node.password,
        'congestion-controller': node.congestionControl,
        'udp-relay-mode': node.udpRelayMode
    };
    if (node.tls) {
        if (node.tls.serverName) proxy.sni = node.tls.serverName;
        if (node.tls.insecure) proxy['skip-cert-verify'] = true;
        if (node.tls.alpn) proxy.alpn = node.tls.alpn;
    }
    return proxy;
}

function buildHttp(node: HttpNode): ClashProxyConfig {
    return {
        ...buildCommon(node),
        type: 'http',
        username: node.username,
        password: node.password
    };
}

function buildSocks5(node: Socks5Node): ClashProxyConfig {
    return {
        ...buildCommon(node),
        type: 'socks5',
        username: node.username,
        password: node.password
    };
}

function buildSnell(node: SnellNode): ClashProxyConfig {
    const proxy: ClashProxyConfig = {
        ...buildCommon(node),
        type: 'snell',
        psk: node.password,
        version: node.version || '4'
    };
    if (node.obfs) {
        proxy['obfs-opts'] = {
            mode: node.obfs.type,
            host: node.obfs.host
        };
    }
    return proxy;
}

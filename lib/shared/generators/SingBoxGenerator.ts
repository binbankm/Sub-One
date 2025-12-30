
import type { Node, SingBoxOutbound, VmessConfig } from '../types';

export class SingBoxGenerator {
    /**
     * 生成 Sing-Box 配置
     * 使用 JSON 格式，包含 rule-set 和策略组
     */
    static generate(nodes: Node[], _subName: string): string {
        const specificOutbounds = nodes
            .map(node => this.nodeToSingBoxOutbound(node))
            .filter(o => o !== null);
        const selectorTags = specificOutbounds.map(o => o.tag);

        // 如果没有节点，添加 DIRECT 防止配置错误
        if (selectorTags.length === 0) selectorTags.push('DIRECT');

        const commonTags = ["🚀 节点选择", "♻️ 自动选择", "DIRECT"];

        const createSelector = (tag: string) => ({
            type: "selector",
            tag: tag,
            outbounds: commonTags
        });

        const outbounds = [
            {
                type: "selector",
                tag: "🚀 节点选择",
                outbounds: ["♻️ 自动选择", "🖐 手动选择", "DIRECT"]
            },
            {
                type: "selector",
                tag: "🖐 手动选择",
                outbounds: selectorTags
            },
            {
                type: "urltest",
                tag: "♻️ 自动选择",
                outbounds: selectorTags,
                url: "http://www.gstatic.com/generate_204",
                interval: "3m",
                tolerance: 50
            },
            createSelector("📲 电报信息"),
            createSelector("🤖 AI 服务"),
            createSelector("📹 油管视频"),
            createSelector("🎬 奈飞视频"),
            createSelector("📺 迪士尼+"),
            createSelector("🎵 Spotify"),
            createSelector("🌍 国外媒体"),
            createSelector("🎮 游戏平台"),
            createSelector("🍎 苹果服务"),
            createSelector("Ⓜ️ 微软服务"),
            { type: "selector", tag: "🐟 漏网之鱼", outbounds: ["🚀 节点选择", "♻️ 自动选择", "DIRECT"] },
            ...specificOutbounds,
            { type: "direct", tag: "DIRECT" },
            { type: "block", tag: "BLOCK" },
            { type: "dns", tag: "dns-out" }
        ];

        const geositeUrl = (name: string) => `https://raw.githubusercontent.com/SagerNet/sing-geosite/rule-set/geosite-${name}.srs`;

        const createRuleSet = (tag: string, name: string) => ({
            tag: tag,
            type: "remote",
            format: "binary",
            url: geositeUrl(name),
            download_detour: "🚀 节点选择"
        });

        const config = {
            log: { level: "info", timestamp: true },
            dns: {
                servers: [
                    { tag: "google", address: "tls://8.8.8.8", strategy: "prefer_ipv4" },
                    { tag: "local", address: "223.5.5.5", strategy: "prefer_ipv4", detour: "DIRECT" },
                    { tag: "block", address: "rcode://success" }
                ],
                rules: [
                    { outbound: "any", server: "local" },
                    { clash_mode: "Direct", server: "local" },
                    { clash_mode: "Global", server: "google" },
                    { rule_set: "geosite-cn", server: "local" },
                    { rule_set: "geosite-category-ads-all", server: "block" }
                ],
                final: "google",
                strategy: "prefer_ipv4"
            },
            route: {
                rule_set: [
                    createRuleSet("geosite-category-ads-all", "category-ads-all"),
                    createRuleSet("geosite-openai", "openai"),
                    createRuleSet("geosite-telegram", "telegram"),
                    createRuleSet("geosite-youtube", "youtube"),
                    createRuleSet("geosite-netflix", "netflix"),
                    createRuleSet("geosite-disney", "disney"),
                    createRuleSet("geosite-spotify", "spotify"),
                    createRuleSet("geosite-steam", "steam"),
                    createRuleSet("geosite-apple", "apple"),
                    createRuleSet("geosite-microsoft", "microsoft"),
                    createRuleSet("geosite-google", "google"),
                    createRuleSet("geosite-twitter", "twitter"),
                    createRuleSet("geosite-facebook", "facebook"),
                    createRuleSet("geosite-cn", "cn"),
                    {
                        tag: "geoip-cn",
                        type: "remote",
                        format: "binary",
                        url: "https://raw.githubusercontent.com/SagerNet/sing-geoip/rule-set/geoip-cn.srs",
                        download_detour: "🚀 节点选择"
                    }
                ],
                rules: [
                    { rule_set: "geosite-category-ads-all", action: "reject" },
                    { rule_set: "geosite-openai", outbound: "🤖 AI 服务" },
                    { rule_set: "geosite-telegram", outbound: "📲 电报信息" },
                    { rule_set: "geosite-youtube", outbound: "📹 油管视频" },
                    { rule_set: "geosite-netflix", outbound: "🎬 奈飞视频" },
                    { rule_set: "geosite-disney", outbound: "📺 迪士尼+" },
                    { rule_set: "geosite-spotify", outbound: "🎵 Spotify" },
                    { rule_set: "geosite-steam", outbound: "🎮 游戏平台" },
                    { rule_set: "geosite-twitter", outbound: "📲 电报信息" },
                    { rule_set: "geosite-facebook", outbound: "📲 电报信息" },
                    { rule_set: "geosite-google", outbound: "🌍 国外媒体" },
                    { rule_set: "geosite-apple", outbound: "🍎 苹果服务" },
                    { rule_set: "geosite-microsoft", outbound: "Ⓜ️ 微软服务" },
                    { rule_set: "geosite-cn", outbound: "DIRECT" },
                    { rule_set: "geoip-cn", outbound: "DIRECT" },
                    { type: "logical", mode: "or", rules: [{ protocol: "dns" }, { port: 53 }], outbound: "dns-out" }
                ],
                final: "🐟 漏网之鱼",
                auto_detect_interface: true
            },
            inbounds: [
                { type: "mixed", tag: "mixed-in", listen: "::", listen_port: 7890 }
            ],
            outbounds: outbounds,
            experimental: {
                cache_file: {
                    enabled: true,
                    path: "cache.db",
                    cache_id: "sub_one_cache",
                    store_rdrc: true
                },
                clash_api: {
                    external_controller: "127.0.0.1:9090",
                    external_ui: "ui",
                    external_ui_download_url: "https://github.com/MetaCubeX/Yacd-meta/archive/gh-pages.zip",
                    external_ui_download_detour: "🚀 节点选择",
                    default_mode: "rule"
                }
            }
        };

        return JSON.stringify(config, null, 2);
    }

    /**
     * Sing-Box 节点转换
     * 将 Node 对象转换为 Sing-Box outbound 配置
     */
    private static nodeToSingBoxOutbound(node: Node): SingBoxOutbound | null {
        if (!node.url) return null;

        let outbound: Partial<SingBoxOutbound> = {
            type: this.mapProtocolToSingBoxType(node.protocol),
            tag: node.name,
            server: '',
            server_port: 0
        };

        try {
            const url = new URL(node.url);
            outbound.server = url.hostname;
            outbound.server_port = Number(url.port) || 443;
            const params = url.searchParams;

            const isTls = params.get('security') === 'tls' || params.get('security') === 'reality' || node.url.startsWith('trojan') || node.url.startsWith('hysteria2');

            if (isTls) {
                outbound.tls = {
                    enabled: true,
                    server_name: params.get('sni') || url.hostname,
                    insecure: params.has('allowInsecure') || params.has('insecure'),
                    alpn: params.get('alpn')?.split(',') || undefined
                };
            }

            switch (outbound.type) {
                case 'vless':
                    outbound.uuid = url.username;
                    outbound.flow = params.get('flow') || undefined;

                    if (params.get('security') === 'reality') {
                        delete outbound.tls;
                        outbound.tls = {
                            enabled: true,
                            server_name: params.get('sni') || url.hostname,
                            utls: { enabled: true, fingerprint: params.get('fp') || 'chrome' },
                            reality: {
                                enabled: true,
                                public_key: params.get('pbk') || undefined,
                                short_id: params.get('sid') || undefined
                            }
                        };
                    }

                    const network = params.get('type') || undefined;
                    if (network === 'ws') {
                        outbound.transport = {
                            type: 'ws',
                            path: params.get('path') || undefined,
                            headers: params.has('host') ? { Host: params.get('host') || '' } : undefined
                        };
                    }
                    if (network === 'grpc') {
                        outbound.transport = {
                            type: 'grpc',
                            service_name: params.get('serviceName') || undefined
                        };
                    }
                    break;

                case 'hysteria2':
                    outbound.password = url.username || url.password;
                    if (params.has('obfs')) {
                        outbound.obfs = {
                            type: 'salamander',
                            password: params.get('obfs-password') || undefined
                        };
                    }
                    break;

                case 'trojan':
                    outbound.password = url.username;
                    const trojanType = params.get('type') || undefined;
                    if (trojanType === 'ws') {
                        outbound.transport = { type: 'ws', path: params.get('path') || undefined };
                    }
                    break;

                case 'vmess':
                    if (node.url.startsWith('vmess://')) {
                        const b64 = node.url.slice(8);
                        const vmessObj = JSON.parse(atob(b64)) as VmessConfig;
                        outbound.server = vmessObj.add;
                        outbound.server_port = Number(vmessObj.port);
                        outbound.uuid = vmessObj.id;
                        outbound.alter_id = Number(vmessObj.aid);
                        outbound.security = vmessObj.scy;
                        if (vmessObj.tls === 'tls') {
                            outbound.tls = { enabled: true, server_name: vmessObj.sni };
                        }
                        if (vmessObj.net === 'ws') {
                            outbound.transport = { type: 'ws', path: vmessObj.path };
                        }
                    }
                    break;

                case 'anytls':
                    outbound.uuid = url.username || url.password;
                    outbound.tls = {
                        enabled: true,
                        server_name: params.get('sni') || url.hostname,
                        utls: {
                            enabled: true,
                            fingerprint: params.get('fp') || 'chrome'
                        }
                    };
                    if (params.has('idle_timeout')) outbound.idle_timeout = params.get('idle_timeout') || undefined;
                    break;

                default:
                // unsupported
            }

        } catch (e) {
            // ignore
        }

        if (!outbound.server) return null;
        return outbound as SingBoxOutbound;
    }

    /**
     * 协议映射到 Sing-Box 类型
     */
    private static mapProtocolToSingBoxType(protocol: string | undefined): string {
        switch (protocol) {
            case 'hy2':
            case 'hysteria2': return 'hysteria2';
            case 'vless': return 'vless';
            case 'vmess': return 'vmess';
            case 'trojan': return 'trojan';
            case 'ss': return 'shadowsocks';
            case 'ssr': return 'shadowsocksr';
            case 'tuic': return 'tuic';
            default: return 'unknown';
        }
    }
}

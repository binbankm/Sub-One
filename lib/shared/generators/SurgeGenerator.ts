
import type { Node, VmessConfig } from '../types';

export class SurgeGenerator {
    /**
     * 生成 Surge 配置
     * 使用 INI 格式，包含策略组和 RULE-SET
     */
    static generate(nodes: Node[], _subName: string): string {
        const proxies = nodes
            .map(node => this.nodeToSurgeProxy(node))
            .filter(p => p !== null);

        const proxyNames = proxies.map(p => p.split(/\s*=/)[0].trim());
        if (proxyNames.length === 0) proxyNames.push('DIRECT');

        const allProxiesStr = proxyNames.join(', ');

        let conf = `[General]
loglevel = notify
skip-proxy = 127.0.0.1, 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, 100.64.0.0/10, 17.0.0.0/8, localhost, *.local, *.crashlytics.com
ipv6 = false
dns-server = 223.5.5.5, 119.29.29.29
wifi-access-http-port = 6152
wifi-access-socks5-port = 6153
external-controller-access = 6170@0.0.0.0:6170
allow-wifi-access = true
test-timeout = 5
internet-test-url = http://www.gstatic.com/generate_204
proxy-test-url = http://www.gstatic.com/generate_204
exclude-simple-hostnames = true

[Replica]
hide-apple-request = true
hide-crash-reporter-request = true
hide-udp = false
keyword-filter-type = false

[Host]
*.local = server:system
*.lan = server:system

[Proxy]
`;
        conf += proxies.join('\n');

        conf += `\n\n[Proxy Group]\n`;
        conf += `🚀 节点选择 = select, ♻️ 自动选择, ${allProxiesStr}\n`;
        conf += `♻️ 自动选择 = url-test, ${allProxiesStr}, url=http://www.gstatic.com/generate_204, interval=300, tolerance=50\n`;

        const sceneGroups = [
            '📲 电报信息', '🤖 AI 服务', '📹 油管视频', '🎬 奈飞视频', '📺 迪士尼+', '🎵 Spotify',
            '🌍 国外媒体', '🎮 游戏平台', '🍎 苹果服务', 'Ⓜ️ 微软服务', '🐟 漏网之鱼'
        ];

        sceneGroups.forEach(g => {
            if (g === '🐟 漏网之鱼') {
                conf += `${g} = select, 🚀 节点选择, ♻️ 自动选择, ${allProxiesStr}, DIRECT\n`;
            } else if (g === '🎮 游戏平台' || g === '🍎 苹果服务' || g === 'Ⓜ️ 微软服务') {
                conf += `${g} = select, DIRECT, 🚀 节点选择, ♻️ 自动选择, ${allProxiesStr}\n`;
            } else {
                conf += `${g} = select, ♻️ 自动选择, 🚀 节点选择, ${allProxiesStr}\n`;
            }
        });

        conf += `\n[Rule]\n`;
        const ruleBase = "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@surge/geo/geosite";

        conf += `RULE-SET,${ruleBase}/category-ads-all.list,REJECT\n`;
        conf += `RULE-SET,${ruleBase}/openai.list,🤖 AI 服务\n`;
        conf += `RULE-SET,${ruleBase}/telegram.list,📲 电报信息\n`;
        conf += `RULE-SET,${ruleBase}/youtube.list,📹 油管视频\n`;
        conf += `RULE-SET,${ruleBase}/netflix.list,🎬 奈飞视频\n`;
        conf += `RULE-SET,${ruleBase}/disney.list,📺 迪士尼+\n`;
        conf += `RULE-SET,${ruleBase}/spotify.list,🎵 Spotify\n`;
        conf += `RULE-SET,${ruleBase}/steam.list,🎮 游戏平台\n`;
        conf += `RULE-SET,${ruleBase}/twitter.list,📲 电报信息\n`;
        conf += `RULE-SET,${ruleBase}/facebook.list,📲 电报信息\n`;
        conf += `RULE-SET,${ruleBase}/google.list,🌍 国外媒体\n`;
        conf += `RULE-SET,${ruleBase}/apple.list,🍎 苹果服务\n`;
        conf += `RULE-SET,${ruleBase}/microsoft.list,Ⓜ️ 微软服务\n`;
        conf += `RULE-SET,${ruleBase}/cn.list,DIRECT\n`;

        conf += `GEOIP,CN,DIRECT\n`;
        conf += `FINAL,🐟 漏网之鱼\n`;

        return conf;
    }

    /**
     * Surge 节点转换
     * 将 Node 对象转换为 Surge 代理配置行
     */
    private static nodeToSurgeProxy(node: Node): string | null {
        try {
            if (!node.url) return null;
            const url = new URL(node.url);
            const params = url.searchParams;
            const name = node.name.replace(/[,=]/g, '');
            let line = '';

            switch (node.protocol) {
                case 'ss':
                    // 格式：名称 = ss, 服务器, 端口, encrypt-method=xxx, password=xxx
                    line = `${name} = ss, ${url.hostname}, ${url.port}, encrypt-method=${url.username}, password=${url.password}`;
                    if (params.has('plugin')) {
                        const plugin = params.get('plugin') || '';
                        if (plugin.includes('obfs')) {
                            line += `, obfs=${plugin.includes('http') ? 'http' : 'tls'}`;
                            if (params.has('obfs-host')) line += `, obfs-host=${params.get('obfs-host')}`;
                        }
                    }
                    line += `, udp-relay=true`;
                    break;

                case 'vmess':
                    if (node.url.startsWith('vmess://')) {
                        const b64 = node.url.slice(8);
                        const obj = JSON.parse(atob(b64)) as VmessConfig;

                        // 格式：名称 = vmess, 服务器, 端口, username=xxx
                        line = `${name} = vmess, ${obj.add}, ${obj.port}, username=${obj.id}`;

                        // 加密方式
                        if (obj.scy) line += `, encrypt-method=${obj.scy}`;

                        // TLS
                        if (obj.tls === 'tls') {
                            line += `, tls=true`;
                            if (obj.sni) line += `, sni=${obj.sni}`;
                            if (obj.skip_cert_verify || obj['skip-cert-verify']) {
                                line += `, skip-cert-verify=true`;
                            }
                        }

                        // 传输协议
                        if (obj.net === 'ws') {
                            line += `, ws=true`;
                            if (obj.path) line += `, ws-path=${obj.path}`;
                            if (obj.host) line += `, ws-headers=Host:${obj.host}`;
                        } else if (obj.net === 'h2') {
                            line += `, http2=true`;
                            if (obj.path) line += `, http2-path=${obj.path}`;
                        }

                        // VMess AEAD
                        line += `, vmess-aead=true`;
                    }
                    break;

                case 'trojan':
                    // 格式：名称 = trojan, 服务器, 端口, password=xxx
                    line = `${name} = trojan, ${url.hostname}, ${url.port}, password=${url.username}`;

                    // SNI
                    if (params.get('sni')) line += `, sni=${params.get('sni')}`;

                    // 传输协议
                    if (params.get('type') === 'ws') {
                        line += `, ws=true`;
                        if (params.get('path')) line += `, ws-path=${params.get('path')}`;
                        if (params.get('host')) line += `, ws-headers=Host:${params.get('host')}`;
                    }

                    line += `, skip-cert-verify=true`;
                    break;

                case 'tuic':
                    // Surge 支持 TUIC
                    line = `${name} = tuic, ${url.hostname}, ${url.port}, token=${url.password}`;
                    if (params.get('sni')) line += `, sni=${params.get('sni')}`;
                    line += `, skip-cert-verify=true`;
                    break;

                case 'hysteria2':
                case 'hy2':
                    // 格式：名称 = hysteria2, 服务器, 端口, password=xxx
                    line = `${name} = hysteria2, ${url.hostname}, ${url.port}, password=${url.username || url.password}`;

                    // SNI
                    if (params.get('sni')) line += `, sni=${params.get('sni')}`;

                    // 混淆
                    if (params.get('obfs')) line += `, obfs=${params.get('obfs')}`;

                    // 带宽
                    if (params.get('down')) line += `, download-bandwidth=${params.get('down')}`;

                    line += `, skip-cert-verify=true`;
                    break;

                default:
                    return null;
            }
            return line;
        } catch (e) {
            return null;
        }
    }
}

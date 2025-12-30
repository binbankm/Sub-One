
import type { Node, VmessConfig } from '../types';

export class LoonGenerator {
    /**
     * 生成 Loon 配置
     * 使用 INI 格式，类似 Surge 但有专属语法
     */
    static generate(nodes: Node[], _subName: string): string {
        const proxies = nodes
            .map(node => this.nodeToLoonProxy(node))
            .filter(p => p !== null);

        const proxyNames = proxies.map(p => p.split(/\s*=/)[0].trim());
        if (proxyNames.length === 0) proxyNames.push('DIRECT');

        const allProxiesStr = proxyNames.join(', ');

        let conf = `[General]
skip-proxy = 192.168.0.0/16, 10.0.0.0/8, 172.16.0.0/12, localhost, *.local, e.crashlytics.com
ipv6 = false
dns-server = 223.5.5.5, 119.29.29.29
wifi-access-http-port = 6152
wifi-access-socks5-port = 6153
allow-wifi-access = true
allow-udp-proxy = true
proxy-test-url = http://www.gstatic.com/generate_204
test-timeout = 5
real-ip = *.lan, *.local

[Host]
*.local = server:system
*.lan = server:system

[Proxy]
`;
        conf += proxies.join('\n');

        conf += `\n\n[Proxy Group]\n`;
        // 主选择只包含 自动、手动 和 直连
        conf += `🚀 节点选择 = select, ♻️ 自动选择, 🖐 手动选择, DIRECT\n`;
        // 手动选择包含所有节点
        conf += `🖐 手动选择 = select, ${allProxiesStr}\n`;
        // 自动选择包含所有节点
        conf += `♻️ 自动选择 = url-test, ${allProxiesStr}, url=http://www.gstatic.com/generate_204, interval=300, tolerance=50\n`;

        const sceneGroups = [
            '📲 电报信息', '🤖 AI 服务', '📹 油管视频', '🎬 奈飞视频', '📺 迪士尼+', '🎵 Spotify',
            '🌍 国外媒体', '🎮 游戏平台', '🍎 苹果服务', 'Ⓜ️ 微软服务', '🐟 漏网之鱼'
        ];

        sceneGroups.forEach(g => {
            if (g === '🐟 漏网之鱼') {
                conf += `${g} = select, 🚀 节点选择, ♻️ 自动选择, DIRECT\n`;
            } else if (g === '🎮 游戏平台' || g === '🍎 苹果服务' || g === 'Ⓜ️ 微软服务') {
                // 游戏和微软服务优先直连
                conf += `${g} = select, DIRECT, 🚀 节点选择, ♻️ 自动选择\n`;
            } else {
                conf += `${g} = select, 🚀 节点选择, ♻️ 自动选择, DIRECT\n`;
            }
        });

        conf += `\n[Rule]\n`;
        const ruleBase = "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@loon/geo/geosite";

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
     * Loon 节点转换
     * 将 Node 对象转换为 Loon 代理配置行
     */
    private static nodeToLoonProxy(node: Node): string | null {
        try {
            if (!node.url) return null;
            const url = new URL(node.url);
            const params = url.searchParams;
            const name = node.name.replace(/[,=]/g, '');
            let line = '';

            switch (node.protocol) {
                case 'ss':
                    line = `${name} = Shadowsocks, ${url.hostname}, ${url.port}, ${url.username}, "${url.password}"`;
                    if (params.has('plugin')) {
                        const plugin = params.get('plugin') || '';
                        if (plugin.includes('obfs')) {
                            line += `, obfs=${plugin.includes('http') ? 'http' : 'tls'}`;
                            if (params.has('obfs-host')) line += `, obfs-host=${params.get('obfs-host')}`;
                        }
                    }
                    // 通用参数
                    line += `, fast-open=true, udp=true`;
                    break;

                case 'vmess':
                    if (node.url.startsWith('vmess://')) {
                        const b64 = node.url.slice(8);
                        const obj = JSON.parse(atob(b64)) as VmessConfig;

                        // 加密方式（默认 auto）
                        const cipher = obj.scy || 'auto';

                        // 基础格式：名称 = vmess, 服务器, 端口, 加密方式, "UUID"
                        line = `${name} = vmess, ${obj.add}, ${obj.port}, ${cipher}, "${obj.id}"`;

                        // TLS
                        if (obj.tls === 'tls') {
                            line += `, over-tls=true`;
                            if (obj.sni) line += `, tls-name=${obj.sni}`;
                            if (obj.skip_cert_verify || obj['skip-cert-verify']) {
                                line += `, skip-cert-verify=true`;
                            }
                        }

                        // 传输协议
                        if (obj.net === 'ws') {
                            line += `, transport=ws`;
                            if (obj.path) line += `, path=${obj.path}`;
                            if (obj.host) line += `, host=${obj.host}`;
                        } else if (obj.net === 'grpc') {
                            line += `, transport=grpc`;
                            if (obj.serviceName) line += `, serviceName=${obj.serviceName}`;
                        } else if (obj.net === 'h2') {
                            line += `, transport=http`;
                            if (obj.path) line += `, path=${obj.path}`;
                            if (obj.host) line += `, host=${obj.host}`;
                        }

                        // AEAD 和通用参数
                        line += `, vmess-aead=true, udp=true`;
                    }
                    break;

                case 'vless':
                    // 基础格式：名称 = vless, 服务器, 端口, "UUID"
                    line = `${name} = vless, ${url.hostname}, ${url.port}, "${url.username}"`;

                    // TLS / Reality
                    const security = params.get('security');
                    if (security === 'tls') {
                        line += `, over-tls=true`;
                        if (params.get('sni')) line += `, tls-name=${params.get('sni')}`;
                        if (params.get('fp')) line += `, fingerprint=${params.get('fp')}`;
                    } else if (security === 'reality') {
                        line += `, over-tls=true`;
                        if (params.get('sni')) line += `, tls-name=${params.get('sni')}`;
                        if (params.get('pbk')) line += `, public-key="${params.get('pbk')}"`;
                        if (params.get('sid')) line += `, short-id=${params.get('sid')}`;
                        if (params.get('fp')) line += `, fingerprint=${params.get('fp')}`;
                    }

                    // 传输协议
                    const vlessType = params.get('type');
                    if (vlessType === 'ws') {
                        line += `, transport=ws`;
                        if (params.get('path')) line += `, path=${params.get('path')}`;
                        if (params.get('host')) line += `, host=${params.get('host')}`;
                    } else if (vlessType === 'grpc') {
                        line += `, transport=grpc`;
                        if (params.get('serviceName')) line += `, serviceName=${params.get('serviceName')}`;
                    }

                    // Flow
                    if (params.get('flow')) line += `, flow=${params.get('flow')}`;

                    // 通用参数
                    line += `, skip-cert-verify=true, udp=true, fast-open=true`;
                    break;

                case 'trojan':
                    // 基础格式：名称 = trojan, 服务器, 端口, "密码"
                    line = `${name} = trojan, ${url.hostname}, ${url.port}, "${url.username}"`;

                    // SNI
                    if (params.get('sni')) line += `, tls-name=${params.get('sni')}`;

                    // 传输协议
                    if (params.get('type') === 'ws') {
                        line += `, transport=ws, path=${params.get('path') || '/'}`;
                        if (params.get('host')) line += `, host=${params.get('host')}`;
                    } else if (params.get('type') === 'grpc') {
                        line += `, transport=grpc`;
                        if (params.get('serviceName')) line += `, serviceName=${params.get('serviceName')}`;
                    }

                    // 通用参数
                    line += `, skip-cert-verify=true, udp=true, fast-open=true`;
                    break;

                case 'hysteria2':
                case 'hy2':
                    // 基础格式：名称 = Hysteria2, 服务器, 端口, "密码"
                    line = `${name} = Hysteria2, ${url.hostname}, ${url.port}, "${url.username || url.password}"`;

                    // SNI
                    if (params.get('sni')) line += `, sni=${params.get('sni')}`;

                    // 混淆
                    if (params.get('obfs')) {
                        line += `, obfs=${params.get('obfs')}`;
                        if (params.get('obfs-password')) line += `, obfs-password=${params.get('obfs-password')}`;
                    }

                    // 速度限制
                    if (params.get('down')) line += `, down=${params.get('down')}`;
                    if (params.get('up')) line += `, up=${params.get('up')}`;

                    // 通用参数
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

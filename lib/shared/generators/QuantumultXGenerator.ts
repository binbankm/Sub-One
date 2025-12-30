
import type { Node, VmessConfig } from '../types';

export class QuantumultXGenerator {
    /**
     * 生成 Quantumult X 配置
     * 使用 Conf 格式
     * 注意：QX 不支持 VLESS, Hysteria2, TUIC 等新型协议
    */
    static generate(nodes: Node[], _subName: string): string {
        const proxies = nodes
            .map(node => this.nodeToQuantumultXProxy(node))
            .filter(p => p !== null);

        const proxyNames = proxies.map(p => {
            const match = p.match(/tag=([^,]+)/);
            return match ? match[1].trim() : 'Unknown';
        });

        if (proxyNames.length === 0) proxyNames.push('DIRECT');

        const allProxiesStr = proxyNames.join(', ');

        let conf = `[general]
ipv6_route = false
dns_exclusion_list = *.cmpassport.com, *.jegotrip.com.cn, *.icitymobile.mobi, id6.me, *.pingan.com.cn, *.cmbchina.com
excluded_routes = 239.255.255.250/32, 239.255.255.250/32
resource_parser_url = https://raw.githubusercontent.com/KOP-XIAO/QuantumultX/master/Scripts/resource-parser.js

[dns]
server = 223.5.5.5
server = 119.29.29.29

[policy]
`;

        // 策略组
        // 1. 🚀 节点选择 (主入口)
        conf += `static=🚀 节点选择, ♻️ 自动选择, 🖐 手动选择, direct, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Rocket.png\n`;

        // 2. 🖐 手动选择 (包含所有节点)
        conf += `static=🖐 手动选择, ${allProxiesStr}, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Manual.png\n`;

        // 3. ♻️ 自动选择 (包含所有节点，测速)
        conf += `url-latency-benchmark=♻️ 自动选择, ${allProxiesStr}, url=http://www.gstatic.com/generate_204, interval=300, tolerance=50, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Auto.png\n`;

        const sceneGroups = [
            { name: '📲 电报信息', icon: 'Telegram' },
            { name: '🤖 AI 服务', icon: 'Bot' },
            { name: '📹 油管视频', icon: 'YouTube' },
            { name: '🎬 奈飞视频', icon: 'Netflix' },
            { name: '📺 迪士尼+', icon: 'Disney' },
            { name: '🎵 Spotify', icon: 'Spotify' },
            { name: '🌍 国外媒体', icon: 'Global' },
            { name: '🎮 游戏平台', icon: 'Game' },
            { name: '🍎 苹果服务', icon: 'Apple' },
            { name: 'Ⓜ️ 微软服务', icon: 'Microsoft' },
            { name: '🐟 漏网之鱼', icon: 'Final' }
        ];

        sceneGroups.forEach(g => {
            let proxies = '🚀 节点选择, ♻️ 自动选择, direct';
            if (g.name === '🎮 游戏平台' || g.name === '🍎 苹果服务' || g.name === 'Ⓜ️ 微软服务') {
                proxies = 'direct, 🚀 节点选择, ♻️ 自动选择';
            }
            conf += `static=${g.name}, ${proxies}, img-url=https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/${g.icon}.png\n`;
        });

        conf += `\n[server_local]\n`;
        conf += proxies.join('\n');

        conf += `\n[filter_remote]\n`;
        const ruleBase = "https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/QuantumultX";

        conf += `${ruleBase}/Advertising/Advertising.list, tag=广告拦截, policy=reject, enabled=true\n`;
        conf += `${ruleBase}/OpenAI/OpenAI.list, tag=AI 服务, policy=🤖 AI 服务, enabled=true\n`;
        conf += `${ruleBase}/Telegram/Telegram.list, tag=Telegram, policy=📲 电报信息, enabled=true\n`;
        conf += `${ruleBase}/YouTube/YouTube.list, tag=YouTube, policy=📹 油管视频, enabled=true\n`;
        conf += `${ruleBase}/Netflix/Netflix.list, tag=Netflix, policy=🎬 奈飞视频, enabled=true\n`;
        conf += `${ruleBase}/Disney/Disney.list, tag=Disney, policy=📺 迪士尼+, enabled=true\n`;
        conf += `${ruleBase}/Spotify/Spotify.list, tag=Spotify, policy=🎵 Spotify, enabled=true\n`;
        conf += `${ruleBase}/Steam/Steam.list, tag=Steam, policy=🎮 游戏平台, enabled=true\n`;
        conf += `${ruleBase}/Epic/Epic.list, tag=Epic, policy=🎮 游戏平台, enabled=true\n`;
        conf += `${ruleBase}/Twitter/Twitter.list, tag=Twitter, policy=📲 电报信息, enabled=true\n`;
        conf += `${ruleBase}/Facebook/Facebook.list, tag=Facebook, policy=📲 电报信息, enabled=true\n`;
        conf += `${ruleBase}/Apple/Apple.list, tag=Apple, policy=🍎 苹果服务, enabled=true\n`;
        conf += `${ruleBase}/Microsoft/Microsoft.list, tag=Microsoft, policy=Ⓜ️ 微软服务, enabled=true\n`;
        conf += `${ruleBase}/China/China.list, tag=China, policy=direct, enabled=true\n`;

        conf += `\n[filter_local]\n`;
        conf += `geoip, cn, direct\n`;
        conf += `final, 🐟 漏网之鱼\n`;

        return conf;
    }

    /**
     * Quantumult X 节点转换
     */
    private static nodeToQuantumultXProxy(node: Node): string | null {
        try {
            if (!node.url) return null;
            const url = new URL(node.url);
            const params = url.searchParams;
            const name = node.name.replace(/[,=]/g, '').trim();
            // QX 不支持 VLESS, Hysteria2, TUIC
            // QX 格式特点：key=value, key=value

            let line = '';

            switch (node.protocol) {
                case 'ss':
                    // shadowsocks=1.2.3.4:80, method=chacha20-ietf-poly1305, password=pwd, fast-open=false, udp-relay=false, tag=Name
                    line = `shadowsocks=${url.hostname}:${url.port}, method=${url.username}, password=${url.password}`;
                    if (params.has('plugin')) {
                        const plugin = params.get('plugin') || '';
                        if (plugin.includes('obfs')) {
                            const obfsType = plugin.includes('http') ? 'http' : 'tls';
                            line += `, obfs=${obfsType}, obfs-host=${params.get('obfs-host') || url.hostname}`;
                        }
                    }
                    line += `, fast-open=false, udp-relay=true, tag=${name}`;
                    break;

                case 'vmess':
                    if (node.url.startsWith('vmess://')) {
                        const b64 = node.url.slice(8);
                        const obj = JSON.parse(atob(b64)) as VmessConfig;

                        // vmess=1.2.3.4:80, method=none, password=23ad6b10-8d1a-40f7-8ad0-e3e35cd38297, fast-open=false, udp-relay=false, tag=Name
                        if (obj.net === 'grpc') return null; // QX 不完全支持 gRPC？视版本而定，暂且保守处理

                        line = `vmess=${obj.add}:${obj.port}, method=${obj.scy || 'auto'}, password=${obj.id}`;

                        // TLS
                        if (obj.tls === 'tls') {
                            line += `, obfs=over-tls`; // QX 用 obfs=over-tls, obfs-host=xxx
                            if (obj.sni) line += `, obfs-host=${obj.sni}`;
                        } else if (obj.net === 'ws') {
                            line += `, obfs=${obj.tls === 'tls' ? 'wss' : 'ws'}`;
                            if (obj.path) line += `, obfs-uri=${obj.path}`;
                            // QX 的 ws host 用于 header
                            if (obj.host) line += `, obfs-host=${obj.host}`;
                        }

                        // AEAD
                        line += `, aead=true`;
                        line += `, fast-open=false, udp-relay=true, tag=${name}`;
                    }
                    break;

                case 'vless':
                    // vless=1.2.3.4:443, method=none, password=UUID, ...
                    // QX VLESS 支持：TCP, WS, TLS
                    line = `vless=${url.hostname}:${url.port}, method=none, password=${url.username}`;

                    // TLS
                    const security = params.get('security');
                    if (security === 'tls') {
                        line += `, obfs=over-tls`;
                        if (params.get('sni')) line += `, obfs-host=${params.get('sni')}`;
                    }
                    // Reality (部分版本支持，尝试兼容)
                    // Reality (部分版本支持，尝试兼容)
                    else if (security === 'reality') {
                        line += `, obfs=over-tls`;
                        if (params.get('sni')) line += `, obfs-host=${params.get('sni')}`;
                        // QX 目前对于 Reality 的正式参数支持可能尚不完整，通常复用 over-tls
                        // 且暂不支持 pbk/sid 等Reality特有参数的直接透传，除非使用最新测试版特定语法
                        // 暂时保持与标准 TLS 一致配置以尝试连接（如果服务器允许 fallback）
                    }

                    if (security === 'tls' || security === 'reality') {
                        line += `, tls-verification=true`;
                    }

                    // 传输协议
                    const type = params.get('type');
                    if (type === 'ws') {
                        line += `, obfs=${security === 'tls' || security === 'reality' ? 'wss' : 'ws'}`;
                        if (params.get('path')) line += `, obfs-uri=${params.get('path')}`;
                        if (params.get('host')) line += `, obfs-host=${params.get('host')}`;
                    }

                    line += `, fast-open=false, udp-relay=true, tag=${name}`;
                    break;

                case 'trojan':
                    // trojan=1.2.3.4:443, password=pwd, over-tls=true, tls-verification=true, fast-open=false, udp-relay=false, tag=Name
                    line = `trojan=${url.hostname}:${url.port}, password=${url.username}, over-tls=true, tls-verification=true`;
                    if (params.get('sni')) line += `, tls-host=${params.get('sni')}`;

                    // WS? QX Trojan 支持 WS 吗？原生支持较少，Usually raw TCP with TLS
                    if (params.get('type') === 'ws') return null; // 暂不支持复杂 Trojan 变种

                    line += `, fast-open=false, udp-relay=true, tag=${name}`;
                    break;

                case 'http':
                case 'https':
                    line = `http=${url.hostname}:${url.port}, username=${url.username}, password=${url.password}, fast-open=false, udp-relay=false, tag=${name}`;
                    if (node.protocol === 'https') line += `, over-tls=true, tls-verification=true`;
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

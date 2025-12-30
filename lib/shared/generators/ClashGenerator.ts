
import yaml from 'js-yaml';
import type { Node, ClashProxy, VmessConfig } from '../types';

export class ClashGenerator {
    /**
     * 生成 Clash Meta (Mihomo) 配置
     * 使用 YAML 格式，包含 Rule Providers 和丰富策略组
     */
    static generate(nodes: Node[], _subName: string, _userConfig: any = {}): string {
        const proxies = nodes
            .map(node => this.nodeToClashProxy(node))
            .filter(p => p !== null);

        // 如果没有代理节点，添加一个 DIRECT，防止配置文件报错
        if (proxies.length === 0) {
            // 空数组在下面处理
        }

        const manualGroup = {
            name: '🖐 手动选择',
            type: 'select',
            proxies: ['DIRECT'],
            'include-all': true
        };

        // 普通策略组，不包含手动选择（因为可以通过节点选择间接使用）
        const commonProxies = ['🚀 节点选择', '♻️ 自动选择', 'DIRECT'];

        // 策略组定义
        const autoGroup = {
            name: '♻️ 自动选择',
            type: 'url-test',
            url: 'http://www.gstatic.com/generate_204',
            interval: 300,
            tolerance: 50,
            'include-all': true
        };

        const createSelectGroup = (name: string) => ({
            name: name,
            type: 'select',
            proxies: [...commonProxies]
        });

        const groups = [
            {
                name: '🚀 节点选择',
                type: 'select',
                proxies: ['♻️ 自动选择', '🖐 手动选择', 'DIRECT']
            },
            manualGroup,
            autoGroup,
            createSelectGroup('📲 电报信息'),
            createSelectGroup('🤖 AI 服务'),
            createSelectGroup('📹 油管视频'),
            createSelectGroup('🎬 奈飞视频'),
            createSelectGroup('📺 迪士尼+'),
            createSelectGroup('🎵 Spotify'),
            createSelectGroup('🌍 国外媒体'),
            createSelectGroup('🎮 游戏平台'),
            createSelectGroup('🍎 苹果服务'),
            createSelectGroup('Ⓜ️ 微软服务'),
            {
                name: '🐟 漏网之鱼',
                type: 'select',
                proxies: ['🚀 节点选择', '♻️ 自动选择', 'DIRECT']
            }
        ];

        // 基础配置
        const general = {
            'port': 7890,
            'socks-port': 7891,
            'allow-lan': true,
            'mode': 'rule',
            'log-level': 'info',
            'ipv6': false,
            'external-controller': '127.0.0.1:9090',
            'geodata-mode': true,
            'geo-auto-update': true,
            'global-client-fingerprint': 'chrome',
            'dns': {
                'enable': true,
                'listen': '0.0.0.0:1053',
                'ipv6': false,
                'enhanced-mode': 'fake-ip',
                'fake-ip-range': '198.18.0.1/16',
                'nameserver': ['223.5.5.5', '119.29.29.29'],
                'fallback': ['tls://8.8.4.4', 'tls://1.1.1.1'],
                'fallback-filter': { 'geoip': true, 'ipcidr': ['240.0.0.0/4', '0.0.0.0/32'] }
            }
        };

        let yamlOutput = yaml.dump(general);

        // 代理节点
        if (proxies.length > 0) {
            yamlOutput += '\nproxies:\n';
            for (const p of proxies) {
                yamlOutput += `  - ${yaml.dump(p, { flowLevel: 0, lineWidth: -1 }).trim()}\n`;
            }
        }

        // 策略组
        yamlOutput += '\n' + yaml.dump({ 'proxy-groups': groups });

        // Rule Providers & Rules
        const ruleBase = "https://cdn.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@meta/geo/geosite";
        const createProvider = (name: string, path: string) => ({
            type: 'http', behavior: 'domain', url: `${ruleBase}/${name}.yaml`, path: `./ruleset/${path}.yaml`, interval: 86400
        });

        const rulesParams = {
            'rule-providers': {
                'reject': createProvider('category-ads-all', 'reject'),
                'openai': createProvider('openai', 'openai'),
                'telegram': createProvider('telegram', 'telegram'),
                'youtube': createProvider('youtube', 'youtube'),
                'netflix': createProvider('netflix', 'netflix'),
                'disney': createProvider('disney', 'disney'),
                'spotify': createProvider('spotify', 'spotify'),
                'steam': createProvider('steam', 'steam'),
                'apple': createProvider('apple', 'apple'),
                'microsoft': createProvider('microsoft', 'microsoft'),
                'google': createProvider('google', 'google'),
                'twitter': createProvider('twitter', 'twitter'),
                'facebook': createProvider('facebook', 'facebook'),
                'cn': createProvider('cn', 'cn'),
            },
            'rules': [
                'RULE-SET,reject,REJECT',
                'RULE-SET,openai,🤖 AI 服务',
                'RULE-SET,telegram,📲 电报信息',
                'RULE-SET,youtube,📹 油管视频',
                'RULE-SET,netflix,🎬 奈飞视频',
                'RULE-SET,disney,📺 迪士尼+',
                'RULE-SET,spotify,🎵 Spotify',
                'RULE-SET,steam,🎮 游戏平台',
                'RULE-SET,twitter,📲 电报信息',
                'RULE-SET,facebook,📲 电报信息',
                'RULE-SET,google,🌍 国外媒体',
                'RULE-SET,apple,🍎 苹果服务',
                'RULE-SET,microsoft,Ⓜ️ 微软服务',
                'RULE-SET,cn,DIRECT',
                'GEOIP,LAN,DIRECT',
                'GEOIP,CN,DIRECT',
                'MATCH,🐟 漏网之鱼'
            ]
        };

        yamlOutput += '\n' + yaml.dump(rulesParams);
        return yamlOutput;
    }

    /**
     * Clash 节点转换
     * 将 Node 对象转换为 Clash 代理配置
     */
    private static nodeToClashProxy(node: Node): ClashProxy | null {
        if (!node.url) return null;

        let proxy: ClashProxy | null = node.originalProxy ? { ...node.originalProxy } as unknown as ClashProxy : null;

        if (!proxy) {
            proxy = this.urlToClashProxy(node.url, node.name, node.protocol || 'unknown');
        } else {
            proxy.name = node.name;
        }

        return proxy;
    }

    /**
     * URL 转 Clash 代理配置
     * 解析各协议的 URL 参数并生成 Clash 配置对象
     */
    private static urlToClashProxy(urlStr: string, name: string, protocol: string): ClashProxy | null {
        try {
            let config: Partial<ClashProxy> = { name: name, type: protocol };
            const url = new URL(urlStr);

            if (url.username) config.uuid = url.username;
            if (url.password) config.password = url.password;
            config.server = url.hostname;
            config.port = Number(url.port) || 443;

            const params = url.searchParams;

            // 通用参数
            if (params.has('sni')) config.servername = params.get('sni') || undefined;
            if (params.has('fp')) config['client-fingerprint'] = params.get('fp') || undefined;
            if (params.has('alpn')) config.alpn = params.get('alpn')?.split(',') || undefined;
            if (params.has('allowInsecure') || params.has('insecure')) config['skip-cert-verify'] = true;
            if (params.has('udp')) config.udp = true;

            // 协议特定处理
            switch (protocol) {
                case 'ss':
                    if (urlStr.includes('@')) {
                        config.cipher = url.username;
                    }
                    if (params.has('plugin')) {
                        const pluginVal = params.get('plugin') || '';
                        const pluginParts = pluginVal.split(';');
                        config.plugin = pluginParts[0];
                        if (pluginParts.length > 1) {
                            config['plugin-opts'] = {};
                            pluginParts.slice(1).forEach(p => {
                                const [k, v] = p.split('=');
                                if (k && v && config['plugin-opts']) config['plugin-opts'][k] = v;
                            });
                        }
                    }
                    break;

                case 'vmess':
                    if (urlStr.startsWith('vmess://')) {
                        const b64 = urlStr.slice(8);
                        try {
                            const decoded = atob(b64);
                            const vmessObj = JSON.parse(decoded) as VmessConfig;
                            config = {
                                name: name,
                                type: 'vmess',
                                server: vmessObj.add,
                                port: Number(vmessObj.port),
                                uuid: vmessObj.id,
                                alterId: Number(vmessObj.aid),
                                cipher: vmessObj.scy || 'auto',
                                udp: true,
                                tls: vmessObj.tls === 'tls',
                                network: vmessObj.net,
                            };
                            if (config.tls) {
                                if (vmessObj.sni) config.servername = vmessObj.sni;
                                if (vmessObj.fp) config['client-fingerprint'] = vmessObj.fp;
                                if (vmessObj.alpn) config.alpn = vmessObj.alpn.split(',');
                            }
                            if (vmessObj.net === 'ws') {
                                config['ws-opts'] = {
                                    path: vmessObj.path,
                                    headers: { Host: vmessObj.host || '' }
                                };
                            }
                        } catch (e) {
                            console.error('VMess base64 decode error', e);
                            return null;
                        }
                    }
                    break;

                case 'vless':
                    config.uuid = url.username;
                    if (params.has('type')) config.network = params.get('type') || undefined;
                    if (params.has('flow')) config.flow = params.get('flow'); // ClashProxy 暂无 flow，但在 [key: string]: any 中允许

                    if (params.has('security') && params.get('security') === 'reality') {
                        config.tls = true;
                        config['reality-opts'] = {
                            'public-key': params.get('pbk') || '',
                            'short-id': params.get('sid') || ''
                        };
                        const spx = params.get('spx');
                        if (spx) config['reality-opts']['spider-x'] = spx;
                    } else if (params.has('security') && params.get('security') === 'tls') {
                        config.tls = true;
                    }

                    if (config.network === 'ws') {
                        config['ws-opts'] = {
                            path: params.get('path') || undefined,
                            headers: params.has('host') ? { Host: params.get('host') || '' } : undefined
                        };
                    }
                    if (config.network === 'grpc') {
                        config['grpc-opts'] = {
                            'grpc-service-name': params.get('serviceName') || undefined
                        };
                        const grpMode = params.get('mode');
                        if (grpMode) config['grpc-opts'].mode = grpMode;
                    }
                    break;

                case 'hysteria2':
                case 'hy2':
                    config.type = 'hysteria2';
                    config.password = url.username || url.password;
                    if (params.has('obfs')) {
                        config.obfs = params.get('obfs') || undefined;
                        if (params.has('obfs-password')) config['obfs-password'] = params.get('obfs-password') || undefined;
                    }
                    break;

                case 'trojan':
                    config.password = url.username;
                    if (params.has('type')) config.network = params.get('type') || undefined;
                    if (config.network === 'ws') {
                        config['ws-opts'] = {
                            path: params.get('path') || undefined,
                            headers: params.has('host') ? { Host: params.get('host') || '' } : undefined
                        };
                    }
                    if (config.network === 'grpc') {
                        config['grpc-opts'] = { 'grpc-service-name': params.get('serviceName') || undefined };
                    }
                    config.udp = true;
                    break;

                case 'tuic':
                    config.uuid = url.username;
                    config.password = url.password;
                    if (params.has('congestion_control')) config['congestion-controller'] = params.get('congestion_control') || undefined;
                    if (params.has('udp_relay_mode')) config['udp-relay-mode'] = params.get('udp_relay_mode') || undefined;
                    break;

                case 'anytls':
                    config.type = 'anytls';
                    config.password = url.username || url.password;
                    if (params.has('sni')) config.servername = params.get('sni') || undefined;
                    if (params.has('fp')) config['client-fingerprint'] = params.get('fp') || undefined;
                    if (params.has('idle_timeout')) config['idle-timeout'] = params.get('idle_timeout') || undefined;
                    break;

                default:
                    if (!config.server) return null;
            }

            return config as ClashProxy;
        } catch (e) {
            console.error('Convert to Clash Proxy Error:', e);
            return null;
        }
    }
}

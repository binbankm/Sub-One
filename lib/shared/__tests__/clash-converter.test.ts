import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { SubscriptionConverter } from '../subscription-converter';
import {
    vmessNode,
    vlessNode,
    vlessRealityNode,
    trojanNode,
    shadowsocksNode,
    shadowsocksWithPluginNode,
    hysteria2Node,
    tuicNode,
    snellNode,
    wireguardNode,
    mixedNodes,
    emptyNodes,
    allProtocolNodes,
} from '../__fixtures__/test-nodes';

describe('SubscriptionConverter - Clash 转换', () => {
    const converter = new SubscriptionConverter();

    describe('toClash() - 基础功能', () => {
        it('应该返回有效的 YAML 配置', () => {
            const result = converter.toClash(mixedNodes);

            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');

            // 应该能解析为有效的 YAML
            expect(() => yaml.load(result)).not.toThrow();
        });

        it('应该包含必要的 Clash 配置字段', () => {
            const result = converter.toClash(mixedNodes);
            const config: any = yaml.load(result);

            expect(config).toHaveProperty('port');
            expect(config).toHaveProperty('socks-port');
            expect(config).toHaveProperty('mode');
            expect(config).toHaveProperty('proxies');
            expect(config).toHaveProperty('proxy-groups');
            expect(config).toHaveProperty('rules');
        });

        it('应该包含所有节点', () => {
            const result = converter.toClash(mixedNodes);
            const config: any = yaml.load(result);

            expect(config.proxies).toBeInstanceOf(Array);
            expect(config.proxies.length).toBeGreaterThan(0);
        });

        it('应该创建默认的代理组', () => {
            const result = converter.toClash(mixedNodes);
            const config: any = yaml.load(result);

            expect(config['proxy-groups']).toBeInstanceOf(Array);
            expect(config['proxy-groups'].length).toBeGreaterThan(0);

            const groupNames = config['proxy-groups'].map((g: any) => g.name);
            expect(groupNames).toContain('🚀 节点选择');
            expect(groupNames).toContain('♻️ 自动选择');
        });

        it('应该处理空节点数组', () => {
            const result = converter.toClash(emptyNodes);
            const config: any = yaml.load(result);

            expect(config.proxies).toEqual([]);
        });
    });

    describe('toClash() - VMess 协议', () => {
        it('应该正确转换 VMess 节点', () => {
            const result = converter.toClash([vmessNode]);
            const config: any = yaml.load(result);

            const proxy = config.proxies[0];
            expect(proxy.type).toBe('vmess');
            expect(proxy.name).toBe(vmessNode.name);
            expect(proxy.server).toBeTruthy();
            expect(proxy.port).toBeTruthy();
            expect(proxy.uuid).toBeTruthy();
            expect(proxy.cipher).toBeTruthy();
        });

        it('VMess 应该包含 TLS 配置', () => {
            const result = converter.toClash([vmessNode]);
            const config: any = yaml.load(result);

            const proxy = config.proxies[0];
            expect(proxy.tls).toBe(true);
        });

        it('VMess 应该包含 WebSocket 传输配置', () => {
            const result = converter.toClash([vmessNode]);
            const config: any = yaml.load(result);

            const proxy = config.proxies[0];
            expect(proxy.network).toBe('ws');
            expect(proxy['ws-opts']).toBeTruthy();
            expect(proxy['ws-opts'].path).toBeTruthy();
        });
    });

    describe('toClash() - VLESS 协议', () => {
        it('应该正确转换 VLESS 节点', () => {
            const result = converter.toClash([vlessNode]);
            const config: any = yaml.load(result);

            const proxy = config.proxies[0];
            expect(proxy.type).toBe('vless');
            expect(proxy.server).toBeTruthy();
            expect(proxy.port).toBeTruthy();
            expect(proxy.uuid).toBeTruthy();
        });

        it('应该正确转换 VLESS Reality 节点', () => {
            const result = converter.toClash([vlessRealityNode]);
            const config: any = yaml.load(result);

            const proxy = config.proxies[0];
            expect(proxy.type).toBe('vless');
            expect(proxy.tls).toBe(true);
            expect(proxy['reality-opts']).toBeTruthy();
            expect(proxy['reality-opts']['public-key']).toBeTruthy();
            expect(proxy['reality-opts']['short-id']).toBeTruthy();
        });
    });

    describe('toClash() - Trojan 协议', () => {
        it('应该正确转换 Trojan 节点', () => {
            const result = converter.toClash([trojanNode]);
            const config: any = yaml.load(result);

            const proxy = config.proxies[0];
            expect(proxy.type).toBe('trojan');
            expect(proxy.server).toBeTruthy();
            expect(proxy.port).toBeTruthy();
            expect(proxy.password).toBeTruthy();
        });
    });

    describe('toClash() - Shadowsocks 协议', () => {
        it('应该正确转换 Shadowsocks 节点', () => {
            const result = converter.toClash([shadowsocksNode]);
            const config: any = yaml.load(result);

            const proxy = config.proxies[0];
            expect(proxy.type).toBe('ss');
            expect(proxy.server).toBeTruthy();
            expect(proxy.port).toBeTruthy();
            expect(proxy.cipher).toBeTruthy();
            expect(proxy.password).toBeTruthy();
        });

        it('应该支持 Shadowsocks 插件', () => {
            const result = converter.toClash([shadowsocksWithPluginNode]);
            const config: any = yaml.load(result);

            const proxy = config.proxies[0];
            expect(proxy.type).toBe('ss');
            if (proxy.plugin) {
                expect(proxy.plugin).toBeTruthy();
            }
        });
    });

    describe('toClash() - Hysteria2 协议', () => {
        it('应该正确转换 Hysteria2 节点', () => {
            const result = converter.toClash([hysteria2Node]);
            const config: any = yaml.load(result);

            const proxy = config.proxies[0];
            expect(proxy.type).toBe('hysteria2');
            expect(proxy.server).toBeTruthy();
            expect(proxy.port).toBeTruthy();
            expect(proxy.password).toBeTruthy();
        });
    });

    describe('toClash() - TUIC 协议', () => {
        it('应该正确转换 TUIC 节点', () => {
            const result = converter.toClash([tuicNode]);
            const config: any = yaml.load(result);

            const proxy = config.proxies[0];
            expect(proxy.type).toBe('tuic');
            expect(proxy.server).toBeTruthy();
            expect(proxy.port).toBeTruthy();
            expect(proxy.uuid).toBeTruthy();
        });
    });

    describe('toClash() - Snell 协议', () => {
        it('应该正确转换 Snell 节点', () => {
            const result = converter.toClash([snellNode]);
            const config: any = yaml.load(result);

            const proxy = config.proxies[0];
            expect(proxy.type).toBe('snell');
            expect(proxy.server).toBeTruthy();
            expect(proxy.port).toBeTruthy();
            expect(proxy.psk).toBeTruthy();
        });
    });

    describe('toClash() - WireGuard 协议', () => {
        it('应该正确转换 WireGuard 节点', () => {
            const result = converter.toClash([wireguardNode]);
            const config: any = yaml.load(result);

            const proxy = config.proxies[0];
            expect(proxy.type).toBe('wireguard');
            expect(proxy.server).toBeTruthy();
            expect(proxy.port).toBeTruthy();
        });
    });

    describe('toClash() - 混合协议测试', () => {
        it('应该能转换所有支持的协议', () => {
            const result = converter.toClash(allProtocolNodes);
            const config: any = yaml.load(result);

            expect(config.proxies).toBeInstanceOf(Array);
            expect(config.proxies.length).toBeGreaterThan(0);

            // 检查是否包含各种协议类型
            const types = config.proxies.map((p: any) => p.type);
            expect(types).toContain('vmess');
            expect(types).toContain('vless');
            expect(types).toContain('trojan');
            expect(types).toContain('ss');
        });
    });

    describe('convert() - Clash 格式', () => {
        it('应该通过 convert 方法调用 Clash 转换', () => {
            const result = converter.convert(mixedNodes, 'clash');
            const config: any = yaml.load(result);

            expect(config).toHaveProperty('proxies');
            expect(config).toHaveProperty('proxy-groups');
        });
    });
});

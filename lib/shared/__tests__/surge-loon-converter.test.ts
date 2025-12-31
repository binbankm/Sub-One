import { describe, it, expect } from 'vitest';
import { SubscriptionConverter } from '../subscription-converter';
import {
    vmessNode,
    trojanNode,
    shadowsocksNode,
    hysteria2Node,
    tuicNode,
    snellNode,
    wireguardNode,
    mixedNodes,
    emptyNodes,
} from '../__fixtures__/test-nodes';

describe('SubscriptionConverter - Surge 转换', () => {
    const converter = new SubscriptionConverter();

    describe('toSurge() - 基础功能', () => {
        it('应该返回有效的 Surge 配置文本', () => {
            const result = converter.toSurge(mixedNodes);

            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('应该包含必要的 Surge 配置段', () => {
            const result = converter.toSurge(mixedNodes);

            expect(result).toContain('[General]');
            expect(result).toContain('[Proxy]');
            expect(result).toContain('[Proxy Group]');
            expect(result).toContain('[Rule]');
        });

        it('应该包含所有节点', () => {
            const result = converter.toSurge(mixedNodes);

            mixedNodes.forEach(node => {
                // 配置中应该包含节点名称
                expect(result).toContain(node.name);
            });
        });

        it('应该创建 Proxy Group', () => {
            const result = converter.toSurge(mixedNodes);

            const lines = result.split('\n');
            const proxyGroupSection = lines.findIndex(line => line === '[Proxy Group]');
            expect(proxyGroupSection).toBeGreaterThan(-1);

            const proxyGroupLine = lines[proxyGroupSection + 1];
            expect(proxyGroupLine).toContain('Proxy = select');
        });

        it('应该处理空节点数组', () => {
            const result = converter.toSurge(emptyNodes);

            expect(result).toContain('[General]');
            expect(result).toContain('[Proxy]');
        });
    });

    describe('toSurge() - 各协议转换', () => {
        it('应该正确转换 VMess 节点', () => {
            const result = converter.toSurge([vmessNode]);

            expect(result).toContain(vmessNode.name);
            expect(result).toContain('vmess');
        });

        it('应该正确转换 Trojan 节点', () => {
            const result = converter.toSurge([trojanNode]);

            expect(result).toContain(trojanNode.name);
            expect(result).toContain('trojan');
        });

        it('应该正确转换 Shadowsocks 节点', () => {
            const result = converter.toSurge([shadowsocksNode]);

            expect(result).toContain(shadowsocksNode.name);
            expect(result).toContain('ss');
        });

        it('应该正确转换 Hysteria2 节点', () => {
            const result = converter.toSurge([hysteria2Node]);

            expect(result).toContain(hysteria2Node.name);
            expect(result).toContain('hysteria2');
        });

        it('应该正确转换 TUIC 节点', () => {
            const result = converter.toSurge([tuicNode]);

            expect(result).toContain(tuicNode.name);
            expect(result).toContain('tuic');
        });

        it('应该正确转换 Snell 节点', () => {
            const result = converter.toSurge([snellNode]);

            expect(result).toContain(snellNode.name);
            expect(result).toContain('snell');
        });

        it('应该正确转换 WireGuard 节点', () => {
            const result = converter.toSurge([wireguardNode]);

            expect(result).toContain(wireguardNode.name);
            expect(result).toContain('wireguard');
        });
    });

    describe('toSurge() - 配置格式', () => {
        it('节点配置应该是 "name = type, server, port, ..." 格式', () => {
            const result = converter.toSurge([vmessNode]);
            const lines = result.split('\n');

            const proxyLine = lines.find(line => line.includes(vmessNode.name) && line.includes('='));
            expect(proxyLine).toBeTruthy();
            expect(proxyLine).toMatch(/^.+\s*=\s*.+/);
        });
    });

    describe('convert() - Surge 格式', () => {
        it('应该通过 convert 方法调用 Surge 转换', () => {
            const result = converter.convert(mixedNodes, 'surge');

            expect(result).toContain('[General]');
            expect(result).toContain('[Proxy]');
        });
    });
});

describe('SubscriptionConverter - Loon 转换', () => {
    const converter = new SubscriptionConverter();

    describe('toLoon() - 基础功能', () => {
        it('应该返回有效的 Loon 配置文本', () => {
            const result = converter.toLoon(mixedNodes);

            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');
        });

        it('应该包含必要的 Loon 配置段', () => {
            const result = converter.toLoon(mixedNodes);

            expect(result).toContain('[General]');
            expect(result).toContain('[Proxy]');
            expect(result).toContain('[Proxy Group]');
            expect(result).toContain('[Rule]');
        });

        it('应该包含所有节点', () => {
            const result = converter.toLoon(mixedNodes);

            mixedNodes.forEach(node => {
                expect(result).toContain(node.name);
            });
        });

        it('应该处理空节点数组', () => {
            const result = converter.toLoon(emptyNodes);

            expect(result).toContain('[General]');
            expect(result).toContain('[Proxy]');
        });
    });

    describe('toLoon() - 各协议转换', () => {
        it('应该正确转换 VMess 节点', () => {
            const result = converter.toLoon([vmessNode]);

            expect(result).toContain(vmessNode.name);
            expect(result).toContain('VMess');
        });

        it('应该正确转换 Trojan 节点', () => {
            const result = converter.toLoon([trojanNode]);

            expect(result).toContain(trojanNode.name);
            expect(result).toContain('Trojan');
        });

        it('应该正确转换 Shadowsocks 节点', () => {
            const result = converter.toLoon([shadowsocksNode]);

            expect(result).toContain(shadowsocksNode.name);
            expect(result).toContain('Shadowsocks');
        });

        it('应该正确转换 Hysteria2 节点', () => {
            const result = converter.toLoon([hysteria2Node]);

            expect(result).toContain(hysteria2Node.name);
            expect(result).toContain('Hysteria2');
        });
    });

    describe('toLoon() - 配置格式', () => {
        it('节点配置应该是逗号分隔格式', () => {
            const result = converter.toLoon([vmessNode]);
            const lines = result.split('\n');

            const proxyLine = lines.find(line => line.includes(vmessNode.name) && line.includes('='));
            expect(proxyLine).toBeTruthy();
            expect(proxyLine).toContain(',');
        });
    });

    describe('convert() - Loon 格式', () => {
        it('应该通过 convert 方法调用 Loon 转换', () => {
            const result = converter.convert(mixedNodes, 'loon');

            expect(result).toContain('[General]');
            expect(result).toContain('[Proxy]');
        });
    });
});

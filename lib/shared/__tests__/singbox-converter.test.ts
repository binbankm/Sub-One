import { describe, it, expect } from 'vitest';
import { SubscriptionConverter } from '../subscription-converter';
import {
    vmessNode,
    vlessNode,
    trojanNode,
    shadowsocksNode,
    hysteria2Node,
    tuicNode,
    wireguardNode,
    mixedNodes,
    emptyNodes,
} from '../__fixtures__/test-nodes';

describe('SubscriptionConverter - Sing-Box 转换', () => {
    const converter = new SubscriptionConverter();

    describe('toSingBox() - 基础功能', () => {
        it('应该返回有效的 JSON 配置', () => {
            const result = converter.toSingBox(mixedNodes);

            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');

            // 应该能解析为有效的 JSON
            expect(() => JSON.parse(result)).not.toThrow();
        });

        it('应该包含必要的 Sing-Box 配置字段', () => {
            const result = converter.toSingBox(mixedNodes);
            const config = JSON.parse(result);

            expect(config).toHaveProperty('log');
            expect(config).toHaveProperty('dns');
            expect(config).toHaveProperty('inbounds');
            expect(config).toHaveProperty('outbounds');
            expect(config).toHaveProperty('route');
        });

        it('应该包含所有节点作为 outbounds', () => {
            const result = converter.toSingBox(mixedNodes);
            const config = JSON.parse(result);

            expect(config.outbounds).toBeInstanceOf(Array);
            expect(config.outbounds.length).toBeGreaterThan(0);

            // 应该包含节点 + selector + direct + block
            const nodeOutbounds = config.outbounds.filter((o: any) =>
                !['selector', 'direct', 'block'].includes(o.type)
            );
            expect(nodeOutbounds.length).toBeGreaterThan(0);
        });

        it('应该创建 selector 出站', () => {
            const result = converter.toSingBox(mixedNodes);
            const config = JSON.parse(result);

            const selector = config.outbounds.find((o: any) => o.type === 'selector');
            expect(selector).toBeTruthy();
            expect(selector.tag).toBe('proxy');
            expect(selector.outbounds).toBeInstanceOf(Array);
        });

        it('应该处理空节点数组', () => {
            const result = converter.toSingBox(emptyNodes);
            const config = JSON.parse(result);

            expect(config.outbounds).toBeInstanceOf(Array);

            // 即使没有节点，也应该有 direct 和 block
            const directOutbound = config.outbounds.find((o: any) => o.type === 'direct');
            const blockOutbound = config.outbounds.find((o: any) => o.type === 'block');

            expect(directOutbound).toBeTruthy();
            expect(blockOutbound).toBeTruthy();
        });
    });

    describe('toSingBox() - VMess 协议', () => {
        it('应该正确转换 VMess 节点', () => {
            const result = converter.toSingBox([vmessNode]);
            const config = JSON.parse(result);

            const vmess = config.outbounds.find((o: any) => o.type === 'vmess');
            expect(vmess).toBeTruthy();
            expect(vmess.tag).toBe(vmessNode.name);
            expect(vmess.server).toBeTruthy();
            expect(vmess.server_port).toBeTruthy();
            expect(vmess.uuid).toBeTruthy();
            expect(vmess.security).toBeTruthy();
        });

        it('VMess 应该包含 TLS 配置', () => {
            const result = converter.toSingBox([vmessNode]);
            const config = JSON.parse(result);

            const vmess = config.outbounds.find((o: any) => o.type === 'vmess');
            expect(vmess.tls).toBeTruthy();
            expect(vmess.tls.enabled).toBe(true);
        });

        it('VMess 应该包含传输配置', () => {
            const result = converter.toSingBox([vmessNode]);
            const config = JSON.parse(result);

            const vmess = config.outbounds.find((o: any) => o.type === 'vmess');
            expect(vmess.transport).toBeTruthy();
            expect(vmess.transport.type).toBe('ws');
        });
    });

    describe('toSingBox() - VLESS 协议', () => {
        it('应该正确转换 VLESS 节点', () => {
            const result = converter.toSingBox([vlessNode]);
            const config = JSON.parse(result);

            const vless = config.outbounds.find((o: any) => o.type === 'vless');
            expect(vless).toBeTruthy();
            expect(vless.server).toBeTruthy();
            expect(vless.server_port).toBeTruthy();
            expect(vless.uuid).toBeTruthy();
        });
    });

    describe('toSingBox() - Trojan 协议', () => {
        it('应该正确转换 Trojan 节点', () => {
            const result = converter.toSingBox([trojanNode]);
            const config = JSON.parse(result);

            const trojan = config.outbounds.find((o: any) => o.type === 'trojan');
            expect(trojan).toBeTruthy();
            expect(trojan.server).toBeTruthy();
            expect(trojan.server_port).toBeTruthy();
            expect(trojan.password).toBeTruthy();
            expect(trojan.tls).toBeTruthy();
        });
    });

    describe('toSingBox() - Shadowsocks 协议', () => {
        it('应该正确转换 Shadowsocks 节点', () => {
            const result = converter.toSingBox([shadowsocksNode]);
            const config = JSON.parse(result);

            const ss = config.outbounds.find((o: any) => o.type === 'shadowsocks');
            expect(ss).toBeTruthy();
            expect(ss.server).toBeTruthy();
            expect(ss.server_port).toBeTruthy();
            expect(ss.method).toBeTruthy();
            expect(ss.password).toBeTruthy();
        });
    });

    describe('toSingBox() - Hysteria2 协议', () => {
        it('应该正确转换 Hysteria2 节点', () => {
            const result = converter.toSingBox([hysteria2Node]);
            const config = JSON.parse(result);

            const hy2 = config.outbounds.find((o: any) => o.type === 'hysteria2');
            expect(hy2).toBeTruthy();
            expect(hy2.server).toBeTruthy();
            expect(hy2.server_port).toBeTruthy();
            expect(hy2.password).toBeTruthy();
        });
    });

    describe('toSingBox() - TUIC 协议', () => {
        it('应该正确转换 TUIC 节点', () => {
            const result = converter.toSingBox([tuicNode]);
            const config = JSON.parse(result);

            const tuic = config.outbounds.find((o: any) => o.type === 'tuic');
            expect(tuic).toBeTruthy();
            expect(tuic.server).toBeTruthy();
            expect(tuic.server_port).toBeTruthy();
            expect(tuic.uuid).toBeTruthy();
        });
    });

    describe('toSingBox() - WireGuard 协议', () => {
        it('应该正确转换 WireGuard 节点', () => {
            const result = converter.toSingBox([wireguardNode]);
            const config = JSON.parse(result);

            const wg = config.outbounds.find((o: any) => o.type === 'wireguard');
            expect(wg).toBeTruthy();
            expect(wg.server).toBeTruthy();
            expect(wg.server_port).toBeTruthy();
            expect(wg.private_key).toBeTruthy();
            expect(wg.peer_public_key).toBeTruthy();
        });
    });

    describe('toSingBox() - DNS 和路由配置', () => {
        it('应该包含 DNS 配置', () => {
            const result = converter.toSingBox(mixedNodes);
            const config = JSON.parse(result);

            expect(config.dns).toBeTruthy();
            expect(config.dns.servers).toBeInstanceOf(Array);
            expect(config.dns.servers.length).toBeGreaterThan(0);
        });

        it('应该包含路由规则', () => {
            const result = converter.toSingBox(mixedNodes);
            const config = JSON.parse(result);

            expect(config.route).toBeTruthy();
            expect(config.route.rules).toBeInstanceOf(Array);
            expect(config.route.final).toBeTruthy();
        });
    });

    describe('convert() - Sing-Box 格式', () => {
        it('应该通过 convert 方法调用 Sing-Box 转换', () => {
            const result = converter.convert(mixedNodes, 'singbox');
            const config = JSON.parse(result);

            expect(config).toHaveProperty('outbounds');
            expect(config).toHaveProperty('route');
        });
    });
});

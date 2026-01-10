import { describe, it, expect } from 'vitest';
import { parseClashProxy } from '../parsers/clash';
import { toClash } from '../converter/clash-converter';
import { toSingBox } from '../converter/singbox-converter';
import { toSurge } from '../converter/surge-converter';
import { toLoon } from '../converter/loon-converter';
import { ClashProxyConfig, ProxyNode } from '../../shared/types';

// 来自真实订阅的 Hysteria2 节点配置
const realHy2Nodes: ClashProxyConfig[] = [
    {
        name: "德国 - Frankfurt Am Main - Hetzner Online AG - 2",
        server: "91.107.190.166",
        port: 8443,
        type: "hysteria2",
        password: "xtGIM7iEx9",
        sni: "dash.cloudflare.com",
        'skip-cert-verify': true,
        obfs: "salamander",
        'obfs-password': "KLSADFIU43#$",
        udp: true
    },
    {
        name: "韩国 - 春川市 - Oracle Corporation - 5",
        server: "kr1.miyazono-kaori.com",
        port: 42574,
        type: "hysteria2",
        password: "274691f9-e6c0-46ff-82f2-3a9062872a04",
        sni: "kr1.miyazono-kaori.com",
        'skip-cert-verify': false,
        obfs: "salamander",
        'obfs-password': "MKsqfibVxwhZ3pCf",
        udp: true
    }
];

describe('真实订阅 Hysteria2 节点测试', () => {
    it('应该正确解析来自真实订阅的 Clash 配置', () => {
        const nodes = realHy2Nodes
            .map(proxy => parseClashProxy(proxy))
            .filter((n): n is ProxyNode => n !== null);

        console.log(`\n解析到 ${nodes.length} 个节点\n`);

        expect(nodes.length).toBe(2);

        nodes.forEach((node, index) => {
            console.log(`\n节点 ${index + 1}:`);
            console.log(JSON.stringify(node, null, 2));

            expect(node.type).toBe('hysteria2');
            if (node.type === 'hysteria2') {
                expect(node.obfs).toBeDefined();
                expect(node.obfs?.type).toBe('salamander');
                expect(node.obfs?.password).toBeTruthy();
            }
        });
    });

    it('应该正确转换为 Clash 格式', () => {
        const nodes = realHy2Nodes
            .map(proxy => parseClashProxy(proxy))
            .filter((n): n is ProxyNode => n !== null);

        const output = toClash(nodes, { ruleTemplate: 'none' });

        console.log('\n========== Clash 输出 ==========');
        console.log(output);

        expect(output).toContain('obfs: salamander');
        expect(output).toContain('obfs-password: KLSADFIU43#$');
        expect(output).toContain('obfs-password: MKsqfibVxwhZ3pCf');
    });

    it('应该正确转换为 Sing-Box 格式', () => {
        const nodes = realHy2Nodes
            .map(proxy => parseClashProxy(proxy))
            .filter((n): n is ProxyNode => n !== null);

        const output = toSingBox(nodes);
        const config = JSON.parse(output);

        const hy2Nodes = config.outbounds.filter((o: any) => o.type === 'hysteria2');

        console.log('\n========== Sing-Box Hysteria2 节点 ==========');
        hy2Nodes.forEach((node: any, index: number) => {
            console.log(`\n节点 ${index + 1}:`);
            console.log(JSON.stringify(node, null, 2));
        });

        expect(hy2Nodes.length).toBe(2);
        hy2Nodes.forEach((node: any) => {
            expect(node.obfs).toBeDefined();
            expect(node.obfs.type).toBe('salamander');
        });
    });

    it('应该正确转换为 Surge 格式', () => {
        const nodes = realHy2Nodes
            .map(proxy => parseClashProxy(proxy))
            .filter((n): n is ProxyNode => n !== null);

        const output = toSurge(nodes);

        console.log('\n========== Surge 节点部分 ==========');
        const proxySection = output.match(/\[Proxy\]([\s\S]*?)\[Proxy Group\]/)?.[1];
        console.log(proxySection);

        expect(output).toContain('obfs=salamander');
        expect(output).toContain('obfs-password=KLSADFIU43#$');
        expect(output).toContain('obfs-password=MKsqfibVxwhZ3pCf');
    });

    it('应该正确转换为 Loon 格式', () => {
        const nodes = realHy2Nodes
            .map(proxy => parseClashProxy(proxy))
            .filter((n): n is ProxyNode => n !== null);

        const output = toLoon(nodes);

        console.log('\n========== Loon 节点部分 ==========');
        const proxySection = output.match(/\[Proxy\]([\s\S]*?)\[Proxy Group\]/)?.[1];
        console.log(proxySection);

        expect(output).toContain('obfs:salamander');
        expect(output).toContain('obfs-pwd:KLSADFIU43#$');
        expect(output).toContain('obfs-pwd:MKsqfibVxwhZ3pCf');
    });
});

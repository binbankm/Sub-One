import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { subscriptionParser } from '../subscription-parser';
import { subscriptionConverter } from '../subscription-converter';
import type { Node } from '../types';

describe('真实世界链路集成测试', () => {
    // 用户提供的混合节点列表
    const rawLinks = `
vless://582f44d4-4511-402c-a0b7-b5771a2a5c9d@us1.miyazono-kaori.com:443?encryption=none&type=tcp&flow=xtls-rprx-vision&security=reality&pbk=9mkPUmY5M-N81bSDf3lP9X3JnH25l4SfeUTnlwV04Eo&sid=d77c4204&sni=download-porter.hoyoverse.com&fp=chrome&headerType=none&udp=1#%F0%9F%87%BA%F0%9F%87%B8US_1%7C27.9MB%2Fs%7C11%25%7CTK-US%7CYT-US%7CNF%7CGPT%E2%81%BA%7CGM
vless://582f44d4-4511-402c-a0b7-b5771a2a5c9d@us2.miyazono-kaori.com:443?encryption=none&type=tcp&flow=xtls-rprx-vision&security=reality&pbk=_TIQSjojgpdSBoSVXuQjFSqIdPeXjQIQkM5cFSv6Gnc&sid=9613864900a8f12d&sni=download-porter.hoyoverse.com&fp=chrome&headerType=none&udp=1#%F0%9F%87%BA%F0%9F%87%B8US_2%7C10.0MB%2Fs%7C11%25%7CTK-US%7CYT-US%7CNF%7CGPT%E2%81%BA%7CGM
trojan://5a2c16f9@one.cf.cdn.hyli.xyz:443?sni=snippets.kkii.eu.org&type=ws&path=%2F&host=snippets.kkii.eu.org&udp=1#%F0%9F%87%BA%F0%9F%87%B8US_4%7C9.1MB%2Fs%7CTK-US%7CYT-US%7CNF%7CD%2B%7CGPT%7CGM
ss://YWVzLTI1Ni1jZmI6ZjhmN2FDemNQS2JzRjhwMw==@38.165.233.93:989?udp=1#%F0%9F%87%B5%F0%9F%87%BEPY_1%7C1.7MB%2Fs%7C0%25%7CTK-PY%7CYT-PY%7CD%2B%7CGPT%E2%81%BA%7CGM
ss://YWVzLTEyOC1nY206c2hhZG93c29ja3M=@173.244.56.6:443?udp=1#%F0%9F%87%BA%F0%9F%87%B8US_22%7C10.3MB%2Fs%7C50%25%7CTK-US%7CYT-US%7CNF%7CGPT%E2%81%BA%7CGM
vmess://eyJ2IjoiMiIsInBzIjoi8J+HsPCfh7dLUl8xfDMuNE1CL3N8NCV8VEstS1J8WVQtVVN8TkZ8R1BU4oG6IiwiYWRkIjoic2VvdWwwMy56Z2pvay5jb20iLCJwb3J0Ijo0NDMsImlkIjoiNzJhMGRhYzQtOTY4OS00YTU3LWIxNjQtNWM2NWJmYTk0NzcyIiwiYWlkIjowLCJzY3kiOiJhdXRvIiwibmV0Ijoid3MiLCJ0eXBlIjoibm9uZSIsImhvc3QiOiJzZW91bDAzLnpnam9rLmNvbSIsInBhdGgiOiIvIiwidGxzIjoidGxzIiwic25pIjoic2VvdWwwMy56Z2pvay5jb20iLCJhbHBuIjoiIiwiZnAiOiIiLCJ1ZHAiOnRydWV9
ss://cmM0LW1kNToxNGZGUHJiZXpFM0hEWnpzTU9yNg==@68.183.227.4:8080?udp=1#%F0%9F%87%B8%F0%9F%87%ACSG_1%7C2.0MB%2Fs%7CGPT%E2%81%BA%7CGM
`;

    let parsedNodes: Node[] = [];

    it('第一步：解析真实链接', async () => {
        // 假设 parser 有 parse 方法接受字符串内容
        // 根据具体实现可能需要调整调用方式，这里先尝试直接 parse 文本
        // 如果 parser.parse 接受的是 Base64 订阅内容，我们需要先处理
        // 但通常 parser 也能处理直接的行列表

        // 模拟 Parser 可能的行为：如果它接受完整订阅内容，我们可能需要 mock 或者直接调用处理单行的方法
        // 让我们假设 parser.parse(content) 可以处理换行分隔的链接

        parsedNodes = await subscriptionParser.parse(rawLinks);

        expect(parsedNodes).toBeDefined();
        expect(parsedNodes.length).toBeGreaterThan(0);

        // 验证几种关键协议是否都解析出来了
        const protocols = parsedNodes.map(n => n.protocol);
        expect(protocols).toContain('vless');
        expect(protocols).toContain('trojan');
        expect(protocols).toContain('ss');
        expect(protocols).toContain('vmess');

        // 验证名称解码
        const us1 = parsedNodes.find(n => n.url.includes('us1.miyazono-kaori.com'));
        expect(us1).toBeDefined();
        // 期望名称已被 URL 解码 (包含 Emoji 🇺🇸)
        expect(us1?.name).toContain('🇺🇸');
    });

    it('第二步：转换为 Clash 格式', () => {
        const clashConfig = subscriptionConverter.toClash(parsedNodes);
        const config: any = yaml.load(clashConfig);

        expect(config.proxies).toHaveLength(parsedNodes.length);

        // 检查 VMess 解析
        const vmessProxy = config.proxies.find((p: any) => p.type === 'vmess');
        expect(vmessProxy).toBeDefined();
        expect(vmessProxy.server).toBe('seoul03.zgjok.com');
        expect(vmessProxy.tls).toBe(true);

        // 检查 VLESS Reality 解析
        const vlessProxy = config.proxies.find((p: any) => p.type === 'vless');
        expect(vlessProxy).toBeDefined();
        expect(vlessProxy.servername).toBe('download-porter.hoyoverse.com');
        expect(vlessProxy['reality-opts']).toBeDefined();
        expect(vlessProxy['reality-opts']['public-key']).toBeDefined();

        // 检查 SS 解析
        const ssProxy = config.proxies.find((p: any) => p.type === 'ss' && p.cipher === 'aes-256-cfb');
        expect(ssProxy).toBeDefined();
        expect(ssProxy.password).toBeDefined();
    });

    it('第三步：转换为 Sing-Box 格式', () => {
        const singboxConfigStr = subscriptionConverter.toSingBox(parsedNodes);
        const config = JSON.parse(singboxConfigStr);

        // 过滤出除了 selector/direct/block 之外的节点
        const nodeOutbounds = config.outbounds.filter((o: any) =>
            !['selector', 'direct', 'block'].includes(o.type)
        );

        expect(nodeOutbounds).toHaveLength(parsedNodes.length);

        // 检查 VLESS Reality
        const vlessOutbound = nodeOutbounds.find((o: any) => o.type === 'vless');
        expect(vlessOutbound.tls.reality.enabled).toBe(true);
        expect(vlessOutbound.tls.reality.public_key).toBeDefined();
    });
});

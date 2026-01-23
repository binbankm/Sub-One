import { describe, it, expect } from 'vitest';
import { parse, process, convert } from '../index';

describe('Proxy Integration Tests', () => {
    const rawData = `
ss://YWVzLTEyOC1nY206cGFzc3dvcmRAc2VydmVyOjQ0Mw#Node1
vmess://eyJhZGQiOiJzZXJ2ZXIyIiwicG9ydCI6NDQzLCJpZCI6InV1aWQiLCJhaWQiOjAsInNjeSI6ImF1dG8iLCJuZXQiOiJ3cyIsInR5cGUiOiJub25lIiwicHMiOiJOb2RlMiJ9
trojan://password@server3:443?sni=sni.com#Node3
# 重复节点用于测试去重
ss://YWVzLTEyOC1nY206cGFzc3dvcmRAc2VydmVyOjQ0Mw#Node1-Dup
    `.trim();

    it('should complete the full Parse -> Process -> Convert flow', async () => {
        // 1. Parse
        const nodes = parse(rawData);
        expect(nodes.length).toBe(4);
        expect(nodes[0].name).toBe('Node1');
        expect(nodes[1].type).toBe('vmess');
        expect(nodes[2].type).toBe('trojan');

        // 2. Process (Filter & Dedupe)
        const processedNodes = await process(nodes, {
            dedupe: true,
            exclude: 'Node3'
        });

        expect(processedNodes.length).toBe(2);
        expect(processedNodes[0].name).toBe('Node1');
        expect(processedNodes[1].name).toBe('Node2');

        // 3. Convert (Clash)
        const clashResult = await convert(processedNodes, 'clash', { filename: 'test' });
        expect(clashResult).toContain('proxies:');
        expect(clashResult).toContain('name: Node1');
        expect(clashResult).toContain('name: Node2');
        expect(clashResult).not.toContain('Node3');

        // 4. Convert (URI)
        const uriResult = await convert(processedNodes, 'uri');
        expect(uriResult).toContain('ss://');
        expect(uriResult).toContain('vmess://');
    });

    it('should handle Base64 encoded subscription data', async () => {
        const base64Data = Buffer.from('ss://YWVzLTEyOC1nY206cGFzc3dvcmRAc2VydmVyOjQ0Mw#NodeB64').toString('base64');
        const nodes = parse(base64Data);
        expect(nodes.length).toBe(1);
        expect(nodes[0].name).toBe('NodeB64');
    });

    it('should correctly convert to Sing-box format', async () => {
        const nodes = parse('ss://YWVzLTEyOC1nY206cGFzc3dvcmRAc2VydmVyOjQ0Mw#SingboxTest');
        const singboxResult = await convert(nodes, 'singbox');
        const config = JSON.parse(singboxResult);
        expect(config.outbounds).toBeDefined();
        expect(config.outbounds[0].type).toBe('shadowsocks');
        expect(config.outbounds[0].tag).toBe('SingboxTest');
    });
});

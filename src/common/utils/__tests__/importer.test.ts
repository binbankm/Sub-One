import { describe, expect, it } from 'vitest';
import { parseImportText, createNode } from '@/common/utils/importer';
import { Base64 } from 'js-base64';

describe('importer - parseImportText & node creation', () => {
    it('should parse multiple URI nodes with different protocols', () => {
        const text = `
            vless://ad2f8aed-13c5-44a2-b12e-9ad0549fc9ed@163.61.30.40:48138?security=reality&type=tcp#%F0%9F%87%AE%F0%9F%87%B3%20IN-Host
            hysteria2://wA4LDUCe5m4KJoAX@163.61.30.40:19088?insecure=1&sni=one.apple.com#%F0%9F%87%AE%F0%9F%87%B3%20IN-Host-hy2
            vless://940cd2ee-c0ef-4446-9d79-ffcf053b32b0@216.236.7.143:41071?security=reality&type=tcp#%F0%9F%87%AD%F0%9F%87%B0%20HK-VLESS
            trojan://password123@96.44.179.247:43091?sni=example.com#US-Trojan
        `;

        const { subs, nodes } = parseImportText(text);

        expect(subs).toHaveLength(0);
        expect(nodes).toHaveLength(4);

        expect(nodes[0].name).toBe('🇮🇳 IN-Host');
        expect(nodes[0].type).toBe('vless');
        expect(nodes[0].server).toBe('163.61.30.40');
        expect(nodes[0].port).toBe(48138);

        expect(nodes[1].name).toBe('🇮🇳 IN-Host-hy2');
        expect(nodes[1].type).toBe('hysteria2');
        expect(nodes[1].server).toBe('163.61.30.40');
        expect(nodes[1].port).toBe(19088);

        expect(nodes[2].name).toBe('🇭🇰 HK-VLESS');
        expect(nodes[2].type).toBe('vless');
        expect(nodes[2].server).toBe('216.236.7.143');

        expect(nodes[3].name).toBe('US-Trojan');
        expect(nodes[3].type).toBe('trojan');
        expect(nodes[3].server).toBe('96.44.179.247');
        expect(nodes[3].port).toBe(43091);
    });

    it('should parse Base64 encoded node list', () => {
        const rawNodes = [
            'vless://ad2f8aed-13c5-44a2-b12e-9ad0549fc9ed@163.61.30.40:48138?security=reality#Node1',
            'hysteria2://wA4LDUCe5m4KJoAX@163.61.30.40:19088?insecure=1#Node2',
            'vmess://eyJ2IjoiMiIsInBzIjoiTm9kZTMiLCJhZGQiOiIxLjEuMS4xIiwicG9ydCI6NDQzLCJpZCI6ImFkMmY4YWVkLTEzYzUtNDRhMi1iMTJlLTlhZDA1NDlmYzllZCIsImFpZCI6MCwic2N5IjoiYXV0byIsIm5ldCI6InRjcCIsInR5cGUiOiJub25lIn0='
        ].join('\n');

        const base64Str = Base64.encode(rawNodes);
        const { subs, nodes } = parseImportText(base64Str);

        expect(subs).toHaveLength(0);
        expect(nodes).toHaveLength(3);
        expect(nodes[0].name).toBe('Node1');
        expect(nodes[1].name).toBe('Node2');
        expect(nodes[2].name).toBe('Node3');
        expect(nodes[2].type).toBe('vmess');
    });

    it('should parse single line containing multiple space-separated URIs', () => {
        const line = 'vless://uuid1@1.1.1.1:443#NodeA vless://uuid2@2.2.2.2:443#NodeB trojan://pwd@3.3.3.3:443#NodeC';
        const { nodes } = parseImportText(line);

        expect(nodes).toHaveLength(3);
        expect(nodes[0].name).toBe('NodeA');
        expect(nodes[1].name).toBe('NodeB');
        expect(nodes[2].name).toBe('NodeC');
    });

    it('should parse mixed subscriptions and nodes', () => {
        const text = `
            https://example.com/sub/token1
            vless://uuid@1.1.1.1:443#Node1
            https://example.com/sub/token2
        `;

        const { subs, nodes } = parseImportText(text);

        expect(subs).toHaveLength(2);
        expect(nodes).toHaveLength(1);
        expect(subs[0].url).toBe('https://example.com/sub/token1');
        expect(subs[1].url).toBe('https://example.com/sub/token2');
        expect(nodes[0].name).toBe('Node1');
    });

    it('should preserve URL fragment node name even when optional name argument is passed', () => {
        const url = 'vless://uuid@1.1.1.1:443#CustomFragmentName';
        const node = createNode(url, 'FallbackName');

        expect(node.name).toBe('CustomFragmentName');
    });

    it('should use fallback name when URL fragment is missing', () => {
        const url = 'vless://uuid@1.1.1.1:443';
        const node = createNode(url, 'MyFallback');

        expect(node.name).toBe('MyFallback');
    });
});

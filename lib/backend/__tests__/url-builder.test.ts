
import { describe, it, expect } from 'vitest';
import { buildNodeUrl } from '../url-builder';
import { mockNodes } from '../converter/__tests__/mock-nodes';
import { parseVless } from '../parsers/vless';
import { parseHysteria2 } from '../parsers/hysteria2';
import { parseTrojan } from '../parsers/trojan';

describe('URL Builder', () => {
    // VLESS Reality
    it('should build VLESS Reality URL correctly', () => {
        const node = mockNodes.vlessReality;
        const url = buildNodeUrl(node);

        console.log('VLESS Reality URL:', url);

        expect(url).toMatch(/^vless:\/\//);
        expect(url).toContain(node.uuid);
        expect(url).toContain(node.server);
        expect(url).toContain(`:${node.port}`);
        expect(url).toContain('security=reality');
        expect(url).toContain('flow=xtls-rprx-vision');
        expect(url).toContain(`pbk=${node.tls?.reality?.publicKey}`);
        expect(url).toContain(`sid=${node.tls?.reality?.shortId}`);
        expect(url).toContain(`sni=${node.tls?.serverName}`);

        // Removed fp check as mock node doesn't have it

        // Round Trip verify
        const parsed = parseVless(url);
        expect(parsed).toBeTruthy();
        expect(parsed?.uuid).toBe(node.uuid);
        expect(parsed?.flow).toBe(node.flow);
        expect(parsed?.tls?.reality?.publicKey).toBe(node.tls?.reality?.publicKey);
    });

    // VMess
    it('should build VMess URL (v2rayN format)', () => {
        const node = mockNodes.vmess;
        const url = buildNodeUrl(node);
        console.log('VMess URL:', url);

        expect(url).toMatch(/^vmess:\/\//);
    });

    // Trojan
    it('should build Trojan URL', () => {
        const node = mockNodes.trojan;
        const url = buildNodeUrl(node);
        console.log('Trojan URL:', url);

        expect(url).toMatch(/^trojan:\/\//);
        expect(url).toContain(node.password);
        expect(url).toContain('security=tls');
        expect(url).toContain(`sni=${node.tls?.serverName}`);

        const parsed = parseTrojan(url);
        expect(parsed?.password).toBe(node.password);
    });

    // Hysteria 2
    it('should build Hysteria 2 URL', () => {
        const node = mockNodes.hysteria2;
        const url = buildNodeUrl(node);
        console.log('Hy2 URL:', url);

        expect(url).toMatch(/^hysteria2:\/\//);
        expect(url).toContain(node.password);
        expect(url).toContain(`sni=${node.tls?.serverName}`);
        // allowInsecure param
        expect(url).toContain('allowInsecure=1');

        expect(url).toContain('obfs=salamander');
        expect(url).toContain(`obfs-password=${node.obfs?.password}`);

        const parsed = parseHysteria2(url);
        expect(parsed?.tls?.insecure).toBe(true);
        expect(parsed?.obfs?.type).toBe('salamander');
    });

    // Original URL Bypass
    it('should return original URL if name matches (optimization)', () => {
        const originalUrl = 'vless://uuid@1.1.1.1:443?key=val#Original_Name';
        const node = {
            ...mockNodes.vlessReality,
            name: 'Original_Name',
            originalUrl: originalUrl
        };

        const url = buildNodeUrl(node);
        expect(url).toBe(originalUrl);
    });

    // Original URL with different name (should rebuild but keep params if implemented)
    it('should rebuild URL if name changed', () => {
        const originalUrl = 'vless://uuid@1.1.1.1:443?unknownParam=keepme#Original_Name';
        const node = {
            ...mockNodes.vlessReality,
            name: 'New_Name',
            originalUrl: originalUrl
        };

        const url = buildNodeUrl(node);
        expect(url).not.toBe(originalUrl);
        expect(url).toContain('#New_Name');
        // Check backfill
        expect(url).toContain('unknownParam=keepme');
    });
});

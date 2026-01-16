import { describe, it, expect } from 'vitest';
import { toClash, nodeToClashProxy } from '../clash-converter';
import { mockNodes, allNodes } from './mock-nodes';
import * as yaml from 'js-yaml';

describe('Clash Converter', () => {
    it('should convert VMess correctly', () => {
        const result = nodeToClashProxy(mockNodes.vmess);
        expect(result).toBeDefined();
        if (!result) return;

        expect(result.type).toBe('vmess');
        expect(result.name).toBe(mockNodes.vmess.name);
        expect(result.server).toBe(mockNodes.vmess.server);
        expect(result.port).toBe(mockNodes.vmess.port);
        expect(result.uuid).toBe(mockNodes.vmess.uuid);
        expect(result.alterId).toBe(mockNodes.vmess.alterId);
        expect(result.cipher).toBe(mockNodes.vmess.cipher);
        expect(result.tls).toBe(true);
        expect(result.servername).toBe(mockNodes.vmess.tls?.serverName);
        expect(result.network).toBe('ws');
        expect(result['ws-opts']).toEqual({
            path: mockNodes.vmess.transport?.path,
            headers: mockNodes.vmess.transport?.headers
        });
    });

    it('should convert VLESS Reality correctly', () => {
        const result = nodeToClashProxy(mockNodes.vlessReality);
        expect(result).toBeDefined();
        if (!result) return;

        expect(result.type).toBe('vless');
        expect(result.flow).toBe(mockNodes.vlessReality.flow);
        expect(result.tls).toBe(true);
        expect(result['reality-opts']).toBeDefined();
        expect(result['reality-opts']?.['public-key']).toBe(mockNodes.vlessReality.tls?.reality?.publicKey);
        expect(result['reality-opts']?.['short-id']).toBe(mockNodes.vlessReality.tls?.reality?.shortId);
    });

    it('should convert Hysteria2 correctly', () => {
        const result = nodeToClashProxy(mockNodes.hysteria2);
        expect(result).toBeDefined();
        if (!result) return;

        expect(result.type).toBe('hysteria2');
        expect(result.password).toBe(mockNodes.hysteria2.password);
        expect(result.sni).toBe(mockNodes.hysteria2.tls?.serverName);
        expect(result['skip-cert-verify']).toBe(true);
        expect(result.obfs).toBe(mockNodes.hysteria2.obfs?.type);
        expect(result['obfs-password']).toBe(mockNodes.hysteria2.obfs?.password);
    });

    it('should convert TUIC correctly', () => {
        const result = nodeToClashProxy(mockNodes.tuic);
        expect(result).toBeDefined();
        if (!result) return;

        expect(result.type).toBe('tuic');
        expect(result.uuid).toBe(mockNodes.tuic.uuid);
        expect(result.password).toBe(mockNodes.tuic.password);
        expect(result['congestion-controller']).toBe(mockNodes.tuic.congestionControl);
        expect(result.alpn).toEqual(mockNodes.tuic.tls?.alpn);
    });

    it('should convert all protocols correctly', () => {
        const yamlOutput = toClash(allNodes);
        expect(yamlOutput).toContain('proxies:');

        const parsed = yaml.load(yamlOutput) as { proxies: any[] };
        expect(parsed.proxies).toHaveLength(allNodes.length);

        // 验证特定协议是否存在
        const types = parsed.proxies.map(p => p.type);
        expect(types).toContain('vmess');
        expect(types).toContain('vless');
        expect(types).toContain('trojan');
        expect(types).toContain('ss');
        expect(types).toContain('ssr');
        expect(types).toContain('hysteria2');
        expect(types).toContain('tuic');
        expect(types).toContain('wireguard');
        expect(types).toContain('socks5');
    });
});

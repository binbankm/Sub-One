
import { describe, it, expect } from 'vitest';
import { parseVless } from '../vless';

describe('VLESS Parser', () => {
    it('should parse standard VLESS url', () => {
        const url = 'vless://a12ba00f-485a-4b07-9b2f-2d743a1a5b82@example.com:443?encryption=none&type=ws&host=example.com&path=/ws#VLESS_Node';
        const node = parseVless(url);

        expect(node).not.toBeNull();
        expect(node?.type).toBe('vless');
        expect(node?.server).toBe('example.com');
        expect(node?.port).toBe(443);
        expect(node?.uuid).toBe('a12ba00f-485a-4b07-9b2f-2d743a1a5b82');
        expect(node?.transport?.type).toBe('ws');
        expect(node?.transport?.headers?.Host).toBe('example.com');
        expect(node?.name).toBe('VLESS_Node');
    });

    it('should parse VLESS with XTLS-Vision', () => {
        const url = 'vless://a12ba00f-485a-4b07-9b2f-2d743a1a5b82@example.com:443?encryption=none&flow=xtls-rprx-vision&security=tls&sni=example.com#XTLS';
        const node = parseVless(url);

        expect(node?.flow).toBe('xtls-rprx-vision');
        expect(node?.tls?.enabled).toBe(true);
        expect(node?.tls?.serverName).toBe('example.com');
    });

    it('should parse VLESS Reality', () => {
        const url = 'vless://a12ba00f-485a-4b07-9b2f-2d743a1a5b82@example.com:443?encryption=none&flow=xtls-rprx-vision&security=reality&pbk=public-key&sid=short-id&sni=example.com&fp=chrome#Reality';
        const node = parseVless(url);

        expect(node?.tls?.reality?.enabled).toBe(true);
        expect(node?.tls?.reality?.publicKey).toBe('public-key');
        expect(node?.tls?.reality?.shortId).toBe('short-id');
        expect(node?.tls?.fingerprint).toBe('chrome');
    });

    it('should handle IPv6 addresses', () => {
        const url = 'vless://a12ba00f-485a-4b07-9b2f-2d743a1a5b82@[2001:db8::1]:443?encryption=none#IPv6';
        const node = parseVless(url);

        expect(node?.server).toBe('2001:db8::1');
        expect(node?.port).toBe(443);
    });
});

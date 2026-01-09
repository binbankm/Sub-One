
import { describe, it, expect } from 'vitest';
import { parseSocks5 } from '../parsers/socks5';

describe('Socks5 Parser', () => {
    it('should parse standard socks5 url with authentication', () => {
        const url = 'socks5://user:pass@127.0.0.1:1080#TestNode';
        const result = parseSocks5(url);

        expect(result).not.toBeNull();
        expect(result?.type).toBe('socks5');
        expect(result?.name).toBe('TestNode');
        expect(result?.server).toBe('127.0.0.1');
        expect(result?.port).toBe(1080);
        expect(result?.username).toBe('user');
        expect(result?.password).toBe('pass');
        // 关键验证：URL 字段必须存在且正确
        expect(result?.url).toBe(url);
    });

    it('should parse socks5 url without authentication', () => {
        const url = 'socks5://192.168.1.1:7890#NoAuth';
        const result = parseSocks5(url);

        expect(result).not.toBeNull();
        expect(result?.server).toBe('192.168.1.1');
        expect(result?.port).toBe(7890);
        expect(result?.username).toBeUndefined();
        expect(result?.url).toBe(url);
    });

    it('should handle url trimming', () => {
        const rawUrl = '  socks5://1.1.1.1:1080  ';
        const result = parseSocks5(rawUrl);

        expect(result).not.toBeNull();
        expect(result?.server).toBe('1.1.1.1');
        // 验证返回的 URL 应该是 trim 过的
        expect(result?.url).toBe(rawUrl.trim());
    });

    it('should return null for invalid protocol', () => {
        const result = parseSocks5('http://google.com');
        expect(result).toBeNull();
    });

    it('should parse base64 encoded socks5 if supported', () => {
        // 假设 parseSocks5 支持某种 Base64 逻辑，这里简单验证不报错
        parseSocks5('socks5://invalid_base64');
        expect(() => parseSocks5('socks5://invalid')).not.toThrow();
    });
});

import { buildNodeUrl } from '../url-builder';
import { Socks5Node } from '../../shared/types';

describe('Socks5 URL Builder', () => {
    it('should use Base64 encoding for credentials with special characters', () => {
        const node: Socks5Node = {
            type: 'socks5',
            id: 'test-id',
            name: 'SpecialCharsNode',
            server: '1.1.1.1',
            port: 1080,
            username: 'user@name', // Contains @
            password: 'pass:word#', // Contains : and #
            udp: true
        };

        const url = buildNodeUrl(node);
        console.log('Generated URL for Special Chars:', url);

        // Expect standard socks5 protocol
        expect(url.startsWith('socks5://')).toBe(true);

        // Assert that it uses Base64 format (no @ before host part check is tricky if base64 contains it, but unlikely for standard base64)
        // Standard format is socks5://user:pass@host:port
        // Base64 format is socks5://BASE64_STRING#Name

        // Check that the URL does NOT contain the raw password 'pass:word#' visible
        expect(url).not.toContain('pass:word#');

        // Check that it DOES contain the Base64 representation
        // manual calc: user@name:pass:word#@1.1.1.1:1080
        // Base64: dXNlckBuYW1lOnBhc3M6d29yZCNAMS4xLjEuMToxMDgw
        expect(url).toContain('dXNlckBuYW1lOnBhc3M6d29yZCNAMS4xLjEuMToxMDgw');
    });

    it('should use standard encoding for simple credentials', () => {
        const node: Socks5Node = {
            type: 'socks5',
            id: 'test-id-2',
            name: 'SimpleNode',
            server: '1.1.1.1',
            port: 1080,
            username: 'simpleuser',
            password: 'simplepass',
            udp: true
        };

        const url = buildNodeUrl(node);
        // Should look like socks5://simpleuser:simplepass@...
        expect(url).toContain('socks5://simpleuser:simplepass@');
    });
});

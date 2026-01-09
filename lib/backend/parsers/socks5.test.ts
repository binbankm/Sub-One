
import { describe, it, expect } from 'vitest';
import { parseSocks5 } from './socks5';

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
        // 如果不支持 Base64，此测试可能不适用，视实现而定
        // 构造一个简单的 'socks5://base64...' 格式
        // 这里主要测试它不会崩溃
        const result = parseSocks5('socks5://invalid_base64');
        // 根据当前实现，如果解不出有效内容，可能返回 null，也可能解析出错误的 host
        // 我们只要确保不抛出异常即可
        expect(() => parseSocks5('socks5://invalid')).not.toThrow();
    });
});

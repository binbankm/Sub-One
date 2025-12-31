import { describe, it, expect } from 'vitest';
import { SubscriptionConverter } from '../subscription-converter';
import { vmessNode, mixedNodes, emptyNodes } from '../__fixtures__/test-nodes';
import { base64Decode } from './test-utils';

describe('SubscriptionConverter - Base64 转换', () => {
    const converter = new SubscriptionConverter();

    describe('toBase64()', () => {
        it('应该能将单个节点转换为 Base64', () => {
            const result = converter.toBase64([vmessNode]);

            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');

            // 验证是有效的 Base64
            expect(() => base64Decode(result)).not.toThrow();

            // 解码后应该包含原始 URL
            const decoded = base64Decode(result);
            expect(decoded).toContain('vmess://');
        });

        it('应该能将多个节点转换为 Base64', () => {
            const result = converter.toBase64(mixedNodes);

            expect(result).toBeTruthy();
            const decoded = base64Decode(result);

            // 应该包含所有节点的 URL
            expect(decoded).toContain('vmess://');
            expect(decoded).toContain('vless://');
            expect(decoded).toContain('trojan://');
            expect(decoded).toContain('ss://');

            // 检查节点数量（通过换行符）
            const lines = decoded.split('\n');
            expect(lines.length).toBe(mixedNodes.length);
        });

        it('应该处理空节点数组', () => {
            const result = converter.toBase64(emptyNodes);

            expect(result).toBeDefined();
            const decoded = base64Decode(result);
            expect(decoded).toBe('');
        });

        it('Base64 编码应该可逆', () => {
            const urls = mixedNodes.map(n => n.url).join('\n');
            const encoded = converter.toBase64(mixedNodes);
            const decoded = base64Decode(encoded);

            expect(decoded).toBe(urls);
        });
    });

    describe('convert() - Base64 格式', () => {
        it('应该通过 convert 方法调用 Base64 转换', () => {
            const result = converter.convert([vmessNode], 'base64');

            expect(result).toBeTruthy();
            expect(typeof result).toBe('string');

            const decoded = base64Decode(result);
            expect(decoded).toContain('vmess://');
        });

        it('格式名称应该不区分大小写', () => {
            const result1 = converter.convert([vmessNode], 'base64');
            const result2 = converter.convert([vmessNode], 'BASE64');
            const result3 = converter.convert([vmessNode], 'Base64');

            expect(result1).toBe(result2);
            expect(result2).toBe(result3);
        });
    });
});

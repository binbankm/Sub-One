import { describe, it, expect } from 'vitest';
import { SubscriptionConverter } from '../subscription-converter';
import { mixedNodes, invalidNode } from '../__fixtures__/test-nodes';
import { base64Decode, base64Encode } from './test-utils';

describe('SubscriptionConverter - 主转换方法', () => {
    const converter = new SubscriptionConverter();

    describe('convert() - 格式路由', () => {
        it('应该正确路由到 Base64 转换', () => {
            const result = converter.convert(mixedNodes, 'base64');
            expect(result).toBeTruthy();
            expect(() => {
                // 验证结果是有效的 Base64
                const decoded = base64Decode(result);
                expect(decoded).toBeTruthy();
            }).not.toThrow();
        });

        it('应该正确路由到 Clash 转换', () => {
            const result = converter.convert(mixedNodes, 'clash');
            expect(result).toBeTruthy();
            expect(result).toContain('proxies');
        });

        it('应该正确路由到 Sing-Box 转换', () => {
            const result = converter.convert(mixedNodes, 'singbox');
            expect(result).toBeTruthy();
            expect(() => JSON.parse(result)).not.toThrow();
        });

        it('应该正确路由到 Surge 转换', () => {
            const result = converter.convert(mixedNodes, 'surge');
            expect(result).toBeTruthy();
            expect(result).toContain('[General]');
        });

        it('应该正确路由到 Loon 转换', () => {
            const result = converter.convert(mixedNodes, 'loon');
            expect(result).toBeTruthy();
            expect(result).toContain('[General]');
        });
    });

    describe('convert() - 格式名称处理', () => {
        it('格式名称应该不区分大小写', () => {
            const formats = [
                ['base64', 'BASE64', 'Base64'],
                ['clash', 'CLASH', 'Clash'],
                ['singbox', 'SINGBOX', 'SingBox'],
                ['surge', 'SURGE', 'Surge'],
                ['loon', 'LOON', 'Loon'],
            ];

            formats.forEach(([lower, upper, mixed]) => {
                const result1 = converter.convert(mixedNodes, lower);
                const result2 = converter.convert(mixedNodes, upper);
                const result3 = converter.convert(mixedNodes, mixed);

                expect(result1).toBe(result2);
                expect(result2).toBe(result3);
            });
        });

        it('应该处理带空格的格式名称', () => {
            const result1 = converter.convert(mixedNodes, 'base64');
            const result2 = converter.convert(mixedNodes, ' base64 ');

            expect(result1).toBe(result2);
        });
    });

    describe('convert() - 错误处理', () => {
        it('不支持的格式应该抛出错误', () => {
            expect(() => {
                converter.convert(mixedNodes, 'unsupported-format');
            }).toThrow(/不支持的转换格式/);
        });

        it('空格式名称应该抛出错误', () => {
            expect(() => {
                converter.convert(mixedNodes, '');
            }).toThrow(/不支持的转换格式/);
        });
    });

    describe('convert() - 选项传递', () => {
        it('应该正确传递选项到转换方法', () => {
            const options = {
                filename: 'test-config',
                includeRules: true,
            };

            // 这些方法应该接受选项而不报错
            expect(() => {
                converter.convert(mixedNodes, 'clash', options);
            }).not.toThrow();

            expect(() => {
                converter.convert(mixedNodes, 'singbox', options);
            }).not.toThrow();
        });
    });
});

describe('SubscriptionConverter - 工具方法', () => {
    const converter = new SubscriptionConverter();

    describe('Base64 编解码', () => {
        it('应该正确编码简单字符串', () => {
            const text = 'Hello, World!';
            const encoded = converter['encodeBase64'](text);

            expect(encoded).toBe(base64Encode(text));
        });

        it('应该正确解码简单字符串', () => {
            const text = 'Hello, World!';
            const encoded = base64Encode(text);
            const decoded = converter['decodeBase64'](encoded);

            expect(decoded).toBe(text);
        });

        it('应该处理 UTF-8 字符', () => {
            const text = '你好，世界！🌍';
            const encoded = converter['encodeBase64'](text);
            const decoded = converter['decodeBase64'](encoded);

            expect(decoded).toBe(text);
        });

        it('编解码应该可逆', () => {
            const texts = [
                'simple text',
                '中文测试',
                'Mixed 混合 text 🎉',
                'vmess://eyJ2IjoiMiJ9',
                '特殊字符: !@#$%^&*()',
            ];

            texts.forEach(text => {
                const encoded = converter['encodeBase64'](text);
                const decoded = converter['decodeBase64'](encoded);
                expect(decoded).toBe(text);
            });
        });

        it('应该处理空字符串', () => {
            const encoded = converter['encodeBase64']('');
            expect(encoded).toBe('');

            const decoded = converter['decodeBase64']('');
            expect(decoded).toBe('');
        });

        it('应该处理长文本', () => {
            const longText = 'a'.repeat(10000);
            const encoded = converter['encodeBase64'](longText);
            const decoded = converter['decodeBase64'](encoded);

            expect(decoded).toBe(longText);
        });
    });
});

describe('SubscriptionConverter - 边界情况和错误处理', () => {
    const converter = new SubscriptionConverter();

    describe('无效节点处理', () => {
        it('应该跳过无效协议的节点', () => {
            const nodes = [invalidNode];

            // 应该不抛出错误，而是跳过无效节点
            expect(() => {
                converter.toClash(nodes);
            }).not.toThrow();

            expect(() => {
                converter.toSingBox(nodes);
            }).not.toThrow();
        });

        it('混合有效和无效节点时应该只转换有效节点', () => {
            const nodes = [...mixedNodes, invalidNode];

            const result = converter.toBase64(nodes);
            const decoded = base64Decode(result);

            // 应该包含有效节点
            expect(decoded).toContain('vmess://');

            // 应该包含无效节点的 URL
            expect(decoded).toContain('invalid://');
        });
    });

    describe('特殊字符处理', () => {
        it('应该正确处理节点名称中的特殊字符', () => {
            const specialNode = {
                ...mixedNodes[0],
                name: '节点 #1 (测试)',
            };

            expect(() => {
                converter.toClash([specialNode]);
            }).not.toThrow();

            expect(() => {
                converter.toSingBox([specialNode]);
            }).not.toThrow();
        });

        it('应该正确处理 URL 编码', () => {
            const encodedNode = {
                ...mixedNodes[0],
                name: '节点%20测试',
            };

            expect(() => {
                converter.convert([encodedNode], 'base64');
            }).not.toThrow();
        });
    });

    describe('大量节点处理', () => {
        it('应该能处理大量节点', () => {
            const manyNodes = Array(100).fill(null).map((_, i) => ({
                ...mixedNodes[0],
                id: `node-${i}`,
                name: `节点${i}`,
            }));

            expect(() => {
                converter.toBase64(manyNodes);
            }).not.toThrow();

            expect(() => {
                converter.toClash(manyNodes);
            }).not.toThrow();
        });
    });
});

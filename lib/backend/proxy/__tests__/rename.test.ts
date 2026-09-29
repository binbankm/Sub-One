import { describe, expect, it } from 'vitest';
import { handleRenaming, process } from '../processor';
import type { ProxyNode } from '../types';

function createMockNode(name: string): ProxyNode {
    return {
        id: 'mock-1',
        name,
        type: 'ss',
        server: '1.1.1.1',
        port: 443,
        cipher: 'aes-128-gcm',
        password: 'pass'
    };
}

describe('Node Rename Processor', () => {
    it('should replace simple literal strings', () => {
        const nodes = [createMockNode('香港 01'), createMockNode('日本 02')];
        const rules = '香港@HK\n日本@JP';
        const result = handleRenaming(nodes, rules);

        expect(result[0].name).toBe('HK 01');
        expect(result[1].name).toBe('JP 02');
    });

    it('should delete matched content when @ is omitted or replacement is empty', () => {
        const nodes = [
            createMockNode('[VIP专线] 香港 01'),
            createMockNode('香港 02 [倍率: 1.5x]')
        ];
        const rules = '\\[VIP专线\\]@\n\\[倍率: 1.5x\\]';
        const result = handleRenaming(nodes, rules);

        expect(result[0].name).toBe('香港 01');
        expect(result[1].name).toBe('香港 02');
    });

    it('should support regex patterns and capture groups', () => {
        const nodes = [
            createMockNode('HK-01'),
            createMockNode('US-99')
        ];
        const rules = '([A-Z]+)-(\\d+)@$1 节点 #$2';
        const result = handleRenaming(nodes, rules);

        expect(result[0].name).toBe('HK 节点 #01');
        expect(result[1].name).toBe('US 节点 #99');
    });

    it('should be case-insensitive by default', () => {
        const nodes = [createMockNode('hong kong 01'), createMockNode('Hong Kong 02')];
        const rules = 'hong kong@HK';
        const result = handleRenaming(nodes, rules);

        expect(result[0].name).toBe('HK 01');
        expect(result[1].name).toBe('HK 02');
    });

    it('should ignore comment lines and blank lines', () => {
        const nodes = [createMockNode('[专线] 香港 01')];
        const rules = `
            # 这是注释
            // 这也是注释
            \\[专线\\]@

            香港@HK
        `;
        const result = handleRenaming(nodes, rules);
        expect(result[0].name).toBe('HK 01');
    });

    it('should drop node if rules completely clear the node name (e.g. ad/notice nodes)', () => {
        const nodes = [
            createMockNode('官网: fly.com (加群防失联)'),
            createMockNode('香港 01')
        ];
        const rules = '.*(官网|防失联).*@';
        const result = handleRenaming(nodes, rules);
        expect(result.length).toBe(1);
        expect(result[0].name).toBe('香港 01');
    });

    it('should collapse multiple consecutive spaces into a single space', () => {
        const nodes = [createMockNode('[VIP专线]   香港   01')];
        const rules = '\\[VIP专线\\]@';
        const result = handleRenaming(nodes, rules);
        expect(result[0].name).toBe('香港 01');
    });

    it('should execute in correct order with process(): sub rename -> global rename -> prepend sub name', async () => {
        const nodes = [
            createMockNode('[专线] 香港 01 - 1.5x'),
            createMockNode('[专线] 日本 02 - 2.0x')
        ];

        // 订阅专属规则：去除机场特有的 [专线] 和倍率
        const subRename = '\\[专线\\]@\n\\s*-\\s*(0\\.\\d+|[1-9]\\d*(\\.\\d+)?)x@';
        // 全局规则：统一香港、日本命名为 HK, JP
        const globalRename = '香港@HK\n日本@JP';

        const result = await process(
            nodes,
            {
                rename: subRename,
                globalRename: globalRename,
                prependSubName: true
            },
            '机场A'
        );

        // 先执行 subRename -> "香港 01" / "日本 02"
        // 再执行 globalRename -> "HK 01" / "JP 02"
        // 最后加上前缀 -> "机场A - HK 01" / "机场A - JP 02"
        expect(result[0].name).toBe('机场A - HK 01');
        expect(result[1].name).toBe('机场A - JP 02');
    });
});

import { describe, expect, it } from 'vitest';

import { handleRenaming, process } from '../../processor';
import type { ProxyNode } from '../../types';

const makeNode = (
    partial: Partial<ProxyNode> & Pick<ProxyNode, 'name' | 'type' | 'server' | 'port'>
): ProxyNode => ({
    ...partial,
    id: partial.id ?? partial.name
});

describe('Processor Engine (process & handleRenaming)', () => {
    const createSampleNodes = (): ProxyNode[] => [
        makeNode({ id: '1', name: 'HK-01', type: 'ss', server: '1.1.1.1', port: 8388, cipher: 'aes-128-gcm', password: 'p1' }),
        makeNode({ id: '2', name: 'HK-01-Dup', type: 'ss', server: '1.1.1.1', port: 8388, cipher: 'aes-128-gcm', password: 'p1' }),
        makeNode({ id: '3', name: 'US-02', type: 'vless', server: '2.2.2.2', port: 443, uuid: 'u2' }),
        makeNode({ id: '4', name: 'JP-01', type: 'trojan', server: '3.3.3.3', port: 443, password: 'p3' })
    ];

    it('should filter by include/exclude/proto, deduplicate, rename, prepend subName, and sort', async () => {
        const result = await process(
            createSampleNodes(),
            {
                dedupe: true,
                exclude: 'US',
                rename: 'HK-(\\d+)@香港 $1',
                prependSubName: true,
                sort: 'asc'
            },
            'MySub'
        );

        expect(result).toHaveLength(2);
        expect(result.map((n) => n.name)).toEqual(['MySub - JP-01', 'MySub - 香港 01']);
    });

    it('should support descending sort and custom sort comparator', async () => {
        const desc = await process(createSampleNodes(), { dedupe: true, sort: 'desc' });
        expect(desc.map((n) => n.name)).toEqual(['US-02', 'JP-01', 'HK-01']);

        const custom = await process(createSampleNodes(), {
            dedupe: true,
            sort: (a, b) => a.port - b.port
        });
        expect(custom[0].port).toBe(443);
        expect(custom[2].port).toBe(8388);
    });

    it('should support handleRenaming with comments, deletion rules, and regex capture groups', () => {
        const renamed = handleRenaming(
            [makeNode({ name: '[VIP] SG-01 剩余流量', type: 'ss', server: '1.1.1.1', port: 80 })],
            `
# comment
// another comment
\\[VIP\\]
剩余流量
SG-(\\d+)@新加坡-$1
`
        );
        expect(renamed[0].name).toBe('新加坡-01');
    });
});

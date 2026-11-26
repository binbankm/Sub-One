import { describe, expect, it } from 'vitest';

import { filterNodes } from '../search';

describe('Frontend Node Search Filter (filterNodes)', () => {
    const nodes = [
        { name: 'HK-01', protocol: 'ss', url: 'ss://1.1.1.1:8388' },
        { name: 'US-02', protocol: 'vless', url: 'vless://2.2.2.2:443' },
        { name: 'JP-VMess', protocol: 'vmess', url: 'vmess://3.3.3.3:443' }
    ];

    it('should filter by protocol prefix without false-matching vmess/vless when searching ss', () => {
        const ssOnly = filterNodes(nodes, 'ss');
        expect(ssOnly.map((n) => n.name)).toEqual(['HK-01']);
    });

    it('should match country/region aliases and return all nodes on empty query', () => {
        expect(filterNodes(nodes, '')).toHaveLength(3);
        const hk = filterNodes(nodes, '香港');
        expect(hk.map((n) => n.name)).toEqual(['HK-01']);
    });
});

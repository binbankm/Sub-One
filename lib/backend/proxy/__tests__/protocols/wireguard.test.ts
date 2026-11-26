import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { convert, parse } from '../../index';

describe('Protocol Spec: WireGuard & AmneziaWG', () => {
    it('should preserve IPv4/IPv6 CIDR, reserved bytes, mtu, and peers across Surge, Loon, Singbox, ClashMeta, and URI', async () => {
        const uri =
            'wireguard://privkey@wg.example.com:51820?publickey=pubkey&address=10.0.0.2/32,fd00::2/128&reserved=1,2,3&mtu=1420#WG-Full';
        const nodes = parse(uri);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].reserved).toEqual([1, 2, 3]);

        const clash = yaml.load(await convert(nodes, 'ClashMeta')) as { proxies: any[] };
        expect(clash.proxies[0].ip).toBe('10.0.0.2/32');
        expect(clash.proxies[0].ipv6).toBe('fd00::2/128');
        expect(clash.proxies[0].reserved).toEqual([1, 2, 3]);

        const sb = JSON.parse(await convert(nodes, 'Singbox'));
        expect(sb.outbounds[0].local_address).toEqual(['10.0.0.2/32', 'fd00::2/128']);
        expect(sb.outbounds[0].reserved).toEqual([1, 2, 3]);

        const surge = await convert(nodes, 'Surge');
        expect(surge).toContain('[WireGuard ');
        expect(surge).toContain('client-id = 1/2/3');

        const loon = await convert(nodes, 'Loon');
        expect(loon).toContain('reserved=[1,2,3]');
    });
});

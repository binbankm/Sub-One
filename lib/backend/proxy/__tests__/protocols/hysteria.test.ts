import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { convert, parse } from '../../index';

describe('Protocol Spec: Hysteria & Hysteria2', () => {
    it('should convert Hysteria2 with salamander obfs and multi-range port hopping across all supported clients', async () => {
        const uri =
            'hysteria2://hy2pass@hy2.example.com:443?sni=hy2.example.com&obfs=salamander&obfs-password=salpw&mport=20000-30000,40000-50000&hop-interval=30&up=50&down=200#Hy2-Full';
        const nodes = parse(uri);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].type).toBe('hysteria2');

        const qx = await convert(nodes, 'QuantumultX');
        expect(qx).toContain('salamander-password=salpw');
        expect(qx).toContain('port-hopping="20000-30000,40000-50000"');

        const sb = JSON.parse(await convert(nodes, 'Singbox'));
        expect(sb.outbounds[0].obfs).toEqual({ type: 'salamander', password: 'salpw' });
        expect(sb.outbounds[0].server_ports).toEqual(['20000:30000', '40000:50000']);

        const clash = yaml.load(await convert(nodes, 'ClashMeta')) as { proxies: any[] };
        expect(clash.proxies[0].obfs).toBe('salamander');
        expect(clash.proxies[0]['obfs-password']).toBe('salpw');

        const surge = await convert(nodes, 'Surge');
        expect(surge).toContain('hysteria2,hy2.example.com,443');

        const loon = await convert(nodes, 'Loon');
        expect(loon).toContain('salamander-password=salpw');
    });
});

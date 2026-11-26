import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { convert, parse } from '../../index';

describe('Protocol Spec: Trojan (TLS / WS / Reality / ECH)', () => {
    it('should handle Trojan with implicit TLS and ECH across ClashMeta, Singbox, QX, Surge, and Egern', async () => {
        const nodes = parse(`
proxies:
  - name: Trojan-ECH
    type: trojan
    server: tr.example.com
    port: 443
    password: secret
    sni: tr.example.com
    ech-opts:
      config: ech-b64-cfg
      query-server-name: dns.example.com
`);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].tls).toBe(true);

        const qx = await convert(nodes, 'QuantumultX');
        expect(qx).toContain('over-tls=true');
        expect(qx).toContain('tls-host=tr.example.com');

        const sb = JSON.parse(await convert(nodes, 'Singbox'));
        expect(sb.outbounds[0].tls.ech).toEqual({
            enabled: true,
            config: ['ech-b64-cfg'],
            query_server_name: 'dns.example.com'
        });

        const egern = yaml.load(await convert(nodes, 'Egern')) as { proxies: any[] };
        expect(egern.proxies[0].ech).toEqual({
            enabled: true,
            config_list: ['ech-b64-cfg'],
            query_server_name: 'dns.example.com'
        });
    });
});

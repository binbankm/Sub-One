import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { convert, parse } from '../../index';

describe('Protocol Spec: Snell (v1 - v6)', () => {
    it('should convert Snell v4 with shadow-tls and Snell v6 with quic-proxy-mode across Surge, Loon, ClashMeta, and Singbox', async () => {
        const nodes = parse(`
proxies:
  - name: Snell-v4
    type: snell
    server: snell.example.com
    port: 10000
    psk: mypsk
    version: 4
    reuse: true
    obfs-opts:
      mode: shadow-tls
      host: cdn.example.com
      password: stpw
      version: 3
  - name: Snell-v6
    type: snell
    server: snell6.example.com
    port: 10001
    psk: mypsk6
    version: 6
    mode: quic
    quic-proxy-mode: true
    userkey: uk123
`);
        expect(nodes).toHaveLength(2);

        const surge = await convert(nodes, 'Surge');
        expect(surge).toContain('Snell-v4=snell,snell.example.com,10000,psk=mypsk,version=4');
        expect(surge).toContain('Snell-v6=snell,snell6.example.com,10001,psk=mypsk6,version=6');
        expect(surge).toContain('quic-proxy-mode=true');

        const sb = JSON.parse(await convert(nodes, 'Singbox'));
        expect(sb.outbounds[1].quic_proxy_mode).toBe(true);
        expect(sb.outbounds[1].userkey).toBe('uk123');

        const clash = yaml.load(await convert(nodes, 'ClashMeta')) as { proxies: any[] };
        expect(clash.proxies[0].psk).toBe('mypsk');
        expect(clash.proxies[1].mode).toBe('quic');
    });
});

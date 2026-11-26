import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { convert, parse } from '../../index';

describe('Protocol Spec: AnyTLS (Session Pool / Padding / Reuse)', () => {
    it('should convert AnyTLS with session params and padding-scheme across ClashMeta, Singbox, Surge, Loon, Shadowrocket, Egern, and URI', async () => {
        const nodes = parse(`
proxies:
  - name: AnyTLS-Full
    type: anytls
    server: any.example.com
    port: 443
    password: apw
    servername: any.example.com
    alpn: [h2]
    disable-reuse: true
    idle-session-check-interval: 30
    idle-session-timeout: 60
    min-idle-session: 2
    padding-scheme:
      - stop=8
`);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].type).toBe('anytls');
        expect(nodes[0].tls).toBe(true);

        const sb = JSON.parse(await convert(nodes, 'Singbox'));
        expect(sb.outbounds[0].disable_reuse).toBe(true);
        expect(sb.outbounds[0].idle_session_check_interval).toBe('30s');
        expect(sb.outbounds[0].padding_scheme).toEqual(['stop=8']);

        const clash = yaml.load(await convert(nodes, 'ClashMeta')) as { proxies: any[] };
        expect(clash.proxies[0].tls).toBeUndefined();
        expect(clash.proxies[0]['disable-reuse']).toBe(true);

        const sr = yaml.load(await convert(nodes, 'Shadowrocket')) as { proxies: any[] };
        expect(sr.proxies[0].tls).toBeUndefined();

        expect(await convert(nodes, 'Surge')).toContain('anytls,any.example.com,443');
        expect(await convert(nodes, 'Loon')).toContain('idle-session-check-interval=30');
        expect(await convert(nodes, 'URI')).toMatch(/^anytls:\/\//);
    });
});

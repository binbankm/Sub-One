import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { convert, parse } from '../../index';

describe('Protocol Spec: Shadowsocks & ShadowsocksR (SS / SS-2022 / SSR)', () => {
    it('should parse and convert SS-2022 with shadow-tls and uot across ClashMeta, Singbox, Surge, Loon, and URI', async () => {
        const uri =
            'ss://2022-blake3-aes-128-gcm:base64pw@1.2.3.4:443?plugin=shadow-tls%3Bhost%3Dwww.apple.com%3Bpassword%3Dstpw%3Bversion%3D3&uot=1#SS2022';
        const nodes = parse(uri);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].type).toBe('ss');
        expect(nodes[0].cipher).toBe('2022-blake3-aes-128-gcm');
        expect(nodes[0].plugin).toBe('shadow-tls');

        const clashYaml = yaml.load(await convert(nodes, 'ClashMeta')) as { proxies: any[] };
        expect(clashYaml.proxies[0].plugin).toBe('shadow-tls');
        expect(clashYaml.proxies[0]['udp-over-tcp']).toBe(true);

        const sbJson = JSON.parse(await convert(nodes, 'Singbox'));
        expect(sbJson.outbounds).toHaveLength(2);
        expect(sbJson.outbounds[1].type).toBe('shadowtls');

        const surgeConf = await convert(nodes, 'Surge');
        expect(surgeConf).toContain('shadow-tls-password=stpw');

        const loonConf = await convert(nodes, 'Loon');
        expect(loonConf).toContain('shadow-tls-password=stpw');
    });

    it('should parse and convert SSR with obfs and protocol params across ClashMeta, QX, and URI', async () => {
        const ssrYaml = `
proxies:
  - name: SSR-Node
    type: ssr
    server: 1.2.3.4
    port: 8388
    cipher: aes-256-cfb
    password: ssrpw
    protocol: auth_aes128_md5
    protocol-param: "123:abc"
    obfs: tls1.2_ticket_auth
    obfs-param: www.bing.com
`;
        const nodes = parse(ssrYaml);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].type).toBe('ssr');

        const qxOut = await convert(nodes, 'QuantumultX');
        expect(qxOut).toContain('obfs=tls1.2_ticket_auth');
        expect(qxOut).toContain('obfs-param=www.bing.com');

        const uriOut = await convert(nodes, 'URI');
        expect(uriOut).toMatch(/^ssr:\/\//);
        const reparsed = parse(uriOut);
        expect(reparsed[0].protocol).toBe('auth_aes128_md5');
        expect(reparsed[0]['obfs-param']).toBe('www.bing.com');
    });
});

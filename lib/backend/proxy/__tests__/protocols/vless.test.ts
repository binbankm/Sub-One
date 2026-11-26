import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { convert, parse } from '../../index';

describe('Protocol Spec: VLESS (Reality / Vision / XHTTP / Encryption / ECH)', () => {
    it('should preserve Reality, Vision, XHTTP, and VLESS Encryption across URI, ClashMeta, Shadowrocket, and Egern', async () => {
        const uri =
            'vless://11111111-1111-1111-1111-111111111111@v.example.com:443?security=reality&type=xhttp&mode=auto&path=%2Fxhttp&host=cdn.example.com&sni=sni.example.com&fp=chrome&flow=xtls-rprx-vision&pbk=pub-key&sid=ab12&support-x25519mlkem768=true&encryption=mlkem768x25519plus.native.0rtt.key#VLESS-Full';
        const nodes = parse(uri);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].type).toBe('vless');
        expect(nodes[0].network).toBe('xhttp');
        expect(nodes[0].encryption).toBe('mlkem768x25519plus.native.0rtt.key');
        expect(nodes[0]['reality-opts']?.['support-x25519mlkem768']).toBe(true);

        const clash = yaml.load(await convert(nodes, 'ClashMeta')) as { proxies: any[] };
        expect(clash.proxies[0].encryption).toBe('mlkem768x25519plus.native.0rtt.key');
        expect(clash.proxies[0]['xhttp-opts'].mode).toBe('auto');

        const sr = yaml.load(await convert(nodes, 'Shadowrocket')) as { proxies: any[] };
        expect(sr.proxies[0].encryption).toBe('mlkem768x25519plus.native.0rtt.key');
        expect(sr.proxies[0]['reality-opts']['support-x25519mlkem768']).toBe(true);
    });

    it('should convert VLESS+TLS+WS cleanly to Surge, Loon, Surfboard, and Singbox', async () => {
        const nodes = parse(
            'vless://11111111-1111-1111-1111-111111111111@ws.example.com:443?security=tls&type=ws&path=%2Fws&host=cdn.example.com&sni=ws.example.com#VLESS-WS'
        );
        expect(await convert(nodes, 'Surge')).toContain('ws=true');
        expect(await convert(nodes, 'Loon')).toContain('transport=ws');
        expect(await convert(nodes, 'Surfboard')).toContain('ws=true');
        const sb = JSON.parse(await convert(nodes, 'Singbox'));
        expect(sb.outbounds[0].transport.type).toBe('ws');
    });
});

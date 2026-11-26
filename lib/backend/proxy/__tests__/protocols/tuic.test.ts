import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { convert, parse } from '../../index';

describe('Protocol Spec: TUIC (v4 & v5)', () => {
    it('should parse and convert TUIC v5 with congestion-controller, udp-relay-mode, reduce-rtt, and ALPN', async () => {
        const uri =
            'tuic://11111111-1111-1111-1111-111111111111:tpw@tuic.example.com:443?sni=tuic.example.com&alpn=h3&congestion_control=bbr&udp_relay_mode=quic&reduce_rtt=1#TUIC-v5';
        const nodes = parse(uri);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].type).toBe('tuic');

        const clash = yaml.load(await convert(nodes, 'ClashMeta')) as { proxies: any[] };
        expect(clash.proxies[0].version).toBe(5);
        expect(clash.proxies[0]['congestion-controller']).toBe('bbr');
        expect(clash.proxies[0]['reduce-rtt']).toBe(true);

        const sb = JSON.parse(await convert(nodes, 'Singbox'));
        expect(sb.outbounds[0].congestion_control).toBe('bbr');
        expect(sb.outbounds[0].zero_rtt_handshake).toBe(true);

        expect(await convert(nodes, 'Surge')).toContain('tuic-v5,tuic.example.com,443');
        expect(await convert(nodes, 'Loon')).toContain('reduce-rtt=true');
        expect(await convert(nodes, 'Surfboard')).toContain('tuic-v5,tuic.example.com,443');
    });
});

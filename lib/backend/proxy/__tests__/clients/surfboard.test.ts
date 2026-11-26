import { describe, expect, it } from 'vitest';

import { SurfboardConverter } from '../../converter/surfboard';
import type { ProxyNode } from '../../types';

const makeNode = (
    partial: Partial<ProxyNode> & Pick<ProxyNode, 'name' | 'type' | 'server' | 'port'>
): ProxyNode => ({
    ...partial,
    id: partial.id ?? partial.name
});

describe('SurfboardConverter', () => {
    const converter = new SurfboardConverter();

    it('should convert SS with shadow-tls/uot, Hysteria2 gecko/salamander, TUIC v5, AnyTLS, Snell, Trojan, and Direct/Reject', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'sb-ss',
                type: 'ss',
                server: '1.2.3.4',
                port: 443,
                cipher: '2022-blake3-aes-128-gcm',
                password: 'pw',
                uot: true,
                'shadow-tls-password': 'stls-pw',
                'shadow-tls-sni': 'www.apple.com',
                'shadow-tls-version': 3,
                'underlying-proxy': 'Relay'
            }),
            makeNode({
                name: 'sb-hy2-gecko',
                type: 'hysteria2',
                server: 'hy2.example.com',
                port: 443,
                auth: 'hy2-auth',
                'server-ports': '20000-30000,35000',
                'hop-interval': 30,
                obfs: 'gecko',
                'obfs-password': 'gecko-pw',
                'down-mbps': 150,
                ecn: true,
                sni: 'hy2.example.com',
                'underlying-proxy': 'Relay'
            }),
            makeNode({
                name: 'sb-tuic',
                type: 'tuic',
                server: 'tuic.example.com',
                port: 443,
                uuid: '11111111-1111-1111-1111-111111111111',
                password: 'tpw',
                'server-ports': '10000-10100',
                'congestion-controller': 'bbr',
                'udp-relay-mode': 'quic',
                'reduce-rtt': true,
                'disable-sni': true,
                alpn: ['h3']
            }),
            makeNode({
                name: 'sb-anytls',
                type: 'anytls',
                server: 'any.example.com',
                port: 443,
                password: 'apw',
                'disable-reuse': true,
                'idle-session-check-interval': 30,
                'min-idle-session': 2,
                'underlying-proxy': 'Relay'
            }),
            makeNode({
                name: 'sb-trojan',
                type: 'trojan',
                server: 'tr.example.com',
                port: 443,
                password: 'tpw',
                sni: 'tr.example.com',
                'tls-fingerprint': 'aa:bb:cc'
            }),
            makeNode({ name: 'DIRECT', type: 'direct', server: '', port: 0 }),
            makeNode({ name: 'REJECT', type: 'reject', server: '', port: 0 })
        ];

        const out = await converter.convert(nodes);
        const lines = out.split('\n');
        expect(lines).toHaveLength(7);

        expect(lines[0]).toContain('shadow-tls-password=stls-pw');
        expect(lines[0]).toContain('shadow-tls-sni=www.apple.com');
        expect(lines[0]).toContain('udp-over-tcp=true');
        expect(lines[0]).toContain('underlying-proxy=Relay');

        expect(lines[1]).toContain('password="hy2-auth"');
        expect(lines[1]).toContain('port-hopping="20000-30000;35000"');
        expect(lines[1]).toContain('gecko-password="gecko-pw"');
        expect(lines[1]).toContain('download-bandwidth=150');
        expect(lines[1]).toContain('ecn=true');
        expect(lines[1]).toContain('underlying-proxy=Relay');

        expect(lines[2]).toContain('sb-tuic=tuic-v5');
        expect(lines[2]).toContain('port-hopping="10000-10100"');
        expect(lines[2]).toContain('congestion-controller=bbr');
        expect(lines[2]).toContain('udp-relay-mode=quic');
        expect(lines[2]).toContain('reduce-rtt=true');
        expect(lines[2]).toContain('disable-sni=true');

        expect(lines[3]).toContain('reuse=false');
        expect(lines[3]).toContain('idle-session-check-interval=30');
        expect(lines[3]).toContain('min-idle-session=2');
        expect(lines[3]).toContain('underlying-proxy=Relay');

        expect(lines[4]).toContain('server-cert-fingerprint-sha256=aa:bb:cc');
        expect(lines[5]).toBe('DIRECT=direct');
        expect(lines[6]).toBe('REJECT=reject');
    });

    it('should omit unsupported protocols and VLESS Reality safely', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'vless-reality',
                type: 'vless',
                server: '1.1.1.1',
                port: 443,
                uuid: '11111111-1111-1111-1111-111111111111',
                'reality-opts': { 'public-key': 'pub', 'short-id': 'ab' }
            }),
            makeNode({ name: 'mieru-node', type: 'mieru', server: '1.1.1.1', port: 2012 })
        ];
        const out = await converter.convert(nodes);
        expect(out).toBe('');
    });
});

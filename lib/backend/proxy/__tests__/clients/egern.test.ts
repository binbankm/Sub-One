import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { EgernConverter } from '../../converter/egern';
import type { ProxyNode } from '../../types';

const makeNode = (
    partial: Partial<ProxyNode> & Pick<ProxyNode, 'name' | 'type' | 'server' | 'port'>
): ProxyNode => ({
    ...partial,
    id: partial.id ?? partial.name
});

describe('EgernConverter', () => {
    const converter = new EgernConverter();

    it('should convert SS, Trojan, VLESS Reality, Hysteria2, TUIC, AnyTLS, Snell, and WireGuard', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'eg-ss',
                type: 'ss',
                server: '1.2.3.4',
                port: 443,
                cipher: 'chacha20-ietf-poly1305',
                password: 'pw',
                udp: true,
                uot: true,
                'shadow-tls-password': 'stls-pw',
                'shadow-tls-sni': 'www.apple.com',
                'shadow-tls-version': 3,
                'underlying-proxy': 'relay-node'
            }),
            makeNode({
                name: 'eg-trojan',
                type: 'trojan',
                server: 'tr.example.com',
                port: 443,
                password: 'tpw',
                sni: 'tr.example.com',
                'block-quic': 'on'
            }),
            makeNode({
                name: 'eg-hy2',
                type: 'hysteria2',
                server: 'hy2.example.com',
                port: 443,
                auth: 'hy2-auth',
                'server-ports': '20000-30000',
                'hop-interval': 30,
                obfs: 'salamander',
                'obfs-password': 'opw',
                'up-mbps': 100
            }),
            makeNode({
                name: 'eg-tuic',
                type: 'tuic',
                server: 'tuic.example.com',
                port: 443,
                uuid: '11111111-1111-1111-1111-111111111111',
                token: 'v4-token',
                'congestion-controller': 'bbr',
                'udp-relay-mode': 'quic',
                'reduce-rtt': true,
                'heartbeat-interval': 10000,
                alpn: ['h3']
            }),
            makeNode({
                name: 'eg-anytls',
                type: 'anytls',
                server: 'any.example.com',
                port: 443,
                password: 'apw',
                'disable-reuse': true,
                'idle-session-check-interval': 30,
                'min-idle-session': 2,
                alpn: 'h2' as unknown as string[]
            }),
            makeNode({
                name: 'eg-snell',
                type: 'snell',
                server: 'snell.example.com',
                port: 10000,
                psk: 'spsk',
                version: 4,
                plugin: 'shadow-tls',
                'plugin-opts': { host: 'cdn.example.com', password: 'spw', version: 3 }
            }),
            makeNode({
                name: 'eg-wg',
                type: 'wireguard',
                server: 'orig.example.com',
                port: 51820,
                'private-key': 'priv',
                ip: '10.0.0.2',
                peers: [{ server: 'peer.example.com', port: 51821, 'public-key': 'pub' }]
            })
        ];

        const out = await converter.convert(nodes);
        const parsed = yaml.load(out) as { proxies: any[] };
        expect(parsed.proxies).toHaveLength(7);

        const [ss, trojan, hy2, tuic, anytls, snell, wg] = parsed.proxies;
        expect(ss.method).toBe('chacha20-poly1305');
        expect(ss.udp_relay).toBe(true);
        expect(ss.udp_over_tcp).toBe(true);
        expect(ss.shadow_tls).toEqual({ password: 'stls-pw', sni: 'www.apple.com' });
        expect(ss.underlying_proxy).toBe('relay-node');

        expect(trojan.transport).toEqual({ tls: { sni: 'tr.example.com' } });
        expect(trojan.block_quic).toBe(true);

        expect(hy2.auth).toBe('hy2-auth');
        expect(hy2.port_hopping).toBe('20000-30000');
        expect(hy2.port_hopping_interval).toBe(30);
        expect(hy2.bandwidth).toBe(100);

        expect(tuic.password).toBe('v4-token');
        expect(tuic.udp_relay_mode).toBe('quic');
        expect(tuic.reduce_rtt).toBe(true);
        expect(tuic.heartbeat_interval).toBe(10000);

        expect(anytls.reuse).toBe(false);
        expect(anytls.alpn).toEqual(['h2']);
        expect(anytls.idle_session_check_interval).toBe(30);
        expect(anytls.min_idle_session).toBe(2);

        expect(snell.shadow_tls).toEqual({ password: 'spw', sni: 'cdn.example.com' });

        expect(wg.server).toBe('peer.example.com');
        expect(nodes[6].server).toBe('orig.example.com'); // input not mutated
    });

    it('should omit unsupported protocols (mieru, sudoku, naive) without throwing', async () => {
        const nodes: ProxyNode[] = [
            makeNode({ name: 'u1', type: 'mieru', server: '1.1.1.1', port: 2012 }),
            makeNode({ name: 'u2', type: 'sudoku', server: '1.1.1.1', port: 443 }),
            makeNode({ name: 'u3', type: 'naive', server: '1.1.1.1', port: 443 })
        ];
        const out = await converter.convert(nodes);
        const parsed = yaml.load(out) as { proxies: any[] | null };
        expect(parsed.proxies ?? []).toHaveLength(0);
    });

    it('should convert VLESS XHTTP + Reality and ECH options', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'eg-vless-xhttp',
                type: 'vless',
                server: 'v.example.com',
                port: 443,
                uuid: '11111111-1111-1111-1111-111111111111',
                network: 'splithttp',
                sni: 'v.example.com',
                'xhttp-opts': { mode: 'auto', path: '/xhttp', host: 'cdn.example.com' },
                'reality-opts': { 'public-key': 'pub', 'short-id': 'ab' },
                'ech-opts': { config: 'ignored-with-reality' }
            }),
            makeNode({
                name: 'eg-trojan-ech',
                type: 'trojan',
                server: 't.example.com',
                port: 443,
                password: 'pw',
                'ech-opts': { config: 'ech-b64', 'query-server-name': 'dns.example.com' }
            })
        ];
        const out = await converter.convert(nodes);
        const parsed = yaml.load(out) as { proxies: any[] };
        expect(parsed.proxies).toHaveLength(2);

        const [vx, te] = parsed.proxies;
        expect(vx.transport.xhttp).toEqual({
            mode: 'auto',
            path: '/xhttp',
            host: 'cdn.example.com',
            sni: 'v.example.com',
            reality: { public_key: 'pub', short_id: 'ab' }
        });
        expect(vx.ech).toBeUndefined();

        expect(te.ech).toEqual({
            enabled: true,
            config_list: ['ech-b64'],
            query_server_name: 'dns.example.com'
        });
    });
});

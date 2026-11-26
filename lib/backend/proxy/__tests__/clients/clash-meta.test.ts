import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { ClashConverter } from '../../converter/clash';
import { parseClash } from '../../parser/clash-parser';
import type { ProxyNode } from '../../types';

const makeNode = (
    partial: Partial<ProxyNode> & Pick<ProxyNode, 'name' | 'type' | 'server' | 'port'>
): ProxyNode => ({
    ...partial,
    id: partial.id ?? partial.name
});

describe('ClashMeta / Mihomo Converter & Parser', () => {
    const mihomo = new ClashConverter(true);

    it('should convert and round-trip Mieru, SSH, Sudoku, TrustTunnel, and Naive', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'mieru-1',
                type: 'mieru',
                server: 'm.example.com',
                port: 2012,
                username: 'u1',
                password: 'p1',
                transport: 'TCP',
                multiplexing: 'MULTIPLEXING_HIGH',
                'port-hopping': '10000-20000',
                'port-hopping-interval': 30
            }),
            makeNode({
                name: 'ssh-1',
                type: 'ssh',
                server: 'ssh.example.com',
                port: 22,
                username: 'root',
                'private-key': '-----BEGIN OPENSSH PRIVATE KEY-----',
                'host-key': ['ssh-ed25519 AAAA']
            }),
            makeNode({
                name: 'sudoku-1',
                type: 'sudoku',
                server: 's.example.com',
                port: 443,
                key: 'my-key',
                'aead-method': 'chacha20-poly1305',
                'table-type': 'prefer_ascii',
                'padding-min': 2,
                'padding-max': 7,
                'enable-pure-downlink': true,
                httpmask: { disable: false, mode: 'stream', tls: true }
            }),
            makeNode({
                name: 'tt-1',
                type: 'trusttunnel',
                server: 'tt.example.com',
                port: 443,
                username: 'u2',
                password: 'p2',
                tls: true,
                sni: 'tt.example.com',
                alpn: 'h2' as unknown as string[]
            }),
            makeNode({
                name: 'naive-1',
                type: 'naive',
                server: 'n.example.com',
                port: 443,
                username: 'u3',
                password: 'p3',
                tls: true,
                sni: 'n.example.com'
            })
        ];

        const out = await mihomo.convert(nodes);
        const parsed = yaml.load(out) as { proxies: any[] };
        expect(parsed.proxies).toHaveLength(5);

        const [m, s, su, tt, na] = parsed.proxies;
        expect(m.type).toBe('mieru');
        expect(m.transport).toBe('TCP');
        expect(m['port-hopping']).toBe('10000-20000');

        expect(s.type).toBe('ssh');
        expect(s.user).toBe('root');
        expect(s.username).toBeUndefined();

        expect(su.type).toBe('sudoku');
        expect(su['aead-method']).toBe('chacha20-poly1305');
        expect(su.httpmask).toEqual({ disable: false, mode: 'stream', tls: true });

        expect(tt.type).toBe('trusttunnel');
        expect(tt.tls).toBeUndefined();
        expect(tt.alpn).toEqual(['h2']);
        expect(tt.servername).toBe('tt.example.com');

        expect(na.type).toBe('naive');
        expect(na.tls).toBeUndefined();

        const reparsed = parseClash(out);
        expect(reparsed).toHaveLength(5);
        expect(reparsed[0].type).toBe('mieru');
        expect(reparsed[0]['port-hopping']).toBe('10000-20000');
        expect(reparsed[1].username).toBe('root');
        expect(reparsed[2].type).toBe('sudoku');
        expect(reparsed[3].type).toBe('trusttunnel');
        expect(reparsed[4].type).toBe('naive');
    });

    it('should convert and parse VLESS encryption, AnyTLS metadata/padding, AmneziaWG, and smux', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'vless-enc',
                type: 'vless',
                server: 'v.example.com',
                port: 443,
                uuid: '11111111-1111-1111-1111-111111111111',
                encryption: 'mlkem768x25519plus.native.0rtt.key',
                smux: { enabled: true, protocol: 'h2mux', 'max-connections': 4 }
            }),
            makeNode({
                name: 'anytls-meta',
                type: 'anytls',
                server: 'a.example.com',
                port: 443,
                password: 'pw',
                'client-metadata': 'meta',
                'padding-scheme': ['stop=8'],
                alpn: 'h2' as unknown as string[]
            }),
            makeNode({
                name: 'awg-meta',
                type: 'wireguard',
                server: 'wg.example.com',
                port: 51820,
                'private-key': 'priv',
                'public-key': 'pub',
                ip: '10.0.0.2',
                jc: 4,
                jmin: 40,
                jmax: 70,
                s1: 15,
                s2: 30
            })
        ];

        const out = await mihomo.convert(nodes);
        const parsed = yaml.load(out) as { proxies: any[] };
        const [v, a, w] = parsed.proxies;

        expect(v.cipher).toBe('none');
        expect(v.encryption).toBe('mlkem768x25519plus.native.0rtt.key');
        expect(v.smux).toEqual({ enabled: true, protocol: 'h2mux', 'max-connections': 4 });

        expect(a['client-metadata']).toBe('meta');
        expect(a['padding-scheme']).toEqual(['stop=8']);
        expect(a.alpn).toEqual(['h2']);

        expect(w['amnezia-wg-option']).toEqual({ jc: 4, jmin: 40, jmax: 70, s1: 15, s2: 30 });
        expect(w.jc).toBeUndefined();

        const reparsed = parseClash(out);
        expect(reparsed[0].encryption).toBe('mlkem768x25519plus.native.0rtt.key');
        expect(reparsed[0].smux).toEqual({ enabled: true, protocol: 'h2mux', 'max-connections': 4 });
        expect(reparsed[1]['client-metadata']).toBe('meta');
        expect(reparsed[1]['padding-scheme']).toEqual(['stop=8']);
        expect(reparsed[2]['amnezia-wg-option']).toEqual({ jc: 4, jmin: 40, jmax: 70, s1: 15, s2: 30 });
    });

    it('should parse and preserve fine-grained Mihomo TLS, transport, and protocol parameters', async () => {
        const yamlInput = `
proxies:
  - name: vless-jls-kcp
    type: vless
    server: v.example.com
    port: 443
    uuid: 11111111-1111-1111-1111-111111111111
    name-cert-verify: cert.example.com
    disable-sni: true
    jls-opts:
      iv: jls-iv
      pwd: jls-pwd
    network: kcp
    kcp-opts:
      header-type: srt
      seed: my-seed
  - name: ss-uot
    type: ss
    server: ss.example.com
    port: 8388
    cipher: 2022-blake3-aes-128-gcm
    password: pw
    udp-over-tcp: true
    udp-over-tcp-version: 2
  - name: hy2-windows
    type: hysteria2
    server: hy2.example.com
    port: 443
    password: pw
    initial-stream-receive-window: 8388608
    max-stream-receive-window: 8388608
    cwnd: 32
  - name: tuic-streams
    type: tuic
    server: tuic.example.com
    port: 443
    uuid: 22222222-2222-2222-2222-222222222222
    password: pw
    max-open-streams: 100
    max-udp-relay-packet-size: 1500
    udp-over-stream: true
  - name: wg-stack
    type: wireguard
    server: wg.example.com
    port: 51820
    private-key: priv
    public-key: pub
    ip: 10.0.0.2
    remote-dns-resolve: true
    ip-stack: dual
    refresh-server-ip-interval: 60
`;
        const parsed = parseClash(yamlInput);
        expect(parsed).toHaveLength(5);

        expect(parsed[0]['name-cert-verify']).toBe('cert.example.com');
        expect(parsed[0]['disable-sni']).toBe(true);
        expect(parsed[0]['jls-opts']).toEqual({ iv: 'jls-iv', pwd: 'jls-pwd' });
        expect(parsed[0]['kcp-opts']).toEqual({ 'header-type': 'srt', seed: 'my-seed' });

        expect(parsed[1]['udp-over-tcp']).toBe(true);
        expect(parsed[1]['udp-over-tcp-version']).toBe(2);

        expect(parsed[2]['initial-stream-receive-window']).toBe(8388608);
        expect(parsed[2].cwnd).toBe(32);

        expect(parsed[3]['max-open-streams']).toBe(100);
        expect(parsed[3]['udp-over-stream']).toBe(true);

        expect(parsed[4]['remote-dns-resolve']).toBe(true);
        expect(parsed[4]['ip-stack']).toBe('dual');
        expect(parsed[4]['refresh-server-ip-interval']).toBe(60);

        const converted = await mihomo.convert(parsed);
        const reParsed = parseClash(converted);
        expect(reParsed).toHaveLength(5);
        expect(reParsed[0]['jls-opts']).toEqual({ iv: 'jls-iv', pwd: 'jls-pwd' });
        expect(reParsed[2].cwnd).toBe(32);
        expect(reParsed[4]['ip-stack']).toBe('dual');
    });

    it('should filter Meta-only protocols and VLESS Reality in standard Clash mode', async () => {
        const clash = new ClashConverter(false);
        const nodes: ProxyNode[] = [
            makeNode({ name: 'ss-ok', type: 'ss', server: '1.1.1.1', port: 8388, cipher: 'aes-128-gcm', password: 'pw' }),
            makeNode({
                name: 'vless-reality',
                type: 'vless',
                server: '1.1.1.1',
                port: 443,
                uuid: '11111111-1111-1111-1111-111111111111',
                'reality-opts': { 'public-key': 'pub', 'short-id': 'ab' }
            }),
            makeNode({ name: 'hy2-meta', type: 'hysteria2', server: '1.1.1.1', port: 443, password: 'pw' }),
            makeNode({ name: 'mieru-meta', type: 'mieru', server: '1.1.1.1', port: 2012, username: 'u', password: 'p' })
        ];

        const out = await clash.convert(nodes);
        const parsed = yaml.load(out) as { proxies: any[] };
        expect(parsed.proxies.map((p) => p.name)).toEqual(['ss-ok']);
    });
});

import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { ShadowrocketConverter } from '../../converter/shadowrocket';
import { parseClash } from '../../parser/clash-parser';
import { parseNodeURI } from '../../parser/uri-parsers';
import type { ProxyNode } from '../../types';

const makeNode = (
    partial: Partial<ProxyNode> & Pick<ProxyNode, 'name' | 'type' | 'server' | 'port'>
): ProxyNode => ({
    ...partial,
    id: partial.id ?? partial.name
});

describe('ShadowrocketConverter', () => {
    const converter = new ShadowrocketConverter();

    it('should convert VLESS with Reality, Vision, XHTTP, and VLESS Encryption', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'vless-reality-xhttp',
                type: 'vless',
                server: 'example.com',
                port: 443,
                uuid: '11111111-1111-1111-1111-111111111111',
                flow: 'xtls-rprx-vision',
                network: 'splithttp',
                encryption: 'mlkem768x25519plus.native.0rtt.testkey',
                sni: 'sni.example.com',
                'reality-opts': {
                    'public-key': 'pub-key-123',
                    'short-id': 'ab12',
                    'spider-x': '/crawl',
                    'support-x25519mlkem768': true
                },
                'xhttp-opts': {
                    path: '/xhttp',
                    mode: 'auto'
                },
                'ech-opts': {
                    enable: true,
                    config: 'base64cfg'
                }
            })
        ];

        const out = await converter.convert(nodes);
        const parsed = yaml.load(out) as { proxies: any[] };
        expect(parsed.proxies).toHaveLength(1);
        const p = parsed.proxies[0];
        expect(p.id).toBeUndefined();
        expect(p.cipher).toBe('none');
        expect(p.encryption).toBe('mlkem768x25519plus.native.0rtt.testkey');
        expect(p.network).toBe('xhttp');
        expect(p['xhttp-opts']).toEqual({ path: '/xhttp', mode: 'auto' });
        expect(p.servername).toBe('sni.example.com');
        expect(p.sni).toBeUndefined();
        expect(p['client-fingerprint']).toBe('chrome');
        expect(p['reality-opts']).toEqual({
            'public-key': 'pub-key-123',
            'short-id': 'ab12',
            'spider-x': '/crawl',
            'support-x25519mlkem768': true
        });
        expect(p['ech-opts']).toBeUndefined();
    });

    it('should strip VLESS encryption when it is none', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'vless-none-enc',
                type: 'vless',
                server: 'example.com',
                port: 443,
                uuid: '11111111-1111-1111-1111-111111111111',
                encryption: 'none'
            })
        ];

        const out = await converter.convert(nodes);
        const parsed = yaml.load(out) as { proxies: any[] };
        expect(parsed.proxies[0].encryption).toBeUndefined();
        expect(parsed.proxies[0].cipher).toBe('none');
    });

    it('should normalize ECH opts including query-server-name and config-list', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'trojan-ech',
                type: 'trojan',
                server: 'example.com',
                port: 443,
                password: 'secret',
                'ech-opts': {
                    config: 'ech-config-b64',
                    'query-server-name': 'dns.example.com'
                }
            })
        ];

        const out = await converter.convert(nodes);
        const parsed = yaml.load(out) as { proxies: any[] };
        const p = parsed.proxies[0];
        expect(p.tls).toBeUndefined();
        expect(p['ech-opts']).toEqual({
            enable: true,
            'config-list': ['ech-config-b64'],
            'query-server-name': 'dns.example.com'
        });
    });

    it('should normalize SS flat shadow-tls fields into plugin-opts', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'ss-shadowtls',
                type: 'ss',
                server: '1.2.3.4',
                port: 443,
                cipher: '2022-blake3-aes-128-gcm',
                password: 'ss-password',
                'shadow-tls-password': 'stls-password',
                'shadow-tls-sni': 'www.apple.com',
                'shadow-tls-version': 3
            })
        ];

        const out = await converter.convert(nodes);
        const parsed = yaml.load(out) as { proxies: any[] };
        const p = parsed.proxies[0];
        expect(p.plugin).toBe('shadow-tls');
        expect(p['plugin-opts']).toEqual({
            host: 'www.apple.com',
            password: 'stls-password',
            version: 3
        });
        expect(p['shadow-tls-password']).toBeUndefined();
        expect(p['shadow-tls-sni']).toBeUndefined();
    });

    it('should convert AnyTLS, Hysteria2, TUIC, WireGuard, Snell, Mieru, Naive, and SSH', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'anytls-node',
                type: 'anytls',
                server: 'any.example.com',
                port: 443,
                password: 'pw',
                tls: true,
                reuse: false,
                sni: 'any.example.com',
                alpn: 'h2' as unknown as string[],
                'idle-session-check-interval': 30,
                'min-idle-session': 2
            }),
            makeNode({
                name: 'hy2-node',
                type: 'hysteria2',
                server: 'hy2.example.com',
                port: 443,
                auth: 'hy2-pass',
                'server-ports': '20000-30000',
                alpn: ['h3'],
                tfo: true,
                sni: 'hy2.example.com'
            }),
            makeNode({
                name: 'tuic-node',
                type: 'tuic',
                server: 'tuic.example.com',
                port: 443,
                uuid: '22222222-2222-2222-2222-222222222222',
                password: 'tuic-pass',
                'congestion-controller': 'bbr'
            }),
            makeNode({
                name: 'wg-node',
                type: 'wireguard',
                server: 'wg.example.com',
                port: 51820,
                'private-key': 'priv',
                'public-key': 'pub',
                ip: '10.0.0.2',
                'persistent-keepalive': 25
            }),
            makeNode({
                name: 'snell-node',
                type: 'snell',
                server: 'snell.example.com',
                port: 10000,
                psk: 'snell-psk',
                version: 4,
                plugin: 'shadow-tls',
                'plugin-opts': {
                    host: 'cdn.example.com',
                    password: 'stls',
                    version: 3
                }
            }),
            makeNode({
                name: 'mieru-node',
                type: 'mieru',
                server: 'mieru.example.com',
                port: 2012,
                username: 'user1',
                password: 'pw1',
                transport: 'TCP',
                multiplexing: 'MULTIPLEXING_HIGH'
            }),
            makeNode({
                name: 'naive-node',
                type: 'naive',
                server: 'naive.example.com',
                port: 443,
                username: 'u2',
                password: 'p2',
                sni: 'naive.example.com'
            }),
            makeNode({
                name: 'ssh-node',
                type: 'ssh',
                server: 'ssh.example.com',
                port: 22,
                username: 'root',
                'private-key': '-----BEGIN OPENSSH PRIVATE KEY-----'
            })
        ];

        const out = await converter.convert(nodes);
        const parsed = yaml.load(out) as { proxies: any[] };
        expect(parsed.proxies).toHaveLength(8);

        const [anytls, hy2, tuic, wg, snell, mieru, naive, ssh] = parsed.proxies;
        expect(anytls.tls).toBeUndefined();
        expect(anytls['disable-reuse']).toBe(true);
        expect(anytls.alpn).toEqual(['h2']);
        expect(anytls['idle-session-check-interval']).toBe(30);
        expect(anytls['min-idle-session']).toBe(2);

        expect(hy2.password).toBe('hy2-pass');
        expect(hy2.ports).toBe('20000-30000');
        expect(hy2.alpn).toEqual(['h3']);
        expect(hy2['fast-open']).toBe(true);

        expect(tuic.version).toBe(5);
        expect(tuic['congestion-controller']).toBe('bbr');

        expect(wg.ip).toBe('10.0.0.2/32');
        expect(wg.keepalive).toBe(25);

        expect(snell['obfs-opts']).toEqual({
            mode: 'shadow-tls',
            host: 'cdn.example.com',
            password: 'stls',
            version: 3
        });

        expect(mieru.username).toBe('user1');
        expect(mieru.transport).toBe('TCP');
        expect(naive.servername).toBe('naive.example.com');
        expect(naive.tls).toBeUndefined();
        expect(ssh['private-key']).toBe('-----BEGIN OPENSSH PRIVATE KEY-----');
    });

    it('should parse and convert Sudoku, TrustTunnel, Juicity, and AmneziaWG WireGuard', async () => {
        const sudokuUri = parseNodeURI(
            'sudoku://secretkey@sudoku.example.com:443?aead-method=chacha20-poly1305&table-type=prefer_ascii&padding-min=2&padding-max=7&enable-pure-downlink=true#Sudoku-1'
        );
        const ttUri = parseNodeURI(
            'tt://user1:pass1@tt.example.com:443?sni=cdn.example.com&alpn=h2,http/1.1&insecure=1&fp=chrome#TrustTunnel-1'
        );
        expect(sudokuUri?.type).toBe('sudoku');
        expect(sudokuUri?.key).toBe('secretkey');
        expect(sudokuUri?.['table-type']).toBe('prefer_ascii');
        expect(sudokuUri?.['padding-min']).toBe(2);
        expect(sudokuUri?.['padding-max']).toBe(7);

        expect(ttUri?.type).toBe('trusttunnel');
        expect(ttUri?.username).toBe('user1');
        expect(ttUri?.password).toBe('pass1');
        expect(ttUri?.alpn).toEqual(['h2', 'http/1.1']);

        const clashNodes = parseClash(`
proxies:
  - name: Sudoku-Clash
    type: sudoku
    server: s.example.com
    port: 8443
    key: clash-key
    aead-method: aes-128-gcm
    table-type: prefer_entropy
    httpmask:
      disable: false
      mode: stream
      tls: true
  - name: TrustTunnel-Clash
    type: trusttunnel
    server: tt.example.com
    port: 443
    username: u
    password: p
    sni: tt.example.com
`);
        expect(clashNodes).toHaveLength(2);
        expect(clashNodes[0].type).toBe('sudoku');
        expect(clashNodes[0].httpmask).toEqual({ disable: false, mode: 'stream', tls: true });

        const awgNode = makeNode({
            name: 'awg-node',
            type: 'wireguard',
            server: 'awg.example.com',
            port: 51820,
            'private-key': 'priv',
            'public-key': 'pub',
            ip: '10.0.0.3',
            jc: 4,
            jmin: 40,
            jmax: 70,
            s1: 15,
            s2: 30
        });
        const juicityNode = makeNode({
            name: 'juicity-node',
            type: 'juicity',
            server: 'j.example.com',
            port: 443,
            uuid: '33333333-3333-3333-3333-333333333333',
            password: 'jpw',
            tls: true,
            sni: 'j.example.com'
        });

        const out = await converter.convert([sudokuUri!, ttUri!, awgNode, juicityNode]);
        const parsed = yaml.load(out) as { proxies: any[] };
        expect(parsed.proxies).toHaveLength(4);

        const [sOut, ttOut, awgOut, jOut] = parsed.proxies;
        expect(sOut.type).toBe('sudoku');
        expect(sOut['aead-method']).toBe('chacha20-poly1305');
        expect(ttOut.type).toBe('trusttunnel');
        expect(ttOut.tls).toBeUndefined();
        expect(ttOut.servername).toBe('cdn.example.com');
        expect(awgOut['amnezia-wg-option']).toEqual({ jc: 4, jmin: 40, jmax: 70, s1: 15, s2: 30 });
        expect(awgOut.jc).toBeUndefined();
        expect(jOut.tls).toBeUndefined();
        expect(jOut.servername).toBe('j.example.com');
    });
});

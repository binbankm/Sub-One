import { describe, expect, it } from 'vitest';

import { URIConverter } from '../../converter/uri';
import { parse } from '../../index';
import { parseNodeURI } from '../../parser/uri-parsers';
import type { ProxyNode } from '../../types';

const makeNode = (
    partial: Partial<ProxyNode> & Pick<ProxyNode, 'name' | 'type' | 'server' | 'port'>
): ProxyNode => ({
    ...partial,
    id: partial.id ?? partial.name
});

describe('URIConverter & parseNodeURI roundtrip', () => {
    const converter = new URIConverter();

    it('should convert and round-trip SSH, Mieru, Juicity, Sudoku, TrustTunnel, and Hy2 auth', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'ssh-1',
                type: 'ssh',
                server: 'ssh.example.com',
                port: 22,
                username: 'root',
                password: 'pw'
            }),
            makeNode({
                name: 'mieru-1',
                type: 'mieru',
                server: 'm.example.com',
                port: 2012,
                username: 'u1',
                password: 'p1',
                transport: 'TCP',
                'port-hopping': '10000-20000'
            }),
            makeNode({
                name: 'juicity-1',
                type: 'juicity',
                server: 'j.example.com',
                port: 443,
                uuid: '11111111-1111-1111-1111-111111111111',
                password: 'jpw',
                sni: 'j.example.com'
            }),
            makeNode({
                name: 'sudoku-1',
                type: 'sudoku',
                server: 's.example.com',
                port: 443,
                key: 'secret-key',
                'aead-method': 'chacha20-poly1305',
                'table-type': 'prefer_ascii',
                'padding-min': 2,
                'padding-max': 7,
                'enable-pure-downlink': true
            }),
            makeNode({
                name: 'tt-1',
                type: 'trusttunnel',
                server: 'tt.example.com',
                port: 443,
                username: 'u2',
                password: 'p2',
                sni: 'cdn.example.com',
                alpn: ['h2', 'http/1.1'],
                'skip-cert-verify': true,
                'client-fingerprint': 'chrome'
            }),
            makeNode({
                name: 'hy2-auth',
                type: 'hysteria2',
                server: 'hy2.example.com',
                port: 443,
                auth: 'auth-only-pass'
            })
        ];

        const out = await converter.convert(nodes);
        const lines = out.split('\n');
        expect(lines).toHaveLength(6);

        expect(lines[0]).toMatch(/^ssh:\/\/root:pw@ssh\.example\.com:22/);
        expect(lines[1]).toMatch(/^mieru:\/\/u1:p1@m\.example\.com:2012/);
        expect(lines[2]).toMatch(/^juicity:\/\/11111111-1111-1111-1111-111111111111:jpw@j\.example\.com:443/);
        expect(lines[3]).toMatch(/^sudoku:\/\/secret-key@s\.example\.com:443/);
        expect(lines[4]).toMatch(/^trusttunnel:\/\/u2:p2@tt\.example\.com:443/);
        expect(lines[5]).toMatch(/^hysteria2:\/\/auth-only-pass@hy2\.example\.com:443/);

        const reparsed = lines.map((l) => parseNodeURI(l)!);
        expect(reparsed.every(Boolean)).toBe(true);
        expect(reparsed[0].type).toBe('ssh');
        expect(reparsed[1].type).toBe('mieru');
        expect(reparsed[2].type).toBe('juicity');
        expect(reparsed[2].sni).toBe('j.example.com');
        expect(reparsed[3].type).toBe('sudoku');
        expect(reparsed[3]['table-type']).toBe('prefer_ascii');
        expect(reparsed[4].type).toBe('trusttunnel');
        expect(reparsed[4].alpn).toEqual(['h2', 'http/1.1']);
        expect(reparsed[5].type).toBe('hysteria2');
        expect(reparsed[5].password).toBe('auth-only-pass');
    });

    it('should convert and round-trip SS-2022, VMess XHTTP, VLESS Reality+Encryption+ECH, Trojan, WireGuard IPv6, and AnyTLS', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'ss-2022',
                type: 'ss',
                server: '1.2.3.4',
                port: 8388,
                cipher: '2022-blake3-aes-128-gcm',
                password: 'base64key==',
                plugin: 'shadow-tls',
                'plugin-opts': { host: 'www.apple.com', password: 'stpw', version: 3 },
                uot: true
            }),
            makeNode({
                name: 'vmess-xhttp',
                type: 'vmess',
                server: 'v.example.com',
                port: 443,
                uuid: '11111111-1111-1111-1111-111111111111',
                network: 'xhttp',
                'xhttp-opts': { path: '/xhttp', host: 'cdn.example.com' },
                tls: true,
                sni: 'v.example.com'
            }),
            makeNode({
                name: 'vless-full',
                type: 'vless',
                server: '2001:db8::1',
                port: 443,
                uuid: '22222222-2222-2222-2222-222222222222',
                flow: 'xtls-rprx-vision',
                encryption: 'mlkem768x25519plus.native.0rtt.key',
                sni: 'sni.example.com',
                'reality-opts': { 'public-key': 'pbk1', 'short-id': 'sid1', 'support-x25519mlkem768': true },
                'name-cert-verify': 'vcn.example.com'
            }),
            makeNode({
                name: 'wg-v6',
                type: 'wireguard',
                server: 'wg.example.com',
                port: 51820,
                'private-key': 'priv',
                'public-key': 'pub',
                ip: '10.0.0.2',
                ipv6: 'fd00::2',
                reserved: [1, 2, 3]
            }),
            makeNode({
                name: 'anytls-1',
                type: 'anytls',
                server: 'any.example.com',
                port: 443,
                password: 'apw',
                sni: 'any.example.com',
                'idle-session-check-interval': 30,
                'min-idle-session': 2
            })
        ];

        const out = await converter.convert(nodes);
        const lines = out.split('\n');
        expect(lines).toHaveLength(5);

        expect(lines[0]).toContain('2022-blake3-aes-128-gcm');
        expect(lines[0]).toContain('uot=1');
        expect(lines[2]).toContain('[2001:db8::1]:443');
        expect(lines[2]).toContain('encryption=mlkem768x25519plus.native.0rtt.key');
        expect(lines[2]).toContain('vcn=vcn.example.com');
        expect(lines[2]).toContain('support-x25519mlkem768=true');
        expect(lines[3]).toContain('reserved=1%2C2%2C3');
        expect(lines[4]).toContain('idle-session-check-interval=30');

        const reparsed = parse(out);
        expect(reparsed).toHaveLength(5);
        expect(reparsed[0].type).toBe('ss');
        expect(reparsed[1].network).toBe('xhttp');
        expect(reparsed[2].server).toBe('2001:db8::1');
        expect(reparsed[2].encryption).toBe('mlkem768x25519plus.native.0rtt.key');
        expect(reparsed[3].reserved).toEqual([1, 2, 3]);
        expect(reparsed[4].type).toBe('anytls');
    });
});

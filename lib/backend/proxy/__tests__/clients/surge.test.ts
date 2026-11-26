import { describe, expect, it } from 'vitest';
import { convert } from '../../index';
import { parseSurge } from '../../parser/surge-parser';

describe('Surge Official Manual Full Coverage (parse <-> convert)', () => {
    it('should parse and convert Shadowsocks with shadow-tls and udp-over-tcp', async () => {
        const line =
            'SS-STLS = ss, ss.example.com, 443, encrypt-method=aes-128-gcm, password="pwd", shadow-tls-password=stls-pwd, shadow-tls-sni=www.bing.com, shadow-tls-version=3, udp-port=8443, udp-relay=true, interface=en0';
        const node = parseSurge(line);
        expect(node).not.toBeNull();
        expect(node!.plugin).toBe('shadow-tls');
        expect(node!['plugin-opts']).toEqual({
            password: 'stls-pwd',
            host: 'www.bing.com',
            version: 3
        });
        expect(node!['udp-port']).toBe(8443);
        expect(node!['interface-name']).toBe('en0');

        const out = await convert([node!], 'Surge');
        expect(out).toContain('shadow-tls-password=stls-pwd');
        expect(out).toContain('shadow-tls-sni=www.bing.com');
        expect(out).toContain('shadow-tls-version=3');
        expect(out).toContain('udp-port=8443');
        expect(out).toContain('interface=en0');
    });

    it('should parse and convert VMess with ws-http-upgrade=true (httpupgrade) and ech-config', async () => {
        const line =
            'VM-HU = vmess, vm.example.com, 443, username=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11, ws=true, ws-http-upgrade=true, ws-path=/hu, ws-headers=Host:"cdn.example.com", tls=true, sni=vm.example.com, client-fingerprint=apple-26, ech-config=AEj+DQBEAQAgAC==';
        const node = parseSurge(line);
        expect(node).not.toBeNull();
        expect(node!.network).toBe('httpupgrade');
        expect(node!['httpupgrade-opts']?.path).toBe('/hu');
        expect(node!['client-fingerprint']).toBe('apple-26');
        expect((node!['ech-opts'] as any)?.['config-list']).toEqual(['AEj+DQBEAQAgAC==']);

        const out = await convert([node!], 'Surge');
        expect(out).toContain('ws=true,ws-http-upgrade=true');
        expect(out).toContain('ws-path=/hu');
        expect(out).toContain('client-fingerprint=apple-26');
        expect(out).toContain('ech-config=AEj+DQBEAQAgAC==');
    });

    it('should parse and convert Snell v6 with quic-proxy-mode, userkey, and obfs-uri', async () => {
        const line =
            'Snell-v6 = snell, snell.example.com, 6161, psk=mypsk, version=6, mode=unshaped, quic-proxy-mode=true, userkey=uk123, obfs=http, obfs-host=bing.com, obfs-uri=/test, reuse=true';
        const node = parseSurge(line);
        expect(node).not.toBeNull();
        expect(node!.version).toBe(6);
        expect(node!.mode).toBe('unshaped');
        expect(node!['quic-proxy-mode']).toBe(true);
        expect(node!.userkey).toBe('uk123');
        expect(node!['obfs-opts']).toEqual({ mode: 'http', host: 'bing.com', path: '/test' });

        const out = await convert([node!], 'Surge');
        expect(out).toContain('version=6,mode=unshaped,quic-proxy-mode=true,userkey=uk123');
        expect(out).toContain('obfs=http,obfs-host=bing.com,obfs-uri=/test');
        expect(out).toContain('reuse=true');
    });

    it('should parse and convert TUIC v5, Hysteria2 with upload-bandwidth, and AnyTLS with idle-session-check-interval', async () => {
        const tuicLine =
            'TUIC5 = tuic-v5, tuic.example.com, 443, uuid=u1, password="p1", congestion-controller=bbr, udp-relay-mode=native, reduce-rtt=true, disable-sni=true, sni=tuic.example.com';
        const tuicNode = parseSurge(tuicLine);
        expect(tuicNode!['congestion-controller']).toBe('bbr');
        expect(tuicNode!['udp-relay-mode']).toBe('native');
        expect(tuicNode!['reduce-rtt']).toBe(true);
        expect(tuicNode!['disable-sni']).toBe(true);

        const tuicOut = await convert([tuicNode!], 'Surge');
        expect(tuicOut).toContain('congestion-controller=bbr,udp-relay-mode=native,reduce-rtt=true,disable-sni=true');

        const hy2Line =
            'Hy2 = hysteria2, hy2.example.com, 443, password="p2", upload-bandwidth=50, download-bandwidth=200, port-hopping="2000;5000-6000", port-hopping-interval=30, gecko-password="gpass"';
        const hy2Node = parseSurge(hy2Line);
        expect(hy2Node!.up).toBe('50');
        expect(hy2Node!.down).toBe('200');
        expect(hy2Node!.obfs).toBe('gecko');

        const hy2Out = await convert([hy2Node!], 'Surge');
        expect(hy2Out).toContain('upload-bandwidth=50,download-bandwidth=200');
        expect(hy2Out).toContain('gecko-password="gpass"');

        const anytlsLine =
            'AnyTLS = anytls, any.example.com, 443, password="apass", idle-session-check-interval=30, idle-session-timeout=60, max-stream-count=10, reuse=true';
        const anytlsNode = parseSurge(anytlsLine);
        expect(anytlsNode!['idle-session-check-interval']).toBe(30);
        const anytlsOut = await convert([anytlsNode!], 'Surge');
        expect(anytlsOut).toContain('idle-session-check-interval=30,idle-session-timeout=60,max-stream-count=10');

        const vlessReality = parseSurge(
            'VL-R = vless, vl.example.com, 443, username=u1, reality-public-key=pk1, reality-short-id=sid1, sni=www.apple.com, client-fingerprint=apple-26, block-quic=adaptive'
        );
        expect(vlessReality!['client-fingerprint']).toBe('apple-26');
        expect(vlessReality!['block-quic']).toBe('adaptive');
        const vlessOut = await convert([vlessReality!], 'Surge');
        expect(vlessOut).toContain('client-fingerprint=apple-26');
        expect(vlessOut).toContain('block-quic=adaptive');
    });
});

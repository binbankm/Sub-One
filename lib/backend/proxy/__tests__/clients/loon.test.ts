import { describe, expect, it } from 'vitest';
import { convert, parse } from '../../index';
import { parseLoon } from '../../parser/loon-parser';

describe('Loon Official Spec Full Coverage (parse <-> convert)', () => {
    it('should parse and convert Snell v5/v6 with positional PSK and obfs-uri', async () => {
        const line = 'Snell-v5 = Snell, snell.example.com, 6161, "my-psk", version=5, obfs=http, obfs-host=bing.com, obfs-uri=/test, reuse=true, udp=true';
        const node = parseLoon(line);
        expect(node).not.toBeNull();
        expect(node!.type).toBe('snell');
        expect(node!.psk).toBe('my-psk');
        expect(node!.version).toBe(5);
        expect(node!['obfs-opts']).toEqual({ mode: 'http', host: 'bing.com', path: '/test' });

        const out = await convert([node!], 'Loon');
        expect(out).toContain('Snell-v5=snell,snell.example.com,6161,psk="my-psk",version=5');
        expect(out).toContain('obfs=http,obfs-host=bing.com,obfs-uri=/test');
        expect(out).toContain('reuse=true');
        expect(out).toContain('udp=true');
    });

    it('should parse and convert Hysteria2 with upload/download bandwidth, server-ports, hop-interval, salamander, and tls-pubkey-sha256', async () => {
        const line =
            'Hy2 = Hysteria2, hy2.example.com, 443, "pass123", tls-name=hy2.example.com, skip-cert-verify=false, alpn="h3", salamander-password="obfs", server-ports="20000:20100", hop-interval=30, upload-bandwidth=50, download-bandwidth=200, tls-pubkey-sha256=abc123, udp=true';
        const nodes = parse(line);
        expect(nodes).toHaveLength(1);
        expect(nodes[0].up).toBe('50');
        expect(nodes[0].down).toBe('200');
        expect(nodes[0]['tls-pubkey-sha256']).toBe('abc123');

        const out = await convert(nodes, 'Loon');
        expect(out).toContain('upload-bandwidth=50');
        expect(out).toContain('download-bandwidth=200');
        expect(out).toContain('tls-pubkey-sha256=abc123');
        expect(out).toContain('server-ports="20000:20100"');
        expect(out).toContain('hop-interval=30');
    });

    it('should convert VMess with tls-profile, alpn, tls-cert-sha256, tls-pubkey-sha256, and underlying-proxy', async () => {
        const out = await convert(
            [
                {
                    id: 'vm-1',
                    type: 'vmess',
                    name: 'VMess-TLS',
                    server: 'vm.example.com',
                    port: 443,
                    uuid: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
                    cipher: 'auto',
                    tls: true,
                    sni: 'vm.example.com',
                    alpn: ['h2', 'http/1.1'],
                    'client-fingerprint': 'chrome',
                    'tls-fingerprint': 'sha256-cert',
                    'tls-pubkey-sha256': 'sha256-pub',
                    'underlying-proxy': 'Relay',
                    'server-dns': '223.5.5.5,https://dns.example.com/dns-query' as any
                }
            ],
            'Loon'
        );
        expect(out).toContain('tls-cert-sha256=sha256-cert');
        expect(out).toContain('tls-pubkey-sha256=sha256-pub');
        expect(out).toContain('tls-profile=chrome');
        expect(out).toContain('alpn="h2,http/1.1"');
        expect(out).toContain('underlying-proxy=Relay');
        expect(out).toContain('server-dns="223.5.5.5,https://dns.example.com/dns-query"');
    });

    it('should round-trip VLESS XHTTP + Reality + tls-profile + gRPC service-name', async () => {
        const xhttpLine =
            'VLESS-XHTTP = VLESS, vless.example.com, 443, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", transport=xhttp, path=/xh, host=cdn.example.com, xhttp-mode=packet-up, over-tls=true, sni=www.apple.com, public-key="pbk123", short-id=sid1, tls-profile=safari-ios-26, udp=true';
        const parsedXhttp = parse(xhttpLine);
        expect(parsedXhttp).toHaveLength(1);
        expect(parsedXhttp[0].network).toBe('xhttp');
        expect(parsedXhttp[0]['xhttp-opts']?.mode).toBe('packet-up');
        expect(parsedXhttp[0]['reality-opts']?.['support-x25519mlkem768']).toBe(true);

        const outXhttp = await convert(parsedXhttp, 'Loon');
        expect(outXhttp).toContain('transport=xhttp,path=/xh,host=cdn.example.com,xhttp-mode=packet-up');
        expect(outXhttp).toContain('tls-profile=safari-ios-26');

        const grpcLine =
            'VLESS-gRPC = VLESS, grpc.example.com, 443, "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11", transport=grpc, path=my-svc, over-tls=true, sni=grpc.example.com';
        const parsedGrpc = parse(grpcLine);
        expect(parsedGrpc[0]['grpc-opts']?.['service-name']).toBe('my-svc');
    });

    it('should parse and convert Mieru, VLESS Encryption + XHTTP XMUX, and direct/reject', async () => {
        const mieruLine = 'Mieru-TCP = mieru, mieru.example.com, 8443, "alice", "your-password", udp=true';
        const mieruNodes = parseLoon(mieruLine);
        expect(mieruNodes).not.toBeNull();
        expect(mieruNodes!.type).toBe('mieru');
        expect(mieruNodes!.username).toBe('alice');
        expect(mieruNodes!.password).toBe('your-password');
        expect(mieruNodes!.udp).toBe(true);

        const mieruOut = await convert([mieruNodes!], 'Loon');
        expect(mieruOut).toBe('Mieru-TCP=mieru,mieru.example.com,8443,"alice","your-password",udp=true');

        const encXhttpLine =
            'VLESS-Encrypted-XHTTP = VLESS, vless.example.com, 443, "52396e06-041a-4cc2-be5c-8525eb457809", transport=xhttp, path=/xhttp, host=vless.example.com, alpn=h2, xhttp-mode=stream-one, xhttp-xmux-max-connections=1, xhttp-xmux-max-concurrency=4, over-tls=true, sni=www.example.com, public-key="LgJ9bNTyUqBLFkDA12-QgEL7c1yQ1ztk-V1Q-3OLXSk", short-id=164168844958a16d, encryption-mode=native, encryption-rtt=0rtt, encryption-public-keys="MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY", flow=xtls-rprx-vision, udp=true';
        const encNode = parseLoon(encXhttpLine);
        expect(encNode).not.toBeNull();
        expect(encNode!.encryption).toBe(
            'mlkem768x25519plus.native.0rtt.MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY'
        );
        expect((encNode!['xhttp-opts'] as any)?.xmux).toEqual({
            'max-connections': 1,
            'max-concurrency': 4
        });

        const encOut = await convert([encNode!], 'Loon');
        expect(encOut).toContain('encryption-mode=native');
        expect(encOut).toContain('encryption-rtt=0rtt');
        expect(encOut).toContain('encryption-public-keys="MDEyMzQ1Njc4OWFiY2RlZjAxMjM0NTY3ODlhYmNkZWY"');
        expect(encOut).toContain('xhttp-xmux-max-connections=1');
        expect(encOut).toContain('xhttp-xmux-max-concurrency=4');
        expect(encOut).toContain('flow=xtls-rprx-vision');

        const directReject = await convert(
            [
                { id: 'd1', type: 'direct', name: 'DIRECT', server: '127.0.0.1', port: 0 },
                { id: 'r1', type: 'reject', name: 'REJECT', server: '127.0.0.1', port: 0 }
            ],
            'Loon'
        );
        expect(directReject).toBe('DIRECT=direct\nREJECT=reject');
    });
});

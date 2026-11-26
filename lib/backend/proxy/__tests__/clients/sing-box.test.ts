import { describe, expect, it } from 'vitest';

import { SingboxConverter } from '../../converter/singbox';
import { parseSingbox } from '../../parser/singbox-parser';
import type { ProxyNode } from '../../types';

const makeNode = (
    partial: Partial<ProxyNode> & Pick<ProxyNode, 'name' | 'type' | 'server' | 'port'>
): ProxyNode => ({
    ...partial,
    id: partial.id ?? partial.name
});

describe('SingboxConverter & parseSingbox', () => {
    const converter = new SingboxConverter();

    it('should convert and round-trip SS with flat shadow-tls and v2ray-plugin', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'ss-stls',
                type: 'ss',
                server: '1.2.3.4',
                port: 443,
                cipher: '2022-blake3-aes-128-gcm',
                password: 'ss-pw',
                'shadow-tls-password': 'stls-pw',
                'shadow-tls-sni': 'www.apple.com',
                'shadow-tls-version': 3
            }),
            makeNode({
                name: 'ss-v2ray',
                type: 'ss',
                server: '5.6.7.8',
                port: 443,
                cipher: 'aes-128-gcm',
                password: 'pw',
                plugin: 'v2ray-plugin',
                'plugin-opts': {
                    mode: 'websocket',
                    host: 'cdn.example.com',
                    path: '/ws',
                    tls: true
                }
            })
        ];

        const json = await converter.convert(nodes);
        const parsedJson = JSON.parse(json);
        expect(parsedJson.outbounds).toHaveLength(3);
        expect(parsedJson.outbounds[0].detour).toBe('ss-stls_shadowtls');
        expect(parsedJson.outbounds[1].type).toBe('shadowtls');
        expect(parsedJson.outbounds[2].plugin).toBe('v2ray-plugin');
        expect(parsedJson.outbounds[2].plugin_opts).toBe('mode=websocket;host=cdn.example.com;path=/ws;tls');

        const reparsed = parseSingbox(json);
        expect(reparsed).toHaveLength(2);
        expect(reparsed[0].plugin).toBe('shadow-tls');
        expect(reparsed[0]['plugin-opts']).toEqual({
            host: 'www.apple.com',
            password: 'stls-pw',
            version: 3
        });
        expect(reparsed[0]['dialer-proxy']).toBeUndefined();
    });

    it('should handle AnyTLS session durations, padding_scheme, TLS fragment, and multiplex', async () => {
        const nodes: ProxyNode[] = [
            makeNode({
                name: 'anytls-full',
                type: 'anytls',
                server: 'any.example.com',
                port: 443,
                password: 'pw',
                'idle-session-check-interval': '30s' as any,
                'idle-session-timeout': 60,
                'min-idle-session': 2,
                'padding-scheme': ['stop=8', '0=30-30'],
                'tls-fragment': true,
                'tls-fragment-fallback-delay': '500ms',
                'record-fragment': true,
                'domain-strategy': 'prefer_ipv4',
                'tcp-multi-path': true,
                'interface-name': 'en0'
            }),
            makeNode({
                name: 'vless-mux',
                type: 'vless',
                server: 'vless.example.com',
                port: 443,
                uuid: '11111111-1111-1111-1111-111111111111',
                tls: true,
                smux: {
                    enabled: true,
                    protocol: 'h2mux',
                    'max-connections': 4,
                    padding: true
                }
            })
        ];

        const json = await converter.convert(nodes);
        const parsedJson = JSON.parse(json);
        const [anytlsOut, vlessOut] = parsedJson.outbounds;

        expect(anytlsOut.idle_session_check_interval).toBe('30s');
        expect(anytlsOut.idle_session_timeout).toBe('60s');
        expect(anytlsOut.min_idle_session).toBe(2);
        expect(anytlsOut.padding_scheme).toEqual(['stop=8', '0=30-30']);
        expect(anytlsOut.tls.fragment).toBe(true);
        expect(anytlsOut.tls.fragment_fallback_delay).toBe('500ms');
        expect(anytlsOut.tls.record_fragment).toBe(true);
        expect(anytlsOut.domain_strategy).toBe('prefer_ipv4');
        expect(anytlsOut.tcp_multi_path).toBe(true);
        expect(anytlsOut.bind_interface).toBe('en0');

        expect(vlessOut.multiplex).toEqual({
            enabled: true,
            protocol: 'h2mux',
            max_connections: 4,
            padding: true
        });

        const reparsed = parseSingbox(json);
        expect(reparsed).toHaveLength(2);
        expect(reparsed[0]['padding-scheme']).toEqual(['stop=8', '0=30-30']);
        expect(reparsed[0]['tls-fragment']).toBe(true);
        expect(reparsed[0]['record-fragment']).toBe(true);
        expect(reparsed[0]['domain-strategy']).toBe('prefer_ipv4');
        expect(reparsed[0]['tcp-multi-path']).toBe(true);
        expect(reparsed[0]['interface-name']).toBe('en0');
        expect(reparsed[1].smux).toEqual({
            enabled: true,
            protocol: 'h2mux',
            'max-connections': 4,
            padding: true
        });
    });

    it('should parse sing-box 1.11+ WireGuard endpoints and Hysteria/Hysteria2/TUIC', async () => {
        const config = JSON.stringify({
            endpoints: [
                {
                    type: 'wireguard',
                    tag: 'wg-ep',
                    address: ['10.0.0.2/32', 'fd00::2/128'],
                    private_key: 'priv-key',
                    mtu: 1420,
                    peers: [
                        {
                            address: 'wg.example.com',
                            port: 51820,
                            public_key: 'pub-key',
                            allowed_ips: ['0.0.0.0/0', '::/0']
                        }
                    ]
                }
            ],
            outbounds: [
                {
                    type: 'hysteria',
                    tag: 'hy1',
                    server: 'hy1.example.com',
                    server_port: 443,
                    auth_str: 'secret',
                    server_ports: ['20000:30000'],
                    hop_interval: '30s',
                    tls: { enabled: true, alpn: ['hysteria'] }
                },
                {
                    type: 'tuic',
                    tag: 'tuic1',
                    server: 'tuic.example.com',
                    server_port: 443,
                    uuid: '22222222-2222-2222-2222-222222222222',
                    password: 'tpw',
                    congestion_control: 'bbr',
                    udp_relay_mode: 'quic',
                    zero_rtt_handshake: true,
                    tls: { enabled: true, alpn: ['h3'] }
                }
            ]
        });

        const nodes = parseSingbox(config);
        expect(nodes).toHaveLength(3);
        expect(nodes[0].type).toBe('hysteria');
        expect(nodes[0].ports).toBe('20000-30000');
        expect(nodes[0]['hop-interval']).toBe('30s');

        expect(nodes[1].type).toBe('tuic');
        expect(nodes[1]['congestion-controller']).toBe('bbr');
        expect(nodes[1]['udp-relay-mode']).toBe('quic');
        expect(nodes[1]['reduce-rtt']).toBe(true);

        expect(nodes[2].type).toBe('wireguard');
        expect(nodes[2].ip).toBe('10.0.0.2/32');
        expect(nodes[2].ipv6).toBe('fd00::2/128');
        expect(nodes[2].peers?.[0].server).toBe('wg.example.com');
    });
});

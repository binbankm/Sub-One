import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';
import { convert } from '../converter';
import { parseNodeURI } from '../parser/uri-parsers';
import { parse } from '../index';
import type { ProxyNode } from '../types';

describe('Proxy Protocol Enhancements and Verifications', () => {
    // =========================================================================
    // 1. Singbox Converter: Protocols & Modern Transports
    // =========================================================================
    describe('1. Singbox Converter (1.8+ / 1.10+ schema)', () => {
        it('1.1 WireGuard: should parse string reserved into number array and map local_address', async () => {
            const node: ProxyNode = {
                id: 'wg-1',
                type: 'wireguard',
                name: 'WG-Test',
                server: '1.2.3.4',
                port: 51820,
                'private-key': 'privKey==',
                'public-key': 'pubKey==',
                ip: '10.0.0.2',
                ipv6: 'fc00::2',
                mtu: 1420,
                reserved: '1, 2, 3'
            };

            const jsonStr = await convert([node], 'singbox');
            const parsed = JSON.parse(jsonStr);
            const outbound = parsed.outbounds[0];

            expect(outbound.type).toBe('wireguard');
            expect(outbound.server).toBe('1.2.3.4');
            expect(outbound.server_port).toBe(51820);
            expect(outbound.local_address).toEqual(['10.0.0.2/32', 'fc00::2/128']);
            expect(outbound.private_key).toBe('privKey==');
            expect(outbound.peer_public_key).toBe('pubKey==');
            expect(outbound.reserved).toEqual([1, 2, 3]);
            expect(outbound.mtu).toBe(1420);
        });

        it('1.2 WireGuard: should map peers structure with peer reserved as numbers', async () => {
            const node: ProxyNode = {
                id: 'wg-peers',
                type: 'wireguard',
                name: 'WG-MultiPeer',
                server: '1.2.3.4',
                port: 51820,
                'private-key': 'privKey==',
                ip: '10.0.0.2',
                peers: [
                    {
                        server: '5.6.7.8',
                        port: 51821,
                        'public-key': 'pubKey2==',
                        'pre-shared-key': 'pskKey==',
                        reserved: '4,5,6',
                        'allowed-ips': ['0.0.0.0/0']
                    }
                ]
            };

            const jsonStr = await convert([node], 'singbox');
            const outbound = JSON.parse(jsonStr).outbounds[0];

            expect(outbound.peers).toHaveLength(1);
            expect(outbound.peers[0].server).toBe('5.6.7.8');
            expect(outbound.peers[0].server_port).toBe(51821);
            expect(outbound.peers[0].public_key).toBe('pubKey2==');
            expect(outbound.peers[0].pre_shared_key).toBe('pskKey==');
            expect(outbound.peers[0].reserved).toEqual([4, 5, 6]);
            expect(outbound.peers[0].allowed_ips).toEqual(['0.0.0.0/0']);
        });

        it('1.3 Snell: should map snell outbound with psk, version and obfs', async () => {
            const node: ProxyNode = {
                id: 'snell-1',
                type: 'snell',
                name: 'Snell-Node',
                server: 'snell.example.com',
                port: 8388,
                password: 'secretPassword',
                version: 4,
                obfs: 'http',
                'obfs-host': 'obfs.example.com'
            };

            const jsonStr = await convert([node], 'singbox');
            const outbound = JSON.parse(jsonStr).outbounds[0];

            expect(outbound.type).toBe('snell');
            expect(outbound.tag).toBe('Snell-Node');
            expect(outbound.server).toBe('snell.example.com');
            expect(outbound.server_port).toBe(8388);
            expect(outbound.psk).toBe('secretPassword');
            expect(outbound.version).toBe(4);
            expect(outbound.obfs_mode).toBe('http');
            expect(outbound.obfs_host).toBe('obfs.example.com');
        });

        it('1.4 Hysteria 2: should map obfs salamander with password and up/down bandwidth', async () => {
            const node: ProxyNode = {
                id: 'hy2-1',
                type: 'hysteria2',
                name: 'Hy2-Node',
                server: 'hy2.example.com',
                port: 443,
                password: 'hy2password',
                obfs: 'salamander',
                'obfs-password': 'salamander-secret',
                up: '50 Mbps',
                down: '100 Mbps',
                ports: '20000-30000',
                'hop-interval': 30
            };

            const jsonStr = await convert([node], 'singbox');
            const outbound = JSON.parse(jsonStr).outbounds[0];

            expect(outbound.type).toBe('hysteria2');
            expect(outbound.password).toBe('hy2password');
            expect(outbound.obfs).toEqual({
                type: 'salamander',
                password: 'salamander-secret'
            });
            expect(outbound.up_mbps).toBe(50);
            expect(outbound.down_mbps).toBe(100);
            expect(outbound.server_ports).toEqual(['20000:30000']);
            expect(outbound.hop_interval).toBe('30s');
        });

        it('1.5 TUIC: should map token as password fallback, udp_over_stream, and heartbeat', async () => {
            const node: ProxyNode = {
                id: 'tuic-1',
                type: 'tuic',
                name: 'TUIC-Node',
                server: 'tuic.example.com',
                port: 8443,
                uuid: 'uuid-1234',
                token: 'token-pass',
                'congestion-controller': 'bbr',
                'udp-relay-mode': 'quic',
                'reduce-rtt': true,
                'heartbeat-interval': 10000,
                'udp-over-stream': true
            };

            const jsonStr = await convert([node], 'singbox');
            const outbound = JSON.parse(jsonStr).outbounds[0];

            expect(outbound.type).toBe('tuic');
            expect(outbound.uuid).toBe('uuid-1234');
            expect(outbound.password).toBe('token-pass');
            expect(outbound.congestion_control).toBe('bbr');
            expect(outbound.udp_relay_mode).toBe('quic');
            expect(outbound.zero_rtt_handshake).toBe(true);
            expect(outbound.heartbeat).toBe('10000ms');
            expect(outbound.udp_over_stream).toBe(true);
        });

        it('1.6 Transports: HTTPUpgrade transport should map properly in Singbox', async () => {
            const node: ProxyNode = {
                id: 'vless-hu',
                type: 'vless',
                name: 'VLESS-HTTPUpgrade',
                server: 'cdn.example.com',
                port: 443,
                uuid: 'uuid-hu',
                network: 'httpupgrade',
                tls: true,
                sni: 'cdn.example.com',
                'ws-path': '/upgrade-path',
                'ws-headers': { Host: 'cdn.example.com' }
            };

            const jsonStr = await convert([node], 'singbox');
            const outbound = JSON.parse(jsonStr).outbounds[0];

            expect(outbound.type).toBe('vless');
            expect(outbound.transport).toEqual({
                type: 'httpupgrade',
                path: '/upgrade-path',
                host: 'cdn.example.com'
            });
        });

        it('1.7 Transports: mKCP (kcp) and QUIC transports in Singbox', async () => {
            const kcpNode: ProxyNode = {
                id: 'vmess-kcp',
                type: 'vmess',
                name: 'VMess-KCP',
                server: 'kcp.example.com',
                port: 443,
                uuid: 'uuid-kcp',
                network: 'kcp',
                headerType: 'wechat-video'
            };

            const kcpOut = JSON.parse(await convert([kcpNode], 'singbox')).outbounds[0];
            expect(kcpOut.transport).toEqual({
                type: 'mkcp',
                header: { type: 'wechat-video' }
            });

            const quicNode: ProxyNode = {
                id: 'vmess-quic',
                type: 'vmess',
                name: 'VMess-QUIC',
                server: 'quic.example.com',
                port: 443,
                uuid: 'uuid-quic',
                network: 'quic'
            };

            const quicOut = JSON.parse(await convert([quicNode], 'singbox')).outbounds[0];
            expect(quicOut.transport).toEqual({
                type: 'quic'
            });
        });
    });

    // =========================================================================
    // 2. Clash Meta / Mihomo Converter
    // =========================================================================
    describe('2. Clash Meta / Mihomo Converter', () => {
        it('2.1 Reality: should preserve spider-x field in reality-opts', async () => {
            const node: ProxyNode = {
                id: 'vless-r',
                type: 'vless',
                name: 'VLESS-Reality-SpiderX',
                server: 'reality.example.com',
                port: 443,
                uuid: 'uuid-reality',
                tls: true,
                sni: 'www.microsoft.com',
                'reality-opts': {
                    'public-key': 'pubkey123',
                    'short-id': 'shortid123',
                    'spider-x': '/test-path'
                }
            };

            const yamlStr = await convert([node], 'clashmeta');
            const doc = yaml.load(yamlStr) as any;
            const proxy = doc.proxies[0];

            expect(proxy['reality-opts']['public-key']).toBe('pubkey123');
            expect(proxy['reality-opts']['short-id']).toBe('shortid123');
            expect(proxy['reality-opts']['spider-x']).toBe('/test-path');
        });

        it('2.2 Trojan with Reality: should preserve reality-opts in Clash Meta', async () => {
            const node: ProxyNode = {
                id: 'trojan-r',
                type: 'trojan',
                name: 'Trojan-Reality',
                server: 'trojan.example.com',
                port: 443,
                password: 'trojanpassword',
                tls: true,
                sni: 'www.apple.com',
                'reality-opts': {
                    'public-key': 'pbk123',
                    'short-id': 'sid123',
                    'spider-x': '/download'
                }
            };

            const yamlStr = await convert([node], 'clashmeta');
            const doc = yaml.load(yamlStr) as any;
            const proxy = doc.proxies[0];

            expect(proxy.type).toBe('trojan');
            expect(proxy['reality-opts']).toBeDefined();
            expect(proxy['reality-opts']['public-key']).toBe('pbk123');
            expect(proxy['reality-opts']['short-id']).toBe('sid123');
            expect(proxy['reality-opts']['spider-x']).toBe('/download');
        });

        it('2.3 WireGuard: should parse reserved string to integer array, set mtu and udp: true', async () => {
            const node: ProxyNode = {
                id: 'wg-cm',
                type: 'wireguard',
                name: 'WG-ClashMeta',
                server: '1.2.3.4',
                port: 51820,
                'private-key': 'privKey==',
                'public-key': 'pubKey==',
                ip: '10.0.0.1',
                mtu: 1280,
                reserved: '10, 20, 30'
            };

            const yamlStr = await convert([node], 'clashmeta');
            const doc = yaml.load(yamlStr) as any;
            const proxy = doc.proxies[0];

            expect(proxy.type).toBe('wireguard');
            expect(proxy.reserved).toEqual([10, 20, 30]);
            expect(proxy.mtu).toBe(1280);
            expect(proxy.udp).toBe(true);
        });

        it('2.4 HTTPS proxy: should map to type http with tls: true in Clash Meta', async () => {
            const node: ProxyNode = {
                id: 'https-1',
                type: 'https',
                name: 'HTTPS-Node',
                server: 'secure.proxy.com',
                port: 8443,
                username: 'user1',
                password: 'pass1'
            };

            const yamlStr = await convert([node], 'clashmeta');
            const doc = yaml.load(yamlStr) as any;
            const proxy = doc.proxies[0];

            expect(proxy.type).toBe('http');
            expect(proxy.tls).toBe(true);
            expect(proxy.username).toBe('user1');
            expect(proxy.password).toBe('pass1');
        });

        it('2.5 AnyTLS: should export session parameters in Clash Meta YAML', async () => {
            const node: ProxyNode = {
                id: 'anytls-cm',
                type: 'anytls',
                name: 'AnyTLS-CM',
                server: 'anytls.example.com',
                port: 443,
                password: 'anytlspassword',
                sni: 'anytls.example.com',
                'idle-session-check-interval': 15,
                'idle-session-timeout': 30,
                'min-idle-session': 2
            };

            const yamlStr = await convert([node], 'clashmeta');
            const doc = yaml.load(yamlStr) as any;
            const proxy = doc.proxies[0];

            expect(proxy.type).toBe('anytls');
            expect(proxy.servername).toBe('anytls.example.com');
            expect(proxy['idle-session-check-interval']).toBe(15);
            expect(proxy['idle-session-timeout']).toBe(30);
            expect(proxy['min-idle-session']).toBe(2);
        });
    });

    // =========================================================================
    // 3. Surge Converter
    // =========================================================================
    describe('3. Surge Converter', () => {
        it('3.1 Hysteria 2: should export salamander-password and gecko-password correctly', async () => {
            const hy2Salamander: ProxyNode = {
                id: 'hy2-salamander',
                type: 'hysteria2',
                name: 'Hy2-Salamander',
                server: 'hy2.example.com',
                port: 443,
                password: 'pwd',
                obfs: 'salamander',
                'obfs-password': 'salamander-secret',
                'down-mbps': 200,
                ports: '5000-6000',
                'hop-interval': 45
            };

            const surgeSal = await convert([hy2Salamander], 'surge');
            expect(surgeSal).toContain('hysteria2,hy2.example.com,443');
            expect(surgeSal).toContain('password="pwd"');
            expect(surgeSal).toContain('salamander-password="salamander-secret"');
            expect(surgeSal).toContain('download-bandwidth=200');
            expect(surgeSal).toContain('port-hopping="5000-6000"');
            expect(surgeSal).toContain('port-hopping-interval=45');

            const hy2Gecko: ProxyNode = {
                id: 'hy2-gecko',
                type: 'hysteria2',
                name: 'Hy2-Gecko',
                server: 'hy2.example.com',
                port: 443,
                password: 'pwd',
                obfs: 'gecko',
                'obfs-password': 'gecko-secret'
            };

            const surgeGecko = await convert([hy2Gecko], 'surge');
            expect(surgeGecko).toContain('gecko-password="gecko-secret"');
            expect(surgeGecko).not.toContain('salamander-password');
        });

        it('3.2 TUIC v5: should export tuic-v5 without tls=true flag and include port-hopping-interval', async () => {
            const tuicNode: ProxyNode = {
                id: 'tuic-surge',
                type: 'tuic',
                name: 'TUIC-Surge',
                server: 'tuic.example.com',
                port: 8443,
                uuid: 'uuid-1234',
                password: 'tuicpass',
                sni: 'sni.tuic.com',
                alpn: ['h3'],
                ports: '4000-5000',
                'hop-interval': 25,
                'skip-cert-verify': true
            };

            const surgeTuic = await convert([tuicNode], 'surge');
            expect(surgeTuic).toContain('tuic-v5,tuic.example.com,8443');
            expect(surgeTuic).toContain('uuid=uuid-1234');
            expect(surgeTuic).toContain('password="tuicpass"');
            expect(surgeTuic).toContain('alpn=h3');
            expect(surgeTuic).toContain('port-hopping="4000-5000"');
            expect(surgeTuic).toContain('port-hopping-interval=25');
            expect(surgeTuic).toContain('sni=sni.tuic.com');
            expect(surgeTuic).toContain('skip-cert-verify=true');
            // Surge tuic-v5 does not use tls=true
            expect(surgeTuic).not.toContain('tls=true');
        });

        it('3.3 Shadowsocks with v2ray-plugin: should convert to ws=true in Surge', async () => {
            const ssNode: ProxyNode = {
                id: 'ss-v2ray',
                type: 'ss',
                name: 'SS-V2RayPlugin',
                server: 'ss.example.com',
                port: 443,
                cipher: 'aes-128-gcm',
                password: 'sspassword',
                plugin: 'v2ray-plugin',
                'plugin-opts': {
                    mode: 'websocket',
                    host: 'cdn.example.com',
                    path: '/v2ray-ws',
                    tls: true
                }
            };

            const surgeSS = await convert([ssNode], 'surge');
            expect(surgeSS).toContain('ss,ss.example.com,443');
            expect(surgeSS).toContain('encrypt-method=aes-128-gcm');
            expect(surgeSS).toContain('ws=true');
            expect(surgeSS).toContain('ws-path=/v2ray-ws');
            expect(surgeSS).toContain('ws-headers=Host:"cdn.example.com"');
            expect(surgeSS).toContain('tls=true');
            expect(surgeSS).toContain('sni=cdn.example.com');
        });

        it('3.4 AnyTLS: should support alpn and sni in Surge', async () => {
            const anytlsNode: ProxyNode = {
                id: 'anytls-surge',
                type: 'anytls',
                name: 'AnyTLS-Surge',
                server: 'anytls.example.com',
                port: 443,
                password: 'anytlspassword',
                sni: 'sni.anytls.com',
                alpn: ['h2', 'http/1.1']
            };

            const surgeAnytls = await convert([anytlsNode], 'surge');
            expect(surgeAnytls).toContain('anytls,anytls.example.com,443');
            expect(surgeAnytls).toContain('password="anytlspassword"');
            expect(surgeAnytls).toContain('sni=sni.anytls.com');
            expect(surgeAnytls).toContain('alpn=h2');
        });
    });

    // =========================================================================
    // 4. Loon Converter
    // =========================================================================
    describe('4. Loon Converter', () => {
        it('4.1 Hysteria 2: should export salamander-password and alpn in Loon', async () => {
            const hy2Node: ProxyNode = {
                id: 'hy2-loon',
                type: 'hysteria2',
                name: 'Hy2-Loon',
                server: 'hy2.example.com',
                port: 443,
                password: 'loonpassword',
                sni: 'sni.hy2.com',
                obfs: 'salamander',
                'obfs-password': 'loon-salamander',
                alpn: ['h3']
            };

            const loonHy2 = await convert([hy2Node], 'loon');
            expect(loonHy2).toContain('Hysteria2,hy2.example.com,443');
            expect(loonHy2).toContain('"loonpassword"');
            expect(loonHy2).toContain('tls-name=sni.hy2.com');
            expect(loonHy2).toContain('salamander-password=loon-salamander');
            expect(loonHy2).toContain('alpn="h3"');
        });

        it('4.2 WireGuard: should parse peers correctly with reserved array in Loon', async () => {
            const wgNode: ProxyNode = {
                id: 'wg-loon',
                type: 'wireguard',
                name: 'WG-Loon',
                server: 'wg.example.com',
                port: 51820,
                'private-key': 'privKey==',
                ip: '10.0.0.2',
                peers: [
                    {
                        endpoint: 'wg.example.com:51820',
                        'public-key': 'pubKey==',
                        'pre-shared-key': 'pskKey==',
                        reserved: [1, 2, 3],
                        'allowed-ips': ['0.0.0.0/0']
                    }
                ]
            };

            const loonWg = await convert([wgNode], 'loon');
            expect(loonWg).toContain('wireguard');
            expect(loonWg).toContain('interface-ip=10.0.0.2');
            expect(loonWg).toContain('private-key="privKey=="');
            expect(loonWg).toContain('peers=[{');
            expect(loonWg).toContain('public-key="pubKey=="');
            expect(loonWg).toContain('endpoint=wg.example.com:51820');
            expect(loonWg).toContain('reserved=[1,2,3]');
            expect(loonWg).toContain('preshared-key="pskKey=="');
        });

        it('4.3 TUIC: should map sni from servername and fallback password from token', async () => {
            const tuicNode: ProxyNode = {
                id: 'tuic-loon',
                type: 'tuic',
                name: 'TUIC-Loon',
                server: 'tuic.example.com',
                port: 443,
                uuid: 'uuid-tuic',
                token: 'token-pass',
                servername: 'sni.tuic.com'
            };

            const loonTuic = await convert([tuicNode], 'loon');
            expect(loonTuic).toContain('tuic,tuic.example.com,443,"uuid-tuic","token-pass"');
            expect(loonTuic).toContain('sni=sni.tuic.com');
        });
    });

    // =========================================================================
    // 5. Quantumult X Converter
    // =========================================================================
    describe('5. Quantumult X Converter', () => {
        it('5.1 should handle unsupported protocols gracefully without throwing', async () => {
            const hy2Node: ProxyNode = {
                id: 'hy2-qx',
                type: 'hysteria2',
                name: 'Hy2-QX',
                server: 'hy2.example.com',
                port: 443,
                password: 'pass'
            };

            const wgNode: ProxyNode = {
                id: 'wg-qx',
                type: 'wireguard',
                name: 'WG-QX',
                server: 'wg.example.com',
                port: 51820,
                'private-key': 'priv'
            };

            const ssNode: ProxyNode = {
                id: 'ss-qx',
                type: 'ss',
                name: 'SS-QX',
                server: 'ss.example.com',
                port: 8388,
                cipher: 'aes-128-gcm',
                password: 'pass'
            };

            // Should not throw, should omit unsupported ones and convert supported SS
            const result = await convert([hy2Node, ssNode, wgNode], 'qx');
            expect(result).not.toContain('Hy2-QX');
            expect(result).not.toContain('WG-QX');
            expect(result).toContain('shadowsocks=ss.example.com:8388');
            expect(result).toContain('tag=SS-QX');
        });

        it('5.2 HTTPS proxy should have over-tls=true and tls-host from servername', async () => {
            const httpsNode: ProxyNode = {
                id: 'https-qx',
                type: 'https',
                name: 'HTTPS-QX',
                server: 'proxy.example.com',
                port: 443,
                servername: 'sni.example.com'
            };

            const result = await convert([httpsNode], 'qx');
            expect(result).toContain('http=proxy.example.com:443');
            expect(result).toContain('over-tls=true');
            expect(result).toContain('tls-host=sni.example.com');
            expect(result).toContain('tag=HTTPS-QX');
        });
    });

    // =========================================================================
    // 6. URI Serialization & Roundtrip Tests
    // =========================================================================
    describe('6. URI Serialization & URI Parsers Roundtrip', () => {
        it('6.1 Snell: serialize to standard URI and roundtrip through parseSnell', async () => {
            const node: ProxyNode = {
                id: 'snell-uri',
                type: 'snell',
                name: 'Snell-URI',
                server: 'snell.example.com',
                port: 8388,
                password: 'snell-password-123',
                version: 4,
                obfs: 'http',
                'obfs-host': 'host.example.com',
                tfo: true
            };

            const uri = await convert([node], 'uri');
            expect(uri).toContain('snell://snell-password-123@snell.example.com:8388');
            expect(uri).toContain('version=4');
            expect(uri).toContain('obfs=http');
            expect(uri).toContain('host=host.example.com');
            expect(uri).toContain('tfo=1');
            expect(uri).toContain('#Snell-URI');

            const parsed = parseNodeURI(uri);
            expect(parsed).not.toBeNull();
            expect(parsed!.type).toBe('snell');
            expect(parsed!.server).toBe('snell.example.com');
            expect(parsed!.port).toBe(8388);
            expect(parsed!.password).toBe('snell-password-123');
            expect(parsed!.version).toBe(4);
            expect(parsed!.obfs).toBe('http');
            expect(parsed!['obfs-host']).toBe('host.example.com');
            expect(parsed!.tfo).toBe(true);
        });

        it('6.2 WireGuard URI: should preserve reserved, allowed-ips, keepalive and roundtrip', async () => {
            const rawUri =
                'wireguard://privKey123%3D%3D@1.2.3.4:51820?publickey=pubKey456%3D%3D&address=10.0.0.2%2F32&mtu=1420&presharedkey=psk789%3D%3D&reserved=1%2C2%2C3&keepalive=25&allowed=0.0.0.0%2F0&dns=1.1.1.1#WG-Full';

            const parsed = parseNodeURI(rawUri);
            expect(parsed).not.toBeNull();
            expect(parsed!.type).toBe('wireguard');
            expect(parsed!.server).toBe('1.2.3.4');
            expect(parsed!.port).toBe(51820);
            expect(parsed!['private-key']).toBe('privKey123==');
            expect(parsed!['public-key']).toBe('pubKey456==');
            expect(parsed!.ip).toBe('10.0.0.2');
            expect(parsed!.mtu).toBe(1420);
            expect(parsed!['pre-shared-key']).toBe('psk789==');
            expect(parsed!.reserved).toEqual([1, 2, 3]);
            expect(parsed!.keepalive).toBe('25');
            expect(parsed!['allowed-ips']).toEqual(['0.0.0.0/0']);
            expect(parsed!.dns).toBe('1.1.1.1');

            const reEncoded = await convert([parsed!], 'uri');
            expect(reEncoded).toContain('wireguard://privKey123%3D%3D@1.2.3.4:51820');
            expect(reEncoded).toContain('publickey=pubKey456%3D%3D');
            expect(reEncoded).toContain('address=10.0.0.2%2F32');
            expect(reEncoded).toContain('mtu=1420');
            expect(reEncoded).toContain('reserved=1%2C2%2C3');
            expect(reEncoded).toContain('keepalive=25');
        });

        it('6.3 WireGuard URI: should handle base64 reserved and slash reserved', async () => {
            // Base64 [1, 2, 3] is "AQID"
            const b64Uri = 'wireguard://priv@1.2.3.4:51820?publickey=pub&reserved=AQID#WG-B64';
            const parsedB64 = parseNodeURI(b64Uri);
            expect(parsedB64!.reserved).toEqual([1, 2, 3]);

            const slashUri = 'wireguard://priv@1.2.3.4:51820?publickey=pub&reserved=4/5/6#WG-Slash';
            const parsedSlash = parseNodeURI(slashUri);
            expect(parsedSlash!.reserved).toEqual([4, 5, 6]);
        });

        it('6.4 TUIC URI: should preserve congestion-controller, udp-relay-mode, heartbeat and roundtrip', async () => {
            const rawUri =
                'tuic://uuid-tuic:pass-tuic@tuic.example.com:8443?sni=tuic.example.com&alpn=h3&congestion_control=bbr&udp_relay_mode=quic&heartbeat_interval=10000&reduce_rtt=1#TUIC-Full';

            const parsed = parseNodeURI(rawUri);
            expect(parsed).not.toBeNull();
            expect(parsed!.type).toBe('tuic');
            expect(parsed!.uuid).toBe('uuid-tuic');
            expect(parsed!.password).toBe('pass-tuic');
            expect(parsed!['congestion-controller']).toBe('bbr');
            expect(parsed!['udp-relay-mode']).toBe('quic');
            expect(parsed!['heartbeat-interval']).toBe(10000);
            expect(parsed!['reduce-rtt']).toBe(true);

            const reEncoded = await convert([parsed!], 'uri');
            expect(reEncoded).toContain('tuic://uuid-tuic:pass-tuic@tuic.example.com:8443');
            expect(reEncoded).toContain('congestion_control=bbr');
            expect(reEncoded).toContain('udp_relay_mode=quic');
            expect(reEncoded).toContain('heartbeat_interval=10000');
        });

        it('6.5 Hysteria 2 URI: should preserve obfs, obfs-password, pinSHA256, hop-interval and roundtrip', async () => {
            const rawUri =
                'hysteria2://mypassword@hy2.example.com:443?sni=hy2.example.com&obfs=salamander&obfs-password=sec-pass&pinSHA256=pin123456&hop-interval=30&up=50&down=100#Hy2-Full';

            const parsed = parseNodeURI(rawUri);
            expect(parsed).not.toBeNull();
            expect(parsed!.type).toBe('hysteria2');
            expect(parsed!.password).toBe('mypassword');
            expect(parsed!.obfs).toBe('salamander');
            expect(parsed!['obfs-password']).toBe('sec-pass');
            expect(parsed!['tls-fingerprint']).toBe('pin123456');
            expect(parsed!['hop-interval']).toBe('30');
            expect(parsed!.up).toBe(50);
            expect(parsed!.down).toBe(100);

            const reEncoded = await convert([parsed!], 'uri');
            expect(reEncoded).toContain('hysteria2://mypassword@hy2.example.com:443');
            expect(reEncoded).toContain('obfs=salamander');
            expect(reEncoded).toContain('obfs-password=sec-pass');
            expect(reEncoded).toContain('pinSHA256=pin123456');
            expect(reEncoded).toContain('hop-interval=30');
        });

        it('6.6 VMess URI: should support xhttp transport in JSON config', async () => {
            const node: ProxyNode = {
                id: 'vm-xhttp',
                type: 'vmess',
                name: 'VM-XHTTP',
                server: '1.2.3.4',
                port: 443,
                uuid: 'uuid-vm-xhttp',
                network: 'xhttp',
                'xhttp-opts': {
                    path: '/xhttp-path',
                    host: 'xhttp.host.com'
                }
            };

            const uri = await convert([node], 'uri');
            const parsed = parse(uri);
            expect(parsed[0].type).toBe('vmess');
            expect(parsed[0].network).toBe('xhttp');
            expect(parsed[0]['xhttp-opts']?.path).toBe('/xhttp-path');
            expect(parsed[0]['xhttp-opts']?.host).toBe('xhttp.host.com');
        });
    });

    // =========================================================================
    // 7. Processor Rule Matching
    // =========================================================================
    describe('7. Processor Rule Matching with New Protocols', () => {
        it('7.1 should filter nodes by proto: for snell, hysteria, ss, socks5, etc.', async () => {
            const { process } = await import('../processor');
            const nodes: ProxyNode[] = [
                { id: '1', type: 'snell', name: 'Snell1', server: '1.1.1.1', port: 8388 },
                { id: '2', type: 'hysteria', name: 'Hy1', server: '2.2.2.2', port: 443 },
                { id: '3', type: 'ss', name: 'SS1', server: '3.3.3.3', port: 8388 },
                { id: '4', type: 'vmess', name: 'VM1', server: '4.4.4.4', port: 443 }
            ];

            const keepSnell = await process(nodes, { exclude: 'keep:proto:snell' });
            expect(keepSnell).toHaveLength(1);
            expect(keepSnell[0].type).toBe('snell');

            const keepHy = await process(nodes, { exclude: 'keep:proto:hy|hysteria' });
            expect(keepHy).toHaveLength(1);
            expect(keepHy[0].type).toBe('hysteria');

            const keepSS = await process(nodes, { exclude: 'keep:proto:shadowsocks|ss' });
            expect(keepSS).toHaveLength(1);
            expect(keepSS[0].type).toBe('ss');

            const excludeSnell = await process(nodes, { exclude: 'proto:snell' });
            expect(excludeSnell).toHaveLength(3);
            expect(excludeSnell.some((n) => n.type === 'snell')).toBe(false);
        });
    });

    // =========================================================================
    // 8. Critical Bug Fixes & Deep Round-Trip Verifications
    // =========================================================================
    describe('8. Critical Bug Fixes & Deep Round-Trip Verifications', () => {
        it('8.1 WireGuard: bracketed reserved [1, 2, 3] should not drop the first number in Singbox & Clash', async () => {
            const node: ProxyNode = {
                id: 'wg-bracket',
                type: 'wireguard',
                name: 'WG-Bracket',
                server: '1.2.3.4',
                port: 51820,
                'private-key': 'priv==',
                'public-key': 'pub==',
                ip: '10.0.0.2',
                reserved: '[1, 2, 3]' as any
            };

            const sbJson = JSON.parse(await convert([node], 'singbox'));
            expect(sbJson.outbounds[0].reserved).toEqual([1, 2, 3]);

            const clashYaml = yaml.load(await convert([node], 'clash')) as any;
            expect(clashYaml.proxies[0].reserved).toEqual([1, 2, 3]);
        });

        it('8.2 WireGuard: base64 reserved should decode properly into byte numbers', async () => {
            const uri = 'wireguard://privkey@1.2.3.4:51820?publickey=pubkey&ip=10.0.0.2&reserved=AQID#WG-B64';
            const nodes = parse(uri);
            expect(nodes[0].reserved).toEqual([1, 2, 3]);
        });

        it('8.3 Loon WireGuard: should completely preserve reserved, allowed-ips, dns, and keepalive upon parse', async () => {
            const loonLine =
                'WG-Loon=wireguard,interface-ip=10.0.0.2,private-key="privkey",mtu=1420,dns=1.1.1.1,dnsv6=2606:4700:4700::1111,keepalive=25,peers=[{public-key="pubkey",allowed-ips="0.0.0.0/0, ::/0",endpoint=1.2.3.4:51820,reserved=[1,2,3],preshared-key="psk"}]';

            const nodes = parse(loonLine);
            expect(nodes).toHaveLength(1);
            const n = nodes[0];
            expect(n.type).toBe('wireguard');
            expect(n.server).toBe('1.2.3.4');
            expect(n.port).toBe(51820);
            expect(n['private-key']).toBe('privkey');
            expect(n['public-key']).toBe('pubkey');
            expect(n['pre-shared-key']).toBe('psk');
            expect(n.reserved).toEqual([1, 2, 3]);
            expect(n['allowed-ips']).toEqual(['0.0.0.0/0', '::/0']);
            expect(n.keepalive).toBe(25);
            expect(n.dns).toEqual(['1.1.1.1', '2606:4700:4700::1111']);

            // And re-converting to Loon should preserve reserved=[1,2,3] without double brackets
            const reconverted = await convert([n], 'loon');
            expect(reconverted).toContain('reserved=[1,2,3]');
            expect(reconverted).not.toContain('reserved=[[1,2,3]]');
        });

        it('8.4 Surge WireGuard: should output active policy line without comment #', async () => {
            const node: ProxyNode = {
                id: 'wg-surge',
                type: 'wireguard',
                name: 'WG-Node',
                server: '1.2.3.4',
                port: 51820,
                'private-key': 'priv==',
                'public-key': 'pub==',
                ip: '10.0.0.2',
                reserved: [1, 2, 3]
            };

            const surgeOutput = await convert([node], 'surge');
            expect(surgeOutput).toContain('WG-Node=wireguard,section-name=WG-Node');
            expect(surgeOutput).not.toContain('# WG-Node=wireguard');
            expect(surgeOutput).toContain('client-id = 1/2/3');

            // And parsing a Surge wireguard line should succeed
            const parsed = parse('WG-Node=wireguard,section-name=WG-Node');
            expect(parsed).toHaveLength(1);
            expect(parsed[0].type).toBe('wireguard');
            expect(parsed[0].name).toBe('WG-Node');
        });

        it('8.5 Surge WebSocket: should preserve ws=true, ws-path, and ws-headers upon parse', async () => {
            const surgeLine =
                'Trojan-WS=trojan,example.com,443,password="pass",ws=true,ws-path=/custom-path,ws-headers=Host:"ws.example.com"|User-Agent:"Surge",tls=true,sni=example.com';
            const nodes = parse(surgeLine);
            expect(nodes).toHaveLength(1);
            const n = nodes[0];
            expect(n.type).toBe('trojan');
            expect(n.network).toBe('ws');
            expect(n['ws-opts']?.path).toBe('/custom-path');
            expect(n['ws-opts']?.headers?.Host).toBe('ws.example.com');
            expect(n['ws-opts']?.headers?.['User-Agent']).toBe('Surge');

            // SS with ws should map to v2ray-plugin
            const ssLine =
                'SS-WS=ss,example.com,443,encrypt-method=aes-128-gcm,password="pass",ws=true,ws-path=/ws,ws-headers=Host:"ss.example.com",tls=true';
            const ssNodes = parse(ssLine);
            expect(ssNodes[0].type).toBe('ss');
            expect(ssNodes[0].plugin).toBe('v2ray-plugin');
            expect(ssNodes[0]['plugin-opts']?.mode).toBe('websocket');
            expect(ssNodes[0]['plugin-opts']?.host).toBe('ss.example.com');
        });

        it('8.6 Quantumult X: should preserve TLS when obfs=over-tls is parsed', async () => {
            const qxLine =
                'vmess=1.2.3.4:443,method=none,password=uuid-1234,obfs=over-tls,tls-host=vmess.tls.com,tag=VMess-TLS';
            const nodes = parse(qxLine);
            expect(nodes).toHaveLength(1);
            expect(nodes[0].type).toBe('vmess');
            expect(nodes[0].tls).toBe(true);
            expect(nodes[0].sni).toBe('vmess.tls.com');
        });

        it('8.7 Clash Meta Snell: should map password to psk and package obfs-opts', async () => {
            const node: ProxyNode = {
                id: 'snell-clash',
                type: 'snell',
                name: 'Snell-Clash',
                server: '1.2.3.4',
                port: 8388,
                password: 'secretPassword',
                version: 4,
                obfs: 'http',
                'obfs-host': 'bing.com'
            };

            const clashYaml = yaml.load(await convert([node], 'clash')) as any;
            const p = clashYaml.proxies[0];
            expect(p.type).toBe('snell');
            expect(p.psk).toBe('secretPassword');
            expect(p.password).toBeUndefined();
            expect(p['obfs-opts']).toEqual({ mode: 'http', host: 'bing.com' });
            expect(p.obfs).toBeUndefined();
            expect(p['obfs-host']).toBeUndefined();
        });

        it('8.8 Trojan Reality: should preserve security=reality, pbk, sid, spx, and flow in URI serialization and parsing', async () => {
            const node: ProxyNode = {
                id: 'tr-reality',
                type: 'trojan',
                name: 'Trojan-Reality',
                server: '1.2.3.4',
                port: 443,
                password: 'trojan-pass',
                sni: 'trojan.reality.com',
                flow: 'xtls-rprx-vision',
                'reality-opts': {
                    'public-key': 'pbk123456',
                    'short-id': 'sid123456',
                    'spider-x': '/test-spider'
                }
            };

            const uri = await convert([node], 'uri');
            expect(uri).toContain('security=reality');
            expect(uri).toContain('pbk=pbk123456');
            expect(uri).toContain('sid=sid123456');
            expect(uri).toContain('spx=%2Ftest-spider');
            expect(uri).toContain('flow=xtls-rprx-vision');

            // Roundtrip parse
            const parsed = parse(uri);
            expect(parsed).toHaveLength(1);
            expect(parsed[0].type).toBe('trojan');
            expect(parsed[0].tls).toBe(true);
            expect(parsed[0]['reality-opts']?.['public-key']).toBe('pbk123456');
            expect(parsed[0]['reality-opts']?.['short-id']).toBe('sid123456');
            expect(parsed[0]['reality-opts']?.['spider-x']).toBe('/test-spider');
            expect(parsed[0].flow).toBe('xtls-rprx-vision');
        });

        it('8.9 VLESS xhttp: mode should not be overwritten by other opts', async () => {
            const uri =
                'vless://uuid-vless@1.2.3.4:443?type=xhttp&path=%2Fxhttp-path&host=example.com&mode=stream-up#VLESS-XHTTP';
            const nodes = parse(uri);
            expect(nodes).toHaveLength(1);
            expect(nodes[0].type).toBe('vless');
            expect(nodes[0].network).toBe('xhttp');
            expect(nodes[0]['xhttp-opts']?.mode).toBe('stream-up');
            expect(nodes[0]['xhttp-opts']?.path).toBe('/xhttp-path');
            expect(nodes[0]['xhttp-opts']?.host).toBe('example.com');
        });

        it('8.10 TUIC & Hysteria: aliases and udp-over-stream parsing', async () => {
            const tuicUri =
                'tuic://uuid:pass@1.2.3.4:8443?udp_over_stream=1&heartbeat_interval=5000#TUIC-UOS';
            const tuicNodes = parse(tuicUri);
            expect(tuicNodes[0]['udp-over-stream']).toBe(true);
            expect(tuicNodes[0]['heartbeat-interval']).toBe(5000);

            const hyUri = 'hy://auth123@1.2.3.4:443?upmbps=50&downmbps=100#HY-Alias';
            const hyNodes = parse(hyUri);
            expect(hyNodes).toHaveLength(1);
            expect(hyNodes[0].type).toBe('hysteria');
            expect(hyNodes[0].auth).toBe('auth123');
            expect(hyNodes[0].up).toBe(50);
            expect(hyNodes[0].down).toBe(100);
        });
    });
});

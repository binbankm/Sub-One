
import { describe, it, expect } from 'vitest';
import { subscriptionConverter } from '../converter';
import { buildNodeUrl } from '../url-builder';
import { parseVless } from '../parsers/vless';
import { parseVmess } from '../parsers/vmess';
import { parseHysteria2 } from '../parsers/hysteria2';
import { parseTrojan } from '../parsers/trojan';
import { parseShadowsocks } from '../parsers/shadowsocks';
import { parseWireGuard } from '../parsers/wireguard';

// ==========================================
// 1. 定义全方位测试数据集
// ==========================================
const testCases = [
    {
        name: 'VLESS Reality (IPv6 + XTLS + SpiderX)',
        node: {
            type: 'vless',
            name: 'Complex VLESS',
            server: '2001:db8::1',
            port: 8443,
            uuid: 'a12ba00f-485a-4b07-9b2f-2d743a1a5b82',
            flow: 'xtls-rprx-vision',
            tls: {
                enabled: true,
                serverName: 'gateway.ipv6.com',
                reality: {
                    enabled: true,
                    publicKey: '7_A2k1x9',
                    shortId: '12345678',
                    spiderX: '/login'
                },
                fingerprint: 'chrome'
            }
        },
        parser: parseVless,
        protoType: 'vless'
    },
    {
        name: 'VMess (WS + TLS + Path + Headers)',
        node: {
            type: 'vmess',
            name: 'Complex VMess',
            server: 'cdn.example.com',
            port: 443,
            uuid: 'b23cb11f-596b-5c18-0c3f-3e854b2b6c93',
            alterId: 0,
            cipher: 'auto',
            tls: {
                enabled: true,
                serverName: 'api.example.com',
                insecure: true
            },
            transport: {
                type: 'ws',
                path: '/ws-path',
                headers: { Host: 'api.example.com' }
            }
        },
        parser: parseVmess,
        protoType: 'vmess'
    },
    {
        name: 'Hysteria 2 (Obfs + Insecure)',
        node: {
            type: 'hysteria2',
            name: 'Hy2 Obfs',
            server: 'hy2.server.com',
            port: 50000,
            password: 'my-password',
            tls: {
                enabled: true,
                serverName: 'hy2.server.com',
                insecure: true
            },
            obfs: {
                type: 'salamander',
                password: 'obfs-password-123'
            }
        },
        parser: parseHysteria2,
        protoType: 'hysteria2'
    },
    {
        name: 'Trojan (gRPC + TLS)',
        node: {
            type: 'trojan',
            name: 'Trojan gRPC',
            server: 'trojan.server.com',
            port: 443,
            password: 'trojan-password',
            tls: {
                enabled: true,
                serverName: 'trojan.server.com'
            },
            transport: {
                type: 'grpc',
                serviceName: 'grpc-service',
                mode: 'gun'
            }
        },
        parser: parseTrojan,
        protoType: 'trojan'
    },
    {
        name: 'Shadowsocks (SIP002 + Plugin)',
        node: {
            type: 'ss',
            name: 'SS Plugin',
            server: '1.2.3.4',
            port: 8388,
            cipher: 'aes-256-gcm',
            password: 'ss-password',
            plugin: 'v2ray-plugin',
            pluginOpts: {
                mode: 'websocket',
                host: 'plugin.com'
            }
        },
        parser: parseShadowsocks,
        protoType: 'ss'
    },
    {
        name: 'WireGuard (IPv4/IPv6 + PreSharedKey)',
        node: {
            type: 'wireguard',
            name: 'WG Complex',
            server: 'vpn.example.com',
            port: 51820,
            privateKey: 'Base64PrivateKey',
            publicKey: 'Base64PublicKey',
            preSharedKey: 'Base64PSK',
            ip: '10.100.0.2',
            ipv6: 'fd00::2',
            mtu: 1280
        },
        parser: parseWireGuard,
        protoType: 'wireguard'
    }
];

describe('Comprehensive System Test', () => {
    testCases.forEach(({ name, node, parser, protoType }) => {
        it(`[${name}] should pass full lifecycle (URL -> Parse -> Convert)`, () => {
            // 1. Build URL
            const url = buildNodeUrl(node as any);
            console.log(`[${name}] URL:`, url);
            expect(url).toBeDefined();

            // 2. Parse URL (Round Trip)
            const parsedNode = parser(url);
            expect(parsedNode).not.toBeNull();
            expect(parsedNode!.type).toBe(protoType);
            expect(parsedNode!.server).toBe(node.server);

            // Check specific deep properties
            if (node.tls?.reality && 'tls' in parsedNode!) {
                expect((parsedNode as any).tls?.reality?.publicKey).toBe(node.tls.reality.publicKey);
            }
            if (node.transport?.path && 'transport' in parsedNode!) {
                expect((parsedNode as any).transport?.path).toBe(node.transport.path);
            }
            if (node.obfs && 'obfs' in parsedNode!) {
                expect((parsedNode as any).obfs?.password).toBe(node.obfs.password);
            }

            // 3. Convert to Configs
            const formats = ['clash', 'singbox', 'surge', 'loon', 'quantumultx'];
            const nodeList = [parsedNode!];

            formats.forEach(fmt => {
                try {
                    const config = subscriptionConverter.convert(nodeList, fmt);
                    expect(config).toBeDefined();
                    expect(config.length).toBeGreaterThan(0);

                    // Deep Config Validation
                    if (fmt === 'clash') {
                        if (protoType === 'vless') expect(config).toContain('type: vless');
                        if (protoType === 'hysteria2') expect(config).toContain('type: hysteria2');
                    }
                    if (fmt === 'singbox') {
                        if (config.startsWith('{')) {
                            // Ensure valid JSON
                            const json = JSON.parse(config);
                            expect(json.outbounds.length).toBeGreaterThan(0);
                        }
                    }
                    if (fmt === 'surge') {
                        // Check Proxy line
                        if (protoType === 'wireguard') {
                            expect(config).toContain('# WireGuard');
                        } else if (protoType === 'vless') {
                            // Surge does NOT support VLESS
                            expect(config).not.toContain(parsedNode!.name + ' =');
                        } else {
                            expect(config).toContain(parsedNode!.name);
                        }
                    }
                } catch (e) {
                    console.error(`[${name}] Failed to convert to ${fmt}`, e);
                    throw e;
                }
            });
        });
    });
});

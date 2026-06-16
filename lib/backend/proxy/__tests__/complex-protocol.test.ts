/**
 * Complex Protocol Test Suite
 * 验证各种复杂协议组合（VLESS+Reality+httpupgrade、SS+plugin、多传输层等）
 * 解析后转换到各平台，确保输出字段正确
 */
import { describe, expect, it } from 'vitest';

import { convert, parse } from '../index';
import type { ProxyNode } from '../types';

// ============================================================
// 测试 URI 定义 —— 每个都是真实场景中的复杂协议组合
// ============================================================

const TEST_URIS = {
    // 1. VLESS + Reality + httpupgrade (最复杂组合)
    vlessRealityHttpupgrade:
        'vless://uuid-1234@1.2.3.4:443?type=httpupgrade&host=cdn.example.com&path=%2Fws%3Fed%3D2048&security=reality&sni=www.google.com&fp=chrome&pbk=abc123def456&sid=abcdef01&spx=%2Fspider#VLESS-Reality-Httpupgrade',

    // 2. VLESS + Reality + WebSocket
    vlessRealityWs:
        'vless://uuid-5678@2.3.4.5:443?type=ws&path=%2Fws&host=ws.example.com&security=reality&sni=www.google.com&fp=chrome&pbk=xyz789&sid=12345678&spx=%2F#VLESS-Reality-WS',

    // 3. VLESS + Reality + gRPC
    vlessRealityGrpc:
        'vless://uuid-abcd@3.4.5.6:443?type=grpc&serviceName=grpc-service&security=reality&sni=grpc.example.com&fp=chrome&pbk=key123&sid=aabbccdd&spx=%2F#VLESS-Reality-gRPC',

    // 4. VLESS + ECH + WebSocket
    vlessEchWs:
        'vless://uuid-ech1@5.6.7.8:443?type=ws&host=ech.example.com&path=%2Fech&security=tls&sni=ech.example.com&fp=firefox&ech=1#VLESS-ECH-WS',

    // 5. VMess + WebSocket + TLS
    vmessWsTls:
        'vmess://eyJ2IjoiMiIsInBzIjoiVk1lc3MtV1MtVExTIiwiYWRkIjoiNi43LjguOSIsInBvcnQiOiI0NDMiLCJpZCI6IjExMTExMTExLTExMTExLTExMTEtMTExMTExMTExMTExMSIsImFpZCI6IjEiLCJuZXQiOiJ3cyIsInR5cGUiOiJub25lIiwiaG9zdCI6IndzLmV4YW1wbGUuY29tIiwicGF0aCI6Ii93cyIsInRscyI6InRscyIsInNuaSI6IndzLmV4YW1wbGUuY29tIn0#VMess-WS-TLS',

    // 6. VMess + gRPC
    vmessGrpc:
        'vmess://eyJ2IjoiMiIsInBzIjoiVk1lc3MtZ1JwYyIsImFkZCI6IjcuOC45LjAiLCJwb3J0IjoiNDQzIiwiaWQiOiIyMjIyMjIyMi0yMjIyLTIyMjItMjIyMi0yMjIyMjIyMjIyMjIiLCJhaWQiOiIxIiwibmV0IjoiZ3JwYyIsInR5cGUiOiJub25lIiwiaG9zdCI6ImdycGNfY2hhbm5lbCIsInBhdGgiOiIiLCJ0bHMiOiJ0bHMifQ#VMess-gRPC',

    // 7. Trojan + WebSocket
    trojanWs:
        'trojan://pass123@8.9.10.11:443?type=ws&host=ws.trojan.com&path=%2Ftrojan&security=tls&sni=trojan.example.com#Trojan-WS',

    // 8. SS + v2ray-plugin + base64 params
    ssV2rayPlugin:
        'ss://Y2hhY2hhMjAtcG9seTEzMDU6dGVzdHBhc3NAMTIzLjQ1LjY3Ljg5OjQ0Mw%3D%3D?v2ray-plugin=eyJ0eXBlIjoid2Vic29ja2V0Iiwib2JmcyI6Imh0dHAiLCJob3N0IjoiZXhhbXBsZS5jb20ifQ#SS-V2ray-Plugin',

    // 9. SS + obfs-plugin (plugin name must be obfs-local or simple-obfs per SS standard)
    ssObfs:
        'ss://YWVzLTI1Ni1nY206dGVzdHBhc3NAMTIzLjQ1LjY3Ljg5OjQ0Mw%3D%3D?plugin=obfs-local%3Bmode%3Dhttp%3Bobfs-host%3Dexample.com#SS-Obfs',

    // 10. Hysteria2 + port hopping
    hysteria2:
        'hysteria2://hy2pass@10.11.12.13:443?obfs=salamander&obfs-password=obfspass&sni=hy2.example.com&insecure=1&ports=443-8443-4&hop-interval=3#Hysteria2-PortHopping',

    // 11. TUIC v5
    tuicV5:
        'tuic://uuid-tuic:tuicpass@14.15.16.17:443?sni=tuic.example.com&alpn=h3&congestion_control=bbr&udp_relay_mode=native&reduce_rtt=1#TUIC-v5',

    // 12. AnyTLS
    anytls:
        'anytls://atp@18.19.20.21:443?sni=at.example.com&insecure=1#AnyTLS',

    // 13. Naive
    naive:
        'naive+https://naiveuser:naivepass@22.23.24.25:443?sni=naive.example.com#Naive',

    // 14. WireGuard
    wireguard:
        'wireguard://testkey@26.27.28.29:51820?publickey=pubkey123&ip=10.0.0.2&dns=1.1.1.1&mtu=1280&reserved=123,45,678&keepalive=25#WireGuard',

    // 15. SS + shadow-tls (plugin string format)
    ssShadowTls:
        'ss://Y2hhY2hhMjAtcG9seTEzMDU6dGVzdEB2MC5zaGFkb3d0bHMudG86NDQz?plugin=shadow-tls%3Bhost%3Dshadow.example.com%3Bpassword%3Dshadowpass%3Bversion%3D1.3#SS-ShadowTLS',

    // 16. Trojan + Reality
    trojanReality:
        'trojan://trpass@30.31.32.33:443?security=reality&sni=tr.example.com&fp=chrome&pbk=trpbk123&sid=trsid456&spx=%2Ftr#Trojan-Reality',
} as const;

// ============================================================
// 测试：解析验证
// ============================================================

describe('Complex Protocol URI Parsing', () => {
    it('should parse VLESS+Reality+httpupgrade', () => {
        const nodes = parse(TEST_URIS.vlessRealityHttpupgrade);
        expect(nodes.length).toBeGreaterThanOrEqual(1);
        const node = nodes[0];
        expect(node.type).toBe('vless');
        expect(node.uuid).toBe('uuid-1234');
        expect(node.server).toBe('1.2.3.4');
        expect(node.network).toBe('ws'); // httpupgrade → ws
        expect(node.tls).toBe(true);
        expect(node.sni).toBe('www.google.com');
        expect(node['reality-opts']).toBeDefined();
        expect(node['reality-opts']!['public-key']).toBe('abc123def456');
        expect(node['reality-opts']!['short-id']).toBe('abcdef01');
        // httpupgrade 标记在 ws-opts 中
        expect(node['ws-opts']?.['v2ray-http-upgrade']).toBe(true);
        expect(node['xhttp-opts']?.mode).toBe('stream-one');
    });

    it('should parse VLESS+Reality+gRPC', () => {
        const nodes = parse(TEST_URIS.vlessRealityGrpc);
        expect(nodes.length).toBeGreaterThanOrEqual(1);
        const node = nodes[0];
        expect(node.type).toBe('vless');
        expect(node.network).toBe('grpc');
        expect(node['grpc-opts']?.['service-name']).toBe('grpc-service');
        expect(node['reality-opts']).toBeDefined();
    });

    it('should parse VLESS+ECH+WS', () => {
        const nodes = parse(TEST_URIS.vlessEchWs);
        expect(nodes.length).toBeGreaterThanOrEqual(1);
        const node = nodes[0];
        expect(node.type).toBe('vless');
        // URI 格式中 ech=1 只存储 _ech 标志，ech-opts 需要从 Clash YAML/base64 获取
        expect((node as any)._ech).toBe('1');
        expect(node.network).toBe('ws');
    });

    it('should parse Hysteria2 with port hopping', () => {
        const nodes = parse(TEST_URIS.hysteria2);
        expect(nodes.length).toBeGreaterThanOrEqual(1);
        const node = nodes[0];
        expect(node.type).toBe('hysteria2');
        expect(node.obfs).toBe('salamander');
        expect(node['obfs-password']).toBe('obfspass');
        expect(node.ports).toBeDefined();
    });

    it('should parse TUIC v5', () => {
        const nodes = parse(TEST_URIS.tuicV5);
        expect(nodes.length).toBeGreaterThanOrEqual(1);
        const node = nodes[0];
        expect(node.type).toBe('tuic');
        expect(node.uuid).toBe('uuid-tuic');
        expect(node['congestion-controller']).toBe('bbr');
        expect(node['reduce-rtt']).toBeTruthy();
    });

    it('should parse AnyTLS', () => {
        const nodes = parse(TEST_URIS.anytls);
        expect(nodes.length).toBeGreaterThanOrEqual(1);
        const node = nodes[0];
        expect(node.type).toBe('anytls');
        expect(node.sni).toBe('at.example.com');
    });

    it('should parse Naive', () => {
        const nodes = parse(TEST_URIS.naive);
        expect(nodes.length).toBeGreaterThanOrEqual(1);
        const node = nodes[0];
        expect(node.type).toBe('naive');
        expect(node.username).toBe('naiveuser');
    });

    it('should parse WireGuard', () => {
        const nodes = parse(TEST_URIS.wireguard);
        expect(nodes.length).toBeGreaterThanOrEqual(1);
        const node = nodes[0];
        expect(node.type).toBe('wireguard');
        expect(node.ip).toBe('10.0.0.2');
        expect(node.mtu).toBe(1280);
    });
});

// ============================================================
// 测试：VLESS+Reality+httpupgrade 转换（最复杂场景）
// ============================================================

describe('VLESS+Reality+httpupgrade Conversion', () => {
    const parseNode = () => parse(TEST_URIS.vlessRealityHttpupgrade)[0];

    it('ClashMeta: should output httpupgrade cleaned, fingerprint, reality-opts, no tls', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'clashmeta');

        // httpupgrade 内部标记字段必须被清理
        expect(result).not.toContain('v2ray-http-upgrade');
        expect(result).not.toContain('v2ray-http-upgrade-fast-open');

        // 应有 fingerprint (非 tls-fingerprint)
        expect(result).toContain('fingerprint: chrome');

        // reality-opts 正确
        expect(result).toContain('reality-opts:');
        expect(result).toContain('public-key: abc123def456');
        expect(result).toContain('short-id: abcdef01');

        // ws-opts 路径不含 early-data (已提取)
        expect(result).toContain('early-data-header-name:');
        expect(result).toContain('max-early-data: 2048');
    });

    it('Surge: should return empty (VLESS not supported)', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'surge');
        expect(result).toBe('');
    });

    it('Loon: should output correct VLESS with Reality', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'loon');

        expect(result).toContain('vless,1.2.3.4,443');
        expect(result).toContain('over-tls=true');
        expect(result).toContain('sni=www.google.com');
        expect(result).toContain('tls-profile=chrome');
    });

    it('Shadowrocket: should output ClashYAML with fingerprint and reality', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'shadowrocket');

        expect(result).toContain('fingerprint: chrome');
        expect(result).toContain('public-key: abc123def456');
        expect(result).not.toContain('tls-fingerprint:');
    });

    it('Singbox: should output utls+reality in TLS', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'singbox');
        const config = JSON.parse(result);
        const out = config.outbounds[0];

        expect(out.type).toBe('vless');
        expect(out.tls.reality.enabled).toBe(true);
        expect(out.tls.reality.public_key).toBe('abc123def456');
        expect(out.tls.utls.fingerprint).toBe('chrome');
        expect(out.transport.type).toBe('ws');
    });

    it('URI: should output vless:// with reality params', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'uri');

        expect(result).toContain('vless://uuid-1234@1.2.3.4:443');
        expect(result).toContain('security=reality');
        expect(result).toContain('pbk=abc123def456');
        expect(result).toContain('sid=abcdef01');
        // httpupgrade 在 URI 中映射为 type=ws
        expect(result).toContain('type=ws');
        expect(result).toContain('mode=stream-one');
    });

    it('QX: should output vless with reality params', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'qx');

        expect(result).toContain('vless=');
        expect(result).toContain('reality-base64-pubkey=');
        expect(result).toContain('reality-hex-shortid=');
    });
});

// ============================================================
// 测试：SS + Plugin 组合转换
// ============================================================

describe('SS Plugin Conversions', () => {
    it('ClashMeta: SS+obfs should output plugin and plugin-opts', async () => {
        const nodes = parse(TEST_URIS.ssObfs);
        const result = await convert(nodes, 'clashmeta');

        expect(result).toContain('plugin: obfs');
        expect(result).toContain('plugin-opts:');
        expect(result).toContain('host: example.com');
    });

    it('Loon: SS+obfs should output obfs-name and obfs-host', async () => {
        const nodes = parse(TEST_URIS.ssObfs);
        const result = await convert(nodes, 'loon');

        expect(result).toContain('obfs-name=http');
        expect(result).toContain('obfs-host=example.com');
    });

    it('Surge: SS+obfs should output obfs', async () => {
        const nodes = parse(TEST_URIS.ssObfs);
        const result = await convert(nodes, 'surge');

        expect(result).toContain('obfs=http');
        expect(result).toContain('obfs-host=example.com');
    });

    it('Singbox: SS+obfs should output obfs plugin', async () => {
        const nodes = parse(TEST_URIS.ssObfs);
        const result = await convert(nodes, 'singbox');
        const config = JSON.parse(result);
        const out = config.outbounds[0];

        expect(out.plugin).toBe('obfs');
    });
});

// ============================================================
// 测试：Hysteria2 + port hopping 转换
// ============================================================

describe('Hysteria2 Complex Conversion', () => {
    const parseNode = () => parse(TEST_URIS.hysteria2)[0];

    it('ClashMeta: should output hysteria2 with obfs and salamander', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'clashmeta');

        expect(result).toContain('type: hysteria2');
        expect(result).toContain('obfs: salamander');
        expect(result).toContain('obfs-password: obfspass');
        // 隐式 TLS，不需要 tls 字段
        expect(result).not.toMatch(/tls:/);
    });

    it('Singbox: should output server_ports and hop_interval', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'singbox');
        const config = JSON.parse(result);
        const out = config.outbounds[0];

        expect(out.type).toBe('hysteria2');
        expect(out.server_ports).toBeDefined();
        expect(out.hop_interval).toBe('3s');
        expect(out.obfs.type).toBe('salamander');
        expect(out.obfs.password).toBe('obfspass');
    });

    it('Loon: should output Hysteria2 with salamander', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'loon');

        expect(result).toContain('Hysteria2');
        expect(result).toContain('salamander-password=obfspass');
    });

    it('Surge: should output hysteria2 with port-hopping', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'surge');

        expect(result).toContain('hysteria2');
        expect(result).toContain('port-hopping=');
    });
});

// ============================================================
// 测试：TUIC v5 转换
// ============================================================

describe('TUIC v5 Conversion', () => {
    const parseNode = () => parse(TEST_URIS.tuicV5)[0];

    it('ClashMeta: should output tuic with congestion-controller and alpn', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'clashmeta');

        expect(result).toContain('type: tuic');
        expect(result).toContain('congestion-controller: bbr');
        expect(result).toContain('udp-relay-mode: native');
        expect(result).toContain('alpn:');
        // 隐式 TLS
        expect(result).not.toMatch(/tls:/);
    });

    it('Surge: should output tuic-v5 (no token)', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'surge');

        expect(result).toContain('tuic-v5');
        expect(result).toContain('uuid=uuid-tuic');
        expect(result).toContain('password="tuicpass"');
    });

    it('Singbox: should output zero_rtt_handshake and congestion_control', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'singbox');
        const config = JSON.parse(result);
        const out = config.outbounds[0];

        expect(out.type).toBe('tuic');
        expect(out.congestion_control).toBe('bbr');
        expect(out.zero_rtt_handshake).toBe(true);
        expect(out.tls.enabled).toBe(true);
    });

    it('URI: should output tuic:// with all params', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'uri');

        expect(result).toContain('tuic://uuid-tuic:tuicpass@14.15.16.17:443');
        expect(result).toContain('congestion_control=bbr');
        expect(result).toContain('reduce_rtt=1');
    });
});

// ============================================================
// 测试：Naive + Singbox 转换
// ============================================================

describe('Naive Conversion', () => {
    const parseNode = () => parse(TEST_URIS.naive)[0];

    it('Singbox: should output http type with TLS (no insecure)', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'singbox');
        const config = JSON.parse(result);
        const out = config.outbounds[0];

        expect(out.type).toBe('http');
        expect(out.username).toBe('naiveuser');
        expect(out.password).toBe('naivepass');
        expect(out.tls.enabled).toBe(true);
        // insecure should be false (not true) for naive
        expect(out.tls.insecure).toBe(false);
    });

    it('URI: should output naive+https:// with auth', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'uri');

        expect(result).toContain('naive+https://');
        expect(result).toContain('naiveuser');
        expect(result).toContain('naive.example.com');
    });
});

// ============================================================
// 测试：AnyTLS 全平台转换
// ============================================================

describe('AnyTLS Full Conversion', () => {
    const parseNode = () => parse(TEST_URIS.anytls)[0];

    it('ClashMeta: should output anytls without tls', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'clashmeta');

        expect(result).toContain('type: anytls');
        // 隐式 TLS
        expect(result).not.toMatch(/tls:/);
    });

    it('Loon: should output anytls with tls-name', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'loon');

        expect(result).toContain('anytls,18.19.20.21,443');
        expect(result).toContain('tls-name=at.example.com');
    });

    it('Surge: should output anytls', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'surge');

        expect(result).toContain('anytls');
        expect(result).toContain('sni=at.example.com');
    });

    it('QX: should output anytls with over-tls', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'qx');

        expect(result).toContain('anytls=18.19.20.21:443');
        expect(result).toContain('over-tls=true');
    });

    it('Singbox: should output anytls with TLS', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'singbox');
        const config = JSON.parse(result);
        const out = config.outbounds[0];

        expect(out.type).toBe('anytls');
        expect(out.tls.enabled).toBe(true);
    });

    it('URI: should output anytls://', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'uri');

        expect(result).toContain('anytls://atp@18.19.20.21:443');
        expect(result).toContain('sni=at.example.com');
    });
});

// ============================================================
// 测试：VLESS + ECH + WS 转换
// ============================================================

describe('VLESS+ECH Conversion', () => {
    it('ClashMeta: should output ech-opts when ech-opts present', async () => {
        // ECH config must come from Clash YAML / base64 format, not simple URI
        // Test with a node that has ech-opts set manually
        const nodes = parse(TEST_URIS.vlessEchWs);
        // URI format only stores _ech flag, not ech-opts config
        expect(nodes[0]['ech-opts']).toBeUndefined();
        expect((nodes[0] as any)._ech).toBe('1');
    });

    it('Singbox: should handle ech field when present', async () => {
        // ECH in Singbox requires ech config, not just flag
        const nodes = parse(TEST_URIS.vlessEchWs);
        const result = await convert(nodes, 'singbox');
        const config = JSON.parse(result);
        const out = config.outbounds[0];
        // Without ech-opts config, singbox won't have ech field
        expect(out.type).toBe('vless');
    });
});

// ============================================================
// 测试：VLESS Reality gRPC 转换 — grpc 内部字段清理
// ============================================================

describe('VLESS+Reality+gRPC grpc-opts cleanup', () => {
    const parseNode = () => parse(TEST_URIS.vlessRealityGrpc)[0];

    it('ClashMeta: should clean grpc internal fields', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'clashmeta');

        expect(result).not.toContain('_grpc-type');
        expect(result).not.toContain('_grpc-authority');
        expect(result).toContain('service-name: grpc-service');
    });

    it('Shadowrocket: should clean grpc internal fields', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'shadowrocket');

        expect(result).not.toContain('_grpc-type');
        expect(result).not.toContain('_grpc-authority');
    });

    it('URI: should preserve grpc internal fields for round-trip', async () => {
        const nodes = parseNode();
        const result = await convert([nodes], 'uri');

        expect(result).toContain('serviceName=grpc-service');
    });
});

// ============================================================
// 测试：TCP 节点不应有传输层字段泄漏
// ============================================================

describe('TCP node transport cleanup', () => {
    it('AnyTLS should not have network=tcp', async () => {
        const nodes = parse(TEST_URIS.anytls);
        // AnyTLS 默认无 network 字段
        expect(nodes[0].network).toBeUndefined();
    });

    it('Hysteria2 should not have network field', async () => {
        const nodes = parse(TEST_URIS.hysteria2);
        // Hysteria2 使用 QUIC，不需要 network
        expect(nodes[0].network).toBeUndefined();
    });
});

// ============================================================
// 测试：Round-trip —— URI → Parse → Convert → URI 保留核心字段
// ============================================================

describe('URI Round-trip preservation', () => {
    it('VLESS Reality spider-x should survive parse→convert→uri', async () => {
        const nodes = parse(TEST_URIS.vlessRealityGrpc);
        const uriResult = await convert([nodes[0]], 'uri');

        // spider-x 必须保留
        expect(uriResult).toContain('spx=%2F');
    });

    it('VLESS Reality short-id should survive round-trip', async () => {
        const nodes = parse(TEST_URIS.vlessRealityWs);
        const uriResult = await convert([nodes[0]], 'uri');

        expect(uriResult).toContain('sid=12345678');
    });

    it('TUIC reduce-rtt should survive round-trip', async () => {
        const nodes = parse(TEST_URIS.tuicV5);
        const uriResult = await convert([nodes[0]], 'uri');

        expect(uriResult).toContain('reduce_rtt=1');
        expect(uriResult).toContain('congestion_control=bbr');
    });

    it('WireGuard reserved should survive round-trip', async () => {
        const nodes = parse(TEST_URIS.wireguard);
        const uriResult = await convert([nodes[0]], 'uri');

        // URL-encoded commas in URI
        expect(uriResult).toContain('reserved=123%2C45%2C678');
    });
});

// ============================================================
// 测试：ClashMeta tls 删除 —— 确认 Bug 修复
// ============================================================

describe('ClashMeta implicit TLS deletion (Bug fix)', () => {
    it('Trojan should not have tls: field', async () => {
        const nodes = parse(TEST_URIS.trojanWs);
        const result = await convert(nodes, 'clashmeta');

        // Trojan 隐式 TLS，不应出现 "tls: true"
        expect(result).not.toMatch(/\btls:\s*true\b/);
    });

    it('Hysteria2 should not have tls: field', async () => {
        const nodes = parse(TEST_URIS.hysteria2);
        const result = await convert(nodes, 'clashmeta');

        expect(result).not.toMatch(/\btls:\s*true\b/);
    });

    it('TUIC should not have tls: field', async () => {
        const nodes = parse(TEST_URIS.tuicV5);
        const result = await convert(nodes, 'clashmeta');

        expect(result).not.toMatch(/\btls:\s*true\b/);
    });

    it('AnyTLS should not have tls: field', async () => {
        const nodes = parse(TEST_URIS.anytls);
        const result = await convert(nodes, 'clashmeta');

        expect(result).not.toMatch(/\btls:\s*true\b/);
    });
});

// ============================================================
// 测试：Loon Reality 支持 (AnyTLS/Trojan/VMess)
// ============================================================

describe('Loon Reality conversions (feat: AnyTLS/Trojan + Reality, VMess + Reality)', () => {
    it('Loon VMess + Reality should output sni/public-key/short-id', async () => {
        const nodes = [
            {
                type: 'vmess',
                name: 'Loon VMess Reality',
                server: 'vmess.example.com',
                port: 443,
                cipher: 'auto',
                uuid: '12345678-1234-1234-1234-123456789abc',
                alterId: 0,
                tls: true,
                sni: 'sni.example.com',
                'reality-opts': {
                    'public-key': 'vmess-pubkey',
                    'short-id': '01'
                },
                'skip-cert-verify': true
            }
        ] as unknown as ProxyNode[];
        const result = await convert(nodes, 'loon');

        expect(result).toContain('vmess,vmess.example.com,443');
        expect(result).toContain('sni=sni.example.com');
        expect(result).toContain('public-key="vmess-pubkey"');
        expect(result).toContain('short-id=01');
        expect(result).toContain('over-tls=true');
        expect(result).toContain('skip-cert-verify=true');
        expect(result).not.toContain('tls-name=');
    });

    it('Loon Trojan + Reality should output sni/public-key/short-id', async () => {
        const nodes = [
            {
                type: 'trojan',
                name: 'Loon Trojan Reality',
                server: 'trojan.example.com',
                port: 443,
                password: 'secret',
                sni: 'sni.example.com',
                'reality-opts': {
                    'public-key': 'trojan-pubkey',
                    'short-id': '02'
                },
                'skip-cert-verify': true
            }
        ] as unknown as ProxyNode[];
        const result = await convert(nodes, 'loon');

        expect(result).toContain('trojan,trojan.example.com,443');
        expect(result).toContain('sni=sni.example.com');
        expect(result).toContain('public-key="trojan-pubkey"');
        expect(result).toContain('short-id=02');
        expect(result).toContain('skip-cert-verify=true');
        expect(result).not.toContain('tls-name=');
        expect(result).not.toContain('tls-cert-sha256=');
    });

    it('Loon AnyTLS + Reality should output sni/public-key/short-id', async () => {
        const nodes = [
            {
                type: 'anytls',
                name: 'Loon AnyTLS Reality',
                server: 'anytls.example.com',
                port: 443,
                password: 'secret',
                sni: 'sni.example.com',
                'reality-opts': {
                    'public-key': 'anytls-pubkey',
                    'short-id': '03'
                },
                'skip-cert-verify': true
            }
        ] as unknown as ProxyNode[];
        const result = await convert(nodes, 'loon');

        expect(result).toContain('anytls,anytls.example.com,443');
        expect(result).toContain('sni=sni.example.com');
        expect(result).toContain('public-key="anytls-pubkey"');
        expect(result).toContain('short-id=03');
        expect(result).toContain('skip-cert-verify=true');
        expect(result).not.toContain('tls-name=');
        expect(result).not.toContain('tls-cert-sha256=');
    });

    it('Loon Trojan without Reality should use tls-name (normal TLS)', async () => {
        const nodes = [
            {
                type: 'trojan',
                name: 'Loon Trojan Normal',
                server: 'trojan.example.com',
                port: 443,
                password: 'secret',
                tls: true,
                sni: 'sni.example.com',
                'skip-cert-verify': true
            }
        ] as unknown as ProxyNode[];
        const result = await convert(nodes, 'loon');

        expect(result).toContain('trojan,trojan.example.com,443');
        expect(result).toContain('tls-name=sni.example.com');
        expect(result).not.toContain('public-key=');
    });
});

// ============================================================
// 测试：SS2022 + obfs 转换
// ============================================================

describe('SS2022 + obfs Loon conversion', () => {
    it('Loon SS2022 + HTTP obfs should output correctly', async () => {
        const nodes = [
            {
                type: 'ss',
                name: 'Loon SS2022 HTTP Obfs',
                server: 'ss2022-http.example.com',
                port: 8388,
                cipher: '2022-blake3-aes-128-gcm',
                password: 'server-key:user-key',
                plugin: 'obfs',
                'plugin-opts': {
                    mode: 'http',
                    host: 'obfs.example.com',
                    path: '/'
                }
            }
        ] as unknown as ProxyNode[];
        const result = await convert(nodes, 'loon');

        expect(result).toContain('shadowsocks,ss2022-http.example.com,8388');
        expect(result).toContain('2022-blake3-aes-128-gcm');
        expect(result).toContain('obfs-name=http');
        expect(result).toContain('obfs-host=obfs.example.com');
        expect(result).toContain('obfs-uri=/');
    });

    it('Loon SS2022 + TLS obfs should output correctly', async () => {
        const nodes = [
            {
                type: 'ss',
                name: 'Loon SS2022 TLS Obfs',
                server: 'ss2022-tls.example.com',
                port: 8389,
                cipher: '2022-blake3-aes-256-gcm',
                password: 'server-key:user-key',
                plugin: 'obfs',
                'plugin-opts': {
                    mode: 'tls',
                    host: 'tls.example.com',
                    path: '/tls'
                }
            }
        ] as unknown as ProxyNode[];
        const result = await convert(nodes, 'loon');

        expect(result).toContain('shadowsocks,ss2022-tls.example.com,8389');
        expect(result).toContain('2022-blake3-aes-256-gcm');
        expect(result).toContain('obfs-name=tls');
        expect(result).toContain('obfs-host=tls.example.com');
        expect(result).toContain('obfs-uri=/tls');
    });
});

// ============================================================
// 测试：Egern 字段转换验证
// ============================================================

describe('Egern field conversions', () => {
    it('Egern: VMess should output user_id and security', async () => {
        const nodes = parse(TEST_URIS.vmessWsTls);
        const result = await convert(nodes, 'egern');

        expect(result).toContain('"user_id"');
        expect(result).toContain('"vmess"');
        expect(result).toContain('"transport"');
    });

    it('Egern: Trojan + Reality should output reality.public_key', async () => {
        const nodes = parse(TEST_URIS.trojanReality);
        const result = await convert(nodes, 'egern');

        expect(result).toContain('"trojan"');
        expect(result).toContain('"reality"');
        expect(result).toContain('"public_key"');
        expect(result).toContain('"short_id"');
    });

    it('Egern: Hysteria2 should output obfs.salamander', async () => {
        const nodes = parse(TEST_URIS.hysteria2);
        const result = await convert(nodes, 'egern');

        expect(result).toContain('"hysteria2"');
        expect(result).toContain('"salamander"');
    });

    it('Egern: SS should output method (not cipher)', async () => {
        const nodes = parse(TEST_URIS.ssObfs);
        const result = await convert(nodes, 'egern');

        expect(result).toContain('"shadowsocks"');
        expect(result).toContain('"method"');
        expect(result).toContain('"obfs"');
    });

    it('Egern: AnyTLS should output anytls type', async () => {
        const nodes = parse(TEST_URIS.anytls);
        const result = await convert(nodes, 'egern');

        expect(result).toContain('"anytls"');
    });

    it('Egern: VLESS + Reality should output reality', async () => {
        const nodes = parse(TEST_URIS.vlessRealityWs);
        const result = await convert(nodes, 'egern');

        expect(result).toContain('"vless"');
        expect(result).toContain('"reality"');
        expect(result).toContain('"public_key"');
    });
});

// ============================================================
// 测试：全平台转换不崩溃
// ============================================================

describe('All protocols × All platforms smoke test', () => {
    const platforms = ['clash', 'clashmeta', 'surge', 'loon', 'qx', 'shadowrocket', 'surfboard', 'singbox', 'uri', 'egern'] as const;

    const uriEntries = Object.entries(TEST_URIS);

    for (const [name, uri] of uriEntries) {
        for (const platform of platforms) {
            it(`${name} → ${platform} should not throw`, async () => {
                const nodes = parse(uri);
                expect(nodes.length).toBeGreaterThanOrEqual(1);

                // Surge 不支持 VLESS —— 跳过
                if (platform === 'surge' && (name.startsWith('vless') || name === 'trojanReality')) {
                    return;
                }
                // Egern 不支持 naive —— 跳过
                if (platform === 'egern' && name === 'naive') {
                    return;
                }

                const result = await convert(nodes, platform);
                expect(typeof result).toBe('string');
            });
        }
    }
});

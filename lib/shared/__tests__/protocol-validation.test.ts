import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { SubscriptionConverter } from '../subscription-converter';
import type { Node } from '../types';
import { base64Encode } from './test-utils';

describe('深度协议格式校验', () => {
    const converter = new SubscriptionConverter();

    // 辅助函数：快速创建节点
    const createNode = (protocol: string, url: string): Node[] => [{
        id: 'test-id',
        name: 'Test Node',
        protocol,
        enabled: true,
        url
    }];

    describe('Clash 协议格式校验', () => {

        it('VMess (WS + TLS) 字段精确映射', () => {
            // 构造一个复杂的 VMess 配置
            const vmessConfig = {
                v: '2',
                ps: 'Test Node',
                add: '1.2.3.4',
                port: '443',
                id: 'a0b1c2d3-e4f5-6789-0123-456789abcdef',
                aid: '0',
                scy: 'auto',
                net: 'ws',
                type: 'none',
                host: 'ws.example.com',
                path: '/ws-path',
                tls: 'tls',
                sni: 'sni.example.com',
                alpn: 'h2,http/1.1'
            };

            const url = 'vmess://' + base64Encode(JSON.stringify(vmessConfig));
            const result = converter.toClash(createNode('vmess', url));
            const config: any = yaml.load(result);
            const proxy = config.proxies[0];

            // 精确断言
            expect(proxy.type).toBe('vmess');
            expect(proxy.server).toBe('1.2.3.4');
            expect(proxy.port).toBe(443);
            expect(proxy.uuid).toBe('a0b1c2d3-e4f5-6789-0123-456789abcdef');
            expect(proxy.cipher).toBe('auto');
            expect(proxy.tls).toBe(true);
            expect(proxy.servername).toBe('sni.example.com');
            expect(proxy.network).toBe('ws');
            expect(proxy['ws-opts']).toEqual({
                path: '/ws-path',
                headers: {
                    Host: 'ws.example.com'
                }
            });
            // ALPN 在 Clash Meta 中通常是数组
            expect(proxy.alpn).toEqual(['h2', 'http/1.1']);
        });

        it('VLESS (Reality + gRPC) 字段精确映射', () => {
            const url = 'vless://uuid-1234@1.2.3.4:443?type=grpc&serviceName=grpc-test&security=reality&pbk=public-key-val&sid=short-id-val&sni=reality.com&fp=chrome#Test Node';

            const result = converter.toClash(createNode('vless', url));
            const config: any = yaml.load(result);
            const proxy = config.proxies[0];

            expect(proxy.type).toBe('vless');
            expect(proxy.server).toBe('1.2.3.4');
            expect(proxy.uuid).toBe('uuid-1234');
            expect(proxy.tls).toBe(true);
            expect(proxy.servername).toBe('reality.com');
            expect(proxy['client-fingerprint']).toBe('chrome');

            // Reality 特有字段
            expect(proxy['reality-opts']).toEqual({
                'public-key': 'public-key-val',
                'short-id': 'short-id-val'
            });

            // gRPC 配置
            expect(proxy.network).toBe('grpc'); // 代码中可能未显式设置 network=grpc，而是通过 grpc-opts 体现，或者解析器会自动设置
            // 检查代码逻辑：parseVlessToClash 会根据 type 设置 network 吗？
            // 让我们检查实际输出，而不是假设。
            if (proxy.network) {
                expect(proxy.network).toBe('grpc');
            }
            expect(proxy['grpc-opts']).toEqual({
                'grpc-service-name': 'grpc-test'
            });
        });

        it('Shadowsocks (Obfs) 字段精确映射', () => {
            // ss://method:pass@server:port
            const userInfo = base64Encode('aes-256-gcm:password123');
            const url = `ss://${userInfo}@1.2.3.4:8388?plugin=obfs-local;obfs=http;obfs-host=bing.com#Test Node`;

            const result = converter.toClash(createNode('ss', url));
            const config: any = yaml.load(result);
            const proxy = config.proxies[0];

            expect(proxy.type).toBe('ss');
            expect(proxy.cipher).toBe('aes-256-gcm');
            expect(proxy.password).toBe('password123');
            expect(proxy.plugin).toBe('obfs-local');
            expect(proxy['plugin-opts']).toEqual({
                obfs: 'http',
                'obfs-host': 'bing.com'
            });
        });

        it('Hysteria2 (Obfs + SNI) 字段精确映射', () => {
            const url = 'hysteria2://password123@1.2.3.4:443?sni=secure.com&obfs=salamander&obfs-password=pwd&insecure=1#Test Node';

            const result = converter.toClash(createNode('hysteria2', url));
            const config: any = yaml.load(result);
            const proxy = config.proxies[0];

            expect(proxy.type).toBe('hysteria2');
            expect(proxy.password).toBe('password123');
            expect(proxy.sni).toBe('secure.com');
            expect(proxy.obfs).toBe('salamander');
            expect(proxy['obfs-password']).toBe('pwd');
            expect(proxy['skip-cert-verify']).toBe(true);
        });
    });

    describe('Sing-Box 协议格式校验', () => {

        it('VMess (WS + TLS) 字段精确映射', () => {
            const vmessConfig = {
                v: '2',
                ps: 'Test Node',
                add: '1.2.3.4',
                port: '443',
                id: 'uuid-val',
                aid: '0',
                scy: 'auto',
                net: 'ws',
                host: 'ws.com',
                path: '/path',
                tls: 'tls',
                sni: 'sni.com',
                alpn: 'h2'
            };

            const url = 'vmess://' + base64Encode(JSON.stringify(vmessConfig));
            const result = converter.toSingBox(createNode('vmess', url));
            const config: any = JSON.parse(result);
            // 找到 tag 为 Test Node 的 outbound
            const outbound = config.outbounds.find((o: any) => o.tag === 'Test Node');

            expect(outbound).toBeDefined();
            expect(outbound.type).toBe('vmess');
            expect(outbound.server).toBe('1.2.3.4');
            expect(outbound.server_port).toBe(443);
            expect(outbound.uuid).toBe('uuid-val');

            expect(outbound.tls).toEqual({
                enabled: true,
                server_name: 'sni.com',
                insecure: false,
                alpn: ['h2']
            });

            expect(outbound.transport).toEqual({
                type: 'ws',
                path: '/path',
                headers: {
                    Host: 'ws.com'
                }
            });
        });

        it('VLESS (Reality + TCP) 字段精确映射', () => {
            const url = 'vless://uuid-val@1.2.3.4:443?security=reality&sni=example.com&pbk=pbk-val&sid=sid-val&flow=xtls-rprx-vision#Test Node';

            const result = converter.toSingBox(createNode('vless', url));
            const config: any = JSON.parse(result);
            const outbound = config.outbounds.find((o: any) => o.tag === 'Test Node');

            expect(outbound.type).toBe('vless');
            expect(outbound.flow).toBe('xtls-rprx-vision');

            expect(outbound.tls).toEqual({
                enabled: true,
                server_name: 'example.com',
                reality: {
                    enabled: true,
                    public_key: 'pbk-val',
                    short_id: 'sid-val'
                }
            });
        });

        it('Trojan (WS) 字段精确映射', () => {
            const url = 'trojan://password@1.2.3.4:443?sni=trojan.com&type=ws&path=/trojan&host=trojan.com#Test Node';

            const result = converter.toSingBox(createNode('trojan', url));
            const config: any = JSON.parse(result);
            const outbound = config.outbounds.find((o: any) => o.tag === 'Test Node');

            expect(outbound.type).toBe('trojan');
            expect(outbound.password).toBe('password');

            expect(outbound.tls).toEqual({
                enabled: true,
                server_name: 'trojan.com',
                insecure: false
            });

            expect(outbound.transport).toEqual({
                type: 'ws',
                path: '/trojan',
                headers: {
                    Host: 'trojan.com'
                }
            });
        });
    });
});

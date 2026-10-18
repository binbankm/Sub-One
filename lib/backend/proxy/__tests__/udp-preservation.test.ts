import { describe, expect, it } from 'vitest';
import { parse } from '../parser/index';
import { convert } from '../converter/index';
import type { ProxyNode } from '../types';

describe('UDP 属性保持与转换测试 (Issue: UDP 字段被强制置为 false 问题验证)', () => {
    // 辅助构造函数
    const makeNode = (p: Partial<ProxyNode>): ProxyNode => ({
        id: 'test-' + Math.random(),
        name: 'test-node',
        server: '1.2.3.4',
        port: 443,
        type: 'ss',
        ...p
    });

    describe('1. URI 解析器 (URI Parsers) 的 UDP 行为', () => {
        it('1.1 Shadowsocks: 显式 udp=1 应为 true，udp=0 应为 false，缺省应为 undefined', () => {
            const ssDefault = parse('ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@1.2.3.4:443#SS-Default');
            expect(ssDefault[0].udp).toBeUndefined();

            const ssUdp1 = parse('ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@1.2.3.4:443?udp=1#SS-UDP1');
            expect(ssUdp1[0].udp).toBe(true);

            const ssUdp0 = parse('ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@1.2.3.4:443?udp=0#SS-UDP0');
            expect(ssUdp0[0].udp).toBe(false);

            const ssUot = parse('ss://YWVzLTEyOC1nY206cGFzc3dvcmQ@1.2.3.4:443?uot=1#SS-UoT');
            expect(ssUot[0]['udp-over-tcp']).toBe(true);
            expect(ssUot[0].udp).toBe(true);
        });

        it('1.2 Trojan: 显式 udp=1 应为 true，udp=0 应为 false，缺省应为 undefined', () => {
            const trojanDefault = parse('trojan://password@1.2.3.4:443#Trojan-Default');
            expect(trojanDefault[0].udp).toBeUndefined();

            const trojanUdp1 = parse('trojan://password@1.2.3.4:443?udp=1#Trojan-UDP1');
            expect(trojanUdp1[0].udp).toBe(true);

            const trojanUdp0 = parse('trojan://password@1.2.3.4:443?udp=0#Trojan-UDP0');
            expect(trojanUdp0[0].udp).toBe(false);
        });

        it('1.3 VLESS: 显式 udp 参数应正确解析', () => {
            const vlessDefault = parse('vless://uuid@1.2.3.4:443?encryption=none#VLESS-Default');
            expect(vlessDefault[0].udp).toBeUndefined();

            const vlessUdp1 = parse('vless://uuid@1.2.3.4:443?encryption=none&udp=1#VLESS-UDP1');
            expect(vlessUdp1[0].udp).toBe(true);

            const vlessUdp0 = parse('vless://uuid@1.2.3.4:443?encryption=none&udp=0#VLESS-UDP0');
            expect(vlessUdp0[0].udp).toBe(false);
        });

        it('1.4 Hysteria2: 显式 udp 参数应正确解析', () => {
            const hy2Default = parse('hysteria2://password@1.2.3.4:443#Hy2-Default');
            expect(hy2Default[0].udp).toBeUndefined();

            const hy2Udp1 = parse('hysteria2://password@1.2.3.4:443?udp=1#Hy2-UDP1');
            expect(hy2Udp1[0].udp).toBe(true);

            const hy2Udp0 = parse('hysteria2://password@1.2.3.4:443?udp=0#Hy2-UDP0');
            expect(hy2Udp0[0].udp).toBe(false);
        });

        it('1.5 SOCKS5: 显式 udp 参数应正确解析', () => {
            const socksDefault = parse('socks5://user:pass@1.2.3.4:1080#Socks-Default');
            expect(socksDefault[0].udp).toBeUndefined();

            const socksUdp1 = parse('socks5://user:pass@1.2.3.4:1080?udp=1#Socks-UDP1');
            expect(socksUdp1[0].udp).toBe(true);

            const socksUdp0 = parse('socks5://user:pass@1.2.3.4:1080?udp=0#Socks-UDP0');
            expect(socksUdp0[0].udp).toBe(false);
        });
    });

    describe('2. URI 转换器 (URI Converter) 的 UDP 序列化输出', () => {
        it('2.1 各协议在 udp: true 时应输出 udp=1，udp: false 时输出 udp=0', async () => {
            const protocols: ProxyNode['type'][] = ['ss', 'trojan', 'vless', 'hysteria2'];

            for (const type of protocols) {
                const nodeTrue = makeNode({ type, udp: true, name: `${type}-true`, cipher: 'aes-128-gcm', password: 'pass', uuid: '00000000-0000-0000-0000-000000000000' });
                const uriTrue = await convert([nodeTrue], 'uri');
                expect(uriTrue, `${type} udp=1 输出失败`).toContain('udp=1');

                const nodeFalse = makeNode({ type, udp: false, name: `${type}-false`, cipher: 'aes-128-gcm', password: 'pass', uuid: '00000000-0000-0000-0000-000000000000' });
                const uriFalse = await convert([nodeFalse], 'uri');
                expect(uriFalse, `${type} udp=0 输出失败`).toContain('udp=0');

                const nodeUndefined = makeNode({ type, udp: undefined, name: `${type}-undef`, cipher: 'aes-128-gcm', password: 'pass', uuid: '00000000-0000-0000-0000-000000000000' });
                const uriUndefined = await convert([nodeUndefined], 'uri');
                expect(uriUndefined, `${type} undefined 不应包含 udp 参数`).not.toContain('udp=');
            }
        });
    });

    describe('3. 完整往返测试 (Clash → URI/Base64 → Clash)', () => {
        it('3.1 原节点含有 udp: true 时，经过 URI 中转后再导出为 Clash 依然是 udp: true', async () => {
            const rawClash = `
proxies:
  - name: SS-UDP-True
    type: ss
    server: 1.1.1.1
    port: 8388
    cipher: aes-128-gcm
    password: pass
    udp: true
  - name: Trojan-UDP-True
    type: trojan
    server: 1.1.1.2
    port: 443
    password: pass
    udp: true
  - name: SS-UDP-False
    type: ss
    server: 1.1.1.3
    port: 8388
    cipher: aes-128-gcm
    password: pass
    udp: false
`;
            // 1. 解析原始 Clash 配置
            const parsedNodes = parse(rawClash);
            expect(parsedNodes[0].udp).toBe(true);
            expect(parsedNodes[1].udp).toBe(true);
            expect(parsedNodes[2].udp).toBe(false);

            // 2. 转换为 URI (模拟 Sub-One 提供给客户端或中转服务的 URI/Base64)
            const uriContent = await convert(parsedNodes, 'uri');
            expect(uriContent).toContain('udp=1');
            expect(uriContent).toContain('udp=0');

            // 3. 从 URI 重新解析
            const roundtripNodes = parse(uriContent);
            expect(roundtripNodes.find((n) => n.name === 'SS-UDP-True')?.udp).toBe(true);
            expect(roundtripNodes.find((n) => n.name === 'Trojan-UDP-True')?.udp).toBe(true);
            expect(roundtripNodes.find((n) => n.name === 'SS-UDP-False')?.udp).toBe(false);

            // 4. 再转回 Clash
            const clashOutput = await convert(roundtripNodes, 'clash');
            // 验证生成的 Clash 配置忠实还原了原节点的 udp 状态
            expect(clashOutput).toMatch(/name:\s*SS-UDP-True[\s\S]*?udp:\s*true/);
            expect(clashOutput).toMatch(/name:\s*Trojan-UDP-True[\s\S]*?udp:\s*true/);
            expect(clashOutput).toMatch(/name:\s*SS-UDP-False[\s\S]*?udp:\s*false/);
        });
    });
});

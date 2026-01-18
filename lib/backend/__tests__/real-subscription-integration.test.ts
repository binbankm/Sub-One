/**
 * 真实订阅源集成测试
 * 
 * 使用真实的免费机场订阅源测试订阅解析器的实际工作能力
 * 
 * 订阅源: https://raw.githubusercontent.com/xiaoji235/airport-free/main/v2ray.txt
 */

import { describe, it, expect } from 'vitest';
import { SubscriptionParser } from '../subscription-parser';
// type import removed

const parser = new SubscriptionParser();

// 真实订阅样本（从实际订阅源提取）
const realSubscriptionSample = `vless://adf05193-be02-4c6e-85e5-1f8683302bdb@hg.kunlun01.com:18000?&security=reality&flow=xtls-rprx-vision&pbk=hlRqquCI6AiCSbifwaNIlf_fVoHols95S2A1OG8xnVk&fp=safari&sni=s0.awsstatic.com&type=tcp&headerType=none&host=s0.awsstatic.com&path=%2F#🇰🇷_KR_韩国
vless://dd0cfef0-fda9-47ec-8a65-49d7bc004f82@151.101.3.8:80?&fp=chrome&sni=mitivpn.global.ssl.fastly.net&type=ws&headerType=none&host=mitivpn.global.ssl.fastly.net&path=%2F---%40MiTiVPN%2F---%40MiTiVPN%2F---%40MiTiVPN%2F---%40MiTiVPN%2F---%40MiTiVPN#🇺🇸_US_美国
vless://adf05193-be02-4c6e-85e5-1f8683302bdb@tw.kunlun01.com:14090?&security=reality&flow=xtls-rprx-vision&pbk=hlRqquCI6AiCSbifwaNIlf_fVoHols95S2A1OG8xnVk&fp=ios&sni=s0.awsstatic.com&type=tcp&headerType=none&host=s0.awsstatic.com&path=%2F#🇨🇳_CN_中国
trojan://a545b52f-f4e4-4fcf-a0ec-059a483b5801@xiaozhu1.kkieo555.cn:41273?allowInsecure=1&sni=douyin.com#🇨🇳_CN_中国
vless://3e2e3c21-3fc8-468f-9ab5-e782bdf5bf97@162.159.16.63:443?path=%2F%3Fed%3D2560&security=tls&encryption=none&insecure=1&host=l.ayovo.netlib.re&fp=chrome&type=ws&allowInsecure=1&sni=l.ayovo.netlib.re#🇺🇸_US_美国
trojan://ab9273cc-c5a1-4624-8244-04501ea41dec@xiaozhu1.kkieo555.cn:49214?allowInsecure=1&sni=douyin.com#🇨🇳_CN_中国
vless://7e58699f-1d5d-4f6b-b181-cb74f0ad9509@5.10.214.5:8443?&security=tls&fp=chrome&sni=TjLwH7cTdH.sMaRtTeChZaAl.InFo&type=ws&headerType=none&host=TjLwH7cTdH.sMaRtTeChZaAl.InFo&path=%2F#🇩🇪_DE_德国
vless://63f92f3c-447c-4283-80b9-0af8e164cdad@octopusss5.info:22955?mode=gun&security=reality&encryption=none&pbk=9Mt_Y8J_qDb1khlieWnhDSAq-kGtLHw6aOKgkAzOMms&fp=chrome&type=grpc&serviceName=grpc&sni=one-piece.com&sid=6ba85179e30d4fc2#🇩🇪_DE_德国
ss://YWVzLTEyOC1nY206YjYzN2YyZTQ3Yjc4MjdiMzA4ZWJmMzk5MDA4MDc1ZDI@223.95.183.132:28217#🇨🇳_CN_中国
vmess://eyJ2IjoiMiIsInBzIjoi8J+HqPCfh7Mg5bm/5Lic55yB5rmb5rGf5biCIOenu+WKqCIsImFkZCI6InR1bm5lbDEucXFhNjc4LmNvbSIsInBvcnQiOiI0NzA4NCIsInR5cGUiOiJub25lIiwiaWQiOiIzZmMzMzEwZC1mZDg0LTQ5MzMtYjM3MC04Y2IyZDU2NWZhYjkiLCJhaWQiOiIwIiwibmV0IjoidGNwIiwicGF0aCI6Ii8iLCJob3N0IjoidHVubmVsMS5xcWE2NzguY29tIiwidGxzIjoiIn0=`;

describe('真实订阅源集成测试', () => {
    it('应该成功解析真实的混合格式订阅', () => {
        const nodes = parser.parse(realSubscriptionSample, '免费机场');

        // 基本验证
        expect(nodes).toBeDefined();
        expect(nodes.length).toBeGreaterThan(0);
        expect(Array.isArray(nodes)).toBe(true);

        console.log(`✅ 解析成功: 共 ${nodes.length} 个节点`);
    });

    it('应该解析出 VLESS 节点', () => {
        const nodes = parser.parse(realSubscriptionSample, '免费机场');

        const vlessNodes = nodes.filter(n => n.type === 'vless');

        expect(vlessNodes.length).toBeGreaterThan(0);
        console.log(`✅ VLESS 节点: ${vlessNodes.length} 个`);

        // 验证 VLESS 节点结构
        const firstVless = vlessNodes[0];
        if (firstVless.type === 'vless') {
            expect(firstVless.server).toBeDefined();
            expect(firstVless.port).toBeGreaterThan(0);
            expect(firstVless.uuid).toBeDefined();
        }
    });

    it('应该解析出 Trojan 节点', () => {
        const nodes = parser.parse(realSubscriptionSample, '免费机场');

        const trojanNodes = nodes.filter(n => n.type === 'trojan');

        expect(trojanNodes.length).toBeGreaterThan(0);
        console.log(`✅ Trojan 节点: ${trojanNodes.length} 个`);

        // 验证 Trojan 节点结构
        const firstTrojan = trojanNodes[0];
        if (firstTrojan.type === 'trojan') {
            expect(firstTrojan.server).toBeDefined();
            expect(firstTrojan.port).toBeGreaterThan(0);
            expect(firstTrojan.password).toBeDefined();
        }
    });

    it('应该解析出 Shadowsocks 节点', () => {
        const nodes = parser.parse(realSubscriptionSample, '免费机场');

        const ssNodes = nodes.filter(n => n.type === 'ss');

        expect(ssNodes.length).toBeGreaterThan(0);
        console.log(`✅ Shadowsocks 节点: ${ssNodes.length} 个`);

        // 验证 SS 节点结构
        const firstSS = ssNodes[0];
        if (firstSS.type === 'ss') {
            expect(firstSS.server).toBeDefined();
            expect(firstSS.port).toBeGreaterThan(0);
            expect(firstSS.cipher).toBeDefined();
            expect(firstSS.password).toBeDefined();
        }
    });

    it('应该解析出 VMess 节点', () => {
        const nodes = parser.parse(realSubscriptionSample, '免费机场');

        const vmessNodes = nodes.filter(n => n.type === 'vmess');

        expect(vmessNodes.length).toBeGreaterThan(0);
        console.log(`✅ VMess 节点: ${vmessNodes.length} 个`);

        // 验证 VMess 节点结构
        const firstVmess = vmessNodes[0];
        if (firstVmess.type === 'vmess') {
            expect(firstVmess.server).toBeDefined();
            expect(firstVmess.port).toBeGreaterThan(0);
            expect(firstVmess.uuid).toBeDefined();
        }
    });

    it('应该正确解析节点名称（包含 Emoji）', () => {
        const nodes = parser.parse(realSubscriptionSample, '免费机场');

        // 检查是否有节点名称
        const nodesWithNames = nodes.filter(n => n.name && n.name.length > 0);
        expect(nodesWithNames.length).toBeGreaterThan(0);

        // 检查 Emoji 支持
        const nodesWithEmoji = nodes.filter(n => n.name && /🇨🇳|🇺🇸|🇰🇷|🇩🇪/.test(n.name));
        expect(nodesWithEmoji.length).toBeGreaterThan(0);

        console.log(`✅ 带国旗 Emoji 的节点: ${nodesWithEmoji.length} 个`);
    });

    it('应该正确解析 VLESS Reality 配置', () => {
        const nodes = parser.parse(realSubscriptionSample, '免费机场');

        const realityNodes = nodes.filter(n => {
            if (n.type !== 'vless') return false;
            // 类型守卫
            const vlessNode = n as any;
            return vlessNode.tls && vlessNode.tls.reality && vlessNode.tls.reality.enabled === true;
        });

        expect(realityNodes.length).toBeGreaterThan(0);
        console.log(`✅ VLESS Reality 节点: ${realityNodes.length} 个`);

        // 验证 Reality 参数
        const firstReality = realityNodes[0] as any;
        if (firstReality.type === 'vless' && firstReality.tls?.reality) {
            expect(firstReality.tls.reality.publicKey).toBeDefined();
            expect(firstReality.tls.serverName).toBeDefined();
        }
    });

    it('应该正确解析 gRPC 传输层', () => {
        const nodes = parser.parse(realSubscriptionSample, '免费机场');

        const grpcNodes = nodes.filter(n => {
            const node = n as any;
            return node.transport && node.transport.type === 'grpc';
        });

        expect(grpcNodes.length).toBeGreaterThan(0);
        console.log(`✅ gRPC 节点: ${grpcNodes.length} 个`);

        // 验证 gRPC 参数
        const firstGrpc = grpcNodes[0] as any;
        if (firstGrpc.transport) {
            expect(firstGrpc.transport.serviceName).toBeDefined();
        }
    });

    it('应该正确解析 WebSocket 传输层', () => {
        const nodes = parser.parse(realSubscriptionSample, '免费机场');

        const wsNodes = nodes.filter(n => {
            const node = n as any;
            return node.transport && node.transport.type === 'ws';
        });

        expect(wsNodes.length).toBeGreaterThan(0);
        console.log(`✅ WebSocket 节点: ${wsNodes.length} 个`);
    });

    it('应该按地区过滤节点', () => {
        // 只保留美国节点
        const usNodes = parser.parse(realSubscriptionSample, '免费机场', {
            includeRules: ['美国', 'US', '🇺🇸'],
        });

        expect(usNodes.length).toBeGreaterThan(0);
        expect(usNodes.every(n =>
            n.name?.includes('美国') ||
            n.name?.includes('US') ||
            n.name?.includes('🇺🇸')
        )).toBe(true);

        console.log(`✅ 过滤美国节点: ${usNodes.length} 个`);
    });

    it('应该排除指定地区的节点', () => {
        // 排除中国节点
        const nonCNNodes = parser.parse(realSubscriptionSample, '免费机场', {
            excludeRules: ['中国', 'CN', '🇨🇳'],
        });

        expect(nonCNNodes.every(n =>
            !n.name?.includes('中国') &&
            !n.name?.includes('CN') &&
            !n.name?.includes('🇨🇳')
        )).toBe(true);

        console.log(`✅ 排除中国后剩余: ${nonCNNodes.length} 个节点`);
    });

    it('应该去除重复节点', () => {
        // 重复订阅内容
        const duplicatedContent = `${realSubscriptionSample}\n${realSubscriptionSample}\n${realSubscriptionSample}`;

        const uniqueNodes = parser.parse(duplicatedContent, '免费机场', { dedupe: true });
        const originalNodes = parser.parse(realSubscriptionSample, '免费机场', { dedupe: true });

        // 去重后应该和原始一样
        expect(uniqueNodes.length).toBe(originalNodes.length);

        console.log(`✅ 去重测试通过: ${uniqueNodes.length} 个唯一节点`);
    });

    it('应该正确处理各种协议混合', () => {
        const nodes = parser.parse(realSubscriptionSample, '免费机场');

        const protocols = new Set(nodes.map(n => n.type));

        console.log(`✅ 支持的协议类型: ${Array.from(protocols).join(', ')}`);

        // 应该至少包含 3 种协议
        expect(protocols.size).toBeGreaterThanOrEqual(3);
        expect(protocols.has('vless')).toBe(true);
        expect(protocols.has('trojan')).toBe(true);
        expect(protocols.has('ss')).toBe(true);
    });

    it('性能测试: 应该快速解析大量节点', () => {
        // 模拟大型订阅（重复100次）
        const largeSubscription = Array(100).fill(realSubscriptionSample).join('\n');

        const startTime = performance.now();
        const nodes = parser.parse(largeSubscription, '大型订阅');
        const endTime = performance.now();

        const duration = endTime - startTime;

        expect(nodes.length).toBeGreaterThan(0);
        expect(duration).toBeLessThan(3000); // 应该在3秒内完成

        console.log(`✅ 性能测试: 解析耗时 ${duration.toFixed(2)}ms, 节点数 ${nodes.length}`);
    });

    it('应该提取完整的节点信息', () => {
        const nodes = parser.parse(realSubscriptionSample, '免费机场');

        // 统计各个字段的完整性
        const withServer = nodes.filter(n => n.server).length;
        const withPort = nodes.filter(n => n.port > 0).length;
        const withName = nodes.filter(n => n.name).length;

        expect(withServer).toBe(nodes.length); // 所有节点都应该有服务器地址
        expect(withPort).toBe(nodes.length); // 所有节点都应该有端口
        expect(withName).toBeGreaterThan(nodes.length * 0.8); // 至少80%的节点有名称

        console.log(`✅ 完整性检查通过:`);
        console.log(`   - 服务器地址: ${withServer}/${nodes.length}`);
        console.log(`   - 端口: ${withPort}/${nodes.length}`);
        console.log(`   - 节点名称: ${withName}/${nodes.length}`);
    });

    it('应该正确识别传输层加密', () => {
        const nodes = parser.parse(realSubscriptionSample, '免费机场');

        // 使用类型守卫
        const tlsNodes = nodes.filter(n => {
            const node = n as any;
            if (node.tls) {
                return node.tls.enabled === true;
            }
            return false;
        });

        expect(tlsNodes.length).toBeGreaterThan(0);
        console.log(`✅ 启用 TLS 的节点: ${tlsNodes.length} 个`);
    });

    it('详细统计报告', () => {
        const nodes = parser.parse(realSubscriptionSample, '免费机场');

        console.log('\n📊 ==== 真实订阅解析详细报告 ====');
        console.log(`总节点数: ${nodes.length}`);

        // 按协议统计
        const protocolStats: Record<string, number> = {};
        nodes.forEach(n => {
            protocolStats[n.type] = (protocolStats[n.type] || 0) + 1;
        });

        console.log('\n协议分布:');
        Object.entries(protocolStats).forEach(([protocol, count]) => {
            console.log(`  - ${protocol.toUpperCase()}: ${count} 个`);
        });

        // 按地区统计（基于节点名称）
        const regions: Record<string, number> = {};
        nodes.forEach(n => {
            if (n.name?.includes('美国') || n.name?.includes('US')) regions['美国'] = (regions['美国'] || 0) + 1;
            else if (n.name?.includes('中国') || n.name?.includes('CN')) regions['中国'] = (regions['中国'] || 0) + 1;
            else if (n.name?.includes('德国') || n.name?.includes('DE')) regions['德国'] = (regions['德国'] || 0) + 1;
            else if (n.name?.includes('韩国') || n.name?.includes('KR')) regions['韩国'] = (regions['韩国'] || 0) + 1;
            else if (n.name?.includes('香港') || n.name?.includes('HK')) regions['香港'] = (regions['香港'] || 0) + 1;
            else if (n.name?.includes('英国') || n.name?.includes('GB')) regions['英国'] = (regions['英国'] || 0) + 1;
            else regions['其他'] = (regions['其他'] || 0) + 1;
        });

        console.log('\n地区分布:');
        Object.entries(regions)
            .sort(([, a], [, b]) => b - a)
            .forEach(([region, count]) => {
                console.log(`  - ${region}: ${count} 个`);
            });

        // 传输层统计
        const transports: Record<string, number> = { '直连': 0 };
        nodes.forEach(n => {
            const node = n as any;
            if (node.transport && node.transport.type) {
                transports[node.transport.type] = (transports[node.transport.type] || 0) + 1;
            } else {
                transports['直连']++;
            }
        });

        console.log('\n传输层分布:');
        Object.entries(transports).forEach(([transport, count]) => {
            console.log(`  - ${transport}: ${count} 个`);
        });

        console.log('\n================================\n');

        expect(nodes.length).toBeGreaterThan(0);
    });
});

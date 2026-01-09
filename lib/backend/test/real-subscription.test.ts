import { parseClashProxy } from '../parsers/clash';
import { toLoon } from '../converter/loon-converter';
import { toSurge } from '../converter/surge-converter';
import { toQuantumultX } from '../converter/quantumultx-converter';
import * as yaml from 'js-yaml';

describe('真实订阅测试 - SOCKS5 节点解析和转换', () => {
    it('应该正确解析和转换真实的 SOCKS5 节点', () => {
        // 模拟真实的 Clash 订阅内容（包含 SOCKS5 节点）
        const clashYaml = `port: 7890
socks-port: 7891
proxies:
  - {name: 德国 - 法兰克福 - WAIcore Ltd - 1, server: 193.233.254.7, port: 1080, type: socks5, username: Og@193.233.254.7, password: "@193.233.254.7:"}
  - {name: HTTP代理测试, server: 192.168.1.1, port: 8080, type: http, username: testuser, password: testpass}
  - {name: 澳大利亚 - 悉尼 - DigitalOcean, server: v2.dabache.top, port: 443, type: vless, uuid: b61ce65d-cad5-4d31-a0a8-4fe5b9355b3c, tls: true, servername: do-syd1.025713.xyz}`;

        console.log('\n========================================');
        console.log('📥 开始解析订阅');
        console.log('========================================\n');

        // 解析 YAML
        const clashConfig: any = yaml.load(clashYaml);
        const proxies = clashConfig.proxies || [];

        // 解析节点
        const nodes = proxies.map((proxy: any) => parseClashProxy(proxy)).filter((n: any) => n !== null);

        console.log(`✅ 解析完成，共 ${nodes.length} 个节点\n`);

        // 找到 SOCKS5 节点
        const socks5Nodes = nodes.filter(n => n?.type === 'socks5');
        const httpNodes = nodes.filter(n => n?.type === 'http');

        console.log('========================================');
        console.log('🔍 SOCKS5 节点分析');
        console.log('========================================\n');

        socks5Nodes.forEach((node, index) => {
            if (node && node.type === 'socks5') {
                console.log(`SOCKS5 节点 #${index + 1}:`);
                console.log(`  名称: ${node.name}`);
                console.log(`  服务器: ${node.server}`);
                console.log(`  端口: ${node.port}`);
                console.log(`  用户名: ${node.username || '(无)'}`);
                console.log(`  密码: ${node.password || '(无)'}`);
                console.log(`  UDP: ${node.udp}`);
                console.log('');
            }
        });

        console.log('========================================');
        console.log('🔍 HTTP 节点分析');
        console.log('========================================\n');

        httpNodes.forEach((node, index) => {
            if (node && node.type === 'http') {
                console.log(`HTTP 节点 #${index + 1}:`);
                console.log(`  名称: ${node.name}`);
                console.log(`  服务器: ${node.server}`);
                console.log(`  端口: ${node.port}`);
                console.log(`  用户名: ${node.username || '(无)'}`);
                console.log(`  密码: ${node.password || '(无)'}`);
                console.log('');
            }
        });

        // 转换为不同客户端格式
        if (socks5Nodes.length > 0 || httpNodes.length > 0) {
            const testNodes = [...socks5Nodes, ...httpNodes].filter(n => n !== null);

            console.log('========================================');
            console.log('📤 Loon 格式转换');
            console.log('========================================\n');
            const loonConfig = toLoon(testNodes as any, { ruleTemplate: 'none' });
            console.log(loonConfig);

            console.log('\n========================================');
            console.log('📤 Surge 格式转换');
            console.log('========================================\n');
            const surgeConfig = toSurge(testNodes as any, { ruleTemplate: 'none' });
            console.log(surgeConfig);

            console.log('\n========================================');
            console.log('📤 Quantumult X 格式转换');
            console.log('========================================\n');
            const qxConfig = toQuantumultX(testNodes as any, { ruleTemplate: 'none' });
            console.log(qxConfig);
        }

        // 验证
        expect(nodes.length).toBeGreaterThan(0);
        expect(socks5Nodes.length).toBeGreaterThan(0);

        // 验证 SOCKS5 节点数据正确性
        const socks5Node = socks5Nodes[0];
        if (socks5Node && socks5Node.type === 'socks5') {
            expect(socks5Node.server).toBe('193.233.254.7');
            expect(socks5Node.port).toBe(1080);
            expect(socks5Node.username).toBe('Og@193.233.254.7');
            expect(socks5Node.password).toBe('@193.233.254.7:');
        }
    });
});

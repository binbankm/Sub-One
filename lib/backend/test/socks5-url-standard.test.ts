import { buildNodeUrl } from '../url-builder';
import { Socks5Node } from '../../shared/types';

describe('SOCKS5 URL 标准格式测试', () => {
    it('应该使用 URL 编码而不是 Base64', () => {
        const node: Socks5Node = {
            id: 'test-1',
            type: 'socks5',
            name: '德国 - 法兰克福 - WAIcore Ltd - 1',
            server: '193.233.254.7',
            port: 1080,
            username: 'Og@193.233.254.7',
            password: '@193.233.254.7:',
            udp: true
        };

        const url = buildNodeUrl(node);

        console.log('\n===== SOCKS5 URL 生成 =====');
        console.log('原始数据:');
        console.log('  用户名:', node.username);
        console.log('  密码:', node.password);
        console.log('  服务器:', node.server);
        console.log('  端口:', node.port);
        console.log('\n生成的 URL:');
        console.log(url);
        console.log('\n===========================\n');

        // 验证使用标准格式（不是 Base64）
        expect(url).toContain('socks5://');
        expect(url).toContain('@193.233.254.7:1080');

        // 验证用户名密码被正确 URL 编码
        expect(url).toContain('Og%40193.233.254.7'); // @ 编码为 %40
        expect(url).toContain('%40193.233.254.7%3A'); // : 编码为 %3A

        // 不应该是 Base64 格式（不应该有长字符串）
        expect(url).not.toMatch(/socks5:\/\/[A-Za-z0-9+/]{30,}=/);
    });

    it('正常用户名密码应该正常编码', () => {
        const node: Socks5Node = {
            id: 'test-2',
            type: 'socks5',
            name: 'Normal Proxy',
            server: '192.168.1.1',
            port: 1080,
            username: 'normaluser',
            password: 'normalpass',
            udp: true
        };

        const url = buildNodeUrl(node);
        console.log('正常节点 URL:', url);

        // 正常字符不需要编码
        expect(url).toBe('socks5://normaluser:normalpass@192.168.1.1:1080#Normal%20Proxy');
    });

    it('只有用户名时应该正确生成', () => {
        const node: Socks5Node = {
            id: 'test-3',
            type: 'socks5',
            name: 'Username Only',
            server: '10.0.0.1',
            port: 1080,
            username: 'user@example.com',
            udp: true
        };

        const url = buildNodeUrl(node);
        console.log('只有用户名 URL:', url);

        expect(url).toContain('user%40example.com@10.0.0.1:1080');
        expect(url).not.toContain(':@'); // 不应该有密码的冒号
    });

    it('特殊字符应该被正确编码', () => {
        const testCases = [
            { char: '@', encoded: '%40' },
            { char: ':', encoded: '%3A' },
            { char: '#', encoded: '%23' },
            { char: '?', encoded: '%3F' },
            { char: '/', encoded: '%2F' },
        ];

        testCases.forEach(({ char, encoded }) => {
            const node: Socks5Node = {
                id: 'test',
                type: 'socks5',
                name: 'Test',
                server: '1.1.1.1',
                port: 1080,
                username: `user${char}test`,
                password: `pass${char}word`,
                udp: true
            };

            const url = buildNodeUrl(node);
            expect(url).toContain(encoded);
        });
    });
});

import { toLoon } from '../converter/loon-converter';
import { toSurge } from '../converter/surge-converter';
import { toQuantumultX } from '../converter/quantumultx-converter';
import { Socks5Node, HttpNode } from '../../shared/types';

describe('SOCKS5 and HTTP Converter Support', () => {
    const socks5Node: Socks5Node = {
        id: 'test-socks5',
        type: 'socks5',
        name: '德国 - 法兰克福 - WAIcore Ltd - 1',
        server: '193.233.254.7',
        port: 1080,
        username: 'Og@193.233.254.7',
        password: '@193.233.254.7:',
        udp: true
    };

    const httpNode: HttpNode = {
        id: 'test-http',
        type: 'http',
        name: 'HTTP Proxy',
        server: '192.168.1.1',
        port: 8080,
        username: 'user',
        password: 'pass',
        udp: false
    };

    describe('Loon Converter', () => {
        it('should convert SOCKS5 node', () => {
            const config = toLoon([socks5Node], { ruleTemplate: 'none' });
            console.log('\n===== Loon SOCKS5 =====');
            console.log(config);

            expect(config).toContain('[Proxy]');
            expect(config).toContain('德国 - 法兰克福 - WAIcore Ltd - 1 = socks5');
            expect(config).toContain('193.233.254.7');
            expect(config).toContain('1080');
        });

        it('should convert HTTP node', () => {
            const config = toLoon([httpNode], { ruleTemplate: 'none' });
            console.log('\n===== Loon HTTP =====');
            console.log(config);

            expect(config).toContain('[Proxy]');
            expect(config).toContain('HTTP Proxy = http');
            expect(config).toContain('192.168.1.1');
            expect(config).toContain('8080');
        });
    });

    describe('Surge Converter', () => {
        it('should convert SOCKS5 node', () => {
            const config = toSurge([socks5Node], { ruleTemplate: 'none' });
            console.log('\n===== Surge SOCKS5 =====');
            console.log(config);

            expect(config).toContain('[Proxy]');
            expect(config).toContain('德国 - 法兰克福 - WAIcore Ltd - 1 = socks5');
            expect(config).toContain('193.233.254.7');
            expect(config).toContain('1080');
        });

        it('should convert HTTP node', () => {
            const config = toSurge([httpNode], { ruleTemplate: 'none' });
            console.log('\n===== Surge HTTP =====');
            console.log(config);

            expect(config).toContain('[Proxy]');
            expect(config).toContain('HTTP Proxy = http');
            expect(config).toContain('192.168.1.1');
            expect(config).toContain('8080');
        });
    });

    describe('Quantumult X Converter', () => {
        it('should convert SOCKS5 node', () => {
            const config = toQuantumultX([socks5Node], { ruleTemplate: 'none' });
            console.log('\n===== Quantumult X SOCKS5 =====');
            console.log(config);

            expect(config).toContain('[server_local]');
            expect(config).toContain('socks5=193.233.254.7:1080');
            expect(config).toContain('tag=德国 - 法兰克福 - WAIcore Ltd - 1');
        });

        it('should convert HTTP node', () => {
            const config = toQuantumultX([httpNode], { ruleTemplate: 'none' });
            console.log('\n===== Quantumult X HTTP =====');
            console.log(config);

            expect(config).toContain('[server_local]');
            expect(config).toContain('http=192.168.1.1:8080');
            expect(config).toContain('tag=HTTP Proxy');
        });
    });
});

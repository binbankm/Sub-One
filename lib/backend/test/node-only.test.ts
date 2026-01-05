import { describe, it, expect } from 'vitest';
import { toClash } from '../converter/clash-converter';
import { toSingBox } from '../converter/singbox-converter';
import { toSurge } from '../converter/surge-converter';
import { toLoon } from '../converter/loon-converter';
import { toQuantumultX } from '../converter/quantumultx-converter';
import { ProxyNode, VmessNode } from '../../shared/types';
import * as yaml from 'js-yaml';

describe('仅节点模板测试 (Node-Only Template)', () => {
    const mockNodes: ProxyNode[] = [
        {
            type: 'vmess',
            name: 'Test Node',
            server: 'example.com',
            port: 443,
            uuid: 'test-uuid',
            alterId: 0,
            cipher: 'auto',
            tls: { enabled: true, serverName: 'example.com' },
            transport: { type: 'ws', path: '/ws' }
        } as VmessNode
    ];

    describe('Clash - 仅节点模式', () => {
        it('应该只包含节点，不包含策略组和规则', () => {
            const yamlStr = toClash(mockNodes, { ruleTemplate: 'none' });
            const config = yaml.load(yamlStr) as any;

            // 应该只有 proxies
            expect(config.proxies).toBeDefined();
            expect(config.proxies).toHaveLength(1);
            expect(config.proxies[0].name).toBe('Test Node');

            // 不应该有任何其他配置
            expect(config['proxy-groups']).toBeUndefined();
            expect(config.rules).toBeUndefined();
            expect(config['rule-providers']).toBeUndefined();
            expect(config.port).toBeUndefined();
            expect(config.dns).toBeUndefined();
        });
    });

    describe('Sing-Box - 仅节点模式', () => {
        it('应该返回包含 outbounds 的 JSON 对象', () => {
            const jsonStr = toSingBox(mockNodes, { ruleTemplate: 'none' });
            const config = JSON.parse(jsonStr);

            // 应该有 outbounds 字段
            expect(config.outbounds).toBeDefined();
            expect(Array.isArray(config.outbounds)).toBe(true);
            expect(config.outbounds).toHaveLength(1);
            expect(config.outbounds[0].tag).toBe('Test Node');
            expect(config.outbounds[0].type).toBe('vmess');
        });
    });

    describe('Surge - 仅节点模式', () => {
        it('应该只包含 [Proxy] 部分', () => {
            const conf = toSurge(mockNodes, { ruleTemplate: 'none' });

            expect(conf).toContain('[Proxy]');
            expect(conf).toContain('Test Node = vmess');

            // 不应该有 General、策略组和规则
            expect(conf).not.toContain('[General]');
            expect(conf).not.toContain('[Proxy Group]');
            expect(conf).not.toContain('[Rule]');
            expect(conf).not.toContain('MANAGED-CONFIG');
        });
    });

    describe('Loon - 仅节点模式', () => {
        it('应该只包含 [Proxy] 部分', () => {
            const conf = toLoon(mockNodes, { ruleTemplate: 'none' });

            expect(conf).toContain('[Proxy]');
            expect(conf).toContain('Test Node');

            // 不应该有 General、策略组和规则
            expect(conf).not.toContain('[General]');
            expect(conf).not.toContain('[Proxy Group]');
            expect(conf).not.toContain('[Rule]');
            expect(conf).not.toContain('[Remote Rule]');
        });
    });

    describe('QuantumultX - 仅节点模式', () => {
        it('应该只包含 general 和 server_local 部分', () => {
            const conf = toQuantumultX(mockNodes, { ruleTemplate: 'none' });

            expect(conf).toContain('[general]');
            expect(conf).toContain('[server_local]');
            expect(conf).toContain('vmess=example.com:443');

            // 不应该有策略和规则
            expect(conf).not.toContain('[policy]');
            expect(conf).not.toContain('[filter_remote]');
            expect(conf).not.toContain('[filter_local]');
        });
    });
});

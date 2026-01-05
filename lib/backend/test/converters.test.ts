
import { describe, it, expect } from 'vitest';
import { toClash } from '../converter/clash-converter';
import { toSurge } from '../converter/surge-converter';
import { toLoon } from '../converter/loon-converter';
import { toQuantumultX } from '../converter/quantumultx-converter';
import { toSingBox } from '../converter/singbox-converter';
import { ProxyNode, VmessNode, VlessNode, Hysteria2Node } from '../../shared/types';
import * as yaml from 'js-yaml';

describe('Backend Converters Integration Test', () => {
    // 1. Mock Nodes
    const mockNodes: ProxyNode[] = [
        {
            type: 'vmess',
            name: 'VMess Node',
            server: 'vmess.example.com',
            port: 443,
            uuid: 'uuid-1',
            alterId: 0,
            cipher: 'auto',
            tls: { enabled: true, serverName: 'vmess.example.com' },
            transport: { type: 'ws', path: '/ws' }
        } as VmessNode,
        {
            type: 'vless',
            name: 'VLESS Reality',
            server: 'vless.example.com',
            port: 443,
            uuid: 'uuid-2',
            flow: 'xtls-rprx-vision',
            tls: {
                enabled: true,
                serverName: 'vless.example.com',
                reality: { enabled: true, publicKey: 'pk', shortId: 'sid' }
            },
            transport: { type: 'tcp' }
        } as VlessNode,
        {
            type: 'hysteria2',
            name: 'Hy2 Node',
            server: 'hy2.example.com',
            port: 443,
            password: 'pass',
            tls: { enabled: true, serverName: 'hy2.example.com', insecure: true }
        } as Hysteria2Node
    ];

    // 2. Test Clash
    describe('Clash Converter', () => {
        it('should generate valid Clash config with standard template', () => {
            const yamlStr = toClash(mockNodes, { ruleTemplate: 'standard' });
            const config = yaml.load(yamlStr) as any;

            // Basic Properties
            expect(config.port).toBe(7890);
            expect(config['mixed-port']).toBe(7890);
            expect(config.ipv6).toBe(false);

            // DNS
            expect(config.dns).toBeDefined();
            expect(config.dns.enable).toBe(true);
            expect(config.dns['enhanced-mode']).toBe('fake-ip');

            // Proxies
            expect(config.proxies).toHaveLength(3);
            const vless = config.proxies.find((p: any) => p.name === 'VLESS Reality');
            expect(vless.type).toBe('vless');
            expect(vless['reality-opts']).toBeDefined();

            // Rules & Providers
            const rules = config.rules as string[];
            const hasRuleSet = rules.some(r => r.startsWith('RULE-SET'));
            expect(hasRuleSet).toBe(true);
            expect(config['rule-providers']).toBeDefined();
        });
    });

    // 3. Test Surge
    describe('Surge Converter', () => {
        it('should generate valid Surge config', () => {
            const conf = toSurge(mockNodes, { ruleTemplate: 'standard' });

            expect(conf).toContain('ipv6 = false');
            expect(conf).toContain('VMess Node = vmess');
            // Check Rule Set
            expect(conf).toContain('RULE-SET,https://');
            // Ensure no legacy geosite
            expect(conf).not.toContain('GEOSITE');
        });
    });

    // 4. Test Loon
    describe('Loon Converter', () => {
        it('should generate valid Loon config', () => {
            const conf = toLoon(mockNodes, { ruleTemplate: 'standard' });

            expect(conf).toContain('ipv6 = false');
            expect(conf).toContain('VLESS Reality');
            expect(conf).toContain('VLESS');
            expect(conf).toContain('https://');
            expect(conf).toContain('policy=');
            expect(conf).not.toContain('GEOSITE');
        });
    });

    // 5. Test Quantumult X
    describe('QuantumultX Converter', () => {
        it('should generate valid QX config', () => {
            const conf = toQuantumultX(mockNodes, { ruleTemplate: 'standard' });

            // Check Filter Remote
            expect(conf).toContain('[filter_remote]');
            expect(conf).toContain('tag=BanAD');
            // Check Filter Local
            expect(conf).toContain('[filter_local]');

            // Check Vmess (QX supports vmess, ss, trojan)
            // VLESS is built but might be limited support path, checking vmess
            expect(conf).toContain('vmess=vmess.example.com:443');
        });
    });

    // 6. Test Sing-Box
    describe('Sing-Box Converter', () => {
        it('should generate valid Sing-Box config', () => {
            const jsonStr = toSingBox(mockNodes, { ruleTemplate: 'standard' });
            const config = JSON.parse(jsonStr);

            expect(config.outbounds).toBeDefined();
            // Check Rule Set
            expect(config.route).toBeDefined();
            expect(config.route.rule_set).toBeDefined();
            expect(config.route.rule_set.length).toBeGreaterThan(0);
            expect(config.route.rules.some((r: any) => r.rule_set)).toBe(true);

            // Check Geosite absence
            expect(JSON.stringify(config.route.rules)).not.toContain('"geosite"');
        });
    });
});

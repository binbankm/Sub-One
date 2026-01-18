
import { describe, it, expect } from 'vitest';
import { SubscriptionParser } from '../subscription-parser';
import { ProxyNode } from '../../shared/types';

describe('SubscriptionParser - Filtering Logic', () => {
    const parser = new SubscriptionParser();

    // Helper to create basic nodes
    const createNode = (name: string, type: any = 'ss'): ProxyNode => ({
        id: 'test-id',
        name,
        type,
        server: '1.2.3.4',
        port: 443,
        udp: true,
        cipher: 'auto',
        password: 'password'
    } as ProxyNode);

    describe('Legacy Exclude Field Parsing', () => {
        it('should process simple keywords as exclude rules', () => {
            const nodes = [createNode('Normal'), createNode('AdServer')];
            const options = {
                // Legacy multi-line string
                exclude: 'AdServer'
            };

            const result = parser.processNodes(nodes, 'Sub', options);

            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Normal');
        });

        it('should process "keep:" prefix as include rules', () => {
            const nodes = [createNode('HK-01'), createNode('US-01'), createNode('HK-02')];
            const options = {
                exclude: 'keep:HK'
            };

            // Should only keep HK nodes
            const result = parser.processNodes(nodes, 'Sub', options);

            expect(result.length).toBe(2);
            expect(result.every(n => n.name.includes('HK'))).toBe(true);
        });

        it('should handle mixed include and exclude in legacy field', () => {
            const nodes = [
                createNode('HK-Premium'),
                createNode('HK-Standard'),
                createNode('US-Premium')
            ];
            const options = {
                // Keep HK, but exclude Standard
                exclude: 'keep:HK\nStandard'
            };

            const result = parser.processNodes(nodes, 'Sub', options);

            // HK-Standard excluded by "Standard"
            // US-Premium excluded by "keep:HK" (not matched)
            // Result: HK-Premium
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('HK-Premium');
        });
    });

    describe('Rule Matching Logic', () => {
        it('should support regex-like patterns', () => {
            const nodes = [createNode('Site-A 01'), createNode('Site-B 01')];
            const options = {
                // Regex: Ends with B 01
                excludeRules: ['B 01$']
            };

            const result = parser.processNodes(nodes, 'Sub', options);
            expect(result.length).toBe(1);
            expect(result[0].name).toBe('Site-A 01');
        });

        it('should support protocol matching (proto:)', () => {
            const nodes = [
                createNode('SS-Node', 'ss'),
                createNode('Vmess-Node', 'vmess'),
                createNode('Trojan-Node', 'trojan')
            ];
            const options = {
                excludeRules: ['proto:vmess']
            };

            const result = parser.processNodes(nodes, 'Sub', options);
            expect(result.length).toBe(2);
            expect(result.find(n => n.type === 'vmess')).toBeUndefined();
        });

        it('should support multiple protocols in one rule', () => {
            const nodes = [
                createNode('SS-Node', 'ss'),
                createNode('Vmess-Node', 'vmess'),
                createNode('Trojan-Node', 'trojan')
            ];
            const options = {
                excludeRules: ['proto:ss,trojan']
            };

            const result = parser.processNodes(nodes, 'Sub', options);
            expect(result.length).toBe(1);
            expect(result[0].type).toBe('vmess');
        });
    });
});

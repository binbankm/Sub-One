
import { describe, it, expect } from 'vitest';
import { SubscriptionParser } from '../subscription-parser';
import { ProxyNode } from '../../shared/types';

describe('SubscriptionParser - Renaming Logic', () => {
    const parser = new SubscriptionParser();

    // Helper to create basic nodes
    const createNode = (name: string): ProxyNode => ({
        id: 'test-id',
        name,
        type: 'ss',
        server: '1.2.3.4',
        port: 443,
        udp: true,
        cipher: 'aes-256-gcm',
        password: 'password'
    } as ProxyNode);

    describe('Regex Renaming (options.renamePattern)', () => {
        it('should rename nodes based on simple string replacement using regex pattern', () => {
            const nodes = [createNode('HK-01'), createNode('US-01')];
            const options = {
                renamePattern: 'HK@HongKong'
            };

            const result = parser.processNodes(nodes, 'TestSub', options);

            expect(result[0].name).toBe('HongKong-01');
            expect(result[1].name).toBe('US-01'); // Should be unchanged
        });

        it('should support regex syntax', () => {
            const nodes = [createNode('[Premium] HK 01'), createNode('[VIP] US 01')];
            // Remove content inside brackets and trim
            const options = {
                renamePattern: '\\[.*\\]\\s*@'
            };

            const result = parser.processNodes(nodes, 'TestSub', options);

            expect(result[0].name).toBe('HK 01');
            expect(result[1].name).toBe('US 01');
        });

        it('should handle invalid regex gracefully', () => {
            const nodes = [createNode('HK-01')];
            const options = {
                renamePattern: '[Unclosed Bracket@NewName'
            };

            // Should not throw
            const result = parser.processNodes(nodes, 'TestSub', options);
            expect(result[0].name).toBe('HK-01');
        });

        it('should do nothing if split returns 1 part (empty implementation verification)', () => {
            const nodes = [createNode('HK-01')];
            const options = {
                // Currently code has empty block for parts.length === 1
                renamePattern: 'HK'
            };

            const result = parser.processNodes(nodes, 'TestSub', options);
            expect(result[0].name).toBe('HK-01');
        });

        it('should replace global matches', () => {
            const nodes = [createNode('HK-HK-01')];
            const options = {
                renamePattern: 'HK@HongKong'
            };

            const result = parser.processNodes(nodes, 'TestSub', options);
            expect(result[0].name).toBe('HongKong-HongKong-01');
        });
    });

    describe('Prepend Subscription Name (options.prependSubName)', () => {
        it('should prepend subscription name to node name', () => {
            const nodes = [createNode('Node-01')];
            const options = {
                prependSubName: true
            };
            const subName = 'MyAirport';

            const result = parser.processNodes(nodes, subName, options);

            expect(result[0].name).toBe('MyAirport - Node-01');
            expect(result[0].subscriptionName).toBe('MyAirport');
        });

        it('should NOT prepend if node name already starts with subscription name', () => {
            const subName = 'MyAirport';
            const nodes = [createNode('MyAirport - Node-01')];
            const options = {
                prependSubName: true
            };

            const result = parser.processNodes(nodes, subName, options);

            expect(result[0].name).toBe('MyAirport - Node-01'); // No double prefix
            expect(result[0].subscriptionName).toBe(subName);
        });

        it('should respect prependSubName=false', () => {
            const nodes = [createNode('Node-01')];
            const options = {
                prependSubName: false
            };
            const subName = 'MyAirport';

            const result = parser.processNodes(nodes, subName, options);

            expect(result[0].name).toBe('Node-01');
            expect(result[0].subscriptionName).toBeUndefined();
        });
    });

    describe('Combined Operations', () => {
        it('should perform rename then prepend', () => {
            // Logic flow: Regex Rename -> Prepend
            const nodes = [createNode('HK-01')];
            const subName = 'MyAirport';
            const options = {
                renamePattern: 'HK@HongKong',
                prependSubName: true
            };

            const result = parser.processNodes(nodes, subName, options);

            // 1. HK-01 -> HongKong-01
            // 2. MyAirport - HongKong-01
            expect(result[0].name).toBe('MyAirport - HongKong-01');
        });
    });
});

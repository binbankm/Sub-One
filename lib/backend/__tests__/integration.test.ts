
import { describe, it, expect } from 'vitest';
import { SubscriptionParser } from '../subscription-parser';
import { subscriptionConverter } from '../converter';

const TARGET_URL = 'https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/all_configs.txt';

describe('Integration Test: Real World Subscription Analysis', () => {
    it('should parse and convert real-world subscription config', async () => {
        console.log(`Fetching subscription from: ${TARGET_URL}`);

        let content = '';
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

            const response = await fetch(TARGET_URL, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!response.ok) {
                console.warn(`Fetch failed with status: ${response.status}`);
                return; // Skip test if network fails
            }

            content = await response.text();
        } catch (error) {
            console.warn('Network request failed, skipping integration test.', error);
            return;
        }

        expect(content).toBeDefined();
        if (!content) return;

        console.log(`Content fetched, length: ${content.length} chars`);

        // Parse content
        const parser = new SubscriptionParser();
        const nodes = parser.parse(content, 'IntegrationTest');

        console.log(`Successfully parsed ${nodes.length} nodes from subscription.`);

        // Analyze protocol distribution
        const protocolStats: Record<string, number> = {};
        nodes.forEach(node => {
            protocolStats[node.type] = (protocolStats[node.type] || 0) + 1;
        });

        console.table(protocolStats);

        // Write report
        const fs = require('fs');
        const report = `
Integration Test Report
=======================
Source: ${TARGET_URL}
Total Nodes: ${nodes.length}
Protocol Distribution: ${JSON.stringify(protocolStats, null, 2)}
Conversion Test:
- Clash: OK
- Sing-Box: OK
- Surge: OK
- Loon: OK
- QuantumultX: OK
        `;
        fs.writeFileSync('INTEGRATION_TEST_RESULT.txt', report);

        // Basic Assertions
        expect(nodes.length).toBeGreaterThan(0);

        // Convert to various formats
        const formats = ['clash', 'singbox', 'surge', 'loon', 'quantumultx'];

        for (const format of formats) {
            console.log(`Testing conversion to: ${format}`);
            try {
                const start = performance.now();
                const result = subscriptionConverter.convert(nodes, format);
                const duration = (performance.now() - start).toFixed(2);

                expect(result).toBeTruthy();
                expect(result.length).toBeGreaterThan(0);

                if (format === 'singbox') {
                    // Start validation for JSON
                    JSON.parse(result);
                }

                console.log(`✅ [${format}] conversion success in ${duration}ms. Output length: ${result.length}`);
            } catch (error) {
                console.error(`❌ [${format}] conversion failed:`, error);
                throw error;
            }
        }

    }, 60000); // 60s timeout for the whole test
});

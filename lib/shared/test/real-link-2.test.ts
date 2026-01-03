import { describe, it } from 'vitest';
import * as fs from 'fs';
import { SubscriptionParser } from '../subscription-parser';
import { toClash } from '../converter/clash-converter';

const TARGET_URL = 'https://raw.githubusercontent.com/vxiaov/free_proxies/main/links.txt';

describe('Real Subscription Link Test 2', () => {
    it('should fetch and parse correctly', async () => {
        console.log(`Fetching subscription from: ${TARGET_URL}`);
        try {
            const res = await fetch(TARGET_URL);
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

            const content = await res.text();
            console.log(`Fetched content length: ${content.length} bytes`);

            const parser = new SubscriptionParser();

            const start = performance.now();
            const nodes = parser.parse(content, 'RealSubTest2');
            const duration = performance.now() - start;

            console.log(`Parsing took ${duration.toFixed(2)}ms`);
            console.log(`\n=== Parsing Result ===`);
            console.log(`Total Nodes: ${nodes.length}`);

            // Protocol Distribution
            const stats: Record<string, number> = {};
            nodes.forEach(n => {
                stats[n.type] = (stats[n.type] || 0) + 1;
            });
            console.log('Protocol Distribution:', stats);

            if (nodes.length === 0) {
                console.warn('No nodes parsed!');
                return;
            }

            // Test Conversion on a sample
            // Pick a few diverse nodes
            const samples = nodes.slice(0, 5);

            console.log(`\n=== Conversion Test (Sample of ${samples.length}) ===`);

            let output = '';
            output += '--- Clash Meta ---\n';
            output += toClash(samples as any[]) + '\n';

            fs.writeFileSync('lib/shared/test/real-sub-output-2.txt', output);
            fs.writeFileSync('lib/shared/test/real-sub-stats-2.txt', JSON.stringify(stats, null, 2));

        } catch (e) {
            console.error('Test Error:', e);
            throw e;
        }
    }, 60000); // 60s timeout
});

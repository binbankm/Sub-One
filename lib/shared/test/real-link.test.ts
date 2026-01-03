import { describe, it } from 'vitest';
import * as fs from 'fs';
import { SubscriptionParser } from '../subscription-parser';
import { toClash } from '../converter/clash-converter';
import { toSingBox } from '../converter/singbox-converter';
import { toSurge } from '../converter/surge-converter';
import { toLoon } from '../converter/loon-converter';
import { toQuantumultX } from '../converter/quantumultx-converter';

const TARGET_URL = 'https://raw.githubusercontent.com/SoliSpirit/v2ray-configs/main/all_configs.txt';

describe('Real Subscription Link Test', () => {
    it('should fetch and parse correctly', async () => {
        console.log(`Fetching subscription from: ${TARGET_URL}`);
        try {
            const res = await fetch(TARGET_URL);
            if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);

            const content = await res.text();
            console.log(`Fetched content length: ${content.length} bytes`);

            const parser = new SubscriptionParser();

            const start = performance.now();
            const nodes = parser.parse(content, 'RealSubTest');
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
            const samples = [
                nodes.find(n => n.type === 'vless'),
                nodes.find(n => n.type === 'vmess'),
                nodes.find(n => n.type === 'ss'),
                nodes.find(n => n.type === 'trojan'),
                nodes.find(n => n.type === 'hysteria2')
            ].filter(n => !!n);

            console.log(`\n=== Conversion Test (Sample of ${samples.length}) ===`);

            let output = '';
            output += '--- Clash Meta ---\n';
            output += toClash(samples as any[]) + '\n';

            output += '\n--- Sing-Box ---\n';
            output += toSingBox(samples as any[]) + '\n';

            output += '\n--- Surge ---\n';
            output += toSurge(samples as any[]) + '\n';

            output += '\n--- Loon ---\n';
            output += toLoon(samples as any[]) + '\n';

            output += '\n--- Quantumult X ---\n';
            output += toQuantumultX(samples as any[]) + '\n';

            // console.log(output);
            fs.writeFileSync('lib/shared/test/real-sub-output.txt', output);
            fs.writeFileSync('lib/shared/test/real-sub-stats.txt', JSON.stringify(stats, null, 2));

        } catch (e) {
            console.error('Test Error:', e);
            throw e;
        }
    }, 60000); // 60s timeout
});

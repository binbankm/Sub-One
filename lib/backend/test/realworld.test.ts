import { describe, it, expect } from 'vitest';
import { ProxyUtils } from '../proxy/index';

describe('Real World Subscription Test - All Producers', () => {
    it('should parse real world subscription and generate all formats', async () => {
        const url = 'https://sub-store.lbyan.us.kg/download/sub';

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
        }
        const rawContent = await response.text();

        // 1. 解析 (Parse)
        const proxies = ProxyUtils.parse(rawContent);
        console.log(`\n[Test] Parsed ${proxies.length} proxies`);

        // 2. 生成各种格式进行测试
        const platforms = ['clashmeta', 'singbox', 'surge', 'loon', 'qx', 'base64'];

        for (const platform of platforms) {
            try {
                const output = ProxyUtils.produce(proxies, platform);
                expect(output).toBeDefined();

                if (typeof output === 'string') {
                    expect(output.length).toBeGreaterThan(0);

                    // 打印每个格式的前几行或特征以验证
                    if (platform === 'clashmeta') {
                        expect(output).toContain('proxies:');
                    } else if (platform === 'surge') {
                        expect(output).toContain(' = ');
                    } else if (platform === 'loon') {
                        expect(output).toContain(' = ');
                    } else if (platform === 'qx') {
                        expect(output).toContain('=');
                    } else if (platform === 'singbox') {
                        const json = JSON.parse(output);
                        expect(Array.isArray(json)).toBe(true);
                    } else if (platform === 'base64') {
                        expect(output.length).toBeGreaterThan(10);
                    }

                    console.log(`[Test] ✅ Generated ${platform.toUpperCase()} format successfully (${output.length} characters)`);
                }
            } catch (err) {
                console.error(`[Test] ❌ Failed to generate ${platform.toUpperCase()} format:`, err);
                throw err;
            }
        }
    });
});

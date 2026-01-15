import { describe, it } from 'vitest';
import { ProxyUtils } from '../proxy/index';

describe('Real World Subscription Test - Loon Detailed', () => {
    it('should show simplified Loon config', async () => {
        const url = 'https://sub-store.lbyan.us.kg/download/sub';
        const response = await fetch(url);
        const rawContent = await response.text();

        const proxies = ProxyUtils.parse(rawContent);

        // 选择几个代表性的节点类型进行展示
        const types = ['ss', 'vmess', 'vless', 'trojan'];
        const selectedProxies = [];
        const seenTypes = new Set();

        for (const p of proxies) {
            if (types.includes(p.type) && !seenTypes.has(p.type)) {
                selectedProxies.push(p);
                seenTypes.add(p.type);
            }
        }

        const loonOutput = ProxyUtils.produce(selectedProxies, 'loon');
        console.log('\n=== Loon Configuration Sample ===');
        console.log(loonOutput);
        console.log('=================================\n');

    });
});

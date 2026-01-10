import { describe, it, expect } from 'vitest';
import { parseHysteria2 } from '../parsers/hysteria2';
import { toClash } from '../converter/clash-converter';
import { toSingBox } from '../converter/singbox-converter';
import { toSurge } from '../converter/surge-converter';
import { toLoon } from '../converter/loon-converter';

describe('Hysteria2 obfs support', () => {
    const testUrl = 'hysteria2://xtGIM7iEx9@91.107.190.166:8443?sni=dash.cloudflare.com&allowInsecure=1&obfs=salamander&obfs-password=KLSADFIU43%23%24#%E5%BE%B7%E5%9B%BD%20-%20Frankfurt%20Am%20Main%20-%20Hetzner%20Online%20AG%20-%202';

    it('应该正确解析包含 obfs 参数的 Hysteria2 节点', () => {
        const node = parseHysteria2(testUrl);

        expect(node).not.toBeNull();
        expect(node?.type).toBe('hysteria2');
        expect(node?.server).toBe('91.107.190.166');
        expect(node?.port).toBe(8443);
        expect(node?.password).toBe('xtGIM7iEx9');

        // 检查 obfs 参数
        expect(node?.obfs).toBeDefined();
        expect(node?.obfs?.type).toBe('salamander');
        expect(node?.obfs?.password).toBe('KLSADFIU43#$');

        // 检查 TLS 参数
        expect(node?.tls).toBeDefined();
        expect(node?.tls?.serverName).toBe('dash.cloudflare.com');
        expect(node?.tls?.insecure).toBe(true);

        console.log('解析后的节点:', JSON.stringify(node, null, 2));
    });

    it('应该在 Clash 输出中包含 obfs 参数', () => {
        const node = parseHysteria2(testUrl);
        if (!node) throw new Error('节点解析失败');

        const output = toClash([node], { ruleTemplate: 'none' });

        console.log('\n========== Clash 输出 ==========');
        console.log(output);

        expect(output).toContain('obfs: salamander');
        expect(output).toContain('obfs-password: KLSADFIU43#$');
    });

    it('应该在 Sing-Box 输出中包含 obfs 参数', () => {
        const node = parseHysteria2(testUrl);
        if (!node) throw new Error('节点解析失败');

        const output = toSingBox([node]);
        const config = JSON.parse(output);

        // 找到 hysteria2 类型的节点
        const hy2Node = config.outbounds.find((o: any) => o.type === 'hysteria2');

        console.log('\n========== Sing-Box 输出 ==========');
        console.log(JSON.stringify(hy2Node, null, 2));

        expect(hy2Node).toBeDefined();
        expect(hy2Node.obfs).toBeDefined();
        expect(hy2Node.obfs.type).toBe('salamander');
        expect(hy2Node.obfs.password).toBe('KLSADFIU43#$');
    });

    it('应该在 Surge 输出中包含 obfs 参数', () => {
        const node = parseHysteria2(testUrl);
        if (!node) throw new Error('节点解析失败');

        const output = toSurge([node]);

        console.log('\n========== Surge 输出 ==========');
        console.log(output);

        expect(output).toContain('obfs=salamander');
        expect(output).toContain('obfs-password=KLSADFIU43#$');
    });

    it('应该在 Loon 输出中包含 obfs 参数', () => {
        const node = parseHysteria2(testUrl);
        if (!node) throw new Error('节点解析失败');

        const output = toLoon([node]);

        console.log('\n========== Loon 输出 ==========');
        console.log(output);

        expect(output).toContain('salamander-password=KLSADFIU43#$');
        expect(output).not.toContain('obfs:salamander'); // Loon 不使用 obfs: 前缀
    });
});

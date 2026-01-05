import { describe, it } from 'vitest';
import * as fs from 'fs';
import { parseNodeUrl } from '../parsers/index';
import { toClash } from '../converter/clash-converter';
import { toSingBox } from '../converter/singbox-converter';
import { toSurge } from '../converter/surge-converter';
import { toLoon } from '../converter/loon-converter';
import { toQuantumultX } from '../converter/quantumultx-converter';
import { ProxyNode } from '../../shared/types';

// Use same URLs as parser.test.ts to guarantee success
// Use same URLs as parser.test.ts to guarantee success
const vlessRealityUrl = 'vless://uuid-1234@example.com:443?encryption=none&flow=xtls-rprx-vision&security=reality&sni=example.com&fp=chrome&pbk=76543210&sid=1234&spx=%2F&type=tcp&headerType=none#Test_VLESS_Reality';
// const vmessBase64Url = ... // Skipped in manual verify due to env quirks, covered in unit tests
const hysteria2Url = 'hysteria2://password@2.2.2.2:8443?insecure=1&obfs=salamander&obfs-password=obfspass&sni=hy2.com#Test_Hy2';

const testUrls = [vlessRealityUrl, hysteria2Url];

describe('Manual Verification Output', () => {
    it('should generate converted configs', () => {
        const nodes: ProxyNode[] = [];
        for (const u of testUrls) {
            const n = parseNodeUrl(u);
            if (n) {
                nodes.push(n);
            } else {
                console.error(`Failed to parse: ${u}`);
            }
        }

        let output = '\n========== CONVERTED CONFIG OUTPUT BEGIN ==========\n';

        output += '\n--- [Clash Meta] Output ---\n';
        // Show full yaml but trim lines to avoid excessive whitespace if any
        output += toClash(nodes).trim() + '\n';

        output += '\n--- [Sing-Box] Output ---\n';
        const sb = JSON.parse(toSingBox(nodes));
        output += JSON.stringify(sb.outbounds.filter((o: { type: string }) => o.type !== 'selector' && o.type !== 'urltest' && o.type !== 'direct' && o.type !== 'block' && o.type !== 'dns'), null, 2) + '\n';

        output += '\n--- [Surge] Output ---\n';
        const surge = toSurge(nodes);
        const surgeProxies = surge.match(/\[Proxy\]([\s\S]*?)\[Proxy Group\]/)?.[1].trim();
        output += (surgeProxies || 'No Proxy Section Found') + '\n';

        output += '\n--- [Loon] Output ---\n';
        const loon = toLoon(nodes);
        const loonProxies = loon.match(/\[Proxy\]([\s\S]*?)\[Proxy Group\]/)?.[1].trim();
        output += (loonProxies || 'No Proxy Section Found') + '\n';

        output += '\n--- [Quantumult X] Output ---\n';
        const qx = toQuantumultX(nodes);
        const qxProxies = qx.match(/\[server_local\]([\s\S]*?)\[filter_local\]/)?.[1].trim();
        output += (qxProxies || 'No Proxy Section Found') + '\n';

        output += '========== CONVERTED CONFIG OUTPUT END ==========\n';

        fs.writeFileSync('lib/backend/test/verify_output.txt', output);
        // console.log("Output written to lib/shared/test/verify_output.txt");
    });
});

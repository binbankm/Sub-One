import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';

import { convert, parse } from '../../index';

describe('Protocol Spec: VMess (WS / gRPC / XHTTP / PacketEncoding)', () => {
    it('should parse and convert VMess WS+TLS across ClashMeta, Singbox, Surge, Loon, QX, and Egern', async () => {
        const clashYaml = `
proxies:
  - name: VMess-WS
    type: vmess
    server: v.example.com
    port: 443
    uuid: 11111111-1111-1111-1111-111111111111
    alterId: 0
    cipher: auto
    tls: true
    servername: sni.example.com
    network: ws
    ws-opts:
      path: /ws
      headers:
        Host: cdn.example.com
`;
        const nodes = parse(clashYaml);
        expect(nodes).toHaveLength(1);

        const sb = JSON.parse(await convert(nodes, 'Singbox'));
        expect(sb.outbounds[0].type).toBe('vmess');
        expect(sb.outbounds[0].transport.type).toBe('ws');

        const surge = await convert(nodes, 'Surge');
        expect(surge).toContain('ws=true');
        expect(surge).toContain('vmess-aead=true');

        const qx = await convert(nodes, 'QuantumultX');
        expect(qx).toContain('obfs=wss');
        expect(qx).toContain('obfs-host=cdn.example.com');

        const egern = yaml.load(await convert(nodes, 'Egern')) as { proxies: any[] };
        expect(egern.proxies[0].transport.wss.headers.Host).toBe('cdn.example.com');
    });

    it('should preserve VMess XHTTP transport across URI and Singbox', async () => {
        const nodes = parse(`
proxies:
  - name: VMess-XHTTP
    type: vmess
    server: x.example.com
    port: 443
    uuid: 11111111-1111-1111-1111-111111111111
    tls: true
    network: splithttp
    xhttp-opts:
      path: /xhttp
      host: cdn.example.com
`);
        expect(nodes[0].network).toBe('xhttp');
        const uri = await convert(nodes, 'URI');
        const reparsed = parse(uri);
        expect(reparsed[0].network).toBe('xhttp');
    });
});

import { describe, expect, it } from 'vitest';

import { parseSIP008, parseSIP008Node } from '../../parser/sip008-parser';

describe('SIP008 Parser (parseSIP008 & parseSIP008Node)', () => {
    it('should parse SIP008 servers with string and object plugin_opts', () => {
        const json = JSON.stringify({
            version: 1,
            servers: [
                {
                    id: '1',
                    remarks: 'HK-Obfs',
                    server: '1.2.3.4',
                    server_port: 8388,
                    method: 'aes-128-gcm',
                    password: 'pw1',
                    plugin: 'obfs-local',
                    plugin_opts: 'obfs=http;obfs-host=www.bing.com',
                    udp_over_tcp: true,
                    tfo: true
                },
                {
                    id: '2',
                    remarks: 'US-V2Ray',
                    server: '5.6.7.8',
                    server_port: '443',
                    encryption: '2022-blake3-aes-128-gcm',
                    password: 'pw2',
                    plugin: 'v2ray-plugin',
                    plugin_options: { mode: 'websocket', host: 'cdn.example.com', path: '/ws', tls: true },
                    udp: false
                }
            ]
        });

        const nodes = parseSIP008(json);
        expect(nodes).toHaveLength(2);

        expect(nodes[0].name).toBe('HK-Obfs');
        expect(nodes[0].plugin).toBe('obfs');
        expect(nodes[0]['plugin-opts']).toEqual({ mode: 'http', host: 'www.bing.com' });
        expect(nodes[0]['udp-over-tcp']).toBe(true);
        expect(nodes[0].tfo).toBe(true);
        expect(nodes[0].udp).toBe(true);

        expect(nodes[1].name).toBe('US-V2Ray');
        expect(nodes[1].port).toBe(443);
        expect(nodes[1].cipher).toBe('2022-blake3-aes-128-gcm');
        expect(nodes[1].plugin).toBe('v2ray-plugin');
        expect(nodes[1]['plugin-opts']).toEqual({
            mode: 'websocket',
            host: 'cdn.example.com',
            path: '/ws',
            tls: true
        });
        expect(nodes[1].udp).toBe(false);
    });

    it('should handle invalid JSON and incomplete server entries gracefully', () => {
        expect(parseSIP008('not-json')).toEqual([]);
        expect(parseSIP008('{}')).toEqual([]);
        expect(parseSIP008Node({ server: '1.1.1.1' })).toBeNull();
        expect(parseSIP008Node(null)).toBeNull();
    });
});

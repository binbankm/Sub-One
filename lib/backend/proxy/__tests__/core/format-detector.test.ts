import { describe, expect, it } from 'vitest';

import { detectFormat } from '../../parser/format-detector';

describe('Subscription Format Detector (detectFormat)', () => {
    it('should detect Clash YAML, sing-box JSON, and SIP008 JSON', () => {
        expect(detectFormat('proxies:\n  - name: a\n    type: ss')).toBe('clash');
        expect(detectFormat('{"outbounds":[{"type":"vless"}]}')).toBe('singbox');
        expect(detectFormat('{"endpoints":[{"type":"wireguard"}]}')).toBe('singbox');
        expect(detectFormat('{"version":1,"servers":[{"server":"1.2.3.4","server_port":8388}]}')).toBe('sip008');
    });

    it('should detect Surge, Loon, and Quantumult X INI formats without misclassifying each other', () => {
        expect(detectFormat('[Proxy]\nNode1 = ss, 1.2.3.4, 8388, encrypt-method=aes-128-gcm')).toBe('surge');
        expect(detectFormat('Node1 = Hysteria2, 1.2.3.4, 443, password=pw, tls-name=sni.com')).toBe('loon');
        expect(detectFormat('Node1 = mieru, 1.2.3.4, 2012, u1, pw1')).toBe('loon');
        expect(detectFormat('shadowsocks=1.2.3.4:8388, method=aes-128-gcm, password=pw, tag=SS')).toBe('qx');
        expect(detectFormat('hysteria2=1.2.3.4:443, password=pw, tag=Hy2')).toBe('qx');
    });

    it('should detect URI lists and Base64-encoded URI lists', () => {
        expect(detectFormat('vless://uuid@1.2.3.4:443#V1\nsudoku://key@1.2.3.4:443#S1')).toBe('uri-list');
        const b64 = Buffer.from('ss://YWVzLTEyOC1nY206cHdAMS4yLjMuNDo4Mzg4#SS1\ntt://u:p@1.2.3.4:443#TT1').toString('base64');
        expect(detectFormat(b64)).toBe('base64');
    });
});

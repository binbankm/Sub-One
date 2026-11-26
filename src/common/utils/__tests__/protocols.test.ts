import { describe, expect, it } from 'vitest';

import { getProtocol, getProtocolInfo } from '../protocols';

describe('Frontend Protocol Utilities', () => {
    it('getProtocol should detect all supported URI schemes including emerging protocols', () => {
        expect(getProtocol('ss://abc@1.1.1.1:8388')).toBe('ss');
        expect(getProtocol('ssr://abc')).toBe('ssr');
        expect(getProtocol('vmess://abc')).toBe('vmess');
        expect(getProtocol('vless://uuid@1.1.1.1:443')).toBe('vless');
        expect(getProtocol('trojan://pw@1.1.1.1:443')).toBe('trojan');
        expect(getProtocol('hy2://pw@1.1.1.1:443')).toBe('hysteria2');
        expect(getProtocol('hysteria2://pw@1.1.1.1:443')).toBe('hysteria2');
        expect(getProtocol('hysteria://1.1.1.1:443')).toBe('hysteria');
        expect(getProtocol('tuic://uuid:pw@1.1.1.1:443')).toBe('tuic');
        expect(getProtocol('wireguard://priv@1.1.1.1:51820')).toBe('wireguard');
        expect(getProtocol('wg://priv@1.1.1.1:51820')).toBe('wireguard');
        expect(getProtocol('anytls://pw@1.1.1.1:443')).toBe('anytls');
        expect(getProtocol('snell://psk@1.1.1.1:10000')).toBe('snell');
        expect(getProtocol('naive+https://u:p@1.1.1.1:443')).toBe('naive');
        expect(getProtocol('ssh://root:pw@1.1.1.1:22')).toBe('ssh');
        expect(getProtocol('mieru://u:p@1.1.1.1:2012')).toBe('mieru');
        expect(getProtocol('juicity://u:p@1.1.1.1:443')).toBe('juicity');
        expect(getProtocol('sudoku://key@1.1.1.1:443')).toBe('sudoku');
        expect(getProtocol('trusttunnel://u:p@1.1.1.1:443')).toBe('trusttunnel');
        expect(getProtocol('tt://u:p@1.1.1.1:443')).toBe('trusttunnel');
        expect(getProtocol('https://u:p@1.1.1.1:443')).toBe('http');
        expect(getProtocol(undefined)).toBe('unknown');
    });

    it('getProtocolInfo should return display metadata for protocols', () => {
        expect(getProtocolInfo('shadowsocks').text).toBe('SS');
        expect(getProtocolInfo('hy2').text).toBe('HY2');
        expect(getProtocolInfo('vless').text).toBe('VLESS');
        expect(getProtocolInfo('mieru').text).toBe('Mieru');
        expect(getProtocolInfo('juicity').text).toBe('Juicity');
        expect(getProtocolInfo('sudoku').text).toBe('Sudoku');
        expect(getProtocolInfo('trusttunnel').text).toBe('TrustTunnel');
    });
});

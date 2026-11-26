import { describe, expect, it } from 'vitest';

import {
    getWireGuardAddressWithCIDR,
    isIP,
    isIPv4,
    isIPv6,
    isValidPort,
    normalizeReserved,
    parseEndpoint,
    parsePort
} from '../../utils';

describe('Proxy Utilities (utils.ts)', () => {
    it('should validate IPv4 and IPv6 addresses', () => {
        expect(isIPv4('192.168.1.1')).toBe(true);
        expect(isIPv4('256.1.1.1')).toBe(false);
        expect(isIPv6('2001:db8::1')).toBe(true);
        expect(isIPv6('::1')).toBe(true);
        expect(isIP('10.0.0.1')).toBe(true);
        expect(isIP('2001:db8::1')).toBe(true);
        expect(isIP('example.com')).toBe(false);
    });

    it('should parse and validate ports and IPv4/IPv6 endpoints', () => {
        expect(parsePort('443')).toBe(443);
        expect(isValidPort(443)).toBe(true);
        expect(isValidPort(0)).toBe(false);
        expect(isValidPort(65536)).toBe(false);

        expect(parseEndpoint('1.2.3.4:51820')).toEqual({ server: '1.2.3.4', port: 51820 });
        expect(parseEndpoint('[2001:db8::1]:51820')).toEqual({ server: '2001:db8::1', port: 51820 });
        expect(parseEndpoint('wg.example.com:51820')).toEqual({ server: 'wg.example.com', port: 51820 });
        expect(parseEndpoint('host-only')).toEqual({ server: 'host-only' });
        expect(parseEndpoint('')).toEqual({ server: '' });
    });

    it('should normalize WireGuard reserved bytes and CIDR addresses', () => {
        expect(normalizeReserved([1, 2, 3])).toEqual([1, 2, 3]);
        expect(normalizeReserved('[4, 5, 6]')).toEqual([4, 5, 6]);
        expect(normalizeReserved('7/8/9')).toEqual([7, 8, 9]);
        expect(normalizeReserved(Buffer.from([10, 20, 30]).toString('base64'))).toEqual([10, 20, 30]);
        expect(normalizeReserved('')).toBeUndefined();

        expect(getWireGuardAddressWithCIDR({ ip: '10.0.0.2' }, 'ipv4')).toBe('10.0.0.2/32');
        expect(getWireGuardAddressWithCIDR({ ip: '10.0.0.2/24' }, 'ipv4')).toBe('10.0.0.2/24');
        expect(getWireGuardAddressWithCIDR({ ipv6: 'fd00::2' }, 'ipv6')).toBe('fd00::2/128');
    });
});

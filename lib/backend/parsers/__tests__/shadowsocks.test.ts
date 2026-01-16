
import { describe, it, expect } from 'vitest';
import { parseShadowsocks } from '../shadowsocks';
import { Base64 } from 'js-base64';

describe('Shadowsocks Parser', () => {
    it('should parse SIP002 format (ss://base64)', () => {
        const userInfo = Base64.encode('aes-256-gcm:password');
        const url = `ss://${userInfo}@example.com:8388#SS_Node`;
        const node = parseShadowsocks(url);

        expect(node).not.toBeNull();
        expect(node?.type).toBe('ss');
        expect(node?.cipher).toBe('aes-256-gcm');
        expect(node?.password).toBe('password');
        expect(node?.name).toBe('SS_Node');
    });

    it('should parse plain userinfo format', () => {
        const url = 'ss://aes-256-gcm:password@example.com:8388#Plain';
        const node = parseShadowsocks(url);

        expect(node?.cipher).toBe('aes-256-gcm');
        expect(node?.password).toBe('password');
    });

    it('should parse plugin info', () => {
        const url = 'ss://aes-256-gcm:password@example.com:8388?plugin=obfs-local%3Bobfs%3Dhttp%3Bobfs-host%3Dbing.com#Plugin';
        const node = parseShadowsocks(url);

        expect(node?.plugin).toBe('obfs-local');
        expect(node?.pluginOpts?.obfs).toBe('http');
    });
});

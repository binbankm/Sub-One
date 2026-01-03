import { AnyTLSNode } from '../types';
import { safeDecodeURIComponent, parseStandardParams } from './helper';

/**
 * 解析 AnyTLS 链接
 * Format: anytls://[password@]host:port?sni=...&insecure=...
 */
export function parseAnyTLS(url: string): AnyTLSNode | null {
    if (!url.startsWith('anytls://')) return null;

    try {
        const u = new URL(url);
        const { tls } = parseStandardParams(u.searchParams);

        // AnyTLS usually implies TLS enabled
        if (!tls.enabled) {
            tls.enabled = true;
        }

        // Parse specific params
        const clientFingerprint = u.searchParams.get('client-fingerprint') || u.searchParams.get('fp');
        const idleTimeout = Number(u.searchParams.get('idle_timeout') || 0);

        return {
            type: 'anytls',
            id: crypto.randomUUID(),
            name: safeDecodeURIComponent(u.hash.slice(1)) || 'AnyTLS Node',
            server: u.hostname,
            port: Number(u.port) || 443,
            password: u.username ? decodeURIComponent(u.username) : undefined,
            udp: true, // AnyTLS usually supports UDP
            tls,
            clientFingerprint: clientFingerprint || undefined,
            idleTimeout: idleTimeout > 0 ? idleTimeout : undefined,
            originalUrl: url
        };

    } catch (e) {
        console.warn('Failed to parse AnyTLS URL:', e);
        return null;
    }
}

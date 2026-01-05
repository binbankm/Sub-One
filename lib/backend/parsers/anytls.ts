import { AnyTLSNode } from '../../shared/types';
import { safeDecodeURIComponent, parseStandardParams, generateId } from './helper';

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
            // Also check for tls=1 or tls=true
            const tlsParam = u.searchParams.get('tls');
            if (tlsParam === '1' || tlsParam === 'true') {
                tls.enabled = true;
            } else {
                tls.enabled = true; // Default to true for anytls
            }
        }

        // Parse specific params
        const clientFingerprint = u.searchParams.get('client-fingerprint') || u.searchParams.get('fp');
        // Handle both snake_case and camelCase
        const idleTimeout = Number(u.searchParams.get('idle_timeout') || u.searchParams.get('idleTimeout') || 0);

        return {
            type: 'anytls',
            id: generateId(),
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
        return null; // Silent fail
    }
}

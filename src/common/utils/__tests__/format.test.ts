import { describe, expect, it } from 'vitest';

import { formatBytes, formatExpiry, getTrafficColorClass } from '../format';

describe('Frontend Format Utilities', () => {
    it('formatBytes should format byte counts cleanly', () => {
        expect(formatBytes(0)).toBe('0 B');
        expect(formatBytes(1024)).toBe('1 KB');
        expect(formatBytes(1048576 * 1.5)).toBe('1.5 MB');
    });

    it('getTrafficColorClass should return appropriate color classes by threshold', () => {
        expect(getTrafficColorClass(95)).toContain('danger');
        expect(getTrafficColorClass(80)).toContain('warning');
        expect(getTrafficColorClass(30)).toContain('primary');
    });

    it('formatExpiry should return null when timestamp is missing and metadata when present', () => {
        expect(formatExpiry(undefined)).toBeNull();
        const future = Math.floor(Date.now() / 1000) + 86400 * 30;
        const res = formatExpiry(future);
        expect(res).not.toBeNull();
        expect(res?.style).toContain('text-gray-500');
    });
});

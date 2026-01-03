/**
 * Base64 编解码工具
 */

export function encodeBase64(str: string): string {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str).toString('base64');
    }
    try {
        const bytes = new TextEncoder().encode(str);
        const binaryString = Array.from(bytes, byte => String.fromCharCode(byte)).join('');
        return btoa(binaryString);
    } catch (e) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (_, p1) => {
            return String.fromCharCode(parseInt(p1, 16));
        }));
    }
}

export function decodeBase64(str: string): string {
    // 1. Remove whitespace
    str = str.trim();
    // 2. Replace URL-safe chars and handle spaces (which might be converted from + by URLSearchParams)
    str = str.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, '+');
    // 3. Add padding
    while (str.length % 4) {
        str += '=';
    }

    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str, 'base64').toString('utf-8');
    }

    try {
        const binaryString = atob(str);
        const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
        // Fallback or better error handling
        throw new Error(`Invalid Base64 string: ${e}`);
    }
}

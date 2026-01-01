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
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str, 'base64').toString('utf-8');
    }
    try {
        const binaryString = atob(str);
        const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
        return new TextDecoder('utf-8').decode(bytes);
    } catch (e) {
        return atob(str);
    }
}

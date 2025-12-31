/**
 * 测试工具函数
 * 提供跨环境的 Base64 编解码
 */

export function base64Encode(str: string): string {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str).toString('base64');
    }
    return btoa(str);
}

export function base64Decode(str: string): string {
    if (typeof Buffer !== 'undefined') {
        return Buffer.from(str, 'base64').toString('utf-8');
    }
    return atob(str);
}

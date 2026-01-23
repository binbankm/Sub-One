/**
 * Sub-One Parsers Entry
 * 
 * 整合所有解析器：URI, Clash, SIP008, Base64
 */

import { Base64 } from 'js-base64';
import type { ProxyNode } from '../types';
import { detectFormat } from './format-detector';
import { parseClash } from './clash-parser';
import { parseSIP008 } from './sip008-parser';
import { parseNodeURI } from './uri-parsers';
import { parseSurge } from './surge-parser';
import { parseLoon } from './loon-parser';
import { parseQX } from './qx-parser';
import { normalizeProxyNode } from './normalizer';
import { isNotEmpty } from '../utils';

/**
 * 通用解析入口：根据内容格式自动选择解析器
 */
export function parse(content: string): ProxyNode[] {
    if (!isNotEmpty(content)) return [];

    const format = detectFormat(content);

    switch (format) {
        case 'html':
            return [];

        case 'clash':
            return parseClash(content).map(normalizeProxyNode);

        case 'sip008':
            return parseSIP008(content).map(normalizeProxyNode);

        case 'base64': {
            try {
                // [FIX-ED] 处理 URL-Safe Base64 字符替换 (- -> +, _ -> /) 以修复解码兼容性
                let sanitized = content.trim().replace(/-/g, '+').replace(/_/g, '/');
                // Fix padding if needed
                while (sanitized.length % 4) sanitized += '=';
                const decoded = Base64.decode(sanitized);
                // 递归解析解码后的内容，确保返回 ProxyNode[]
                return parse(decoded);
            } catch (e) {
                console.error('[parse] Base64 decode failed:', e);
                return [];
            }
        }

        case 'surge':
            return content
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => isNotEmpty(line) && !line.startsWith('//') && !line.startsWith('#'))
                .map(line => parseSurge(line))
                .filter((node): node is ProxyNode => node !== null)
                .map(normalizeProxyNode);

        case 'loon':
            return content
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => isNotEmpty(line) && !line.startsWith('//') && !line.startsWith('#'))
                .map(line => parseLoon(line))
                .filter((node): node is ProxyNode => node !== null)
                .map(normalizeProxyNode);

        case 'qx':
            return content
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => isNotEmpty(line) && !line.startsWith('//') && !line.startsWith('#'))
                .map(line => parseQX(line))
                .filter((node): node is ProxyNode => node !== null)
                .map(normalizeProxyNode);

        case 'uri-list':
        case 'unknown':
        default:
            // 按行解析 URI
            return content
                .split(/\r?\n/)
                .map(line => line.trim())
                .filter(line => isNotEmpty(line) && !line.startsWith('//') && !line.startsWith('#'))
                .map(line => parseNodeURI(line))
                .filter((node): node is ProxyNode => node !== null)
                .map(normalizeProxyNode);
    }
}

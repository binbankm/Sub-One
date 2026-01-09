import { ProxyNode } from '../../shared/types';
import { parseVmess } from './vmess';
import { parseVless } from './vless';
import { parseTrojan } from './trojan';
import { parseShadowsocks } from './shadowsocks';
import { parseHysteria } from './hysteria';
import { parseHysteria2 } from './hysteria2';
import { parseTuic } from './tuic';
import { parseWireGuard } from './wireguard';
import { parseAnyTLS } from './anytls';
import { parseSSR } from './ssr';
import { parseSnell } from './snell';
import { parseSocks5 } from './socks5';

export { parseStandardParams } from './helper';

/**
 * 统一节点解析函数
 * 根据 URL 协议头自动分发到对应的解析器
 */
export function parseNodeUrl(url: string): ProxyNode | null {
    let trimmedUrl = url.trim();
    // Normalize HTML entities
    trimmedUrl = trimmedUrl.replace(/&amp;/g, '&');

    // 协议分发映射
    if (trimmedUrl.startsWith('vmess://')) {
        return parseVmess(trimmedUrl);
    } else if (trimmedUrl.startsWith('vless://')) {
        return parseVless(trimmedUrl);
    } else if (trimmedUrl.startsWith('trojan://')) {
        return parseTrojan(trimmedUrl);
    } else if (trimmedUrl.startsWith('ss://') || trimmedUrl.startsWith('ssr://')) {
        if (trimmedUrl.startsWith('ss://')) return parseShadowsocks(trimmedUrl);
        if (trimmedUrl.startsWith('ssr://')) return parseSSR(trimmedUrl);
        return null;
    } else if (trimmedUrl.startsWith('hysteria://') || trimmedUrl.startsWith('hy1://')) {
        return parseHysteria(trimmedUrl);
    } else if (trimmedUrl.startsWith('hysteria2://') || trimmedUrl.startsWith('hy2://')) {
        // normalize hy2 prefix inside the parser
        return parseHysteria2(trimmedUrl);
    } else if (trimmedUrl.startsWith('anytls://')) {
        return parseAnyTLS(trimmedUrl);
    } else if (trimmedUrl.startsWith('tuic://')) {
        return parseTuic(trimmedUrl);
    } else if (trimmedUrl.startsWith('wireguard://') || trimmedUrl.startsWith('wg://')) {
        return parseWireGuard(trimmedUrl);
    } else if (trimmedUrl.startsWith('snell://')) {
        return parseSnell(trimmedUrl);
    } else if (trimmedUrl.startsWith('socks5://')) {
        return parseSocks5(trimmedUrl);
    }

    return null;
}

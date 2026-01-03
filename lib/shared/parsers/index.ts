import { Node } from '../types';
import { parseVmess } from './vmess';
import { parseVless } from './vless';
import { parseTrojan } from './trojan';
import { parseShadowsocks } from './shadowsocks';
import { parseHysteria } from './hysteria';
import { parseHysteria2 } from './hysteria2';
import { parseTuic } from './tuic';
import { parseWireGuard } from './wireguard';

export { parseStandardParams } from './helper';

/**
 * 统一节点解析函数
 * 根据 URL 协议头自动分发到对应的解析器
 */
export function parseNodeUrl(url: string): Node | null {
    const trimmedUrl = url.trim();

    // 协议分发映射
    if (trimmedUrl.startsWith('vmess://')) {
        return parseVmess(trimmedUrl);
    } else if (trimmedUrl.startsWith('vless://')) {
        return parseVless(trimmedUrl);
    } else if (trimmedUrl.startsWith('trojan://')) {
        return parseTrojan(trimmedUrl);
    } else if (trimmedUrl.startsWith('ss://') || trimmedUrl.startsWith('ssr://')) {
        // SSR 暂未完全重构，目前 ss parser 包含一定兼容，或者需要单独的 ssr parser
        // 考虑到 SSR 格式较老，如果 url 是 ssr://，暂时返回 null 或者需要迁移旧逻辑
        // 这里主要处理 SS
        if (trimmedUrl.startsWith('ss://')) return parseShadowsocks(trimmedUrl);
        // SSR parser to be added if strictly needed, current focus: newer protocols
        return null;
    } else if (trimmedUrl.startsWith('hysteria://') || trimmedUrl.startsWith('hy1://')) {
        return parseHysteria(trimmedUrl);
    } else if (trimmedUrl.startsWith('hysteria2://') || trimmedUrl.startsWith('hy2://')) {
        // normalize hy2 prefix inside the parser
        return parseHysteria2(trimmedUrl);
    } else if (trimmedUrl.startsWith('tuic://')) {
        return parseTuic(trimmedUrl);
    } else if (trimmedUrl.startsWith('wireguard://') || trimmedUrl.startsWith('wg://')) {
        return parseWireGuard(trimmedUrl);
    }

    return null;
}

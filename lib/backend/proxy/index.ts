/**
 * Sub-One Core
 * 参考 Sub-Store 架构的核心处理引擎
 *
 * 核心流程: Input → Parse → Process → Produce → Output
 *
 * 使用示例:
 * ```typescript
 * import { parse, produce, convert } from '@/lib/backend/proxy';
 *
 * // 解析订阅内容
 * const proxies = parse(rawContent);
 *
 * // 生成目标格式
 * const output = produce(proxies, 'ClashMeta');
 *
 * // 或使用一站式转换
 * const output = convert(rawContent, 'ClashMeta', { dedupe: true });
 * ```
 */

// === 类型导出 ===
export type {
    ProxyType,
    Proxy,
    Parser,
    Producer,
    ProducerType,
    ProducerOptions,
    TargetPlatform,
    ProcessOptions,
    ConvertOptions,
} from './types';

// === 解析器导出 ===
export { parse, PROXY_PARSERS } from './parsers';
export { parseClashYAML, parseClashProxy } from './parsers/clash';

// === 生产器导出 ===
export { produce, PROXY_PRODUCERS } from './producers';
export { Clash_Producer, ClashMeta_Producer } from './producers/clash';
export { URI_Producer } from './producers/uri';
export { SingBox_Producer } from './producers/singbox';

// === 工具函数导出 ===
export {
    isIPv4,
    isIPv6,
    isIP,
    isValidPortNumber,
    isNotBlank,
    getIfNotBlank,
    isPresent,
    getIfPresent,
    isValidUUID,
    safeBase64Decode,
    isBase64,
    parseQueryParams,
    safeDecode,
    getRandomPort,
    safeParseInt,
    logger,
} from './utils';

// === 核心类型 ===
import { Proxy, TargetPlatform, ProcessOptions, ConvertOptions } from './types';
import { parse } from './parsers';
import { produce } from './producers';

/**
 * 处理代理列表
 * - 过滤
 * - 去重
 * - 重命名
 * - 修改属性 (UDP, 跳过证书)
 */
export function process(proxies: Proxy[], options: ProcessOptions & { udp?: boolean, skipCertVerify?: boolean } = {}): Proxy[] {
    let result = [...proxies];

    // 修改全局属性
    if (options.udp !== undefined || options.skipCertVerify !== undefined) {
        result = result.map((p) => {
            const updated = { ...p };
            if (options.udp !== undefined) updated.udp = options.udp;
            if (options.skipCertVerify !== undefined) updated['skip-cert-verify'] = options.skipCertVerify;
            return updated;
        });
    }

    // 添加订阅名前缀
    if (options.subName) {
        result = result.map((p) => ({
            ...p,
            name: `${options.subName} | ${p.name}`,
            _subName: options.subName,
        }));
    }

    // 添加前缀/后缀
    if (options.prefix) {
        result = result.map((p) => ({
            ...p,
            name: `${options.prefix}${p.name}`,
        }));
    }
    if (options.suffix) {
        result = result.map((p) => ({
            ...p,
            name: `${p.name}${options.suffix}`,
        }));
    }

    // 排除过滤
    if (options.exclude) {
        try {
            const regex = new RegExp(options.exclude, 'i');
            result = result.filter((p) => !regex.test(p.name));
        } catch (e) {
            console.warn('Invalid exclude regex:', options.exclude);
        }
    }

    // 包含过滤
    if (options.include) {
        try {
            const regex = new RegExp(options.include, 'i');
            result = result.filter((p) => regex.test(p.name));
        } catch (e) {
            console.warn('Invalid include regex:', options.include);
        }
    }

    // 正则重命名
    if (options.rename) {
        try {
            const [search, replace] = options.rename.split('==>');
            if (search && replace !== undefined) {
                const regex = new RegExp(search, 'gi');
                result = result.map(p => ({
                    ...p,
                    name: p.name.replace(regex, replace)
                }));
            }
        } catch (e) {
            console.warn('Invalid rename format:', options.rename);
        }
    }

    // 去重 (按指纹)
    if (options.dedupe) {
        const seen = new Set<string>();
        result = result.filter((p) => {
            const fingerprint = getProxyFingerprint(p);
            if (seen.has(fingerprint)) return false;
            seen.add(fingerprint);
            return true;
        });
    }

    // 解决同名冲突 (为重名节点添加序号)
    const nameCounts = new Map<string, number>();
    result = result.map((p) => {
        let name = p.name || `${p.type} ${p.server}`;
        const count = nameCounts.get(name) || 0;
        nameCounts.set(name, count + 1);

        if (count > 0) {
            name = `${name} ${count}`;
        }
        return { ...p, name };
    });

    return result;
}

/**
 * 生成代理指纹用于去重
 */
function getProxyFingerprint(proxy: Proxy): string {
    const parts: string[] = [
        proxy.type,
        proxy.server,
        String(proxy.port),
    ];

    // 根据协议添加关键凭证
    switch (proxy.type) {
        case 'vmess':
        case 'vless':
        case 'tuic':
            if (proxy.uuid) parts.push(proxy.uuid);
            break;
        case 'trojan':
        case 'ss':
        case 'hysteria2':
        case 'anytls':
            if (proxy.password) parts.push(proxy.password);
            break;
        case 'snell':
            if (proxy.psk || proxy.password) parts.push((proxy.psk || proxy.password) as string);
            break;
        case 'ssr':
            if (proxy.password) parts.push(proxy.password);
            if (proxy.protocol) parts.push(proxy.protocol);
            break;
        case 'wireguard':
            if (proxy['private-key']) parts.push(proxy['private-key']);
            break;
    }

    // 添加传输层信息
    if (proxy.network && proxy.network !== 'tcp') {
        parts.push(proxy.network);
        const optsKey = `${proxy.network}-opts` as keyof Proxy;
        const opts = proxy[optsKey] as any;
        if (opts && opts.path) {
            parts.push(String(opts.path));
        }
    }

    return parts.join('|');
}


/**
 * 一站式转换函数
 *
 * @param content 原始订阅内容
 * @param target 目标平台
 * @param options 转换选项
 * @returns 转换后的订阅内容
 */
export function convert(
    content: string,
    target: TargetPlatform | string,
    options: ConvertOptions = {}
): string {
    // 1. 解析
    let proxies = parse(content);

    // 2. 处理
    proxies = process(proxies, options);

    // 3. 生成
    return produce(proxies, target, 'external', options) as string;
}

/**
 * 核心导出对象 (类似 Sub-Store 的 ProxyUtils)
 */
export const ProxyUtils = {
    parse,
    process,
    produce,
    convert,
};

export default ProxyUtils;

/**
 * Sub-One Core Producers
 * 参考 Sub-Store 的生产器架构
 *
 * 核心功能:
 * - produce(): 将内部格式转换为目标平台格式
 * - 支持多种目标平台：Clash, Surge, Loon, QX, Sing-Box, URI
 */

import { Proxy, TargetPlatform, ProducerOptions } from '../types';
import { Base64 } from 'js-base64';

// === 导入所有生产器 ===
import { Clash_Producer, ClashMeta_Producer } from './clash';
import { URI_Producer } from './uri';
import { SingBox_Producer } from './singbox';
import { Surge_Producer } from './surge';
import { QX_Producer } from './qx';
import { Loon_Producer } from './loon';

// === 导出所有生产器 ===
export { Clash_Producer, ClashMeta_Producer } from './clash';
export { URI_Producer } from './uri';
export { SingBox_Producer } from './singbox';
export { Surge_Producer } from './surge';
export { QX_Producer } from './qx';
export { Loon_Producer } from './loon';
export { isPresent, getPath, setPath, cleanProxy, removeMetadata } from './utils';

/**
 * 生产器函数类型（简化版）
 */
interface SimpleProducer {
    type: 'SINGLE' | 'ALL';
    produce: (input: unknown, type?: string, opts?: ProducerOptions) => unknown;
}

/**
 * JSON Producer
 * 输出原始 JSON 格式
 */
function JSON_Producer(): SimpleProducer {
    return {
        type: 'ALL',
        produce: (proxies: unknown, outputType = 'external'): unknown => {
            const list = proxies as Proxy[];
            return outputType === 'internal' ? list : JSON.stringify(list, null, 2);
        },
    };
}

/**
 * Base64 Producer
 * 输出 Base64 编码的 URI 列表
 */
function Base64_Producer(): SimpleProducer {
    const uriProducer = URI_Producer() as unknown as SimpleProducer;

    return {
        type: 'ALL',
        produce: (proxies: unknown, outputType = 'external'): unknown => {
            const list = proxies as Proxy[];
            if (outputType === 'internal') {
                return list;
            }

            const uris = list
                .map((p) => uriProducer.produce(p) as string)
                .filter((uri) => uri.length > 0);

            return Base64.encode(uris.join('\n'));
        },
    };
}

/**
 * 生产器注册表
 */
export const PROXY_PRODUCERS: Record<string, SimpleProducer> = {
    // Clash
    Clash: Clash_Producer() as unknown as SimpleProducer,
    clash: Clash_Producer() as unknown as SimpleProducer,

    // ClashMeta / Mihomo
    ClashMeta: ClashMeta_Producer() as unknown as SimpleProducer,
    clashmeta: ClashMeta_Producer() as unknown as SimpleProducer,
    'clash.meta': ClashMeta_Producer() as unknown as SimpleProducer,
    'Clash.Meta': ClashMeta_Producer() as unknown as SimpleProducer,
    meta: ClashMeta_Producer() as unknown as SimpleProducer,
    mihomo: ClashMeta_Producer() as unknown as SimpleProducer,
    Mihomo: ClashMeta_Producer() as unknown as SimpleProducer,

    // Surge
    Surge: Surge_Producer() as unknown as SimpleProducer,
    surge: Surge_Producer() as unknown as SimpleProducer,

    // Quantumult X
    QX: QX_Producer() as unknown as SimpleProducer,
    qx: QX_Producer() as unknown as SimpleProducer,
    QuantumultX: QX_Producer() as unknown as SimpleProducer,
    quantumultx: QX_Producer() as unknown as SimpleProducer,
    Quantumult: QX_Producer() as unknown as SimpleProducer,
    quantumult: QX_Producer() as unknown as SimpleProducer,

    // Loon
    Loon: Loon_Producer() as unknown as SimpleProducer,
    loon: Loon_Producer() as unknown as SimpleProducer,

    // Sing-Box
    singbox: SingBox_Producer() as unknown as SimpleProducer,
    SingBox: SingBox_Producer() as unknown as SimpleProducer,
    'sing-box': SingBox_Producer() as unknown as SimpleProducer,

    // Stash (ClashMeta compatible)
    Stash: ClashMeta_Producer() as unknown as SimpleProducer,
    stash: ClashMeta_Producer() as unknown as SimpleProducer,

    // URI (Base64 订阅)
    uri: URI_Producer() as unknown as SimpleProducer,
    URI: URI_Producer() as unknown as SimpleProducer,
    base64: Base64_Producer(),
    Base64: Base64_Producer(),
    Shadowrocket: Base64_Producer(),
    shadowrocket: Base64_Producer(),

    // JSON
    json: JSON_Producer(),
    JSON: JSON_Producer(),
};

/**
 * 生成订阅内容
 *
 * @param proxies 代理列表
 * @param targetPlatform 目标平台
 * @param outputType 输出类型 ('internal' 返回对象, 'external' 返回字符串)
 * @param opts 选项
 * @returns 转换后的内容
 */
export function produce(
    proxies: Proxy[],
    targetPlatform: TargetPlatform | string,
    outputType: 'internal' | 'external' = 'external',
    opts: ProducerOptions = {}
): Proxy[] | string {
    const producer = PROXY_PRODUCERS[targetPlatform];

    if (!producer) {
        throw new Error(`Target platform '${targetPlatform}' is not supported!`);
    }

    if (producer.type === 'SINGLE') {
        const results = proxies
            .map((proxy) => {
                try {
                    return producer.produce(proxy, outputType, opts) as string;
                } catch (err) {
                    console.error(`Cannot produce proxy: ${proxy.name}`, err);
                    return '';
                }
            })
            .filter((line) => typeof line === 'string' && line.length > 0);

        return outputType === 'internal' ? proxies : results.join('\n');
    } else {
        const result = producer.produce(proxies, outputType, opts);
        if (outputType === 'internal') {
            return result as Proxy[];
        }
        return result as string;
    }
}

export default produce;

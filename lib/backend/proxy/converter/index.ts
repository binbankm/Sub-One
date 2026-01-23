/**
 * Sub-One Converters Entrance
 */

import { URIConverter } from './uri';
import { ClashConverter } from './clash';
import { SingboxConverter } from './singbox';
import { SurgeConverter } from './surge';
import { LoonConverter } from './loon';
import { QuantumultXConverter } from './quantumultx';
import { ShadowrocketConverter } from './shadowrocket';
import { StashConverter } from './stash';
import { SurfboardConverter } from './surfboard';
import type { ProxyNode, ConvertOptions } from '../types';

const converters: Record<string, any> = {
    'URI': new URIConverter(),
    'Clash': new ClashConverter(true), // Default to Meta as standard Clash is deprecated
    'ClashMeta': new ClashConverter(true),
    'Mihomo': new ClashConverter(true),
    'Singbox': new SingboxConverter(),
    'Surge': new SurgeConverter(),
    'Loon': new LoonConverter(),
    'QX': new QuantumultXConverter(),
    'QuantumultX': new QuantumultXConverter(),
    'Shadowrocket': new ShadowrocketConverter(),
    'Stash': new StashConverter(),
    'Surfboard': new SurfboardConverter(),
};

/**
 * 核心转换函数
 * 
 * @param nodes 标准节点列表
 * @param platform 目标平台
 * @param options 转换选项
 */
export async function convert(
    nodes: ProxyNode[],
    platform: string = 'URI',
    options: ConvertOptions = {}
): Promise<string> {
    const target = platform.toLowerCase();

    let converter;
    if (target.includes('clashmeta') || target.includes('mihomo')) {
        converter = converters['ClashMeta'];
    } else if (target.includes('clash')) {
        converter = converters['Clash'];
    } else if (target.includes('singbox') || target.includes('sing-box')) {
        converter = converters['Singbox'];
    } else if (target.includes('surge')) {
        converter = converters['Surge'];
    } else if (target.includes('loon')) {
        converter = converters['Loon'];
    } else if (target === 'qx' || target.includes('quantumult')) {
        converter = converters['QX'];
    } else if (target === 'shadowrocket') {
        converter = converters['Shadowrocket'];
    } else if (target === 'stash') {
        converter = converters['Stash'];
    } else if (target === 'surfboard') {
        converter = converters['Surfboard'];
    } else if (target === 'uri' || target === 'base64' || target === 'v2ray') {
        converter = converters['URI'];
    } else {
        converter = converters['URI'];
    }

    let result = await converter.convert(nodes, options);

    if (target === 'base64' || target === 'v2ray') {
        const { Base64 } = await import('js-base64');
        result = Base64.encode(result);
    }

    return result;
}

export {
    URIConverter,
    ClashConverter,
    SingboxConverter,
    SurgeConverter,
    LoonConverter,
    QuantumultXConverter,
    ShadowrocketConverter
};


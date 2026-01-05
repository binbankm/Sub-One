import type { ProxyNode, ConverterOptions } from '../../shared/types';
import { encodeBase64 } from './base64';
import { toClash } from './clash-converter';
import { toSingBox } from './singbox-converter';
import { toSurge } from './surge-converter';
import { toLoon } from './loon-converter';
import { toQuantumultX } from './quantumultx-converter';

/**
 * ==================== 订阅转换器 ====================
 * 
 * 功能说明:
 * - 将节点数组转换为各种客户端格式
 * - 支持 Clash、Surge、Sing-Box、Loon、QuantumultX、Base64 等格式
 * - 完全内置,无需依赖外部 SubConverter 服务
 * - 基于 Sub-Store 和 SubConverter 的转换逻辑
 * 
 * 支持的格式:
 * - Base64: 原始节点链接的 Base64 编码
 * - Clash: Clash Meta/Premium YAML 配置
 * - Surge: Surge 配置文件
 * - Sing-Box: Sing-Box JSON 配置
 * - Loon: Loon 配置文件
 * - QuantumultX: QuantumultX 配置文件
 * 
 * ===================================================
 */

export class SubscriptionConverter {
    /**
     * 主转换方法 - 根据目标格式转换节点
     */
    convert(nodes: ProxyNode[], format: string, options: ConverterOptions = {}): string {
        const formatHandlers: Record<string, () => string> = {
            'base64': () => this.toBase64(nodes),
            'v2ray': () => this.toBase64(nodes),
            'clash': () => toClash(nodes, options),
            'singbox': () => toSingBox(nodes, options),
            'surge': () => toSurge(nodes, options),
            'loon': () => toLoon(nodes, options),
            'quantumultx': () => toQuantumultX(nodes, options),
        };

        const handler = formatHandlers[format.trim().toLowerCase()];
        if (!handler) {
            throw new Error(`不支持的转换格式: ${format}`);
        }

        return handler();
    }

    /**
     * 转换为 Base64 格式
     */
    toBase64(nodes: ProxyNode[]): string {
        const urls = nodes.map(node => node.url).join('\n');
        return encodeBase64(urls);
    }

    // 以下方法已移到独立的转换器模块
    toClash(nodes: ProxyNode[], options: ConverterOptions = {}): string {
        return toClash(nodes, options);
    }

    toSingBox(nodes: ProxyNode[], options: ConverterOptions = {}): string {
        return toSingBox(nodes, options);
    }

    toSurge(nodes: ProxyNode[], options: ConverterOptions = {}): string {
        return toSurge(nodes, options);
    }

    toLoon(nodes: ProxyNode[], options: ConverterOptions = {}): string {
        return toLoon(nodes, options);
    }

    toQuantumultX(nodes: ProxyNode[], options: ConverterOptions = {}): string {
        return toQuantumultX(nodes, options);
    }
}

// 导出单例
export const subscriptionConverter = new SubscriptionConverter();

// 导出类型和选项
export type { ConverterOptions } from '../../shared/types';

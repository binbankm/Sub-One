import yaml from 'js-yaml';
import { Node, ProcessOptions } from './types';
import { parseNodeUrl } from './parsers/index';
import { parseClashProxy } from './parsers/clash';
import { buildNodeUrl } from './url-builder';

/**
 * 下一代订阅解析器
 * 核心设计原则：单一职责，将内容标准化为 Node IR
 */
export class SubscriptionParser {
    // 兼容旧的成员变量，虽然可能不再使用
    supportedProtocols: string[] = [];

    constructor() {
        // No-op
    }

    /**
     * 主解析方法
     */
    parse(content: string, subscriptionName: string = '', options: ProcessOptions = {}): Node[] {
        if (!content || typeof content !== 'string') {
            return [];
        }

        const trimmed = content.trim();
        let nodes: Node[] = [];

        // 1. 尝试解析为 JSON (SIP008 / Shadowsocks JSON)
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                JSON.parse(trimmed);
                // 可能是 SIP008 (servers array)
                // TODO: 实现 SIP008 parser logic inside parsers/ ?
                // 暂时简单处理：如果 JSON 失败则继续
            } catch (e) {
                // Ignore JSON parse error, treat as text
            }
        }

        // 2. 尝试解析为 YAML (Clash)
        // 只有包含 proxies: 关键字时才尝试，避免误伤普通文本
        if (trimmed.includes('proxies:') || trimmed.includes('Proxy:')) {
            try {
                const yamlContent: any = yaml.load(trimmed);
                if (yamlContent && typeof yamlContent === 'object') {
                    const proxies = yamlContent.proxies || yamlContent.Proxy;
                    if (Array.isArray(proxies)) {
                        console.log(`[Parser] Detected Clash YAML with ${proxies.length} proxies.`);
                        nodes = proxies
                            .map(p => parseClashProxy(p))
                            .filter((n): n is Node => n !== null);

                        // 如果成功提取了节点，直接返回处理结果
                        if (nodes.length > 0) {
                            return this.processNodes(nodes, subscriptionName, options);
                        }
                    }
                }
            } catch (e) {
                console.warn('[Parser] Failed to parse as YAML:', e);
            }
        }

        // 3. 尝试 Base64 解码
        // 如果内容看起来像 Base64 (没有空格，字符集合合法)
        if (!trimmed.includes(' ') && /^[a-zA-Z0-9+/=]+$/.test(trimmed)) {
            try {
                const decoded = atob(trimmed);
                // 解码成功，递归调用 parse 处理解码后的内容
                // 防止无限递归：Base64 解码后通常是 换行分隔的 URL 或 YAML
                // 我们调用专门的行处理逻辑
                return this.parseLines(decoded, subscriptionName, options);
            } catch (e) {
                // Base64 解码失败，当作普通文本处理
            }
        }

        // 4. 按行解析 (文本/Base64解码结果)
        return this.parseLines(trimmed, subscriptionName, options);
    }

    /**
     * 解析多行文本
     */
    private parseLines(content: string, subscriptionName: string, options: ProcessOptions): Node[] {
        const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        const nodes: Node[] = [];

        for (const line of lines) {
            // 忽略注释
            if (line.startsWith('#') || line.startsWith('//')) continue;

            const node = parseNodeUrl(line);
            if (node) {
                // 如果 URL hash 指定了名字，使用它；否则可以用 subscription name 前缀等
                // 这里 node.name 已经在 parser 里解析了 (from hash)
                nodes.push(node);
            }
        }

        return this.processNodes(nodes, subscriptionName, options);
    }

    /**
     * 后处理：过滤、重命名、去重
     */
    processNodes(nodes: Node[], subscriptionName: string, options: ProcessOptions): Node[] {
        let result = nodes;

        // 1. 过滤 (Exclude)
        if (options.exclude) {
            const regex = new RegExp(options.exclude, 'i');
            result = result.filter(n => !regex.test(n.name));
        }

        // 2. 重命名 (Prepend Subscription Name)
        if (options.prependSubName && subscriptionName) {
            result.forEach(n => {
                // 避免重复前缀
                if (!n.name.startsWith(subscriptionName)) {
                    n.name = `${subscriptionName} - ${n.name}`;
                }
                n.subscriptionName = subscriptionName;
            });
        }

        // 3. 填充 URL (Runtime Generate) if missing
        result.forEach(n => {
            if (!n.url) {
                // 确保有 URL，特别是重命名后需要更新 URL 中的 hash
                n.url = buildNodeUrl(n);
            }
        });

        return result;
    }

    // 兼容旧代码调用: parseNodeLines
    parseNodeLines(lines: string[], subscriptionName: string): Node[] {
        const nodes: Node[] = [];
        for (const line of lines) {
            const node = parseNodeUrl(line);
            if (node) nodes.push(node);
        }
        return this.processNodes(nodes, subscriptionName, {});
    }
}

import yaml from 'js-yaml';
import { Node, ProcessOptions } from './types';
import { parseNodeUrl } from './parsers/index';
import { parseClashProxy } from './parsers/clash';
import { parseSIP008 } from './parsers/sip008';
import { buildNodeUrl } from './url-builder';
import { decodeBase64 } from './converter/base64';

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
                const json = JSON.parse(trimmed);
                nodes = parseSIP008(json);
                if (nodes.length > 0) {
                    console.log(`[Parser] Detected format: SIP008 JSON - found ${nodes.length} nodes.`);
                    return this.processNodes(nodes, subscriptionName, options);
                }
            } catch (e) {
                // Ignore JSON parse error, treat as text
            }
        }


        // 2. 尝试 Base64 解码
        // 如果内容看起来像 Base64 (没有空格，字符集合合法)
        // 很多机场的 Clash 订阅也是 Base64 编码的 YAML
        if (!trimmed.includes(' ') && /^[a-zA-Z0-9+/=_-]+$/.test(trimmed)) {
            try {
                // 使用增强版 decodeBase64
                const decoded = decodeBase64(trimmed);
                console.log(`[Parser] Successfully decoded Base64 content (${decoded.length} bytes).`);

                // 解码后，递归调用 parse 处理解码后的内容 (可能是 YAML 或 URL List)
                return this.parse(decoded, subscriptionName, options);
            } catch (e) {
                // Base64 解码失败，当作普通文本处理
            }
        }

        // 3. 尝试解析为 YAML (Clash)
        // 只有包含 proxies: 关键字时才尝试，避免误伤普通文本
        if (content.includes('proxies:') || content.includes('Proxy:')) {
            try {
                const yamlContent: any = yaml.load(content);
                if (yamlContent && typeof yamlContent === 'object') {
                    const proxies = yamlContent.proxies || yamlContent.Proxy;
                    if (Array.isArray(proxies)) {
                        console.log(`[Parser] Detected format: Clash YAML - found ${proxies.length} proxies.`);
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
                // console.warn('[Parser] Failed to parse as YAML:', e);
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
                nodes.push(node);
            }
        }

        if (nodes.length > 0) {
            console.log(`[Parser] Detected format: URL List - parsed ${nodes.length} nodes successfully.`);
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

        // 2. 去重 (Deduplicate) - 基于物理特征 (server + port + type)
        if (options.dedupe) {
            const seen = new Map<string, Node>();
            result = result.filter(n => {
                // 生成节点的物理指纹
                const fingerprint = `${n.type}://${n.server}:${n.port}`;
                if (seen.has(fingerprint)) {
                    // 已存在相同物理节点，保留名称更短或更早出现的
                    const existing = seen.get(fingerprint)!;
                    if (n.name.length < existing.name.length) {
                        seen.set(fingerprint, n);
                        return true;
                    }
                    return false;
                }
                seen.set(fingerprint, n);
                return true;
            });
        }

        // 3. 重命名 (Prepend Subscription Name)
        if (options.prependSubName && subscriptionName) {
            result.forEach(n => {
                // 避免重复前缀
                if (!n.name.startsWith(subscriptionName)) {
                    n.name = `${subscriptionName} - ${n.name}`;
                }
                n.subscriptionName = subscriptionName;
            });
        }

        // 4. 填充 URL (Runtime Generate) if missing
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

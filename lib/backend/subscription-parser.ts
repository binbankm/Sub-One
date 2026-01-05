import yaml from 'js-yaml';
import { ProxyNode, ProcessOptions, ClashProxyConfig } from '../shared/types';
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
     * 
     * 解析顺序（从高优先级到低优先级）：
     * 1. JSON格式（最明确，100%确定性）
     * 2. YAML格式（关键字明确，误判率低）
     * 3. URL List格式（协议前缀明确）
     * 4. Base64编码（需要解码，最后尝试）
     * 5. 兜底方案（按行解析）
     */
    parse(content: string, subscriptionName: string = '', options: ProcessOptions = {}): ProxyNode[] {
        if (!content || typeof content !== 'string') {
            return [];
        }

        const trimmed = content.trim();
        let nodes: ProxyNode[] = [];

        // ========== 1️⃣ JSON检测（最高优先级）==========
        // 特征：以 { 或 [ 开头，100%确定性
        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            try {
                const json = JSON.parse(trimmed);
                nodes = parseSIP008(json);
                if (nodes.length > 0) {
                    console.log(`[Parser] ✅ Detected format: SIP008 JSON - found ${nodes.length} nodes.`);
                    return this.processNodes(nodes, subscriptionName, options);
                }
            } catch (e) {
                // JSON解析失败，继续尝试其他格式
                console.log('[Parser] JSON parse failed, trying other formats...');
            }
        }

        // ========== 2️⃣ YAML检测（第二优先级）==========
        // 特征：包含 'proxies:' 或 'Proxy:' 关键字
        // 优势：关键字明确，误判率低
        if (content.includes('proxies:') || content.includes('Proxy:')) {
            try {
                const yamlContent = yaml.load(content) as Record<string, unknown>;
                if (yamlContent && typeof yamlContent === 'object') {
                    const proxies = (yamlContent.proxies || yamlContent.Proxy) as ClashProxyConfig[];
                    if (Array.isArray(proxies)) {
                        console.log(`[Parser] ✅ Detected format: Clash YAML - found ${proxies.length} proxies.`);
                        nodes = proxies
                            .map(p => parseClashProxy(p))
                            .filter((n): n is ProxyNode => n !== null);

                        if (nodes.length > 0) {
                            return this.processNodes(nodes, subscriptionName, options);
                        }
                    }
                }
            } catch (e) {
                // YAML解析失败，继续尝试其他格式
                console.log('[Parser] YAML parse failed, trying other formats...');
            }
        }

        // ========== 3️⃣ URL List预检测（第三优先级）==========
        // 特征：第一行以协议前缀开头（ss://, vmess://, trojan://等）
        // 优势：快速判断，避免不必要的Base64解码
        const firstLine = trimmed.split(/\r?\n/)[0]?.trim() || '';
        const urlProtocolPattern = /^(ss|ssr|vmess|vless|trojan|hysteria|hysteria2|tuic|wireguard|snell):\/\//i;

        if (urlProtocolPattern.test(firstLine)) {
            console.log('[Parser] ✅ Detected format: URL List (by protocol prefix)');
            return this.parseLines(trimmed, subscriptionName, options);
        }

        // ========== 4️⃣ Base64检测（第四优先级）==========
        // 特征：无空格 + 仅包含Base64字符集 + 满足最小长度
        // 优化：增加更严格的检测条件，减少误判
        const looksLikeBase64 = (
            !trimmed.includes(' ') &&                    // 无空格
            !trimmed.includes('\n') &&                   // 单行（多行内容通常不是Base64编码的订阅）
            trimmed.length > 50 &&                       // 最小长度（避免误判短URL）
            /^[a-zA-Z0-9+/=_-]+$/.test(trimmed)         // 仅Base64字符集
        );

        if (looksLikeBase64) {
            try {
                const decoded = decodeBase64(trimmed);
                console.log(`[Parser] ✅ Decoded Base64 content (${decoded.length} bytes), re-parsing...`);

                // 解码后递归调用 parse（可能是YAML或URL List）
                // 递归深度自然受限，因为解码后的内容会匹配更明确的格式
                return this.parse(decoded, subscriptionName, options);
            } catch (e) {
                // Base64解码失败，继续走兜底逻辑
                console.log('[Parser] Base64 decode failed, falling back to line parsing...');
            }
        }

        // ========== 5️⃣ 兜底方案：智能兜底 ==========
        // 首先尝试按行解析（parseLines内部会调用processNodes）
        console.log('[Parser] ℹ️  Trying fallback: line-by-line URL parsing...');
        const lineParseResult = this.parseLines(trimmed, subscriptionName, options);

        // 如果按行解析成功（找到节点），直接返回
        if (lineParseResult.length > 0) {
            return lineParseResult;
        }

        // 如果按行解析失败，且内容看起来可能是Base64（包括短Base64）
        // 这是最后的尝试，处理长度 < 50 的罕见Base64场景
        const mightBeShortBase64 = (
            !trimmed.includes(' ') &&                    // 无空格
            !trimmed.includes('\n') &&                   // 单行
            trimmed.length >= 20 &&                      // 最小合理长度（排除明显错误）
            /^[a-zA-Z0-9+/=_-]+$/.test(trimmed)         // Base64字符集
        );

        if (mightBeShortBase64) {
            try {
                const decoded = decodeBase64(trimmed);
                console.log(`[Parser] ⚠️  Last attempt: Decoding potential short Base64 (${trimmed.length} chars)...`);

                // 递归解析解码后的内容
                const result = this.parse(decoded, subscriptionName, options);
                if (result.length > 0) {
                    console.log(`[Parser] ✅ Short Base64 decode successful, found ${result.length} nodes.`);
                    return result;
                }
            } catch (e) {
                // Base64解码失败，返回空数组
                console.log('[Parser] ❌ All parsing attempts failed, no valid nodes found.');
            }
        }

        // 所有尝试都失败，返回空数组
        console.log('[Parser] ℹ️  No valid nodes found in content.');
        return [];
    }

    /**
     * 解析多行文本
     */
    private parseLines(content: string, subscriptionName: string, options: ProcessOptions): ProxyNode[] {
        const lines = content.split(/\r?\n/).map(l => l.trim()).filter(l => l);
        const nodes: ProxyNode[] = [];

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
     * 生成节点指纹用于去重
     * 指纹包括：类型、服务器、端口、凭证（UUID/Password）、传输路径
     */
    private getNodeFingerprint(n: ProxyNode): string {
        let fp = `${n.type}://${n.server}:${n.port}`;

        // 1. 凭证去重 (Credentials)
        if ('uuid' in n && n.uuid) {
            fp += `?uuid=${n.uuid}`;
        } else if ('password' in n && n.password) {
            fp += `?password=${n.password}`;
        } else if ('auth' in n && n.auth) { // Hysteria 1
            fp += `?auth=${n.auth}`;
        } else if ('privateKey' in n && n.privateKey) { // WireGuard
            fp += `?pk=${n.privateKey}`;
        }

        // 2. 传输层去重 (Transport Path/Service)
        // 不同的 Path 意味着不同的接入点，不应合并
        if (n.type === 'vmess' || n.type === 'vless' || n.type === 'trojan') {
            if (n.transport) {
                if (n.transport.path) fp += `&path=${n.transport.path}`;
                if (n.transport.serviceName) fp += `&serviceName=${n.transport.serviceName}`;
                if (n.transport.type) fp += `&net=${n.transport.type}`;
            }
        }

        return fp;
    }

    /**
     * 后处理：过滤、重命名、去重
     */
    processNodes(nodes: ProxyNode[], subscriptionName: string, options: ProcessOptions): ProxyNode[] {
        let result = nodes;

        // 1. 过滤 (Advanced Filter)
        if (options.exclude) {
            try {
                const rules = options.exclude.split('\n').map(r => r.trim()).filter(r => r);

                // 将规则分为保留规则(白名单)和排除规则(黑名单)
                const keepRules = rules.filter(r => r.startsWith('keep:'));
                const excludeRules = rules.filter(r => !r.startsWith('keep:'));

                // 辅助函数：判断节点是否匹配单条规则
                const matchRule = (node: ProxyNode, rule: string): boolean => {
                    // 去除可能存在的 keep: 前缀
                    const cleanRule = rule.replace(/^keep:/, '');

                    // 协议匹配 (proto:ss,vmess)
                    if (cleanRule.startsWith('proto:')) {
                        const protos = cleanRule.replace('proto:', '').toLowerCase().split(',');
                        // 处理 ss/ssr 的别名情况
                        const nodeType = node.type.toLowerCase();
                        return protos.some(p => {
                            if (p === 'ss' && (nodeType === 'ss' || nodeType === 'ssr')) return true;
                            // 兼容前端可能的别名
                            if (p === 'wg' && nodeType === 'wireguard') return true;
                            return nodeType === p;
                        });
                    }

                    // 正则/关键词匹配 (匹配名称)
                    try {
                        const regex = new RegExp(cleanRule, 'i');
                        return regex.test(node.name);
                    } catch (e) {
                        // 如果正则无效，回退到简单的包含匹配
                        return node.name.toLowerCase().includes(cleanRule.toLowerCase());
                    }
                };

                result = result.filter(n => {
                    // 1. 黑名单检查：只要命中任意一条排除规则，立即剔除
                    if (excludeRules.length > 0) {
                        const hitExclude = excludeRules.some(rule => matchRule(n, rule));
                        if (hitExclude) return false;
                    }

                    // 2. 白名单检查：如果存在保留规则，必须命中至少一条
                    if (keepRules.length > 0) {
                        const hitKeep = keepRules.some(rule => matchRule(n, rule));
                        if (!hitKeep) return false;
                    }

                    return true;
                });
            } catch (e) {
                console.error('[Parser] Filter error:', e);
                // 发生严重错误时，为安全起见不进行过滤，或回退到简单正则
                // 这里选择尽可能保留节点
            }
        }

        // 2. 去重 (Deduplicate) - 基于物理特征 (server + port + type + credentials + path)
        if (options.dedupe) {
            // 第一步：收集每个物理指纹对应的最佳节点（名称最短）
            const bestNodes = new Map<string, ProxyNode>();

            result.forEach(n => {
                const fingerprint = this.getNodeFingerprint(n);
                const existing = bestNodes.get(fingerprint);

                if (!existing || n.name.length < existing.name.length) {
                    // 没有现存节点，或当前节点名称更短
                    bestNodes.set(fingerprint, n);
                }
            });

            // 第二步：只保留最佳节点
            const bestNodesSet = new Set(bestNodes.values());
            result = result.filter(n => bestNodesSet.has(n));
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
    parseNodeLines(lines: string[], subscriptionName: string): ProxyNode[] {
        const nodes: ProxyNode[] = [];
        for (const line of lines) {
            const node = parseNodeUrl(line);
            if (node) nodes.push(node);
        }
        return this.processNodes(nodes, subscriptionName, {});
    }
}

import yaml from 'js-yaml';
import { ProxyNode, ProcessOptions, ClashProxyConfig } from '../shared/types';
import { parseNodeUrl } from './parsers/index';
import { parseClashProxy } from './parsers/clash';
import { parseSIP008 } from './parsers/sip008';
import { buildNodeUrl } from './url-builder';
import { Base64 } from 'js-base64';

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
                const decoded = Base64.decode(trimmed);
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
                const decoded = Base64.decode(trimmed);
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
        const includeRules: string[] = [...(options.includeRules || [])];
        const excludeRules: string[] = [...(options.excludeRules || [])];

        // 兼容旧的 exclude 字段
        if (options.exclude) {
            const legacyRules = options.exclude.split('\n').map(r => r.trim()).filter(r => r);
            legacyRules.forEach(r => {
                if (r.startsWith('keep:')) {
                    includeRules.push(r.replace(/^keep:/, ''));
                } else {
                    excludeRules.push(r);
                }
            });
        }

        // 辅助函数：判断节点是否匹配单条规则
        const matchRule = (node: ProxyNode, rule: string): boolean => {
            // 协议匹配 (proto:ss,vmess)
            if (rule.startsWith('proto:')) {
                const protos = rule.replace('proto:', '').toLowerCase().split(',');
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
                // 如果规则是简单的字符串，转义特殊字符
                // 这里我们假设如果规则看起来像正则（包含特殊字符），就作为正则处理
                const isRegex = /[\^\$\.\*\+\?\{\}\[\]\\\|\(\)]/.test(rule);
                if (isRegex) {
                    const regex = new RegExp(rule, 'i');
                    return regex.test(node.name);
                }
                return node.name.toLowerCase().includes(rule.toLowerCase());
            } catch (e) {
                // 如果正则无效，回退到简单的包含匹配
                return node.name.toLowerCase().includes(rule.toLowerCase());
            }
        };

        // 1. 过滤 (Filter)
        if (includeRules.length > 0 || excludeRules.length > 0) {
            result = result.filter(n => {
                // 1. 黑名单检查：只要命中任意一条排除规则，立即剔除
                if (excludeRules.length > 0) {
                    const hitExclude = excludeRules.some(rule => matchRule(n, rule));
                    if (hitExclude) return false;
                }

                // 2. 白名单检查：如果存在保留规则，必须命中至少一条
                if (includeRules.length > 0) {
                    const hitKeep = includeRules.some(rule => matchRule(n, rule));
                    if (!hitKeep) return false;
                }

                return true;
            });
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



        // 3 订阅前缀重命名 (Prepend Subscription Name)
        if (options.prependSubName && subscriptionName) {
            result.forEach(n => {
                // 避免重复前缀
                if (!n.name.startsWith(subscriptionName)) {
                    n.name = `${subscriptionName} - ${n.name}`;
                }
                n.subscriptionName = subscriptionName;
            });
        }

        // 3.5 自动补全旗帜 (Auto Flag Completion)
        result.forEach(n => {
            n.name = addFlagToName(n.name);
        });

        // 4. 填充/更新 URL (Runtime Generate)
        result.forEach(n => {
            // 重新生成 URL 的条件：
            // 1. URL 不存在（从 YAML/JSON 解析的节点）
            // 2. 进行了重命名（需要更新 URL 中的 hash 部分）
            if (!n.url || options.prependSubName) {
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

/**
 * 自动为节点名补全旗帜 Emoji
 * 
 * @param name 原始节点名
 * @returns 补全旗帜后的节点名
 */
export function addFlagToName(name: string): string {
    if (!name) return name;

    // 1. 只有当名字开头已经是国旗 Emoji 时才跳过
    // 这种方式比判断全名包含 Emoji 更鲁棒，不会误伤带标识性图标的节点
    if (/^[\uD83C][\uDDE6-\uDDFF][\uD83C][\uDDE6-\uDDFF]/.test(name)) {
        return name;
    }

    const flags: Record<string, string> = {
        // --- 核心地区 ---
        '香港': '🇭🇰', 'HK': '🇭🇰', 'Hong Kong': '🇭🇰',
        '日本': '🇯🇵', 'JP': '🇯🇵', 'Japan': '🇯🇵', '东京': '🇯🇵', '大阪': '🇯🇵', 'Tokyo': '🇯🇵', 'Osaka': '🇯🇵',
        '美国': '🇺🇸', 'US': '🇺🇸', 'USA': '🇺🇸', 'United States': '🇺🇸', '洛杉矶': '🇺🇸', '圣何塞': '🇺🇸', '旧金山': '🇺🇸', '曼哈顿': '🇺🇸', '波特兰': '🇺🇸', '西雅图': '🇺🇸', 'Los Angeles': '🇺🇸', 'San Francisco': '🇺🇸', 'Seattle': '🇺🇸',
        '新加坡': '🇸🇬', 'SG': '🇸🇬', 'Singapore': '🇸🇬',
        '台湾': '🇹🇼', 'TW': '🇹🇼', 'Taiwan': '🇹🇼', '台北': '🇹🇼', 'Taipei': '🇹🇼',
        '韩国': '🇰🇷', 'KR': '🇰🇷', 'Korea': '🇰🇷', '首尔': '🇰🇷', 'Seoul': '🇰🇷',

        // --- 欧洲/美洲/大洋洲 ---
        '英国': '🇬🇧', 'UK': '🇬🇧', 'United Kingdom': '🇬🇧', '伦敦': '🇬🇧', 'London': '🇬🇧',
        '德国': '🇩🇪', 'DE': '🇩🇪', 'Germany': '🇩🇪', '法兰克福': '🇩🇪', 'Frankfurt': '🇩🇪',
        '法国': '🇫🇷', 'FR': '🇫🇷', 'France': '🇫🇷', '巴黎': '🇫🇷', 'Paris': '🇫🇷',
        '意大利': '🇮🇹', 'IT': '🇮🇹', 'Italy': '🇮🇹', '米兰': '🇮🇹',
        '荷兰': '🇳🇱', 'NL': '🇳🇱', 'Netherlands': '🇳🇱', '阿姆斯特丹': '🇳🇱',
        '瑞士': '🇨🇭', 'CH': '🇨🇭', 'Switzerland': '🇨🇭',
        '瑞典': '🇸🇪', 'SE': '🇸🇪', 'Sweden': '🇸🇪',
        '西班牙': '🇪🇸', 'ES': '🇪🇸', 'Spain': '🇪🇸',
        '波兰': '🇵🇱', 'PL': '🇵🇱', 'Poland': '🇵🇱',
        '加拿大': '🇨🇦', 'CA': '🇨🇦', 'Canada': '🇨🇦', '蒙特利尔': '🇨🇦', '多伦多': '🇨🇦', '温哥华': '🇨🇦',
        '澳大利亚': '🇦🇺', 'AU': '🇦🇺', 'Australia': '🇦🇺', '悉尼': '🇦🇺', '墨尔本': '🇦🇺',

        // --- 亚洲其它/中东/其它 ---
        '俄罗斯': '🇷🇺', 'RU': '🇷🇺', 'Russia': '🇷🇺', '伯力': '🇷🇺', '莫斯科': '��', '圣彼得堡': '��', 'Moscow': '��',
        '印度': '🇮🇳', 'IN': '🇮🇳', 'India': '🇮🇳', '孟买': '🇮�',
        '土耳其': '🇹🇷', 'TR': '🇹🇷', 'Turkey': '🇹🇷', '伊斯坦布尔': '🇹🇷',
        '阿联酋': '🇦🇪', 'AE': '🇦🇪', '阿布扎比': '🇦🇪', '迪拜': '🇦🇪',
        '巴西': '🇧🇷', 'BR': '🇧🇷', 'Brazil': '🇧🇷',
        '泰国': '🇹🇭', 'TH': '🇹🇭', 'Thailand': '🇹🇭',
        '越南': '🇻🇳', 'VN': '🇻🇳', 'Vietnam': '🇻🇳',
        '菲律宾': '🇵🇭', 'PH': '🇵🇭', 'Philippines': '🇵🇭',
        '马来西亚': '🇲🇾', 'MY': '🇲🇾', 'Malaysia': '🇲🇾',
        '印尼': '🇮🇩', 'ID': '🇮🇩', 'Indonesia': '🇮🇩',
        '阿根廷': '🇦🇷', 'AR': '🇦🇷', 'Argentina': '🇦🇷',
        '墨西哥': '🇲🇽', 'MX': '🇲🇽', 'Mexico': '🇲🇽'
    };

    // 搜索顺序：优先匹配最长关键词（防止如 "美国" 匹配到 "美国洛杉矶" 里的 "美国" 时顺序错乱，虽然这里是包含关系）
    const keywords = Object.keys(flags).sort((a, b) => b.length - a.length);

    for (const keyword of keywords) {
        // 使用不区分大小写的正则表达式
        const regex = new RegExp(keyword, 'i');
        if (regex.test(name)) {
            return `${flags[keyword]} ${name}`;
        }
    }

    return name;
}

/**
 * Sub-One Processor Engine
 *
 * 负责执行各种预处理、操作符和后处理逻辑
 */
import type { ProcessOptions, ProxyNode } from '../types';
import { buildRegex, getNodeFingerprint, isNotEmpty } from '../utils';

/**
 * 处理代理节点列表
 *
 * 流程:
 * 1. 基础过滤 (Filter)
 * 2. 基础去重 (Deduplicate)
 * 3. 基础排序 (Sort)
 * 4. 基础重命名 (Rename: 专属规则 -> 全局规则)
 * 5. 前缀添加 (PrependSubName)
 */
export async function process(
    nodes: ProxyNode[],
    options: ProcessOptions = {},
    subscriptionName: string = ''
): Promise<ProxyNode[]> {
    let result = [...nodes];

    // 1. 过滤逻辑
    result = handleFiltering(result, options);

    // 2. 去重逻辑
    if (options.dedupe) {
        result = handleDeduplicate(result);
    }

    // 3. 节点重命名逻辑 (订阅专属规则 -> 全局规则)
    if (options.rename) {
        result = handleRenaming(result, options.rename);
    }
    if (options.globalRename) {
        result = handleRenaming(result, options.globalRename);
    }

    // 4. 前缀逻辑
    if (options.prependSubName && isNotEmpty(subscriptionName)) {
        result.forEach((node) => {
            if (!node.name.startsWith(subscriptionName)) {
                node.name = `${subscriptionName} - ${node.name}`;
            }
        });
    }

    return result;
}

/**
 * 节点重命名逻辑
 *
 * 语法格式:
 * - 每行一条规则: pattern@replacement
 * - 若无 @，则默认直接删除匹配到的内容
 * - 支持正则表达式 (例如 \[[^\]]*\]@ 或 HK-(\d+)@香港 $1)
 * - 支持行注释 (以 # 或 // 开头)
 */
export function handleRenaming(nodes: ProxyNode[], renameRulesStr?: string): ProxyNode[] {
    if (!renameRulesStr || !renameRulesStr.trim()) return nodes;

    const lines = renameRulesStr.split(/\r?\n/);
    const rules: Array<{ regex: RegExp | null; literal: string; replacement: string }> = [];

    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line || line.startsWith('#') || line.startsWith('//')) continue;

        const atIndex = line.indexOf('@');
        let pattern = '';
        let replacement = '';
        if (atIndex !== -1) {
            pattern = line.substring(0, atIndex).trim();
            replacement = line.substring(atIndex + 1).replace(/\r$/, '');
        } else {
            pattern = line;
            replacement = '';
        }

        if (!pattern) continue;

        let regex: RegExp | null = null;
        try {
            regex = new RegExp(pattern, 'gi');
        } catch {
            regex = null;
        }
        rules.push({ regex, literal: pattern, replacement });
    }

    if (rules.length === 0) return nodes;

    const resultNodes: ProxyNode[] = [];

    for (const node of nodes) {
        let currentName = node.name;
        for (const rule of rules) {
            if (rule.regex) {
                currentName = currentName.replace(rule.regex, rule.replacement);
            } else {
                currentName = currentName.split(rule.literal).join(rule.replacement);
            }
        }
        // 清理连续多余空格及首尾空格
        currentName = currentName.replace(/\s+/g, ' ').trim();
        // 如果节点重命名后不为空，保留该节点；若被规则全量清空（如公告、广告节点），则自动丢弃剔除
        if (currentName) {
            node.name = currentName;
            resultNodes.push(node);
        }
    }

    return resultNodes;
}

/**
 * 内部: 过滤逻辑
 */
function handleFiltering(nodes: ProxyNode[], options: ProcessOptions): ProxyNode[] {
    const includeRules = options.includeRules || [];
    const excludeRules = options.excludeRules || [];

    if (options.exclude) {
        const legacyRules = options.exclude
            .split('\n')
            .map((r) => r.trim())
            .filter((r) => r);
        legacyRules.forEach((r) => {
            if (r.startsWith('keep:')) {
                includeRules.push(r.replace(/^keep:/, ''));
            } else {
                excludeRules.push(r);
            }
        });
    }

    if (includeRules.length === 0 && excludeRules.length === 0) return nodes;

    return nodes.filter((node) => {
        if (excludeRules.length > 0) {
            if (excludeRules.some((rule) => matchRule(node, rule))) return false;
        }
        if (includeRules.length > 0) {
            if (!includeRules.some((rule) => matchRule(node, rule))) return false;
        }
        return true;
    });
}

/**
 * 内部: 规则匹配核心
 */
function matchRule(node: ProxyNode, rule: string): boolean {
    if (rule.startsWith('proto:')) {
        const protos = rule.replace('proto:', '').toLowerCase().split(',');
        return protos.includes(node.type.toLowerCase());
    }
    try {
        const re = buildRegex(rule, 'i');
        return re.test(node.name);
    } catch {
        return node.name.toLowerCase().includes(rule.toLowerCase());
    }
}

/**
 * 内部: 去重核心
 */
function handleDeduplicate(nodes: ProxyNode[]): ProxyNode[] {
    const fingerprintMap = new Map<string, ProxyNode>();
    nodes.forEach((node) => {
        const fp = getNodeFingerprint(node);
        const existing = fingerprintMap.get(fp);
        if (!existing || node.name.length < existing.name.length) {
            fingerprintMap.set(fp, node);
        }
    });
    return Array.from(fingerprintMap.values());
}

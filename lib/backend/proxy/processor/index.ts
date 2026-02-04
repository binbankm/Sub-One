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
 * 4. 基础重命名 (Rename)
 * 5. 高级操作符 (Advanced Operators)
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

    // 4. 重命名逻辑
    if (options.prependSubName && isNotEmpty(subscriptionName)) {
        result = handleRename(result, subscriptionName);
    }

    return result;
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

    // 预编译规则
    const excludeMatchers = excludeRules.map(compileRule);
    const includeMatchers = includeRules.map(compileRule);

    if (excludeMatchers.length === 0 && includeMatchers.length === 0) return nodes;

    return nodes.filter((node) => {
        // 先检查排除规则 (黑名单)
        if (excludeMatchers.length > 0) {
            if (excludeMatchers.some((matcher) => matcher(node))) return false;
        }
        // 再检查保留规则 (白名单)
        if (includeMatchers.length > 0) {
            if (!includeMatchers.some((matcher) => matcher(node))) return false;
        }
        return true;
    });
}

/**
 * 内部: 预编译规则匹配器
 */
function compileRule(rule: string): (node: ProxyNode) => boolean {
    if (rule.startsWith('proto:')) {
        const protos = rule.replace('proto:', '').toLowerCase().split(',');
        return (node) => protos.includes(node.type.toLowerCase());
    }
    try {
        const re = buildRegex(rule, 'i');
        return (node) => re.test(node.name);
    } catch {
        const lowerRule = rule.toLowerCase();
        return (node) => node.name.toLowerCase().includes(lowerRule);
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

/**
 * 内部: 重命名逻辑
 */
function handleRename(nodes: ProxyNode[], prefix: string): ProxyNode[] {
    return nodes.map((node) => {
        if (!node.name.startsWith(prefix)) {
            // 创建副本以避免修改原始对象 (如果需要更安全的话，虽然这里 map 已经是浅拷贝了，但 node 还是引用)
            // 为了安全起见，通常我们不深度拷贝 node 除非必要，这里直接修改 name 属性
            // 如果考虑到函数式编程，应该 clone(node)，但为了性能，这里我们假定 input nodes 已经是 process 内部持有的浅拷贝数组
            // 但元素本身是共享引用。
            // 之前的 forEach 直接修改了 node.name。
            // 为了保持行为一致：
            node.name = `${prefix} - ${node.name}`;
        }
        return node;
    });
}

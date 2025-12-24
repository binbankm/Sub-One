/**
 * ==================== 订阅和节点导入模块 ====================
 * 
 * 功能说明：
 * - 解析用户输入的文本内容
 * - 自动识别订阅链接（HTTP）和节点链接（协议://）
 * - 创建标准化的订阅和节点对象
 * - 支持批量导入和文本解析
 * 
 * ==========================================================
 */

import { extractNodeName } from './utils';
import type { Subscription, Node } from '../types';
import { HTTP_REGEX, NODE_PROTOCOL_REGEX } from './constants';

// ==================== 接口定义 ====================

/**
 * 导入结果接口
 * 包含解析后的订阅列表和节点列表
 */
export interface ImportResult {
    /** 解析出的订阅列表 */
    subs: Subscription[];
    /** 解析出的节点列表 */
    nodes: Node[];
}

// ==================== 对象创建函数 ====================

/**
 * 创建标准的订阅对象
 * 
 * 说明：
 * - 根据 URL 和可选的名称创建订阅对象
 * - 自动生成唯一 ID（UUID）
 * - 设置默认属性值
 * 
 * @param {string} url - 订阅链接地址
 * @param {string} [name] - 订阅名称（可选，默认从 URL 提取或使用"未命名"）
 * @returns {Subscription} 标准化的订阅对象
 */
export function createSubscription(url: string, name?: string): Subscription {
    return {
        // 生成唯一标识符（使用浏览器原生 UUID）
        id: crypto.randomUUID(),
        // 设置订阅名称（优先使用传入的名称，否则从 URL 提取，最后使用默认值）
        name: name || extractNodeName(url) || '未命名',
        // 保存订阅 URL
        url: url,
        // 默认启用该订阅
        enabled: true,
        // 初始状态为未检查
        status: 'unchecked',
        // 初始节点数为 0
        nodeCount: 0,
        // 初始不在更新中
        isUpdating: false,
        // 初始排除规则为空
        exclude: ''
    };
}

/**
 * 创建标准的节点对象
 * 
 * 说明：
 * - 根据 URL 和可选的名称创建节点对象
 * - 自动生成唯一 ID（UUID）
 * - 设置默认属性值
 * 
 * @param {string} url - 节点链接地址（如：vmess://xxx, ss://xxx）
 * @param {string} [name] - 节点名称（可选，默认从 URL 提取或使用"未命名"）
 * @returns {Node} 标准化的节点对象
 */
export function createNode(url: string, name?: string): Node {
    return {
        // 生成唯一标识符（使用浏览器原生 UUID）
        id: crypto.randomUUID(),
        // 设置节点名称（优先使用传入的名称，否则从 URL 提取，最后使用默认值）
        name: name || extractNodeName(url) || '未命名',
        // 保存节点 URL
        url: url,
        // 默认启用该节点
        enabled: true
    };
}

// ==================== 文本解析函数 ====================

/**
 * 解析导入文本为订阅和节点列表
 * 
 * 说明：
 * - 自动识别文本中的订阅链接和节点链接
 * - 订阅链接：以 http:// 或 https:// 开头
 * - 节点链接：以特定协议开头（如 vmess://, ss://, trojan:// 等）
 * - 支持多行文本，自动过滤空行
 * 
 * @param {string} importText - 要解析的文本内容（可包含多行）
 * @returns {ImportResult} 包含订阅列表和节点列表的对象
 * 
 * @example
 * ```typescript
 * const text = `
 *   https://example.com/sub1
 *   vmess://xxxxx#香港节点
 *   https://example.com/sub2
 *   trojan://xxxxx#美国节点
 * `;
 * const result = parseImportText(text);
 * // result.subs: 2个订阅
 * // result.nodes: 2个节点
 * ```
 */
export function parseImportText(importText: string): ImportResult {
    // 初始化结果数组
    const newSubs: Subscription[] = [];
    const newNodes: Node[] = [];

    // 处理空输入情况
    if (!importText) {
        return { subs: newSubs, nodes: newNodes };
    }

    // 按换行符分割文本为行数组
    // 注：这里使用简单的 split() 方法，对于大多数场景性能足够
    const lines = importText.split('\n');

    // 遍历每一行进行解析
    for (let i = 0; i < lines.length; i++) {
        // 去除行首尾的空白字符
        const line = lines[i].trim();

        // 跳过空行
        if (!line) continue;

        // 判断是订阅链接还是节点链接
        if (HTTP_REGEX.test(line)) {
            // HTTP/HTTPS 开头的是订阅链接
            newSubs.push(createSubscription(line));
        } else if (NODE_PROTOCOL_REGEX.test(line)) {
            // 协议开头的是节点链接
            newNodes.push(createNode(line));
        }
        // 其他格式的行将被忽略
    }

    // 返回解析结果
    return { subs: newSubs, nodes: newNodes };
}

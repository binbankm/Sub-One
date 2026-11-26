import i18n from '@/i18n';
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
import type { Node, ProxyType, Subscription } from '@/common/types';
import { HTTP_REGEX, NODE_PROTOCOL_REGEX } from '@/common/utils/constants';
import { getProtocol } from '@/common/utils/protocols';
import { extractHostAndPort, extractNodeName, generateUUID } from '@/common/utils/utils';
import { Base64 } from 'js-base64';

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
        // 生成唯一标识符（优先使用包装后的兼容函数）
        id: generateUUID(),
        // 设置订阅名称（优先使用传入的名称，否则从 URL 提取，最后使用默认值）
        name: name || extractNodeName(url) || i18n.global.t('entities.subscription.tg.unnamed'),
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
        exclude: '',
        // 初始重命名规则为空
        rename: ''
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
    const { host, port } = extractHostAndPort(url);
    const protocol = getProtocol(url);

    const hasFragment = url.includes('#');
    let nodeName = '';
    if (hasFragment) {
        nodeName = extractNodeName(url);
    }
    if (!nodeName && name) {
        nodeName = name;
    }
    if (!nodeName) {
        nodeName = extractNodeName(url) || i18n.global.t('entities.subscription.tg.unnamed');
    }

    return {
        // 生成唯一标识符（优先使用包装后的兼容函数）
        id: generateUUID(),
        // 设置节点名称
        name: nodeName,
        // 保存节点 URL
        url: url,
        // 节点类型
        type: protocol as ProxyType,
        // 解析出的服务器地址
        server: host,
        // 解析出的端口
        port: parseInt(port) || 0,
        // 默认启用该节点
        enabled: true
    } as Node;
}

// ==================== 文本解析函数 ====================

/**
 * 解析导入文本为订阅和节点列表
 *
 * 说明：
 * - 自动识别文本中的订阅链接和节点链接
 * - 自动识别并解码 Base64 格式的订阅内容
 * - 订阅链接：以 http:// 或 https:// 开头
 * - 节点链接：以特定协议开头（如 vmess://, ss://, trojan://, vless:// 等）
 * - 支持多行文本，支持单行空格隔开的多个 URI，自动过滤空行
 *
 * @param {string} importText - 要解析的文本内容（可包含多行或 Base64）
 * @returns {ImportResult} 包含订阅列表和节点列表的对象
 */
export function parseImportText(importText: string): ImportResult {
    // 初始化结果数组
    const newSubs: Subscription[] = [];
    const newNodes: Node[] = [];

    // 处理空输入情况
    if (!importText) {
        return { subs: newSubs, nodes: newNodes };
    }

    let rawText = importText.trim();

    // 检查输入是否为 Base64 编码（机场常见订阅输出）
    if (!HTTP_REGEX.test(rawText) && !NODE_PROTOCOL_REGEX.test(rawText)) {
        try {
            const sanitized = rawText.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
            if (sanitized.length >= 16 && /^[A-Za-z0-9+/=]+$/.test(sanitized)) {
                const decoded = Base64.decode(sanitized);
                if (
                    decoded &&
                    (NODE_PROTOCOL_REGEX.test(decoded) ||
                        HTTP_REGEX.test(decoded) ||
                        decoded.includes('://'))
                ) {
                    rawText = decoded;
                }
            }
        } catch {
            // Base64 解码失败则按原文处理
        }
    }

    // 按换行符分割文本为行数组（兼容 CRLF 和 LF）
    const lines = rawText.split(/[\r\n]+/);

    // 遍历每一行进行解析
    for (let i = 0; i < lines.length; i++) {
        // 去除行首尾的空白字符
        const line = lines[i].trim();

        // 跳过空行
        if (!line) continue;

        // 检查一行中是否包含多个空格隔开的节点 URI
        if (!HTTP_REGEX.test(line) && NODE_PROTOCOL_REGEX.test(line)) {
            const matches = line.match(
                /(?:ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5?|socks|snell|wireguard|wg|naive|naive\+https|naive\+http|ssh|mieru|juicity|sudoku|trusttunnel|tt):\/\/[^\s]+/gi
            );
            if (matches && matches.length > 1) {
                for (const uri of matches) {
                    newNodes.push(createNode(uri.trim()));
                }
                continue;
            }
        }

        // 检查是否为 HTTP/HTTPS 代理节点（包含 user:pass@ 或者端口且包含 # 节点备注）
        const isHttpProxyNode =
            HTTP_REGEX.test(line) &&
            ((line.includes('@') && /:\d+/.test(line)) || (line.includes('#') && /:\d+/.test(line)));

        if (isHttpProxyNode) {
            newNodes.push(createNode(line));
        } else if (HTTP_REGEX.test(line)) {
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

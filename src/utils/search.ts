import { getCountryTerms } from './constants';

export interface SearchableNode {
    name?: string;
    url?: string;
    protocol?: string;
    type?: string;
    [key: string]: unknown;
}

/**
 * 通用节点过滤函数
 * 
 * 下列逻辑支持：
 * 1. 协议/类型前缀匹配
 * 2. URL 协议头匹配
 * 3. 智能 SS/VMess 干扰排除
 * 4. 节点名称/URL详情包含匹配
 * 5. 国家/地区别名匹配
 * 
 * @param nodes 节点列表
 * @param searchTerm 搜索关键词
 * @returns 过滤后的节点列表
 */
export const filterNodes = <T extends SearchableNode>(nodes: T[], searchTerm: string): T[] => {
    if (!searchTerm) return nodes;

    const lowerCaseSearch = searchTerm.toLowerCase();
    const alternativeTerms = getCountryTerms(lowerCaseSearch);

    return nodes.filter(node => {
        const nodeNameLower = (node.name || '').toLowerCase();
        const nodeProtocolLower = (node.protocol || '').toLowerCase();
        const nodeTypeLower = (node.type || '').toLowerCase();
        const nodeUrlLower = (node.url || '').toLowerCase();

        // 1. 协议/类型匹配 (优先级最高，且必须以搜索词开头)
        if (nodeProtocolLower.startsWith(lowerCaseSearch) || nodeTypeLower.startsWith(lowerCaseSearch)) {
            // 排除掉搜 manual 匹配到所有节点的情况
            if (lowerCaseSearch !== 'manual') {
                return true;
            }
        }

        // 2. URL 协议头匹配
        if (nodeUrlLower.startsWith(lowerCaseSearch)) {
            return true;
        }

        // 3. 准备名称和 URL 详情的搜索文本
        const isSSSearch = lowerCaseSearch === 'ss';
        // 移除 vmess/vless 防止搜 ss 时误匹配
        const nameToSearch = isSSSearch ? nodeNameLower.replace(/vmess|vless/g, '____') : nodeNameLower;
        const urlDetails = nodeUrlLower.split('://')[1] || '';
        const urlToSearch = isSSSearch ? urlDetails.replace(/vmess|vless/g, '____') : urlDetails;

        // 4. 节点名称匹配
        if (nameToSearch.includes(lowerCaseSearch)) {
            return true;
        }

        // 5. URL 详情匹配
        if (urlToSearch.includes(lowerCaseSearch)) {
            return true;
        }

        // 6. 国家/地区别名匹配
        for (const altTerm of alternativeTerms) {
            if (nameToSearch.includes(altTerm.toLowerCase())) {
                return true;
            }
        }

        return false;
    });
};

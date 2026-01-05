
/**
 * 规则模板定义系统
 * 
 * 核心设计：
 * 使用抽象的 "UniversalRule" 结构来描述规则，然后由各客户端的转换器将其“翻译”为特定格式。
 * 避免维护多份重复的配置。
 */

// ==================== 类型定义 ====================

export type RuleTarget = 'Proxy' | 'Direct' | 'Reject' | 'Auto' | string; // string 用于自定义策略组名称

export interface UniversalGroup {
    name: string;   // 策略组标识，如 "Streaming"
    type: 'select' | 'url-test' | 'fallback';
    icon?: string;  // Clash Meta 专属 (Emoji)
    iconUrl?: string; // Surge / Loon / QX 专属 (Image URL)
    ruleProviders?: string[]; // 绑定的规则集 (可选)
}

export type RuleType =
    | 'domain'
    | 'domain_suffix'
    | 'domain_keyword'
    | 'ip_cidr'
    | 'geoip'

    | 'process_name'
    | 'rule_set';

export interface UniversalRule {
    type: RuleType;
    value: string;
    target: RuleTarget; // 目标策略组
    noResolve?: boolean; // DNS 
}

export interface RuleTemplate {
    id: string;
    name: string;
    description: string;
    groups: UniversalGroup[]; // 该模板需要创建的额外策略组 (除了默认的 Proxy/Auto/Direct)
    rules: UniversalRule[];   // 具体的规则列表
}

// ==================== 预置模板 ====================


/**
 * 模板 0: 仅节点 (None)
 * 只包含节点列表，不包含任何策略组和规则。适合用户完全自定义配置。
 */
export const TEMPLATE_NONE: RuleTemplate = {
    id: 'none',
    name: '仅节点 (无规则)',
    description: '只导出节点列表，不包含策略组和规则，适合完全自定义配置或导入到其他工具。',
    groups: [], // 无策略组
    rules: []   // 无规则
};

/**
 * 模板 1: 基础模式 (Minimal)
 * 仅包含 GEOIP CN 直连，其他全部走代理。最简单，不容易出错。
 */
export const TEMPLATE_MINIMAL: RuleTemplate = {
    id: 'minimal',
    name: '基础模式 (仅CN直连)',
    description: '最简单的规则，国内IP直连，其他全部代理。',
    groups: [], // 无额外策略组
    rules: [
        // 局域网和私有IP
        { type: 'domain_suffix', value: 'local', target: 'Direct' },
        { type: 'ip_cidr', value: '127.0.0.0/8', target: 'Direct', noResolve: true },
        { type: 'ip_cidr', value: '172.16.0.0/12', target: 'Direct', noResolve: true },
        { type: 'ip_cidr', value: '192.168.0.0/16', target: 'Direct', noResolve: true },
        { type: 'ip_cidr', value: '10.0.0.0/8', target: 'Direct', noResolve: true },
        // CN 直连
        { type: 'geoip', value: 'cn', target: 'Direct' },
        { type: 'geoip', value: 'private', target: 'Direct' },
        // 兜底 (Final) 逻辑由转换器处理，通常是 MATCH -> Proxy
    ]
};

/**
 * 模板 2: 标准分流 (Standard)
 * - 增加 Apple, Google, Microsoft 等常见服务的自动分流策略组
 * - 增加 广告拦截 (Reject)
 */
export const TEMPLATE_STANDARD: RuleTemplate = {
    id: 'standard',
    name: '标准分流 (推荐)',
    description: '包含苹果、微软、谷歌、Telegram等常见服务的分流策略，以及基础广告拦截。',
    groups: [
        { name: 'Apple', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Apple.png' },
        { name: 'Microsoft', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Microsoft.png' },
        { name: 'Google', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Google.png' },
        { name: 'Telegram', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Telegram.png' },
        { name: 'Streaming', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Netflix.png' }
    ],
    rules: [
        // AdBlock (Remote Rule Set)
        {
            type: 'rule_set',
            // 使用经典的 ACL4SSR 广告拦截列表
            value: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list',
            target: 'Reject'
        },

        // Specific Groups (使用 Remote Rule Set 以获得更完整的列表)
        {
            type: 'rule_set',
            value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Apple/Apple.list',
            target: 'Apple'
        },
        {
            type: 'rule_set',
            value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Microsoft/Microsoft.list',
            target: 'Microsoft'
        },
        {
            type: 'rule_set',
            value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Google/Google.list',
            target: 'Google'
        },
        {
            type: 'rule_set',
            value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Telegram/Telegram.list',
            target: 'Telegram'
        },
        // Streaming (使用 Remote Rule Set)
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Netflix/Netflix.list', target: 'Streaming' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/YouTube/YouTube.list', target: 'Streaming' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Disney/Disney.list', target: 'Streaming' },

        // CN
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list', target: 'Direct' },
        { type: 'geoip', value: 'cn', target: 'Direct' },
        { type: 'geoip', value: 'private', target: 'Direct' }
    ]
};

/**
 * 模板 3: ACL4SSR 精简版 (ACL4SSR_Mini)
 * 模仿经典的 ACL4SSR 分组逻辑，适合习惯该配置的用户。
 */
/**
 * 模板 3: ACL4SSR 精简版 (ACL4SSR_Mini)
 * 模仿经典的 ACL4SSR 分组逻辑，适合习惯该配置的用户。
 * 全面采用远程规则集。
 */
export const TEMPLATE_ACL4SSR: RuleTemplate = {
    id: 'acl4ssr',
    name: 'ACL4SSR 精简版 (RuleSet)',
    description: '经典的 ACL4SSR 分组策略，使用远程规则集，包含流媒体、社交网络等详细分组。',
    groups: [
        { name: 'Netflix', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Netflix.png' },
        { name: 'Telegram', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Telegram.png' },
        { name: 'YouTube', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/YouTube.png' },
        { name: 'Spotify', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Spotify.png' },
        { name: 'Apple', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Apple.png' },
        { name: 'Scholar', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Scholar.png' } // 学术/Google Scholar
    ],
    rules: [
        // AdBlock
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list', target: 'Reject' },

        // Specific Apps
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Netflix/Netflix.list', target: 'Netflix' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/YouTube/YouTube.list', target: 'YouTube' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Spotify/Spotify.list', target: 'Spotify' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Telegram/Telegram.list', target: 'Telegram' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Apple/Apple.list', target: 'Apple' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/GoogleScholar/GoogleScholar.list', target: 'Scholar' },

        // Common GFW List (Proxy Lite)
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyLite.list', target: 'Proxy' },

        // CN & Final
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaDomain.list', target: 'Direct' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ChinaIp.list', target: 'Direct' },
        { type: 'geoip', value: 'cn', target: 'Direct' },
        { type: 'geoip', value: 'private', target: 'Direct' }
    ]
};

/**
 * 模板 4: 高级全能版 (Advanced)
 * 极致细分，包含 AI、各类流媒体、游戏等独立策略组。
 * 适合进阶用户，全量使用高质量 Rule Rulesets.
 */
export const TEMPLATE_ADVANCED: RuleTemplate = {
    id: 'advanced',
    name: '高级全能版 (AI/流媒体细分)',
    description: '适合进阶用户，包含 OpenAI、Disney+、Prime Video、游戏等独立分组，全链路规则集覆盖。',
    groups: [
        { name: 'AI Services', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/ChatGPT.png' },
        { name: 'Netflix', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Netflix.png' },
        { name: 'Disney+', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Disney+.png' },
        { name: 'Prime Video', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Prime_Video.png' },
        { name: 'YouTube', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/YouTube.png' },
        { name: 'Bilibili', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/bilibili.png' },
        { name: 'Spotify', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Spotify.png' },
        { name: 'Telegram', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Telegram.png' },
        { name: 'Steam', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Steam.png' },
        { name: 'Apple', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Apple.png' },
        { name: 'Microsoft', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Microsoft.png' },
        { name: 'PayPal', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/PayPal.png' },
        { name: 'Crypto', type: 'select', iconUrl: 'https://raw.githubusercontent.com/Koolson/Qure/master/IconSet/Color/Cryptocurrency.png' }    // 加密货币
    ],
    rules: [
        // 1. AdBlock
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/BanAD.list', target: 'Reject' },

        // 2. AI Services (OpenAI / Claude / Gemini)
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/OpenAI/OpenAI.list', target: 'AI Services' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Anthropic/Anthropic.list', target: 'AI Services' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Gemini/Gemini.list', target: 'AI Services' },

        // 3. Streaming
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Netflix/Netflix.list', target: 'Netflix' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Disney/Disney.list', target: 'Disney+' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/PrimeVideo/PrimeVideo.list', target: 'Prime Video' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/YouTube/YouTube.list', target: 'YouTube' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Spotify/Spotify.list', target: 'Spotify' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/BiliBili/BiliBili.list', target: 'Bilibili' },

        // 4. Social & Communication
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Telegram/Telegram.list', target: 'Telegram' },

        // 5. Gaming
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Steam/Steam.list', target: 'Steam' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Epic/Epic.list', target: 'Steam' }, // Using Steam group for all games

        // 6. Common Services
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/PayPal/PayPal.list', target: 'PayPal' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Apple/Apple.list', target: 'Apple' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Microsoft/Microsoft.list', target: 'Microsoft' },
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/Financial/Financial.list', target: 'Crypto' },

        // 7. Generic Proxy (Global)
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/ACL4SSR/ACL4SSR/master/Clash/ProxyLite.list', target: 'Proxy' },

        // 8. CN & Direct
        { type: 'rule_set', value: 'https://raw.githubusercontent.com/blackmatrix7/ios_rule_script/master/rule/Clash/China/China.list', target: 'Direct' },
        { type: 'geoip', value: 'cn', target: 'Direct' },
        { type: 'geoip', value: 'private', target: 'Direct' }
    ]
};

export const BUILTIN_TEMPLATES = [
    TEMPLATE_NONE,
    TEMPLATE_MINIMAL,
    TEMPLATE_STANDARD,
    TEMPLATE_ACL4SSR,
    TEMPLATE_ADVANCED
];

export function getTemplate(id: string): RuleTemplate {
    return BUILTIN_TEMPLATES.find(t => t.id === id) || TEMPLATE_NONE;
}

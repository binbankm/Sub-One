/**
 * 生成节点的唯一标识键
 * 
 * 功能说明：
 * - 生成节点的指纹字符串，用于去重和唯一性判断
 * - 核心原则：只保留影响连通性的关键配置，忽略别名、备注等元数据
 * 
 * 优化点：
 * 1. 修复了 VMess 协议误删 id(UUID) 导致不同节点被误判重复的严重 Bug
 * 2. 增强了 JSON 解析的健壮性
 * 3. 统一了其他协议的处理逻辑
 * 
 * @param url 节点 URL
 * @returns 唯一标识键 (Fingerprint)
 */
export const getUniqueKey = (url: string): string => {
    try {
        const trimmedUrl = url.trim();

        // ==================== VMess 协议特殊处理 ====================
        if (trimmedUrl.startsWith('vmess://')) {
            try {
                // 1. 提取并清理 Base64 部分
                const base64Part = trimmedUrl.substring(8); // 'vmess://'.length
                // 兼容有些链接带不规范的空白字符
                const cleanBase64 = base64Part.replace(/[\s\n\r]/g, '');

                // 2. 解码并解析 JSON
                const decodedString = atob(cleanBase64);
                const nodeConfig = JSON.parse(decodedString);

                // 3. 移除元数据字段（这些字段不影响实际连接）
                // ps: 备注名
                // remark: 部分客户端使用的备注字段
                delete nodeConfig.ps;
                delete nodeConfig.remark;

                // IMPORTANT: 绝不能删除 id (UUID)，它是连接认证的核心
                // delete nodeConfig.id; //已修复：移除此行与注释

                // 4. 生成规范化指纹
                // 对 Keys 排序以保证 JSON 序列化的确定性 (Deterministic)
                const sortedConfig = Object.keys(nodeConfig).sort().reduce(
                    (obj: Record<string, unknown>, key) => {
                        obj[key] = nodeConfig[key];
                        return obj;
                    },
                    {}
                );

                return 'vmess://' + JSON.stringify(sortedConfig);
            } catch (e) {
                // 如果 VMess 解析失败（如非标准格式），回退到通用处理
                console.warn('VMess 指纹生成回退到通用模式:', e);
            }
        }

        // ==================== 通用协议处理 ====================
        // 策略：移除 URL Fragment (#后面部分)，因其通常仅作为备注
        // 保留 URL 参数 (?后面部分)，因为可能包含插件配置、指纹等关键信息
        const hashIndex = trimmedUrl.indexOf('#');
        if (hashIndex !== -1) {
            return trimmedUrl.substring(0, hashIndex);
        }

        return trimmedUrl;

    } catch (e) {
        // 兜底逻辑：发生任何未知错误，直接使用原始 URL 作为 Key
        // 宁可不去重，也不能错误去重
        console.error('生成节点唯一键致命错误:', url, e);
        return url;
    }
};

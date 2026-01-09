/**
 * 生成节点的唯一标识键
 * 
 * 说明：
 * - 用于节点去重，判断两个节点是否相同
 * - 针对 VMess 协议解析配置并排序字段作为 KEY
 * - 其他协议移除 # 后面的名称部分
 * 
 * @param url 节点 URL
 * @returns 唯一标识键
 */
export const getUniqueKey = (url: string): string => {
    try {
        // ==================== VMess 协议特殊处理 ====================
        if (url.startsWith('vmess://')) {
            // 提取 Base64 编码部分
            const base64Part = url.substring('vmess://'.length);

            // 解码后移除空白字符
            const decodedString = atob(base64Part).replace(/\s/g, '');

            // 解析 JSON 配置
            const nodeConfig = JSON.parse(decodedString);

            // 删除不影响连接的字段
            delete nodeConfig.ps;
            delete nodeConfig.remark;
            delete nodeConfig.id; // 虽然 id 也是关键，但通常这里是 uuid？wait, id 肯定是关键。
            // 原逻辑里没有删 id，只删了 ps 和 remark。

            // 注意：上面的解码逻辑是照搬 useManualNodes 的，但原来的代码 delete nodeConfig.ps; delete nodeConfig.remark;
            // 并没有 delete id。VMess 的 id (UUID) 必须一致才算重复。

            // 重新序列化对象，并以此作为唯一键 (排序 Key 确保一致性)
            return 'vmess://' + JSON.stringify(
                Object.keys(nodeConfig).sort().reduce(
                    (obj: Record<string, unknown>, key) => {
                        obj[key] = nodeConfig[key];
                        return obj;
                    },
                    {}
                )
            );
        }

        // ==================== 其他协议通用处理 ====================
        // 简单地移除 # 后面的部分（节点名称）
        const hashIndex = url.indexOf('#');
        return hashIndex !== -1 ? url.substring(0, hashIndex) : url;
    } catch (e) {
        console.error('生成节点唯一键失败，将使用原始URL:', url, e);
        return url;
    }
};

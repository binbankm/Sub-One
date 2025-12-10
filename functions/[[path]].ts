/// <reference types="@cloudflare/workers-types" />

import yaml from 'js-yaml';

const OLD_KV_KEY = 'sub_one_data_v1';
const KV_KEY_SUBS = 'sub_one_subscriptions_v1';
const KV_KEY_PROFILES = 'sub_one_profiles_v1';
const KV_KEY_SETTINGS = 'worker_settings_v1';
const COOKIE_NAME = 'auth_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000;


interface Env {
    SUB_ONE_KV: KVNamespace;
    ADMIN_PASSWORD?: string;
}

/**
 * 计算数据的简单哈希值，用于检测变更
 * @param {any} data - 要计算哈希的数据
 * @returns {string} - 数据的哈希值
 */
function calculateDataHash(data: any): string {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 转换为32位整数
    }
    return hash.toString();
}

/**
 * 检测数据是否发生变更
 * @param {any} oldData - 旧数据
 * @param {any} newData - 新数据
 * @returns {boolean} - 是否发生变更
 */
function hasDataChanged(oldData: any, newData: any): boolean {
    if (!oldData && !newData) return false;
    if (!oldData || !newData) return true;
    return calculateDataHash(oldData) !== calculateDataHash(newData);
}

/**
 * 条件性写入KV存储，只在数据真正变更时写入
 * @param {Object} env - Cloudflare环境对象
 * @param {string} key - KV键名
 * @param {any} newData - 新数据
 * @param {any} oldData - 旧数据（可选）
 * @returns {Promise<boolean>} - 是否执行了写入操作
 */
async function conditionalKVPut(env: Env, key: string, newData: any, oldData: any = null): Promise<boolean> {
    if (oldData === null) {
        try {
            oldData = await env.SUB_ONE_KV.get(key, 'json');
        } catch (error) {
            await env.SUB_ONE_KV.put(key, JSON.stringify(newData));
            return true;
        }
    }

    if (hasDataChanged(oldData, newData)) {
        await env.SUB_ONE_KV.put(key, JSON.stringify(newData));
        return true;
    }
    return false;
}

// --- [新] 默认设置中增加通知阈值 ---
const defaultSettings = {
    FileName: 'Sub-One',
    mytoken: 'auto',
    profileToken: '',  // 默认为空，用户需主动设置
    subConverter: 'url.v1.mk',  // 更可靠的后端，支持 Reality
    subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/refs/heads/main/Clash/config/ACL4SSR_Online_Full.ini',
    prependSubName: true,
    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90
};

const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes || bytes < 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    // toFixed(dm) after dividing by pow(k, i) was producing large decimal numbers
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i < 0) return '0 B'; // Handle log(0) case
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

// --- TG 通知函式 (无修改) ---
async function sendTgNotification(settings: any, message: string) {
    if (!settings.BotToken || !settings.ChatID) {
        console.log("TG BotToken or ChatID not set, skipping notification.");
        return false;
    }
    // 为所有消息添加时间戳
    const now = new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
    const fullMessage = `${message}\n\n*时间:* \`${now} (UTC+8)\``;

    const url = `https://api.telegram.org/bot${settings.BotToken}/sendMessage`;
    const payload = {
        chat_id: settings.ChatID,
        text: fullMessage,
        parse_mode: 'Markdown',
        disable_web_page_preview: true // 禁用链接预览，使消息更紧凑
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (response.ok) {
            console.log("TG 通知已成功发送。");
            return true;
        } else {
            const errorData = await response.json();
            console.error("发送 TG 通知失败：", response.status, errorData);
            return false;
        }
    } catch (error) {
        console.error("发送 TG 通知时出错：", error);
        return false;
    }
}

async function handleCronTrigger(env: Env) {
    console.log("Cron trigger fired. Checking all subscriptions for traffic and node count...");
    const originalSubs = await env.SUB_ONE_KV.get(KV_KEY_SUBS, 'json') || [];
    const allSubs = JSON.parse(JSON.stringify(originalSubs)); // 深拷贝以便比较
    const settings = await env.SUB_ONE_KV.get(KV_KEY_SETTINGS, 'json') || defaultSettings;

    const nodeRegex = /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//gm;
    let changesMade = false;

    for (const sub of allSubs) {
        if (sub.url.startsWith('http') && sub.enabled) {
            try {
                // --- 並行請求流量和節點內容 ---
                const trafficRequest = fetch(new Request(sub.url, {
                    headers: { 'User-Agent': 'Clash for Windows/0.20.39' },
                    redirect: "follow",
                    cf: { insecureSkipVerify: true }
                } as any));
                const nodeCountRequest = fetch(new Request(sub.url, {
                    headers: { 'User-Agent': 'Sub-One-Cron-Updater/1.0' },
                    redirect: "follow",
                    cf: { insecureSkipVerify: true }
                } as any));
                const [trafficResult, nodeCountResult] = await Promise.allSettled([
                    Promise.race([trafficRequest, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))]),
                    Promise.race([nodeCountRequest, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))])
                ]) as [PromiseSettledResult<Response>, PromiseSettledResult<Response>];

                if (trafficResult.status === 'fulfilled' && trafficResult.value.ok) {
                    const userInfoHeader = trafficResult.value.headers.get('subscription-userinfo');
                    if (userInfoHeader) {
                        const info = {};
                        userInfoHeader.split(';').forEach(part => {
                            const [key, value] = part.trim().split('=');
                            if (key && value) info[key] = /^\d+$/.test(value) ? Number(value) : value;
                        });
                        sub.userInfo = info; // 更新流量資訊
                        await checkAndNotify(sub, settings, env); // 檢查並發送通知
                        changesMade = true;
                    }
                } else if (trafficResult.status === 'rejected') {
                    console.error(`Cron: Failed to fetch traffic for ${sub.name}:`, trafficResult.reason.message);
                }

                if (nodeCountResult.status === 'fulfilled' && nodeCountResult.value.ok) {
                    const text = await nodeCountResult.value.text();
                    let nodeCount = 0;

                    // 使用统一的 SubscriptionParser 解析
                    try {
                        const nodes = subscriptionParser.parse(text);
                        nodeCount = nodes.length;
                    } catch (e) {
                        console.error(`Cron: Parse failed for ${sub.name}:`, e);
                    }

                    if (nodeCount > 0) {
                        sub.nodeCount = nodeCount;
                        changesMade = true;
                    }
                } else if (nodeCountResult.status === 'rejected') {
                    console.error(`Cron: Failed to fetch node list for ${sub.name}:`, nodeCountResult.reason.message);
                }

            } catch (e: any) {
                console.error(`Cron: Unhandled error while updating ${sub.name}`, e.message);
            }
        }
    }

    if (changesMade) {
        await env.SUB_ONE_KV.put(KV_KEY_SUBS, JSON.stringify(allSubs));
        console.log("Subscriptions updated with new traffic info and node counts.");
    } else {
        console.log("Cron job finished. No changes detected.");
    }
    return new Response("Cron job completed successfully.", { status: 200 });
}

// --- 认证与API处理的核心函数 (无修改) ---
async function authMiddleware(request: Request, env: Env) {
    const cookie = request.headers.get('Cookie');
    const sessionCookie = cookie?.split(';').find(c => c.trim().startsWith(`${COOKIE_NAME}=`));
    if (!sessionCookie) return false;
    const token = sessionCookie.split('=')[1];
    // 简单的token验证，基于时间戳
    try {
        const timestamp = parseInt(token, 10);
        return !isNaN(timestamp) && (Date.now() - timestamp < SESSION_DURATION);
    } catch {
        return false;
    }
}

// sub: 要检查的订阅对象
// settings: 全局设置
// env: Cloudflare 环境
async function checkAndNotify(sub: any, settings: any, env: Env) {
    if (!sub.userInfo) return; // 没有流量信息，无法检查

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // 1. 检查订阅到期
    if (sub.userInfo.expire) {
        const expiryDate = new Date(sub.userInfo.expire * 1000);
        const daysRemaining = Math.ceil((expiryDate.getTime() - now) / ONE_DAY_MS);

        // 检查是否满足通知条件：剩余天数 <= 阈值
        if (daysRemaining <= (settings.NotifyThresholdDays || 7)) {
            // 检查上次通知时间，防止24小时内重复通知
            if (!sub.lastNotifiedExpire || (now - sub.lastNotifiedExpire > ONE_DAY_MS)) {
                const message = `🗓️ *订阅临期提醒* 🗓️\n\n*订阅名称:* \`${sub.name || '未命名'}\`\n*状态:* \`${daysRemaining < 0 ? '已过期' : `仅剩 ${daysRemaining} 天到期`}\`\n*到期日期:* \`${expiryDate.toLocaleDateString('zh-CN')}\``;
                const sent = await sendTgNotification(settings, message);
                if (sent) {
                    sub.lastNotifiedExpire = now; // 更新通知时间戳
                }
            }
        }
    }

    // 2. 检查流量使用
    const { upload, download, total } = sub.userInfo;
    if (total > 0) {
        const used = upload + download;
        const usagePercent = Math.round((used / total) * 100);

        // 检查是否满足通知条件：已用百分比 >= 阈值
        if (usagePercent >= (settings.NotifyThresholdPercent || 90)) {
            // 检查上次通知时间，防止24小时内重复通知
            if (!sub.lastNotifiedTraffic || (now - sub.lastNotifiedTraffic > ONE_DAY_MS)) {
                const message = `📈 *流量预警提醒* 📈\n\n*订阅名称:* \`${sub.name || '未命名'}\`\n*状态:* \`已使用 ${usagePercent}%\`\n*详情:* \`${formatBytes(used)} / ${formatBytes(total)}\``;
                const sent = await sendTgNotification(settings, message);
                if (sent) {
                    sub.lastNotifiedTraffic = now;
                }
            }
        }
    }
}


// --- 主要 API 請求處理 ---
async function handleApiRequest(request: Request, env: Env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, '');
    // [新增] 安全的、可重复执行的迁移接口
    if (path === '/migrate') {
        if (!await authMiddleware(request, env)) { return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 }); }
        try {
            const oldData = await env.SUB_ONE_KV.get(OLD_KV_KEY, 'json');
            const newDataExists = await env.SUB_ONE_KV.get(KV_KEY_SUBS) !== null;

            if (newDataExists) {
                return new Response(JSON.stringify({ success: true, message: '无需迁移，数据已是最新结构。' }), { status: 200 });
            }
            if (!oldData) {
                return new Response(JSON.stringify({ success: false, message: '未找到需要迁移的旧数据。' }), { status: 404 });
            }

            await env.SUB_ONE_KV.put(KV_KEY_SUBS, JSON.stringify(oldData));
            await env.SUB_ONE_KV.put(KV_KEY_PROFILES, JSON.stringify([]));
            await env.SUB_ONE_KV.put(OLD_KV_KEY + '_migrated_on_' + new Date().toISOString(), JSON.stringify(oldData));
            await env.SUB_ONE_KV.delete(OLD_KV_KEY);

            return new Response(JSON.stringify({ success: true, message: '数据迁移成功！' }), { status: 200 });
        } catch (e: any) {
            console.error('[API Error /migrate]', e);
            return new Response(JSON.stringify({ success: false, message: `迁移失败: ${e.message}` }), { status: 500 });
        }
    }

    if (path === '/login') {
        if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
        try {
            const { password } = await request.json() as any;
            if (password === env.ADMIN_PASSWORD) {
                const token = String(Date.now()); // 简单的基于时间戳的token
                const headers = new Headers({ 'Content-Type': 'application/json' });
                headers.append('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION / 1000}`);
                return new Response(JSON.stringify({ success: true }), { headers });
            }
            return new Response(JSON.stringify({ error: '密码错误' }), { status: 401 });
        } catch (e: any) {
            console.error('[API Error /login]', e);
            return new Response(JSON.stringify({ error: '请求体解析失败' }), { status: 400 });
        }
    }
    if (!await authMiddleware(request, env)) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    switch (path) {
        case '/logout': {
            const headers = new Headers({ 'Content-Type': 'application/json' });
            headers.append('Set-Cookie', `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        case '/data': {
            try {
                const [subs, profiles, settings] = await Promise.all([
                    env.SUB_ONE_KV.get(KV_KEY_SUBS, 'json').then(res => res || []),
                    env.SUB_ONE_KV.get(KV_KEY_PROFILES, 'json').then(res => res || []),
                    env.SUB_ONE_KV.get(KV_KEY_SETTINGS, 'json').then(res => res || {} as any)
                ]);
                const config = {
                    FileName: settings.FileName || 'SUB_ONE',
                    mytoken: settings.mytoken || 'auto',
                    profileToken: settings.profileToken || ''  // 默认为空
                };
                return new Response(JSON.stringify({ subs, profiles, config }), { headers: { 'Content-Type': 'application/json' } });
            } catch (e) {
                console.error('[API Error /data]', 'Failed to read from KV:', e);
                return new Response(JSON.stringify({ error: '读取初始数据失败' }), { status: 500 });
            }
        }

        case '/subs': {
            try {
                // 步骤1: 解析请求体
                let requestData;
                try {
                    requestData = await request.json() as any;
                } catch (parseError) {
                    console.error('[API Error /subs] JSON解析失败:', parseError);
                    return new Response(JSON.stringify({
                        success: false,
                        message: '请求数据格式错误，请检查数据格式'
                    }), { status: 400 });
                }

                const { subs, profiles } = requestData;

                // 步骤2: 验证必需字段
                if (typeof subs === 'undefined' || typeof profiles === 'undefined') {
                    return new Response(JSON.stringify({
                        success: false,
                        message: '请求体中缺少 subs 或 profiles 字段'
                    }), { status: 400 });
                }

                // 步骤3: 验证数据类型
                if (!Array.isArray(subs) || !Array.isArray(profiles)) {
                    return new Response(JSON.stringify({
                        success: false,
                        message: 'subs 和 profiles 必须是数组格式'
                    }), { status: 400 });
                }

                // 步骤4: 获取设置（带错误处理）
                let settings;
                try {
                    settings = await env.SUB_ONE_KV.get(KV_KEY_SETTINGS, 'json') || defaultSettings;
                } catch (settingsError) {
                    console.error('[API Error /subs] 获取设置失败:', settingsError);
                    settings = defaultSettings; // 使用默认设置继续
                }

                // 步骤5: 处理通知（非阻塞，错误不影响保存）
                try {
                    const notificationPromises = subs
                        .filter(sub => sub && sub.url && sub.url.startsWith('http'))
                        .map(sub => checkAndNotify(sub, settings, env).catch(notifyError => {
                            console.error(`[API Warning /subs] 通知处理失败 for ${sub.url}:`, notifyError);
                            // 通知失败不影响保存流程
                        }));

                    // 并行处理通知，但不等待完成
                    Promise.all(notificationPromises).catch(e => {
                        console.error('[API Warning /subs] 部分通知处理失败:', e);
                    });
                } catch (notificationError) {
                    console.error('[API Warning /subs] 通知系统错误:', notificationError);
                    // 继续保存流程
                }

                // 步骤6: 保存数据到KV存储（使用条件写入）
                try {
                    await Promise.all([
                        env.SUB_ONE_KV.put(KV_KEY_SUBS, JSON.stringify(subs)),
                        env.SUB_ONE_KV.put(KV_KEY_PROFILES, JSON.stringify(profiles))
                    ]);
                } catch (kvError: any) {
                    console.error('[API Error /subs] KV存储写入失败:', kvError);
                    return new Response(JSON.stringify({
                        success: false,
                        message: `数据保存失败: ${kvError.message || '存储服务暂时不可用，请稍后重试'}`
                    }), { status: 500 });
                }

                return new Response(JSON.stringify({
                    success: true,
                    message: '订阅源及订阅组已保存'
                }));

            } catch (e: any) {
                console.error('[API Error /subs] 未预期的错误:', e);
                return new Response(JSON.stringify({
                    success: false,
                    message: `保存失败: ${e.message || '服务器内部错误，请稍后重试'}`
                }), { status: 500 });
            }
        }

        case '/node_count': {
            if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
            const { url: subUrl } = await request.json() as any;
            if (!subUrl || typeof subUrl !== 'string' || !/^https?:\/\//.test(subUrl)) {
                return new Response(JSON.stringify({ error: 'Invalid or missing url' }), { status: 400 });
            }

            const result: { count: number; userInfo: any } = { count: 0, userInfo: null };

            try {
                const fetchOptions = {
                    headers: { 'User-Agent': 'Sub-One-Node-Counter/2.0' },
                    redirect: "follow",
                    cf: { insecureSkipVerify: true }
                } as any;
                const trafficFetchOptions = {
                    headers: { 'User-Agent': 'Clash for Windows/0.20.39' },
                    redirect: "follow",
                    cf: { insecureSkipVerify: true }
                } as any;

                const trafficRequest = fetch(new Request(subUrl, trafficFetchOptions));
                const nodeCountRequest = fetch(new Request(subUrl, fetchOptions));

                const responses = await Promise.allSettled([trafficRequest, nodeCountRequest]);

                // 1. 处理流量请求的结果
                if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
                    const trafficResponse = responses[0].value;
                    const userInfoHeader = trafficResponse.headers.get('subscription-userinfo');
                    if (userInfoHeader) {
                        const info = {};
                        userInfoHeader.split(';').forEach(part => {
                            const [key, value] = part.trim().split('=');
                            if (key && value) info[key] = /^\d+$/.test(value) ? Number(value) : value;
                        });
                        result.userInfo = info;
                    }
                } else if (responses[0].status === 'rejected') {
                    console.error(`Traffic request for ${subUrl} rejected:`, responses[0].reason);
                }

                // 2. 处理节点数请求的结果
                if (responses[1].status === 'fulfilled' && responses[1].value.ok) {
                    const nodeCountResponse = responses[1].value;
                    const text = await nodeCountResponse.text();

                    // 使用统一的 SubscriptionParser 解析
                    let nodeCount = 0;
                    try {
                        const nodes = subscriptionParser.parse(text);
                        nodeCount = nodes.length;
                    } catch (e) {
                        console.error(`Node count parse failed for ${subUrl}:`, e);
                    }

                    result.count = nodeCount;
                } else if (responses[1].status === 'rejected') {
                    console.error(`Node count request for ${subUrl} rejected:`, responses[1].reason);
                }

                // 只有在至少获取到一个有效信息时，才更新数据库
                if (result.userInfo || result.count > 0) {
                    const originalSubs = await env.SUB_ONE_KV.get(KV_KEY_SUBS, 'json') || [];
                    const allSubs = JSON.parse(JSON.stringify(originalSubs)); // 深拷贝
                    const subToUpdate = allSubs.find(s => s.url === subUrl);

                    if (subToUpdate) {
                        subToUpdate.nodeCount = result.count;
                        subToUpdate.userInfo = result.userInfo;

                        await env.SUB_ONE_KV.put(KV_KEY_SUBS, JSON.stringify(allSubs));
                    }
                }

            } catch (e) {
                console.error(`[API Error /node_count] Unhandled exception for URL: ${subUrl}`, e);
            }

            return new Response(JSON.stringify(result), { headers: { 'Content-Type': 'application/json' } });
        }

        /**
         * 新增端点: 后端直接获取并解析订阅源
         * 解决前端拼接复杂、容易出错的问题
         * 
         * 请求参数:
         * - url: 订阅源URL
         * - subscriptionName: 订阅名称（可选）
         * - exclude: 排除规则（可选）
         * - prependSubName: 是否添加订阅名前缀（可选）
         * 
         * 返回数据:
         * - success: 是否成功
         * - nodes: 解析后的节点列表
         * - userInfo: 流量信息（如果有）
         * - count: 节点数量
         */
        case '/parse_subscription': {
            if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

            const body = await request.json() as any;
            const { url: subUrl, subscriptionName, exclude, prependSubName } = body;

            // 验证URL
            if (!subUrl || typeof subUrl !== 'string' || !/^https?:\/\//.test(subUrl)) {
                return new Response(JSON.stringify({
                    success: false,
                    error: 'Invalid or missing url parameter'
                }), {
                    status: 400,
                    headers: { 'Content-Type': 'application/json' }
                });
            }

            try {
                console.log(`[Parse Subscription] 开始解析: ${subUrl}`);

                // 并行请求流量信息和节点内容
                const trafficRequest = fetch(new Request(subUrl, {
                    headers: { 'User-Agent': 'Clash for Windows/0.20.39' },
                    redirect: "follow",
                    cf: { insecureSkipVerify: true }
                } as any));

                const nodeRequest = fetch(new Request(subUrl, {
                    headers: { 'User-Agent': 'Clash.Meta/v1.16.0' }, // 使用 Meta UA 获取完整配置
                    redirect: "follow",
                    cf: { insecureSkipVerify: true }
                } as any));

                const [trafficResult, nodeResult] = await Promise.allSettled([
                    Promise.race([trafficRequest, new Promise<Response>((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), 15000)
                    )]),
                    Promise.race([nodeRequest, new Promise<Response>((_, reject) =>
                        setTimeout(() => reject(new Error('Timeout')), 15000)
                    )])
                ]);

                let userInfo: any = null;
                let nodes: Node[] = [];

                // 1. 处理流量信息
                if (trafficResult.status === 'fulfilled' && trafficResult.value.ok) {
                    const userInfoHeader = trafficResult.value.headers.get('subscription-userinfo');
                    if (userInfoHeader) {
                        const info: any = {};
                        userInfoHeader.split(';').forEach((part: string) => {
                            const [key, value] = part.trim().split('=');
                            if (key && value) {
                                info[key] = /^\d+$/.test(value) ? Number(value) : value;
                            }
                        });
                        userInfo = info;
                        console.log(`[Parse Subscription] 获取到流量信息:`, userInfo);
                    }
                } else if (trafficResult.status === 'rejected') {
                    console.warn(`[Parse Subscription] 流量信息请求失败:`, trafficResult.reason.message);
                }

                // 2. 处理节点内容
                if (nodeResult.status === 'fulfilled' && nodeResult.value.ok) {
                    const content = await nodeResult.value.text();
                    console.log(`[Parse Subscription] 获取到内容，长度: ${content.length} bytes`);

                    // 使用订阅解析器解析
                    try {
                        nodes = subscriptionParser.parse(content, subscriptionName || '订阅', {
                            exclude: exclude,
                            prependSubName: prependSubName !== undefined ? prependSubName : false
                        });
                        console.log(`[Parse Subscription] 成功解析 ${nodes.length} 个节点`);
                    } catch (parseError: any) {
                        console.error(`[Parse Subscription] 解析失败:`, parseError);
                        return new Response(JSON.stringify({
                            success: false,
                            error: `解析订阅内容失败: ${parseError.message}`,
                            userInfo: userInfo,
                            nodes: [],
                            count: 0
                        }), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                } else if (nodeResult.status === 'rejected') {
                    console.error(`[Parse Subscription] 节点内容请求失败:`, nodeResult.reason.message);
                    return new Response(JSON.stringify({
                        success: false,
                        error: `获取订阅内容失败: ${nodeResult.reason.message}`,
                        userInfo: userInfo,
                        nodes: [],
                        count: 0
                    }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                // 3. 返回结果
                return new Response(JSON.stringify({
                    success: true,
                    nodes: nodes,
                    userInfo: userInfo,
                    count: nodes.length,
                    message: `成功获取并解析 ${nodes.length} 个节点`
                }), {
                    headers: { 'Content-Type': 'application/json' }
                });

            } catch (error: any) {
                console.error(`[Parse Subscription] 未预期的错误:`, error);
                return new Response(JSON.stringify({
                    success: false,
                    error: `服务器错误: ${error.message}`,
                    nodes: [],
                    count: 0
                }), {
                    status: 500,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        case '/batch_update_nodes': {
            if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
            if (!await authMiddleware(request, env)) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
            }

            try {
                const { subscriptionIds } = await request.json() as any;
                if (!Array.isArray(subscriptionIds)) {
                    return new Response(JSON.stringify({ error: 'subscriptionIds must be an array' }), { status: 400 });
                }

                const allSubs = (await env.SUB_ONE_KV.get(KV_KEY_SUBS, 'json') || []) as any[];
                const subsToUpdate = allSubs.filter(sub => subscriptionIds.includes(sub.id) && sub.url.startsWith('http'));

                console.log(`[Batch Update] Starting batch update for ${subsToUpdate.length} subscriptions`);

                // 并行更新所有订阅的节点信息
                const updatePromises = subsToUpdate.map(async (sub) => {
                    try {
                        const fetchOptions = {
                            headers: { 'User-Agent': 'Sub-One-Batch-Updater/1.0' },
                            redirect: "follow",
                            cf: { insecureSkipVerify: true }
                        } as any;

                        const response = await Promise.race([
                            fetch(sub.url, fetchOptions),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                        ]) as Response;

                        if (response.ok) {
                            // 更新流量信息
                            const userInfoHeader = response.headers.get('subscription-userinfo');
                            if (userInfoHeader) {
                                const info = {};
                                userInfoHeader.split(';').forEach(part => {
                                    const [key, value] = part.trim().split('=');
                                    if (key && value) info[key] = /^\d+$/.test(value) ? Number(value) : value;
                                });
                                sub.userInfo = info;
                            }

                            // 更新节点数量
                            const text = await response.text();

                            // 使用统一的 SubscriptionParser 解析
                            let nodeCount = 0;
                            try {
                                const nodes = subscriptionParser.parse(text);
                                nodeCount = nodes.length;
                            } catch (e) {
                                console.error(`Batch update parse failed:`, e);
                            }

                            sub.nodeCount = nodeCount;

                            return { id: sub.id, success: true, nodeCount: sub.nodeCount, userInfo: sub.userInfo };
                        } else {
                            return { id: sub.id, success: false, error: `HTTP ${response.status}` };
                        }
                    } catch (error: any) {
                        return { id: sub.id, success: false, error: error.message };
                    }
                });

                const results = await Promise.allSettled(updatePromises);
                const updateResults = results.map(result =>
                    result.status === 'fulfilled' ? result.value : { success: false, error: 'Promise rejected' }
                );

                // 使用批量写入管理器保存更新后的数据
                await env.SUB_ONE_KV.put(KV_KEY_SUBS, JSON.stringify(allSubs));

                console.log(`[Batch Update] Completed batch update, ${updateResults.filter(r => r.success).length} successful`);

                return new Response(JSON.stringify({
                    success: true,
                    message: '批量更新完成',
                    results: updateResults
                }), { headers: { 'Content-Type': 'application/json' } });

            } catch (error: any) {
                console.error('[API Error /batch_update_nodes]', error);
                return new Response(JSON.stringify({
                    success: false,
                    message: `批量更新失败: ${error.message}`
                }), { status: 500 });
            }
        }





        case '/settings': {
            if (request.method === 'GET') {
                try {
                    const settings = await env.SUB_ONE_KV.get(KV_KEY_SETTINGS, 'json') || {};
                    return new Response(JSON.stringify({ ...defaultSettings, ...settings }), { headers: { 'Content-Type': 'application/json' } });
                } catch (e) {
                    console.error('[API Error /settings GET]', 'Failed to read settings from KV:', e);
                    return new Response(JSON.stringify({ error: '读取设置失败' }), { status: 500 });
                }
            }
            if (request.method === 'POST') {
                try {
                    const newSettings = await request.json();
                    const oldSettings = await env.SUB_ONE_KV.get(KV_KEY_SETTINGS, 'json') || {};
                    const finalSettings = { ...oldSettings as any, ...newSettings as any };

                    await env.SUB_ONE_KV.put(KV_KEY_SETTINGS, JSON.stringify(finalSettings));

                    const message = `⚙️ *Sub-One 设置更新* ⚙️\n\n您的 Sub-One 应用设置已成功更新。`;
                    await sendTgNotification(finalSettings, message);

                    return new Response(JSON.stringify({ success: true, message: '设置已保存' }));
                } catch (e) {
                    console.error('[API Error /settings POST]', 'Failed to parse request or write settings to KV:', e);
                    return new Response(JSON.stringify({ error: '保存设置失败' }), { status: 500 });
                }
            }
            return new Response('Method Not Allowed', { status: 405 });
        }
        case '/latency_test': {
            if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
            const { url: testUrl } = await request.json() as any;

            if (!testUrl || typeof testUrl !== 'string' || !/^https?:\/\//.test(testUrl)) {
                return new Response(JSON.stringify({ error: 'Invalid or missing url' }), { status: 400 });
            }

            try {
                const startTime = Date.now();
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

                const response = await fetch(testUrl, {
                    method: 'HEAD', // Try HEAD first for speed
                    headers: { 'User-Agent': 'Sub-One-Latency-Tester/1.0' },
                    redirect: 'follow',
                    signal: controller.signal,
                    cf: { insecureSkipVerify: true }
                } as any);

                clearTimeout(timeoutId);
                const endTime = Date.now();
                const latency = endTime - startTime;

                if (response.ok) {
                    return new Response(JSON.stringify({
                        success: true,
                        latency: latency,
                        status: response.status
                    }), { headers: { 'Content-Type': 'application/json' } });
                } else {
                    // If HEAD fails (some servers block it), try GET
                    const startTimeGet = Date.now();
                    const controllerGet = new AbortController();
                    const timeoutIdGet = setTimeout(() => controllerGet.abort(), 10000);

                    const responseGet = await fetch(testUrl, {
                        method: 'GET',
                        headers: { 'User-Agent': 'Sub-One-Latency-Tester/1.0' },
                        redirect: 'follow',
                        signal: controllerGet.signal,
                        cf: { insecureSkipVerify: true }
                    } as any);

                    clearTimeout(timeoutIdGet);
                    const endTimeGet = Date.now();
                    const latencyGet = endTimeGet - startTimeGet;

                    if (responseGet.ok) {
                        return new Response(JSON.stringify({
                            success: true,
                            latency: latencyGet,
                            status: responseGet.status
                        }), { headers: { 'Content-Type': 'application/json' } });
                    }

                    return new Response(JSON.stringify({
                        success: false,
                        latency: latencyGet,
                        status: responseGet.status,
                        error: `HTTP ${responseGet.status}`
                    }), { headers: { 'Content-Type': 'application/json' } });
                }

            } catch (e: any) {
                return new Response(JSON.stringify({
                    success: false,
                    error: e.message === 'The user aborted a request.' ? 'Timeout' : e.message
                }), { headers: { 'Content-Type': 'application/json' } });
            }
        }

    }

    return new Response('API route not found', { status: 404 });
}

interface Node {
    id: string;
    name: string;
    url: string;
    protocol: string;
    enabled: boolean;
    type: string;
    subscriptionName: string;
    originalProxy?: any;
}

interface ProcessOptions {
    exclude?: string;
    prependSubName?: boolean;
}

/**
 * 强大的订阅解析器
 * 支持多种格式：Base64、纯文本、YAML、Clash配置等
 */
class SubscriptionParser {
    supportedProtocols: string[];
    _base64Regex: RegExp;
    _whitespaceRegex: RegExp;
    _newlineRegex: RegExp;
    _nodeRegex: RegExp | null;
    _protocolRegex: RegExp;

    constructor() {
        this.supportedProtocols = [
            'ss', 'ssr', 'vmess', 'vless', 'trojan',
            'hysteria', 'hysteria2', 'hy', 'hy2',
            'tuic', 'anytls', 'socks5'
        ];

        // 预编译正则表达式，提升性能
        this._base64Regex = /^[A-Za-z0-9+\/=]+$/;
        this._whitespaceRegex = /\s/g;
        this._newlineRegex = /\r?\n/;
        this._nodeRegex = null; // 延迟初始化
        this._protocolRegex = /^(.*?):\/\//;
    }

    /**
     * 安全解码 Base64 字符串 (支持 UTF-8)
     */
    decodeBase64(str: string) {
        try {
            const binaryString = atob(str);
            const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
            return new TextDecoder('utf-8').decode(bytes);
        } catch (e) {
            console.warn('Base64 decoding failed:', e);
            return atob(str); // Fallback to standard atob
        }
    }

    /**
     * 解析订阅内容
     * @param {string} content - 订阅内容
     * @param {string} subscriptionName - 订阅名称
     * @returns {Array} 解析后的节点列表
     */
    parse(content: string, subscriptionName = '', options: ProcessOptions = {}): Node[] {
        if (!content || typeof content !== 'string') {
            return [];
        }

        // 根据内容特征选择最合适的解析方法，避免不必要的尝试
        let methods: (() => Node[])[] = [];

        // 检查是否为Base64编码
        const cleanedContent = content.replace(this._whitespaceRegex, '');
        if (this._base64Regex.test(cleanedContent) && cleanedContent.length > 20) {
            methods.push(() => this.parseBase64(content, subscriptionName));
        }

        // 检查是否为YAML格式
        if (content.includes('proxies:') || content.includes('nodes:')) {
            methods.push(() => this.parseYAML(content, subscriptionName));
            methods.push(() => this.parseClashConfig(content, subscriptionName));
        }

        // 最后尝试纯文本解析
        methods.push(() => this.parsePlainText(content, subscriptionName));

        for (const method of methods) {
            try {
                const result = method();
                if (result && result.length > 0) {
                    console.log(`解析成功，使用 ${method.name} 方法，找到 ${result.length} 个节点`);
                    return this.processNodes(result, subscriptionName, options);
                }
            } catch (error) {
                console.warn(`解析方法 ${method.name} 失败:`, error);
                continue;
            }
        }

        return [];
    }

    /**
     * 解析Base64编码的内容
     */
    parseBase64(content: string, subscriptionName: string): Node[] {
        const cleanedContent = content.replace(this._whitespaceRegex, '');

        // 检查是否为Base64编码
        if (!this._base64Regex.test(cleanedContent) || cleanedContent.length < 20) {
            throw new Error('不是有效的Base64编码');
        }

        try {
            const decodedContent = this.decodeBase64(cleanedContent);
            // 优化：使用更高效的换行符分割
            const decodedLines = decodedContent.split(this._newlineRegex).filter(line => line.trim() !== '');

            // 检查解码后的内容是否包含节点链接
            if (!decodedLines.some(line => this.isNodeUrl(line))) {
                throw new Error('Base64解码后未找到有效的节点链接');
            }

            return this.parseNodeLines(decodedLines, subscriptionName);
        } catch (error: any) {
            throw new Error(`Base64解码失败: ${error.message}`);
        }
    }

    /**
     * 解析YAML格式
     */
    parseYAML(content: string, subscriptionName: string): Node[] {
        try {
            const parsed: any = yaml.load(content);
            if (!parsed || typeof parsed !== 'object') {
                throw new Error('无效的YAML格式');
            }

            // 检查是否为Clash配置
            if (parsed.proxies && Array.isArray(parsed.proxies)) {
                return this.parseClashProxies(parsed.proxies, subscriptionName);
            }

            // 检查是否为其他YAML格式
            if (parsed.nodes && Array.isArray(parsed.nodes)) {
                return this.parseGenericNodes(parsed.nodes, subscriptionName);
            }

            throw new Error('不支持的YAML格式');
        } catch (error: any) {
            throw new Error(`YAML解析失败: ${error.message}`);
        }
    }

    /**
     * 解析Clash配置文件
     */
    parseClashConfig(content: string, subscriptionName: string): Node[] {
        try {
            const parsed: any = yaml.load(content);
            if (!parsed || !parsed.proxies || !Array.isArray(parsed.proxies)) {
                throw new Error('不是有效的Clash配置');
            }

            return this.parseClashProxies(parsed.proxies, subscriptionName);
        } catch (error: any) {
            throw new Error(`Clash配置解析失败: ${error.message}`);
        }
    }

    /**
     * 解析纯文本格式
     */
    parsePlainText(content: string, subscriptionName: string): Node[] {
        const lines = content.split(this._newlineRegex).filter(line => line.trim() !== '');
        const nodeLines = lines.filter(line => this.isNodeUrl(line));

        if (nodeLines.length === 0) {
            throw new Error('未找到有效的节点链接');
        }

        return this.parseNodeLines(nodeLines, subscriptionName);
    }

    /**
     * 解析Clash代理配置
     */
    parseClashProxies(proxies: any[], subscriptionName: string): Node[] {
        const nodes: Node[] = [];

        for (const proxy of proxies) {
            if (!proxy || typeof proxy !== 'object') continue;

            try {
                // 规范化字段
                if (proxy.servername && !proxy.sni) {
                    proxy.sni = proxy.servername;
                }
                if (proxy['skip-cert-verify'] === undefined && proxy.skipCertVerify !== undefined) {
                    proxy['skip-cert-verify'] = proxy.skipCertVerify;
                }

                // [Fix] 如果开启了 TLS 但未指定 skip-cert-verify，默认开启以避免证书问题
                if ((proxy.tls === true || proxy.tls === 'true') && proxy['skip-cert-verify'] === undefined) {
                    proxy['skip-cert-verify'] = true;
                }

                const nodeUrl = this.convertClashProxyToUrl(proxy);
                if (nodeUrl) {
                    nodes.push({
                        id: crypto.randomUUID(),
                        name: proxy.name || '未命名节点',
                        url: nodeUrl,
                        protocol: proxy.type?.toLowerCase() || 'unknown',
                        enabled: true,
                        type: 'subscription',
                        subscriptionName: subscriptionName,
                        originalProxy: proxy // 保留原始配置
                    });
                }
            } catch (error) {
                console.warn(`解析代理配置失败:`, proxy, error);
                continue;
            }
        }

        return nodes;
    }

    /**
     * 将Clash代理配置转换为节点URL
     */
    convertClashProxyToUrl(proxy: any) {
        const type = proxy.type?.toLowerCase();
        const server = proxy.server;
        const port = proxy.port;

        if (!server || !port) {
            return null;
        }

        // 优化：使用Map提升性能，避免switch语句
        const proxyTypeHandlers = new Map([
            ['vmess', () => this.buildVmessUrl(proxy)],
            ['vless', () => this.buildVlessUrl(proxy)],
            ['trojan', () => this.buildTrojanUrl(proxy)],
            ['ss', () => this.buildShadowsocksUrl(proxy)],
            ['ssr', () => this.buildShadowsocksRUrl(proxy)],
            ['hysteria', () => this.buildHysteriaUrl(proxy)],
            ['hysteria2', () => this.buildHysteriaUrl(proxy)],
            ['tuic', () => this.buildTUICUrl(proxy)],
            ['socks5', () => this.buildSocks5Url(proxy)]
        ]);

        const handler = proxyTypeHandlers.get(type);
        if (handler) {
            return handler();
        }

        console.warn(`不支持的代理类型: ${type}`);
        return null;
    }

    /**
     * 构建VMess URL
     */
    buildVmessUrl(proxy: any) {
        // 处理 TLS
        let tls = 'none';
        if (proxy.tls === true || proxy.tls === 'true' || proxy.tls === 'tls') {
            tls = 'tls';
        }

        // 处理 SNI/Host
        // 优先使用 sni 或 servername，其次是 host
        const sni = proxy.sni || proxy.servername || proxy.host || '';
        const host = proxy.host || proxy['ws-opts']?.headers?.Host || sni || '';

        const config = {
            v: '2',
            ps: proxy.name || 'VMess节点',
            add: proxy.server,
            port: proxy.port,
            id: proxy.uuid,
            aid: proxy.alterId || 0,
            scy: proxy['skip-cert-verify'] ? 1 : 0,
            net: proxy.network || 'tcp',
            type: proxy.type || 'none',
            host: host,
            path: proxy['ws-opts']?.path || proxy.path || '',
            tls: tls,
            sni: sni,
            alpn: proxy.alpn || '',
            fp: proxy['client-fingerprint'] || proxy.fingerprint || ''
        };

        const jsonStr = JSON.stringify(config);
        const base64 = btoa(unescape(encodeURIComponent(jsonStr)));
        return `vmess://${base64}`;
    }

    /**
     * 构建VLESS URL
     */
    buildVlessUrl(proxy: any) {
        let url = `vless://${proxy.uuid}@${proxy.server}:${proxy.port}`;

        // 优化：使用数组构建查询参数，提升性能
        const queryParams: string[] = [];

        // 添加传输参数
        if (proxy.network && proxy.network !== 'tcp') {
            queryParams.push(`type=${proxy.network}`);

            if (proxy.network === 'ws') {
                if (proxy['ws-opts']?.path) {
                    queryParams.push(`path=${encodeURIComponent(proxy['ws-opts'].path)}`);
                }
                if (proxy['ws-opts']?.headers?.Host) {
                    queryParams.push(`host=${proxy['ws-opts'].headers.Host}`);
                }
            }
        }

        // 添加TLS参数
        if (proxy.tls === 'tls') {
            queryParams.push('security=tls');
            if (proxy.sni) {
                queryParams.push(`sni=${proxy.sni}`);
            }
        }

        // 构建最终URL
        if (queryParams.length > 0) {
            url += `?${queryParams.join('&')}`;
        }

        // 添加名称
        if (proxy.name) {
            url += `#${encodeURIComponent(proxy.name)}`;
        }

        return url;
    }

    /**
     * 构建Trojan URL
     */
    buildTrojanUrl(proxy: any) {
        let url = `trojan://${proxy.password}@${proxy.server}:${proxy.port}`;

        if (proxy.sni) {
            url += `?sni=${proxy.sni}`;
        }

        if (proxy.name) {
            url += `#${encodeURIComponent(proxy.name)}`;
        }

        return url;
    }

    /**
     * 构建Shadowsocks URL
     */
    buildShadowsocksUrl(proxy: any) {
        const method = proxy.cipher;
        const password = proxy.password;
        const server = proxy.server;
        const port = proxy.port;

        const auth = `${method}:${password}@${server}:${port}`;
        const base64 = btoa(auth);
        let url = `ss://${base64}`;

        if (proxy.name) {
            url += `#${encodeURIComponent(proxy.name)}`;
        }

        return url;
    }

    /**
     * 构建ShadowsocksR URL
     */
    buildShadowsocksRUrl(proxy: any) {
        // SSR URL格式比较复杂，这里提供基础实现
        // 优化：使用数组构建配置，提升性能
        const config = [
            proxy.server,
            proxy.port,
            proxy.protocol || 'origin',
            proxy.cipher,
            proxy.obfs || 'plain',
            btoa(proxy.password)
        ];

        // 优化：使用URLSearchParams构建查询参数
        const query = new URLSearchParams();

        // 批量设置参数，减少条件判断
        const params = [
            ['protoparam', proxy['protocol-param']],
            ['obfsparam', proxy['obfs-param']],
            ['remarks', proxy.name]
        ];

        params.forEach(([key, value]) => {
            if (value) {
                query.set(key, btoa(value));
            }
        });

        const base64 = btoa(config.join(':'));
        let url = `ssr://${base64}`;

        if (query.toString()) {
            url += `/?${query.toString()}`;
        }

        return url;
    }

    /**
     * 构建Hysteria URL
     */
    buildHysteriaUrl(proxy: any) {
        let url = `hysteria://${proxy.server}:${proxy.port}`;

        // 优化：使用数组构建参数，提升性能
        const params = new URLSearchParams();

        // 批量设置参数，减少条件判断
        const paramPairs = [
            ['protocol', proxy.protocol],
            ['sni', proxy.sni],
            ['auth', proxy.auth],
            ['alpn', proxy.alpn]
        ];

        paramPairs.forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            }
        });

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        if (proxy.name) {
            url += `#${encodeURIComponent(proxy.name)}`;
        }

        return url;
    }

    /**
     * 构建TUIC URL
     */
    buildTUICUrl(proxy: any) {
        let url = `tuic://${proxy.uuid}:${proxy.password}@${proxy.server}:${proxy.port}`;

        // 优化：使用数组构建参数，提升性能
        const params = new URLSearchParams();

        // 批量设置参数，减少条件判断
        const paramPairs = [
            ['sni', proxy.sni],
            ['alpn', proxy.alpn]
        ];

        paramPairs.forEach(([key, value]) => {
            if (value) {
                params.set(key, value);
            }
        });

        if (params.toString()) {
            url += `?${params.toString()}`;
        }

        if (proxy.name) {
            url += `#${encodeURIComponent(proxy.name)}`;
        }

        return url;
    }

    /**
     * 构建Socks5 URL
     */
    buildSocks5Url(proxy: any) {
        let url = `socks5://`;

        if (proxy.username && proxy.password) {
            url += `${proxy.username}:${proxy.password}@`;
        }

        url += `${proxy.server}:${proxy.port}`;

        if (proxy.name) {
            url += `#${encodeURIComponent(proxy.name)}`;
        }

        return url;
    }

    /**
     * 解析通用节点格式
     */
    parseGenericNodes(nodes: any[], subscriptionName: string): Node[] {
        return nodes.map(node => ({
            id: crypto.randomUUID(),
            name: node.name || '未命名节点',
            url: node.url || '',
            protocol: node.protocol || 'unknown',
            enabled: true,
            type: 'subscription',
            subscriptionName: subscriptionName
        }));
    }

    /**
     * 解析节点链接行
     */
    parseNodeLines(lines: string[], subscriptionName: string): Node[] {
        return lines
            .filter(line => this.isNodeUrl(line))
            .map(line => this.parseNodeLine(line, subscriptionName))
            .filter((node) => node !== null);
    }

    /**
     * 解析单行节点信息
     */
    parseNodeLine(line: string, subscriptionName: string): Node | null {
        // 优化：延迟初始化并缓存正则表达式，避免重复创建
        if (!this._nodeRegex) {
            this._nodeRegex = new RegExp(`^(${this.supportedProtocols.join('|')}):\/\/`);
        }

        if (!this._nodeRegex.test(line)) return null;

        // 提取节点名称
        let name = '';

        // 优化：使用更高效的字符串分割
        const hashIndex = line.indexOf('#');
        if (hashIndex !== -1) {
            name = decodeURIComponent(line.substring(hashIndex + 1) || '');
        }

        // 如果没有名称，尝试从URL中提取
        if (!name) {
            name = this.extractNodeNameFromUrl(line);
        }

        // 获取协议类型
        const protocol = line.match(this._nodeRegex)?.[1] || 'unknown';

        return {
            id: crypto.randomUUID(),
            name: name || '未命名节点',
            url: line,
            protocol: protocol,
            enabled: true,
            type: 'subscription',
            subscriptionName: subscriptionName
        };
    }

    /**
     * 从URL中提取节点名称
     */
    extractNodeNameFromUrl(url: string) {
        try {
            const protocol = url.match(this._protocolRegex)?.[1] || '';

            // 优化：使用Map提升性能，避免switch语句
            const protocolHandlers = new Map([
                ['vmess', () => {
                    try {
                        const vmessContent = url.substring('vmess://'.length);
                        const decoded = this.decodeBase64(vmessContent);
                        const vmessConfig = JSON.parse(decoded);
                        return vmessConfig.ps || vmessConfig.add || 'VMess节点';
                    } catch {
                        return 'VMess节点';
                    }
                }],
                ['vless', () => {
                    const vlessMatch = url.match(/vless:\/\/([^@]+)@([^:]+):(\d+)/);
                    return vlessMatch ? vlessMatch[2] : 'VLESS节点';
                }],
                ['trojan', () => {
                    const trojanMatch = url.match(/trojan:\/\/([^@]+)@([^:]+):(\d+)/);
                    return trojanMatch ? trojanMatch[2] : 'Trojan节点';
                }],
                ['ss', () => {
                    try {
                        const ssMatch = url.match(/ss:\/\/([^#]+)/);
                        if (ssMatch) {
                            const decoded = this.decodeBase64(ssMatch[1]);
                            const [, server] = decoded.split('@');
                            return server.split(':')[0] || 'SS节点';
                        }
                    } catch {
                        return 'SS节点';
                    }
                    return 'SS节点';
                }]
            ]);

            const handler = protocolHandlers.get(protocol);
            if (handler) {
                return handler();
            }

            // 默认处理
            const urlObj = new URL(url);
            return urlObj.hostname || '未命名节点';
        } catch {
            return '未命名节点';
        }
    }

    /**
     * 检查是否为节点URL
     */
    isNodeUrl(line: string) {
        // 优化：延迟初始化并缓存正则表达式，避免重复创建
        if (!this._nodeRegex) {
            this._nodeRegex = new RegExp(`^(${this.supportedProtocols.join('|')}):\/\/`);
        }
        return this._nodeRegex.test(line.trim());
    }

    /**
     * 获取支持的协议列表
     */
    getSupportedProtocols() {
        return [...this.supportedProtocols];
    }

    /**
     * 验证订阅内容格式
     */
    validateContent(content: string) {
        if (!content || typeof content !== 'string') {
            return { valid: false, format: 'unknown', error: '内容为空或格式错误' };
        }

        try {
            // 检查是否为Base64
            const cleanedContent = content.replace(this._whitespaceRegex, '');
            if (this._base64Regex.test(cleanedContent) && cleanedContent.length > 20) {
                return { valid: true, format: 'base64' };
            }

            // 检查是否为YAML
            const parsed: any = yaml.load(content);
            if (parsed && typeof parsed === 'object') {
                if (parsed.proxies && Array.isArray(parsed.proxies)) {
                    return { valid: true, format: 'clash' };
                }
                return { valid: true, format: 'yaml' };
            }

            // 检查是否为纯文本节点列表
            const lines = content.split(this._newlineRegex).filter(line => line.trim() !== '');
            const nodeLines = lines.filter(line => this.isNodeUrl(line));
            if (nodeLines.length > 0) {
                return { valid: true, format: 'plain_text' };
            }

            return { valid: false, format: 'unknown', error: '无法识别的格式' };
        } catch (error: any) {
            return { valid: false, format: 'unknown', error: error.message };
        }
    }
    /**
     * 处理节点：过滤和重命名
     */
    processNodes(nodes: Node[], subName: string, options: ProcessOptions = {}): Node[] {
        let processed = nodes;

        // 1. 处理 Include/Exclude 规则
        if (options.exclude && options.exclude.trim()) {
            const rules = options.exclude.trim().split('\n').map(r => r.trim()).filter(Boolean);
            const keepRules = rules.filter(r => r.toLowerCase().startsWith('keep:'));

            if (keepRules.length > 0) {
                // 白名单模式
                const nameRegexParts: string[] = [];
                const protocolsToKeep = new Set();
                keepRules.forEach(rule => {
                    const content = rule.substring(5).trim(); // 'keep:'.length
                    if (content.toLowerCase().startsWith('proto:')) {
                        content.substring(6).split(',').forEach(p => protocolsToKeep.add(p.trim().toLowerCase()));
                    } else {
                        nameRegexParts.push(content);
                    }
                });
                const nameRegex = nameRegexParts.length ? new RegExp(nameRegexParts.join('|'), 'i') : null;

                processed = processed.filter(node => {
                    if (protocolsToKeep.has(node.protocol)) return true;
                    if (nameRegex && nameRegex.test(node.name)) return true;
                    return false;
                });
            } else {
                // 黑名单模式
                const protocolsToExclude = new Set();
                const nameRegexParts: string[] = [];
                rules.forEach(rule => {
                    if (rule.toLowerCase().startsWith('proto:')) {
                        rule.substring(6).split(',').forEach(p => protocolsToExclude.add(p.trim().toLowerCase()));
                    } else {
                        nameRegexParts.push(rule);
                    }
                });
                const nameRegex = nameRegexParts.length ? new RegExp(nameRegexParts.join('|'), 'i') : null;

                processed = processed.filter(node => {
                    if (protocolsToExclude.has(node.protocol)) return false;
                    if (nameRegex && nameRegex.test(node.name)) return false;
                    return true;
                });
            }
        }

        // 2. 添加前缀
        if (options.prependSubName && subName) {
            processed = processed.map(node => {
                if (!node.name.startsWith(subName)) {
                    node.name = `${subName} - ${node.name}`;
                    // 更新 URL 中的 hash
                    const hashIndex = node.url.lastIndexOf('#');
                    const baseUrl = hashIndex !== -1 ? node.url.substring(0, hashIndex) : node.url;
                    node.url = `${baseUrl}#${encodeURIComponent(node.name)}`;
                }
                return node;
            });
        }

        return processed;
    }
}

const subscriptionParser = new SubscriptionParser();

async function generateCombinedNodeList(context, config, userAgent, subs, prependedContent = '') {
    // 1. 处理手动节点
    const manualNodes = subs.filter(sub => !sub.url.toLowerCase().startsWith('http'));
    // 解析手动节点
    const parsedManualNodes = subscriptionParser.parseNodeLines(manualNodes.map(n => n.url), '手动节点');

    const processedManualNodes = subscriptionParser.processNodes(
        parsedManualNodes,
        '手动节点',
        { prependSubName: config.prependSubName }
    );

    // 2. 处理 HTTP 订阅
    const httpSubs = subs.filter(sub => sub.url.toLowerCase().startsWith('http'));
    const subPromises = httpSubs.map(async (sub) => {
        try {
            const response = await Promise.race([
                fetch(new Request(sub.url, {
                    headers: { 'User-Agent': userAgent },
                    redirect: "follow",
                    cf: { insecureSkipVerify: true }
                })),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
            ]) as Response;

            if (!response.ok) return [];
            const text = await response.text();

            // parse 方法内部会调用 processNodes
            return subscriptionParser.parse(text, sub.name, {
                exclude: sub.exclude,
                prependSubName: config.prependSubName
            });
        } catch (e) {
            console.error(`Failed to fetch/parse sub ${sub.name}:`, e);
            return [];
        }
    });

    const processedSubResults = await Promise.all(subPromises);
    const allNodes = [...processedManualNodes, ...processedSubResults.flat()];

    // 3. 去重 (基于 URL)
    const uniqueNodes: Node[] = [];
    const seenUrls = new Set();

    for (const node of allNodes) {
        if (!node || !node.url) continue;
        if (!seenUrls.has(node.url)) {
            seenUrls.add(node.url);
            uniqueNodes.push(node);
        }
    }

    // 4. 转换回字符串列表
    let finalContent = uniqueNodes.map(n => n.url).join('\n');
    if (finalContent.length > 0 && !finalContent.endsWith('\n')) finalContent += '\n';

    if (prependedContent) {
        return `${finalContent}${prependedContent}`;
    }
    return finalContent;
}

// --- [核心修改] 订阅处理函数 ---
// --- [最終修正版 - 變量名校對] 訂閱處理函數 ---
async function handleSubRequest(context: EventContext<Env, any, any>) {
    const { request, env } = context;
    const url = new URL(request.url);
    const userAgentHeader = request.headers.get('User-Agent') || "Unknown";

    const [settingsData, subsData, profilesData] = await Promise.all([
        env.SUB_ONE_KV.get(KV_KEY_SETTINGS, 'json'),
        env.SUB_ONE_KV.get(KV_KEY_SUBS, 'json'),
        env.SUB_ONE_KV.get(KV_KEY_PROFILES, 'json')
    ]);
    const settings = settingsData || {};
    const allSubs = (subsData || []) as any[];
    const allProfiles = (profilesData || []) as any[];
    // 關鍵：我們在這裡定義了 `config`，後續都應該使用它
    const config = { ...defaultSettings, ...settings };

    let token: string | null = '';
    let profileIdentifier: string | null = null;
    const pathSegments = url.pathname.replace(/^\/sub\//, '/').split('/').filter(Boolean);

    if (pathSegments.length > 0) {
        token = pathSegments[0];
        if (pathSegments.length > 1) {
            profileIdentifier = pathSegments[1] || null;
        }
    } else {
        token = url.searchParams.get('token');
    }

    let targetSubs;
    let subName = config.FileName;
    let effectiveSubConverter;
    let effectiveSubConfig;
    let isProfileExpired = false; // Moved declaration here

    const DEFAULT_EXPIRED_NODE = `trojan://00000000-0000-0000-0000-000000000000@127.0.0.1:443#${encodeURIComponent('您的订阅已失效')}`;

    if (profileIdentifier) {

        // [修正] 使用 config 變量
        if (!token || token !== config.profileToken) {
            return new Response('Invalid Profile Token', { status: 403 });
        }
        const profile = allProfiles.find(p => (p.customId && p.customId === profileIdentifier) || p.id === profileIdentifier);
        if (profile && profile.enabled) {
            // Check if the profile has an expiration date and if it's expired

            if (profile.expiresAt) {
                const expiryDate = new Date(profile.expiresAt);
                const now = new Date();
                if (now > expiryDate) {
                    console.log(`Profile ${profile.name} (ID: ${profile.id}) has expired.`);
                    isProfileExpired = true;
                }
            }

            if (isProfileExpired) {
                subName = profile.name; // Still use profile name for filename
                targetSubs = [{ id: 'expired-node', url: DEFAULT_EXPIRED_NODE, name: '您的订阅已到期', isExpiredNode: true }]; // Set expired node as the only targetSub
            } else {
                subName = profile.name;
                const profileSubIds = new Set(profile.subscriptions);
                const profileNodeIds = new Set(profile.manualNodes);
                targetSubs = allSubs.filter(item => {
                    const isSubscription = item.url.startsWith('http');
                    const isManualNode = !isSubscription;

                    // Check if the item belongs to the current profile and is enabled
                    const belongsToProfile = (isSubscription && profileSubIds.has(item.id)) || (isManualNode && profileNodeIds.has(item.id));
                    if (!item.enabled || !belongsToProfile) {
                        return false;
                    }
                    return true;
                });
            }
            effectiveSubConverter = profile.subConverter && profile.subConverter.trim() !== '' ? profile.subConverter : config.subConverter;
            effectiveSubConfig = profile.subConfig && profile.subConfig.trim() !== '' ? profile.subConfig : config.subConfig;
        } else {
            return new Response('Profile not found or disabled', { status: 404 });
        }
    } else {
        if (!token || token !== config.mytoken) {
            return new Response('Invalid Token', { status: 403 });
        }
        targetSubs = allSubs.filter(s => s.enabled);
        effectiveSubConverter = config.subConverter;
        effectiveSubConfig = config.subConfig;
    }

    // 如果 subConverter 为空或只有空白字符，使用默认值
    if (!effectiveSubConverter || effectiveSubConverter.trim() === '') {
        effectiveSubConverter = defaultSettings.subConverter;
    }
    if (!effectiveSubConfig || effectiveSubConfig.trim() === '') {
        effectiveSubConfig = defaultSettings.subConfig;
    }

    let targetFormat = url.searchParams.get('target');
    if (!targetFormat) {
        const supportedFormats = ['clash', 'singbox', 'surge', 'loon', 'base64', 'v2ray', 'trojan'];
        for (const format of supportedFormats) {
            if (url.searchParams.has(format)) {
                if (format === 'v2ray' || format === 'trojan') { targetFormat = 'base64'; } else { targetFormat = format; }
                break;
            }
        }
    }
    if (!targetFormat) {
        const ua = userAgentHeader.toLowerCase();
        // 使用陣列來保證比對的優先順序
        const uaMapping = [
            // 優先匹配 Mihomo/Meta 核心的客戶端
            ['flyclash', 'clash'],
            ['mihomo', 'clash'],
            ['clash.meta', 'clash'],
            ['clash-verge', 'clash'],
            ['meta', 'clash'],

            // 其他客戶端
            ['stash', 'clash'],
            ['nekoray', 'clash'],
            ['sing-box', 'singbox'],
            ['shadowrocket', 'base64'],
            ['v2rayn', 'base64'],
            ['v2rayng', 'base64'],
            ['surge', 'surge'],
            ['loon', 'loon'],
            ['quantumult%20x', 'quanx'],
            ['quantumult', 'quanx'],

            // 最後才匹配通用的 clash，作為向下相容
            ['clash', 'clash']
        ];

        for (const [keyword, format] of uaMapping) {
            if (ua.includes(keyword)) {
                targetFormat = format;
                break; // 找到第一個符合的就停止
            }
        }
    }
    if (!targetFormat) { targetFormat = 'base64'; }

    if (!url.searchParams.has('callback_token')) {
        const clientIp = request.headers.get('CF-Connecting-IP') || 'N/A';
        const country = request.headers.get('CF-IPCountry') || 'N/A';
        const domain = url.hostname;
        let message = `🛰️ *订阅被访问* 🛰️\n\n*域名:* \`${domain}\`\n*客户端:* \`${userAgentHeader}\`\n*IP 地址:* \`${clientIp} (${country})\`\n*请求格式:* \`${targetFormat}\``;

        if (profileIdentifier) {
            message += `\n*订阅组:* \`${subName}\``;
            const profile = allProfiles.find(p => (p.customId && p.customId === profileIdentifier) || p.id === profileIdentifier);
            if (profile && profile.expiresAt) {
                const expiryDateStr = new Date(profile.expiresAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
                message += `\n*到期时间:* \`${expiryDateStr}\``;
            }
        }

        context.waitUntil(sendTgNotification(config, message));
    }

    let prependedContentForSubconverter = '';

    if (isProfileExpired) { // Use the flag set earlier
        prependedContentForSubconverter = ''; // Expired node is now in targetSubs
    } else {
        // Otherwise, add traffic remaining info if applicable
        const totalRemainingBytes = targetSubs.reduce((acc, sub) => {
            if (sub.enabled && sub.userInfo && sub.userInfo.total > 0) {
                const used = (sub.userInfo.upload || 0) + (sub.userInfo.download || 0);
                const remaining = sub.userInfo.total - used;
                return acc + Math.max(0, remaining);
            }
            return acc;
        }, 0);
        if (totalRemainingBytes > 0) {
            const formattedTraffic = formatBytes(totalRemainingBytes);
            const fakeNodeName = `流量剩余 ≫ ${formattedTraffic}`;
            prependedContentForSubconverter = `trojan://00000000-0000-0000-0000-000000000000@127.0.0.1:443#${encodeURIComponent(fakeNodeName)}`;
        }
    }

    // ========================================================================
    // 🚀 混合模式：智能判断是否可以使用直接传URL的快速路径
    // ========================================================================

    // 判断是否满足快速路径条件
    const httpSubs = targetSubs.filter(s => s.url && s.url.toLowerCase().startsWith('http'));
    const hasManualNodes = targetSubs.some(s => !s.url || !s.url.toLowerCase().startsWith('http'));
    const hasExcludeRules = targetSubs.some(s => s.exclude && s.exclude.trim() !== '');
    const needsPrependName = config.prependSubName === true;
    const hasTrafficInfo = prependedContentForSubconverter !== '';

    // 快速路径条件：
    // 1. 非base64格式（因为base64总是需要后端处理）
    // 2. 只有HTTP订阅（没有手动节点）
    // 3. 没有过滤规则
    // 4. 不需要添加订阅名前缀
    // 5. 没有流量信息节点
    // 6. 不是过期订阅
    const canUseFastPath = targetFormat !== 'base64'
        && httpSubs.length > 0
        && !hasManualNodes
        && !hasExcludeRules
        && !needsPrependName
        && !hasTrafficInfo
        && !isProfileExpired;

    if (canUseFastPath) {
        // 🚀 快速路径：直接传URL给Subconverter
        console.log(`[Fast Path] Using direct URL mode for ${httpSubs.length} subscriptions`);

        try {
            // 多个订阅用 | 分隔（Subconverter支持）
            const urls = httpSubs.map(s => encodeURIComponent(s.url)).join('|');

            // 构建Subconverter URL
            let cleanSubConverter = effectiveSubConverter.replace(/^https?:\/\//, '').replace(/\/$/, '');
            const subconverterUrl = new URL(`https://${cleanSubConverter}/sub`);
            subconverterUrl.searchParams.set('target', targetFormat);
            subconverterUrl.searchParams.set('url', urls); // 直接传原始订阅URL

            // 针对 Clash Meta 内核添加 ver=meta 参数
            const uaLow = userAgentHeader.toLowerCase();
            if (targetFormat === 'clash' && (
                uaLow.includes('mihomo') ||
                uaLow.includes('clash-verge') ||
                uaLow.includes('meta') ||
                uaLow.includes('flyclash')
            )) {
                subconverterUrl.searchParams.set('ver', 'meta');
            }

            // 添加配置URL（如果有）
            if ((targetFormat === 'clash' || targetFormat === 'loon' || targetFormat === 'surge')
                && effectiveSubConfig && effectiveSubConfig.trim() !== '') {
                subconverterUrl.searchParams.set('config', effectiveSubConfig);
            }

            subconverterUrl.searchParams.set('new_name', 'true');

            console.log(`[Fast Path] Subconverter URL: ${subconverterUrl.toString()}`);

            // 直接请求Subconverter
            const subconverterResponse = await fetch(subconverterUrl.toString(), {
                method: 'GET',
                headers: { 'User-Agent': 'Mozilla/5.0' },
            });

            if (!subconverterResponse.ok) {
                console.error(`[Fast Path] Subconverter failed: ${subconverterResponse.status}`);
                throw new Error(`Subconverter returned status: ${subconverterResponse.status}`);
            }

            const responseText = await subconverterResponse.text();
            const responseHeaders = new Headers(subconverterResponse.headers);
            responseHeaders.set("Content-Disposition", `attachment; filename*=utf-8''${encodeURIComponent(subName)}`);

            // 设置正确的Content-Type
            let contentType = 'text/plain; charset=utf-8';
            if (targetFormat === 'clash' || targetFormat === 'singbox' || targetFormat === 'surge' || targetFormat === 'loon') {
                contentType = 'application/x-yaml; charset=utf-8';
            }
            responseHeaders.set('Content-Type', contentType);
            responseHeaders.set('Cache-Control', 'no-store, no-cache');

            console.log(`[Fast Path] ✅ Success! Returned ${responseText.length} bytes`);
            return new Response(responseText, {
                status: subconverterResponse.status,
                statusText: subconverterResponse.statusText,
                headers: responseHeaders
            });

        } catch (error: any) {
            // 快速路径失败，降级到标准路径
            console.error(`[Fast Path] ❌ Failed, falling back to standard path:`, error.message);
            // 继续执行下面的标准路径代码
        }
    } else {
        // 记录为什么不能使用快速路径
        const reasons: string[] = [];
        if (targetFormat === 'base64') reasons.push('base64格式需要后端处理');
        if (hasManualNodes) reasons.push('包含手动节点');
        if (hasExcludeRules) reasons.push('包含过滤规则');
        if (needsPrependName) reasons.push('需要添加订阅名前缀');
        if (hasTrafficInfo) reasons.push('包含流量信息节点');
        if (isProfileExpired) reasons.push('订阅已过期');
        console.log(`[Standard Path] Reason: ${reasons.join(', ')}`);
    }

    // ========================================================================
    // 🔄 标准路径：后端处理（保留原有完整逻辑）
    // ========================================================================
    console.log(`[Standard Path] Using backend processing for ${targetSubs.length} sources`);

    // 使用固定的 User-Agent 请求上游订阅，避免因客户端 UA 导致被屏蔽或返回错误格式
    // 使用 Clash.Meta UA 以获取更详细的 YAML 配置 (包含 TLS/SNI 等)
    const upstreamUserAgent = 'Clash.Meta/v1.16.0';
    console.log(`Fetching upstream with UA: ${upstreamUserAgent}`);
    const combinedNodeList = await generateCombinedNodeList(context, config, upstreamUserAgent, targetSubs, prependedContentForSubconverter);


    if (targetFormat === 'base64') {
        let contentToEncode;
        if (isProfileExpired) {
            contentToEncode = DEFAULT_EXPIRED_NODE + '\n'; // Return the expired node link for base64 clients
        } else {
            contentToEncode = combinedNodeList;
        }
        const headers = { "Content-Type": "text/plain; charset=utf-8", 'Cache-Control': 'no-store, no-cache' };
        return new Response(btoa(unescape(encodeURIComponent(contentToEncode))), { headers });
    }

    const base64Content = btoa(unescape(encodeURIComponent(combinedNodeList)));

    const callbackToken = await getCallbackToken(env);
    const callbackPath = profileIdentifier ? `/${token}/${profileIdentifier}` : `/${token}`;
    const callbackUrl = `${url.protocol}//${url.host}${callbackPath}?target=base64&callback_token=${callbackToken}`;

    // 保留 callback 逻辑以防万一，但主要使用 POST 方式
    if (url.searchParams.get('callback_token') === callbackToken) {
        const headers = { "Content-Type": "text/plain; charset=utf-8", 'Cache-Control': 'no-store, no-cache' };
        return new Response(base64Content, { headers });
    }

    // 智能处理：如果用户填入了 http:// 或 https:// 前缀，自动去除，防止 URL 拼接错误
    let cleanSubConverter = effectiveSubConverter.replace(/^https?:\/\//, '').replace(/\/$/, '');
    const subconverterUrl = new URL(`https://${cleanSubConverter}/sub`);
    subconverterUrl.searchParams.set('target', targetFormat);

    // 针对 Clash Meta / Mihomo / Clash Verge 内核，添加 ver=meta 参数
    // 这能确保 Subconverter 输出兼容 Meta 内核的配置 (保留更多字段如 udp, skip-cert-verify, vless 等)
    const uaLow = userAgentHeader.toLowerCase();
    if (targetFormat === 'clash' && (
        uaLow.includes('mihomo') ||
        uaLow.includes('clash-verge') ||
        uaLow.includes('meta') ||
        uaLow.includes('flyclash')
    )) {
        subconverterUrl.searchParams.set('ver', 'meta');
    }

    subconverterUrl.searchParams.set('url', callbackUrl);
    if ((targetFormat === 'clash' || targetFormat === 'loon' || targetFormat === 'surge') && effectiveSubConfig && effectiveSubConfig.trim() !== '') {
        subconverterUrl.searchParams.set('config', effectiveSubConfig);
    }
    subconverterUrl.searchParams.set('new_name', 'true');

    try {
        const subconverterResponse = await fetch(subconverterUrl.toString(), {
            method: 'GET',
            headers: { 'User-Agent': 'Mozilla/5.0' },
        });

        if (!subconverterResponse.ok) {
            const errorBody = await subconverterResponse.text();
            throw new Error(`Subconverter service returned status: ${subconverterResponse.status}. Body: ${errorBody}`);
        }
        const responseText = await subconverterResponse.text();
        const responseHeaders = new Headers(subconverterResponse.headers);
        responseHeaders.set("Content-Disposition", `attachment; filename*=utf-8''${encodeURIComponent(subName)}`);

        // 优化：根据目标格式设置正确的Content-Type，确保客户端能正确识别和导入
        let contentType = 'text/plain; charset=utf-8';
        if (targetFormat === 'clash' || targetFormat === 'singbox' || targetFormat === 'surge' || targetFormat === 'loon') {
            // YAML格式使用application/x-yaml，确保客户端能正确识别
            contentType = 'application/x-yaml; charset=utf-8';
        } else if (targetFormat === 'base64') {
            contentType = 'text/plain; charset=utf-8';
        }
        responseHeaders.set('Content-Type', contentType);
        responseHeaders.set('Cache-Control', 'no-store, no-cache');

        return new Response(responseText, { status: subconverterResponse.status, statusText: subconverterResponse.statusText, headers: responseHeaders });
    } catch (error: any) {
        console.error(`[Sub-One Final Error] ${error.message}`);
        return new Response(`Error connecting to subconverter: ${error.message}`, { status: 502 });
    }
}

async function getCallbackToken(env) {
    const secret = env.ADMIN_PASSWORD || 'default-callback-secret';
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);
    const cryptoKey = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, encoder.encode('callback-static-data'));
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
}


// --- [核心修改] Cloudflare Pages Functions 主入口 ---
export async function onRequest(context: EventContext<Env, any, any>) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    // **核心修改：判斷是否為定時觸發**
    if (request.headers.get("cf-cron")) {
        return handleCronTrigger(env);
    }

    if (url.pathname.startsWith('/api/')) {
        const response = await handleApiRequest(request, env);
        return response;
    }
    const isStaticAsset = /^\/(assets|@vite|src)\/./.test(url.pathname) || /\.\w+$/.test(url.pathname);
    if (!isStaticAsset && url.pathname !== '/') {
        return handleSubRequest(context);
    }
    return next();
}

import { KV_KEY_PROFILES, KV_KEY_SETTINGS, KV_KEY_SUBS, OLD_KV_KEY } from '../config/constants';
import { GLOBAL_USER_AGENT, defaultSettings } from '../config/defaults';
import { ProxyNode, convert, parse, process } from '../proxy';
import { AppConfig, Profile, Subscription, SubscriptionUserInfo } from '../proxy/types';
import { ImportMode, exportAllData, importAllData, validateBackup } from '../services/backup';
import { autoMigrate } from '../services/migration';
import { checkAndNotify, sendTgNotification } from '../services/notification';
import { IStorageService, StorageFactory } from '../services/storage';
import { getStorageBackendInfo, setStorageBackend } from '../services/storage-backend';
import { authenticateUser, createUser, hasUsers } from '../services/users';
import { Env } from '../types';
import { COOKIE_NAME, SESSION_DURATION, authMiddleware, generateSecureToken } from './auth';

// const subscriptionParser = new SubscriptionParser();

/**
 * 获取当前活动的存储服务实例
 */
async function getStorage(env: Env): Promise<IStorageService> {
    const info = await getStorageBackendInfo(env);
    return StorageFactory.create(env, info.current);
}

/**
 * 确保节点具有 URL 属性 (如果没有则自动生成)
 */
async function ensureNodeUrls(nodes: ProxyNode[]): Promise<ProxyNode[]> {
    return Promise.all(
        nodes.map(async (n) => {
            if (!n.url || n.url.trim() === '') {
                try {
                    // 使用 URI Converter 生成标准链接
                    const url = await convert([n], 'URI');
                    // 这里我们要修改对象，但因为 nodes 可能是只读引用（虽然这里不是），最好解构复制
                    // 并且注意 produce 返回可能有换行
                    return { ...n, url: url.trim() };
                } catch (e) {
                    console.error(`Failed to generate URL for node ${n.name}:`, e);
                }
            }
            return n;
        })
    );
}

/**
 * 主要 API 请求处理
 */
export async function handleApiRequest(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, '');

    // [新增] 系统初始化/设置接口（仅在无用户时可用）
    if (path === '/system/setup') {
        if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
        try {
            // 检查是否已有用户
            if (await hasUsers(env)) {
                return new Response(JSON.stringify({ error: '系统已初始化' }), { status: 403 });
            }

            const { username, password } = (await request.json()) as {
                username?: string;
                password?: string;
            };

            if (!username || !password) {
                return new Response(JSON.stringify({ error: '用户名和密码不能为空' }), {
                    status: 400
                });
            }

            if (password.length < 6) {
                return new Response(JSON.stringify({ error: '密码长度至少为6位' }), {
                    status: 400
                });
            }

            // 创建第一个管理员用户
            const user = await createUser(env, username, password, 'admin');
            const token = await generateSecureToken(env, user.id, user.username);

            const isSecure = request.url.startsWith('https://');
            const headers = new Headers({ 'Content-Type': 'application/json' });
            const secureFlag = isSecure ? ' Secure;' : '';
            headers.append(
                'Set-Cookie',
                `${COOKIE_NAME}=${token}; Path=/; HttpOnly${secureFlag}; SameSite=Strict; Max-Age=${SESSION_DURATION / 1000}`
            );
            return new Response(
                JSON.stringify({
                    success: true,
                    message: '系统初始化成功',
                    user: { id: user.id, username: user.username, role: user.role }
                }),
                { headers }
            );
        } catch (e: any) {
            console.error('[API Error /system/setup]', e);
            return new Response(JSON.stringify({ error: e.message || '初始化失败' }), {
                status: 500
            });
        }
    }

    // 检查系统是否需要初始化
    if (path === '/system/status') {
        try {
            const needsSetup = !(await hasUsers(env));
            return new Response(JSON.stringify({ needsSetup }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) {
            console.error('[API Error /system/status]', e);
            return new Response(JSON.stringify({ error: '获取系统状态失败' }), { status: 500 });
        }
    }

    // [新增] 安全的、可重复执行的迁移接口
    if (path === '/migrate') {
        const authResult = await authMiddleware(request, env);
        if (!authResult.valid) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }
        try {
            const oldData = await env.SUB_ONE_KV.get(OLD_KV_KEY, 'json');
            const newDataExists = (await env.SUB_ONE_KV.get(KV_KEY_SUBS)) !== null;

            if (newDataExists) {
                return new Response(
                    JSON.stringify({ success: true, message: '无需迁移，数据已是最新结构。' }),
                    {
                        status: 200
                    }
                );
            }
            if (!oldData) {
                return new Response(
                    JSON.stringify({ success: false, message: '未找到需要迁移的旧数据。' }),
                    {
                        status: 404
                    }
                );
            }

            await env.SUB_ONE_KV.put(KV_KEY_SUBS, JSON.stringify(oldData));
            await env.SUB_ONE_KV.put(KV_KEY_PROFILES, JSON.stringify([]));
            await env.SUB_ONE_KV.put(
                OLD_KV_KEY + '_migrated_on_' + new Date().toISOString(),
                JSON.stringify(oldData)
            );
            await env.SUB_ONE_KV.delete(OLD_KV_KEY);

            return new Response(JSON.stringify({ success: true, message: '数据迁移成功！' }), {
                status: 200
            });
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            console.error('[API Error /migrate]', e);
            return new Response(JSON.stringify({ success: false, message: `迁移失败: ${msg}` }), {
                status: 500
            });
        }
    }

    if (path === '/login') {
        if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
        try {
            const { username, password } = (await request.json()) as {
                username?: string;
                password?: string;
            };

            if (!username || !password) {
                return new Response(JSON.stringify({ error: '用户名和密码不能为空' }), {
                    status: 400
                });
            }

            // 使用用户服务进行认证
            const user = await authenticateUser(env, username, password);

            if (user) {
                const token = await generateSecureToken(env, user.id, user.username);
                const isSecure = request.url.startsWith('https://');
                const headers = new Headers({ 'Content-Type': 'application/json' });
                const secureFlag = isSecure ? ' Secure;' : '';
                headers.append(
                    'Set-Cookie',
                    `${COOKIE_NAME}=${token}; Path=/; HttpOnly${secureFlag}; SameSite=Strict; Max-Age=${SESSION_DURATION / 1000}`
                );
                return new Response(
                    JSON.stringify({
                        success: true,
                        user: { id: user.id, username: user.username, role: user.role }
                    }),
                    { headers }
                );
            }

            return new Response(JSON.stringify({ error: '用户名或密码错误' }), { status: 401 });
        } catch (e: any) {
            console.error('[API Error /login]', e);
            return new Response(JSON.stringify({ error: '登录失败' }), { status: 500 });
        }
    }

    // 所有其他接口都需要认证
    const authResult = await authMiddleware(request, env);
    if (!authResult.valid) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
    }

    switch (path) {
        case '/logout': {
            const isSecure = request.url.startsWith('https://');
            const headers = new Headers({ 'Content-Type': 'application/json' });
            const secureFlag = isSecure ? ' Secure;' : '';
            headers.append(
                'Set-Cookie',
                `${COOKIE_NAME}=; Path=/; HttpOnly${secureFlag}; SameSite=Strict; Max-Age=0`
            );
            return new Response(JSON.stringify({ success: true }), { headers });
        }

        case '/data': {
            try {
                const storage = await getStorage(env);
                const [subs, profiles, settingsData] = await Promise.all([
                    storage.get<Subscription[]>(KV_KEY_SUBS).then((res) => res || []),
                    storage.get<Profile[]>(KV_KEY_PROFILES).then((res) => res || []),
                    storage.get<Partial<AppConfig>>(KV_KEY_SETTINGS)
                ]);
                const settings = { ...defaultSettings, ...(settingsData || {}) } as AppConfig;
                const config = settings;
                return new Response(JSON.stringify({ subs, profiles, config }), {
                    headers: { 'Content-Type': 'application/json' }
                });
            } catch (e) {
                console.error('[API Error /data]', 'Failed to read from Storage:', e);
                return new Response(JSON.stringify({ error: '读取初始数据失败' }), { status: 500 });
            }
        }

        case '/subs': {
            try {
                // 步骤1: 解析请求体
                let requestData;
                try {
                    requestData = (await request.json()) as any;
                } catch (parseError) {
                    console.error('[API Error /subs] JSON解析失败:', parseError);
                    return new Response(
                        JSON.stringify({
                            success: false,
                            message: '请求数据格式错误，请检查数据格式'
                        }),
                        { status: 400 }
                    );
                }

                const { subs, profiles } = requestData;

                // 步骤2: 验证必需字段
                if (typeof subs === 'undefined' || typeof profiles === 'undefined') {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            message: '请求体中缺少 subs 或 profiles 字段'
                        }),
                        { status: 400 }
                    );
                }

                // 步骤3: 验证数据类型
                if (!Array.isArray(subs) || !Array.isArray(profiles)) {
                    return new Response(
                        JSON.stringify({
                            success: false,
                            message: 'subs 和 profiles 必须是数组格式'
                        }),
                        { status: 400 }
                    );
                }

                // 步骤4: 获取设置（带错误处理）
                const storage = await getStorage(env);
                let settings;
                try {
                    settings = (await storage.get<AppConfig>(KV_KEY_SETTINGS)) || defaultSettings;
                } catch (settingsError) {
                    console.error('[API Error /subs] 获取设置失败:', settingsError);
                    settings = defaultSettings; // 使用默认设置继续
                }

                // 步骤5: 处理通知（非阻塞，错误不影响保存）
                try {
                    const notificationPromises = subs
                        .filter((sub: Subscription) => sub && sub.url && sub.url.startsWith('http'))
                        .map((sub: Subscription) =>
                            checkAndNotify(sub, settings as AppConfig).catch((notifyError) => {
                                console.error(
                                    `[API Warning /subs] 通知处理失败 for ${sub.url}:`,
                                    notifyError
                                );
                                // 通知失败不影响保存流程
                            })
                        );

                    // 并行处理通知，但不等待完成
                    Promise.all(notificationPromises).catch((e) => {
                        console.error('[API Warning /subs] 部分通知处理失败:', e);
                    });
                } catch (notificationError) {
                    console.error('[API Warning /subs] 通知系统错误:', notificationError);
                    // 继续保存流程
                }

                // 步骤6: 保存数据到存储（使用条件写入）
                try {
                    await Promise.all([
                        storage.put(KV_KEY_SUBS, subs),
                        storage.put(KV_KEY_PROFILES, profiles)
                    ]);
                } catch (kvError: any) {
                    console.error('[API Error /subs] 存储写入失败:', kvError);
                    return new Response(
                        JSON.stringify({
                            success: false,
                            message: `数据保存失败: ${kvError.message || '存储服务暂时不可用，请稍后重试'}`
                        }),
                        { status: 500 }
                    );
                }

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: '订阅源及订阅组已保存'
                    })
                );
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : String(e);
                console.error('[API Error /subs] 未预期的错误:', e);
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: `保存失败: ${msg || '服务器内部错误，请稍后重試'}`
                    }),
                    { status: 500 }
                );
            }
        }

        case '/node_count': {
            if (request.method !== 'POST')
                return new Response('Method Not Allowed', { status: 405 });
            const {
                url: subUrl,
                content: rawContent,
                returnNodes = false,
                exclude = ''
            } = (await request.json()) as {
                url?: string;
                content?: string;
                returnNodes?: boolean;
                exclude?: string;
            };

            // 验证参数：必须提供 url 或 content 其中之一
            if (
                !rawContent &&
                (!subUrl || typeof subUrl !== 'string' || !/^https?:\/\//.test(subUrl))
            ) {
                return new Response(JSON.stringify({ error: 'Invalid or missing url/content' }), {
                    status: 400
                });
            }

            const result: {
                count: number;
                userInfo: Partial<SubscriptionUserInfo> | null;
                nodes?: any[];
            } = {
                count: 0,
                userInfo: null
            };

            try {
                // 情况一：直接提供内容（文件导入/文本粘贴）
                if (rawContent) {
                    let nodes = parse(rawContent);
                    nodes = await process(
                        nodes,
                        {
                            exclude: exclude || '',
                            dedupe: false,
                            prependSubName: false
                        },
                        'Imported'
                    );

                    result.count = nodes.length;
                    result.count = nodes.length;
                    if (returnNodes) {
                        const nodesWithIds = nodes.map((n) => ({
                            ...n,
                            id: n.id || crypto.randomUUID()
                        }));
                        result.nodes = await ensureNodeUrls(nodesWithIds);
                    }
                    return new Response(JSON.stringify(result), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                }

                // 情况二：通过 URL 下载（原有逻辑）
                const fetchOptions = {
                    headers: { 'User-Agent': GLOBAL_USER_AGENT },
                    redirect: 'follow',
                    cf: { insecureSkipVerify: true }
                } as any;
                const trafficFetchOptions = {
                    headers: { 'User-Agent': GLOBAL_USER_AGENT },
                    redirect: 'follow',
                    cf: { insecureSkipVerify: true }
                } as any;

                const trafficRequest = fetch(new Request(subUrl!, trafficFetchOptions));
                const nodeCountRequest = fetch(new Request(subUrl!, fetchOptions));

                const responses = await Promise.allSettled([trafficRequest, nodeCountRequest]);

                // 1. 处理流量请求的结果
                if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
                    const trafficResponse = responses[0].value;
                    const userInfoHeader = trafficResponse.headers.get('subscription-userinfo');
                    if (userInfoHeader) {
                        const info: Partial<SubscriptionUserInfo> = {};
                        userInfoHeader.split(';').forEach((part) => {
                            const [key, value] = part.trim().split('=');
                            if (key && value) {
                                const numValue = Number(value);
                                if (!isNaN(numValue)) {
                                    (info as any)[key] = numValue;
                                }
                            }
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

                    // 使用统一的解析逻辑
                    let nodeCount = 0;
                    let parsedNodes: ProxyNode[] = [];
                    try {
                        // 解析节点，应用过滤规则
                        parsedNodes = parse(text);
                        parsedNodes = await process(
                            parsedNodes,
                            {
                                dedupe: false,
                                exclude: exclude // 应用过滤规则
                            },
                            ''
                        );
                        nodeCount = parsedNodes.length;
                    } catch (e) {
                        console.error(`Node count parse failed for ${subUrl}:`, e);
                    }

                    result.count = nodeCount;

                    // 如果请求要求返回节点列表
                    if (returnNodes && parsedNodes.length > 0) {
                        result.nodes = await ensureNodeUrls(parsedNodes);
                    }
                } else if (responses[1].status === 'rejected') {
                    console.error(
                        `Node count request for ${subUrl} rejected:`,
                        responses[1].reason
                    );
                }

                // 只有在至少获取到一个有效信息时，才更新数据库
                if (result.userInfo || result.count > 0) {
                    const storage = await getStorage(env);
                    const originalSubs = (await storage.get<Subscription[]>(KV_KEY_SUBS)) || [];
                    const allSubs = JSON.parse(JSON.stringify(originalSubs)) as Subscription[]; // 深拷贝
                    const subToUpdate = allSubs.find((s) => s.url === subUrl);

                    if (subToUpdate) {
                        subToUpdate.nodeCount = result.count;
                        subToUpdate.userInfo = result.userInfo as SubscriptionUserInfo;

                        await storage.put(KV_KEY_SUBS, allSubs);
                    }
                }
            } catch (e) {
                console.error(`[API Error /node_count] Unhandled exception for URL: ${subUrl}`, e);
            }

            return new Response(JSON.stringify(result), {
                headers: { 'Content-Type': 'application/json' }
            });
        }

        case '/batch_update_nodes': {
            if (request.method !== 'POST')
                return new Response('Method Not Allowed', { status: 405 });

            try {
                const { subscriptionIds } = (await request.json()) as {
                    subscriptionIds?: string[];
                };
                if (!Array.isArray(subscriptionIds)) {
                    return new Response(
                        JSON.stringify({ error: 'subscriptionIds must be an array' }),
                        { status: 400 }
                    );
                }

                const storage = await getStorage(env);
                const allSubs = (await storage.get<Subscription[]>(KV_KEY_SUBS)) || [];
                const subsToUpdate = allSubs.filter(
                    (sub) => subscriptionIds.includes(sub.id) && sub.url.startsWith('http')
                );

                console.log(
                    `[Batch Update] Starting batch update for ${subsToUpdate.length} subscriptions`
                );

                // 并行更新所有订阅的节点信息
                const updatePromises = subsToUpdate.map(async (sub) => {
                    try {
                        const fetchOptions = {
                            headers: { 'User-Agent': GLOBAL_USER_AGENT },
                            redirect: 'follow',
                            cf: { insecureSkipVerify: true }
                        } as any;

                        const response = (await Promise.race([
                            fetch(sub.url, fetchOptions),
                            new Promise((_, reject) =>
                                setTimeout(() => reject(new Error('Timeout')), 30000)
                            )
                        ])) as Response;

                        if (response.ok) {
                            // 更新流量信息
                            const userInfoHeader = response.headers.get('subscription-userinfo');
                            if (userInfoHeader) {
                                const info: Partial<SubscriptionUserInfo> = {};
                                userInfoHeader.split(';').forEach((part) => {
                                    const [key, value] = part.trim().split('=');
                                    if (key && value)
                                        (info as any)[key] = /^\d+$/.test(value)
                                            ? Number(value)
                                            : value;
                                });
                                sub.userInfo = info as SubscriptionUserInfo;
                            }

                            // 更新节点数量
                            const text = await response.text();

                            // 使用统一的解析逻辑
                            let nodeCount = 0;
                            try {
                                // 管理端需要显示全部节点，不进行去重
                                let nodes = parse(text);
                                nodes = await process(nodes, { dedupe: false }, sub.name);
                                nodeCount = nodes.length;
                            } catch (e) {
                                console.error(`Batch update parse failed:`, e);
                            }

                            sub.nodeCount = nodeCount;

                            return {
                                id: sub.id,
                                success: true,
                                nodeCount: sub.nodeCount,
                                userInfo: sub.userInfo
                            };
                        } else {
                            return { id: sub.id, success: false, error: `HTTP ${response.status}` };
                        }
                    } catch (error: any) {
                        return { id: sub.id, success: false, error: error.message };
                    }
                });

                const results = await Promise.allSettled(updatePromises);
                const updateResults = results.map((result) =>
                    result.status === 'fulfilled'
                        ? result.value
                        : { success: false, error: 'Promise rejected' }
                );

                // Re-fetch latest data to minimize race condition window
                // 重新读取最新的订阅列表，以防止覆盖在 fetch 期间发生的其他更改
                const latestSubs = (await storage.get<Subscription[]>(KV_KEY_SUBS)) || [];
                let hasChanges = false;

                updateResults.forEach((res: any) => {
                    if (res.success) {
                        const targetSub = latestSubs.find((s) => s.id === res.id);
                        if (targetSub) {
                            targetSub.nodeCount = res.nodeCount;
                            targetSub.userInfo = res.userInfo;
                            hasChanges = true;
                        }
                    }
                });

                if (hasChanges) {
                    await storage.put(KV_KEY_SUBS, latestSubs);
                }

                console.log(
                    `[Batch Update] Completed batch update, ${updateResults.filter((r) => (r as any).success).length} successful`
                );

                return new Response(
                    JSON.stringify({
                        success: true,
                        message: '批量更新完成',
                        results: updateResults
                    }),
                    { headers: { 'Content-Type': 'application/json' } }
                );
            } catch (error: any) {
                console.error('[API Error /batch_update_nodes]', error);
                return new Response(
                    JSON.stringify({
                        success: false,
                        message: `批量更新失败: ${error.message}`
                    }),
                    { status: 500 }
                );
            }
        }

        case '/settings': {
            if (request.method === 'GET') {
                try {
                    const storage = await getStorage(env);
                    const settings = (await storage.get<Partial<AppConfig>>(KV_KEY_SETTINGS)) || {};
                    return new Response(JSON.stringify({ ...defaultSettings, ...settings }), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (e) {
                    console.error(
                        '[API Error /settings GET]',
                        'Failed to read settings from Storage:',
                        e
                    );
                    return new Response(JSON.stringify({ error: '读取设置失败' }), { status: 500 });
                }
            }
            if (request.method === 'POST') {
                try {
                    const newSettings = await request.json();
                    const storage = await getStorage(env);
                    const oldSettings =
                        (await storage.get<Partial<AppConfig>>(KV_KEY_SETTINGS)) || {};
                    // 使用白名单机制清洗数据：只保留 defaultSettings 中存在的字段
                    // 这样即使未来删除了某个配置项，保存时也会自动剔除旧数据
                    const finalSettings: any = {};
                    const anyNewSettings = newSettings as any;

                    for (const key of Object.keys(defaultSettings)) {
                        const k = key as string;
                        // 优先使用新提交的值，其次是旧值，最后是默认值
                        if (anyNewSettings[k] !== undefined) {
                            finalSettings[k] = anyNewSettings[k];
                        } else if (oldSettings[k] !== undefined) {
                            finalSettings[k] = oldSettings[k];
                        } else {
                            finalSettings[k] = (defaultSettings as any)[k];
                        }
                    }

                    await storage.put(KV_KEY_SETTINGS, finalSettings);

                    const message = `⚙️ *Sub-One 设置更新* ⚙️\n\n您的 Sub-One 应用设置已成功更新。`;
                    await sendTgNotification(finalSettings, message);

                    return new Response(JSON.stringify({ success: true, message: '设置已保存' }));
                } catch (e) {
                    console.error(
                        '[API Error /settings POST]',
                        'Failed to parse request or write settings to Storage:',
                        e
                    );
                    return new Response(JSON.stringify({ error: '保存设置失败' }), { status: 500 });
                }
            }
            return new Response('Method Not Allowed', { status: 405 });
        }
        case '/latency_test': {
            if (request.method !== 'POST')
                return new Response('Method Not Allowed', { status: 405 });
            const { url: testUrl } = (await request.json()) as any;

            if (!testUrl || typeof testUrl !== 'string' || !/^https?:\/\//.test(testUrl)) {
                return new Response(JSON.stringify({ error: 'Invalid or missing url' }), {
                    status: 400
                });
            }

            try {
                const startTime = Date.now();
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

                const response = await fetch(testUrl, {
                    method: 'HEAD', // Try HEAD first for speed
                    headers: { 'User-Agent': GLOBAL_USER_AGENT },
                    redirect: 'follow',
                    signal: controller.signal,
                    cf: { insecureSkipVerify: true }
                } as any);

                clearTimeout(timeoutId);
                const endTime = Date.now();
                const latency = endTime - startTime;

                if (response.ok) {
                    return new Response(
                        JSON.stringify({
                            success: true,
                            latency: latency,
                            status: response.status
                        }),
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                } else {
                    // If HEAD fails (some servers block it), try GET
                    const startTimeGet = Date.now();
                    const controllerGet = new AbortController();
                    const timeoutIdGet = setTimeout(() => controllerGet.abort(), 30000);

                    const responseGet = await fetch(testUrl, {
                        method: 'GET',
                        headers: { 'User-Agent': GLOBAL_USER_AGENT },
                        redirect: 'follow',
                        signal: controllerGet.signal,
                        cf: { insecureSkipVerify: true }
                    } as any);

                    clearTimeout(timeoutIdGet);
                    const endTimeGet = Date.now();
                    const latencyGet = endTimeGet - startTimeGet;

                    if (responseGet.ok) {
                        return new Response(
                            JSON.stringify({
                                success: true,
                                latency: latencyGet,
                                status: responseGet.status
                            }),
                            { headers: { 'Content-Type': 'application/json' } }
                        );
                    }

                    return new Response(
                        JSON.stringify({
                            success: false,
                            latency: latencyGet,
                            status: responseGet.status,
                            error: `HTTP ${responseGet.status}`
                        }),
                        { headers: { 'Content-Type': 'application/json' } }
                    );
                }
            } catch (e: any) {
                return new Response(
                    JSON.stringify({
                        success: false,
                        error: e.message === 'The user aborted a request.' ? 'Timeout' : e.message
                    }),
                    { headers: { 'Content-Type': 'application/json' } }
                );
            }
        }

        case '/storage/backend': {
            // GET: 获取当前存储后端信息
            if (request.method === 'GET') {
                try {
                    const info = await getStorageBackendInfo(env);
                    return new Response(JSON.stringify(info), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (error: any) {
                    console.error('[API Error /storage/backend GET]', error);
                    return new Response(
                        JSON.stringify({
                            error: '获取存储后端信息失败',
                            message: error.message
                        }),
                        { status: 500 }
                    );
                }
            }

            // POST: 切换存储后端
            if (request.method === 'POST') {
                try {
                    const { backend } = (await request.json()) as { backend?: string };

                    if (!backend || (backend !== 'kv' && backend !== 'd1')) {
                        return new Response(
                            JSON.stringify({
                                error: '无效的存储后端类型',
                                message: '存储后端必须是 "kv" 或 "d1"'
                            }),
                            { status: 400 }
                        );
                    }

                    const success = await setStorageBackend(env, backend);

                    if (success) {
                        return new Response(
                            JSON.stringify({
                                success: true,
                                message: `已切换到 ${backend.toUpperCase()} 存储后端`,
                                backend
                            }),
                            {
                                headers: { 'Content-Type': 'application/json' }
                            }
                        );
                    } else {
                        return new Response(
                            JSON.stringify({
                                success: false,
                                error: '切换存储后端失败',
                                message: `${backend.toUpperCase()} 存储后端可能未配置或不可用`
                            }),
                            { status: 400 }
                        );
                    }
                } catch (error: any) {
                    console.error('[API Error /storage/backend POST]', error);
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: '切换存储后端失败',
                            message: error.message
                        }),
                        { status: 500 }
                    );
                }
            }

            return new Response('Method Not Allowed', { status: 405 });
        }

        case '/storage/migrate': {
            // POST: 执行数据迁移
            if (request.method === 'POST') {
                try {
                    const { targetBackend } = (await request.json()) as { targetBackend?: string };

                    if (!targetBackend || (targetBackend !== 'kv' && targetBackend !== 'd1')) {
                        return new Response(
                            JSON.stringify({
                                error: '无效的目标存储后端',
                                message: '目标存储后端必须是 "kv" 或 "d1"'
                            }),
                            { status: 400 }
                        );
                    }

                    console.log(`[Migration] Starting migration to ${targetBackend}`);

                    const result = await autoMigrate(env, targetBackend);

                    if (result.success) {
                        return new Response(
                            JSON.stringify({
                                success: true,
                                message: result.message,
                                details: result.details
                            }),
                            {
                                headers: { 'Content-Type': 'application/json' }
                            }
                        );
                    } else {
                        return new Response(
                            JSON.stringify({
                                success: false,
                                error: '迁移失败',
                                message: result.message,
                                details: result.details
                            }),
                            { status: 500 }
                        );
                    }
                } catch (error: any) {
                    console.error('[API Error /storage/migrate]', error);
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: '迁移过程出错',
                            message: error.message
                        }),
                        { status: 500 }
                    );
                }
            }

            return new Response('Method Not Allowed', { status: 405 });
        }

        case '/backup/export': {
            // 导出所有数据为备份文件
            if (request.method === 'POST') {
                try {
                    const storage = await getStorage(env);
                    const backendInfo = await getStorageBackendInfo(env);

                    // 导出数据
                    const backupData = await exportAllData(
                        storage,
                        backendInfo.current,
                        authResult.username
                    );

                    return new Response(
                        JSON.stringify({
                            success: true,
                            data: backupData
                        }),
                        {
                            headers: { 'Content-Type': 'application/json' }
                        }
                    );
                } catch (error: any) {
                    console.error('[API Error /backup/export]', error);
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: '导出备份失败',
                            message: error.message
                        }),
                        { status: 500 }
                    );
                }
            }

            return new Response('Method Not Allowed', { status: 405 });
        }

        case '/backup/import': {
            // 导入备份数据
            if (request.method === 'POST') {
                try {
                    const { data: backupData, mode } = (await request.json()) as {
                        data: any;
                        mode?: ImportMode;
                    };

                    if (!backupData) {
                        return new Response(
                            JSON.stringify({
                                success: false,
                                error: '缺少备份数据'
                            }),
                            { status: 400 }
                        );
                    }

                    const storage = await getStorage(env);

                    // 导入数据
                    const result = await importAllData(storage, backupData, mode || 'overwrite');

                    if (result.success) {
                        return new Response(JSON.stringify(result), {
                            headers: { 'Content-Type': 'application/json' }
                        });
                    } else {
                        return new Response(JSON.stringify(result), {
                            status: 400,
                            headers: { 'Content-Type': 'application/json' }
                        });
                    }
                } catch (error: any) {
                    console.error('[API Error /backup/import]', error);
                    return new Response(
                        JSON.stringify({
                            success: false,
                            error: '导入备份失败',
                            message: error.message
                        }),
                        { status: 500 }
                    );
                }
            }

            return new Response('Method Not Allowed', { status: 405 });
        }

        case '/backup/validate': {
            // 验证备份文件
            if (request.method === 'POST') {
                try {
                    const { data: backupData } = (await request.json()) as { data: any };

                    if (!backupData) {
                        return new Response(
                            JSON.stringify({
                                valid: false,
                                error: '缺少备份数据'
                            }),
                            { status: 400 }
                        );
                    }

                    // 验证数据
                    const result = await validateBackup(backupData);

                    return new Response(JSON.stringify(result), {
                        headers: { 'Content-Type': 'application/json' }
                    });
                } catch (error: any) {
                    console.error('[API Error /backup/validate]', error);
                    return new Response(
                        JSON.stringify({
                            valid: false,
                            error: '验证失败',
                            message: error.message
                        }),
                        { status: 500 }
                    );
                }
            }

            return new Response('Method Not Allowed', { status: 405 });
        }
    }

    return new Response('API route not found', { status: 404 });
}

import express from 'express';
import { storage } from './storage';
import { config } from './config';
import { subscriptionParser } from './parser';
import { sendTgNotification } from './utils';
import { Settings, Subscription, Node, UserInfo } from './types';
import {
    KV_KEY_SUBS,
    KV_KEY_PROFILES,
    KV_KEY_SETTINGS,
    COOKIE_NAME,
    SESSION_DURATION,
    defaultSettings
} from './constants';

const router = express.Router();


// Auth Middleware
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const token = req.cookies[COOKIE_NAME];
    if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    try {
        const timestamp = parseInt(token, 10);
        if (!isNaN(timestamp) && (Date.now() - timestamp < SESSION_DURATION)) {
            next();
        } else {
            res.status(401).json({ error: 'Unauthorized' });
        }
    } catch {
        res.status(401).json({ error: 'Unauthorized' });
    }
};

router.post('/login', async (req, res) => {
    const { password } = req.body;
    if (password === config.ADMIN_PASSWORD) {
        const token = String(Date.now());
        res.cookie(COOKIE_NAME, token, {
            httpOnly: true,
            secure: false, // Set to true if using HTTPS
            sameSite: 'strict',
            maxAge: SESSION_DURATION
        });
        res.json({ success: true });
    } else {
        res.status(401).json({ error: '密码错误' });
    }
});

router.use(authMiddleware);

router.post('/logout', (req, res) => {
    res.clearCookie(COOKIE_NAME);
    res.json({ success: true });
});

router.get('/data', async (req, res) => {
    try {
        const [subs, profiles, settings] = await Promise.all([
            storage.get(KV_KEY_SUBS).then(res => res || []),
            storage.get(KV_KEY_PROFILES).then(res => res || []),
            storage.get<Settings>(KV_KEY_SETTINGS).then(res => res || defaultSettings)
        ]);
        const configData = {
            FileName: settings.FileName || 'SUB_ONE',
            mytoken: settings.mytoken || 'auto',
            profileToken: settings.profileToken || ''
        };
        res.json({ subs, profiles, config: configData });
    } catch (e) {
        console.error('Failed to read data:', e);
        res.status(500).json({ error: '读取初始数据失败' });
    }
});

router.post('/subs', async (req, res) => {
    try {
        const { subs, profiles } = req.body;
        if (!Array.isArray(subs) || !Array.isArray(profiles)) {
            return res.status(400).json({ success: false, message: 'subs 和 profiles 必须是数组格式' });
        }

        await Promise.all([
            storage.put(KV_KEY_SUBS, subs),
            storage.put(KV_KEY_PROFILES, profiles)
        ]);

        res.json({ success: true, message: '订阅源及订阅组已保存' });
    } catch (e: unknown) {
        console.error('Save failed:', e);
        res.status(500).json({ success: false, message: `保存失败: ${e instanceof Error ? e.message : String(e)}` });
    }
});

router.post('/node_count', async (req, res) => {
    const { url: subUrl } = req.body;
    if (!subUrl || typeof subUrl !== 'string' || !/^https?:\/\//.test(subUrl)) {
        return res.status(400).json({ error: 'Invalid or missing url' });
    }

    const result: { count: number; userInfo: UserInfo | null } = { count: 0, userInfo: null };

    try {
        const trafficRequest = fetch(subUrl, { headers: { 'User-Agent': 'Clash for Windows/0.20.39' }, redirect: "follow" });
        const nodeCountRequest = fetch(subUrl, { headers: { 'User-Agent': 'Sub-One-Node-Counter/2.0' }, redirect: "follow" });

        const responses = await Promise.allSettled([trafficRequest, nodeCountRequest]);

        if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
            const userInfoHeader = responses[0].value.headers.get('subscription-userinfo');
            if (userInfoHeader) {
                const info: Partial<UserInfo> = {};
                userInfoHeader.split(';').forEach(part => {
                    const [key, value] = part.trim().split('=');
                    if (key && value) {
                        (info as Record<string, string | number>)[key] = /^\d+$/.test(value) ? Number(value) : value;
                    }
                });
                result.userInfo = info as UserInfo;
            }
        }

        if (responses[1].status === 'fulfilled' && responses[1].value.ok) {
            const text = await responses[1].value.text();
            try {
                const nodes = subscriptionParser.parse(text);
                result.count = nodes.length;
            } catch (e) {
                console.error(`Node count parse failed for ${subUrl}:`, e);
            }
        }

        if (result.userInfo || result.count > 0) {
            const originalSubs = await storage.get<Subscription[]>(KV_KEY_SUBS) || [];
            const allSubs: Subscription[] = JSON.parse(JSON.stringify(originalSubs));
            const subToUpdate = allSubs.find((s) => s.url === subUrl);

            if (subToUpdate) {
                subToUpdate.nodeCount = result.count;
                if (result.userInfo) {
                    subToUpdate.userInfo = result.userInfo;
                }
                await storage.put(KV_KEY_SUBS, allSubs);
            }
        }
    } catch (e) {
        console.error(`Unhandled exception for URL: ${subUrl}`, e);
    }

    res.json(result);
});

router.post('/batch_update_nodes', async (req, res) => {
    try {
        const { subscriptionIds } = req.body;
        if (!Array.isArray(subscriptionIds)) {
            return res.status(400).json({ error: 'subscriptionIds must be an array' });
        }

        const allSubs = await storage.get<Subscription[]>(KV_KEY_SUBS) || [];
        const subsToUpdate = allSubs.filter(sub => subscriptionIds.includes(sub.id) && sub.url.startsWith('http'));

        const updatePromises = subsToUpdate.map(async (sub) => {
            try {
                const response = await Promise.race([
                    fetch(sub.url, { headers: { 'User-Agent': 'Sub-One-Batch-Updater/1.0' }, redirect: "follow" }),
                    new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                ]);

                if (response.ok) {
                    const userInfoHeader = response.headers.get('subscription-userinfo');
                    if (userInfoHeader) {
                        const info: Partial<UserInfo> = {};
                        userInfoHeader.split(';').forEach(part => {
                            const [key, value] = part.trim().split('=');
                            if (key && value) {
                                (info as Record<string, string | number>)[key] = /^\d+$/.test(value) ? Number(value) : value;
                            }
                        });
                        sub.userInfo = info as UserInfo;
                    }

                    const text = await response.text();
                    try {
                        const nodes = subscriptionParser.parse(text);
                        sub.nodeCount = nodes.length;
                    } catch (e) {
                        console.error(`Batch update parse failed:`, e);
                    }

                    return { id: sub.id, success: true, nodeCount: sub.nodeCount, userInfo: sub.userInfo };
                } else {
                    return { id: sub.id, success: false, error: `HTTP ${response.status}` };
                }
            } catch (error: unknown) {
                return { id: sub.id, success: false, error: error instanceof Error ? error.message : String(error) };
            }
        });

        const results = await Promise.allSettled(updatePromises);
        const updateResults = results.map(result =>
            result.status === 'fulfilled' ? result.value : { success: false, error: 'Promise rejected' }
        );

        await storage.put(KV_KEY_SUBS, allSubs);

        res.json({
            success: true,
            message: '批量更新完成',
            results: updateResults
        });
    } catch (error: unknown) {
        res.status(500).json({ success: false, message: `批量更新失败: ${error instanceof Error ? error.message : String(error)}` });
    }
});

router.get('/settings', async (req, res) => {
    try {
        const settings = await storage.get<Settings>(KV_KEY_SETTINGS) || {};
        res.json({ ...defaultSettings, ...settings });
    } catch (e) {
        res.status(500).json({ error: '读取设置失败' });
    }
});

router.post('/settings', async (req, res) => {
    try {
        const newSettings = req.body;
        const oldSettings = await storage.get<Settings>(KV_KEY_SETTINGS) || {};
        const finalSettings = { ...oldSettings, ...newSettings };

        await storage.put(KV_KEY_SETTINGS, finalSettings);

        const message = `⚙️ *Sub-One 设置更新* ⚙️\n\n您的 Sub-One 应用设置已成功更新。`;
        await sendTgNotification(finalSettings, message);

        res.json({ success: true, message: '设置已保存' });
    } catch (e) {
        res.status(500).json({ error: '保存设置失败' });
    }
});

router.post('/latency_test', async (req, res) => {
    const { url: testUrl } = req.body;
    if (!testUrl || typeof testUrl !== 'string' || !/^https?:\/\//.test(testUrl)) {
        return res.status(400).json({ error: 'Invalid or missing url' });
    }

    try {
        const startTime = Date.now();
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        try {
            const response = await fetch(testUrl, {
                method: 'HEAD',
                headers: { 'User-Agent': 'Sub-One-Latency-Tester/1.0' },
                redirect: 'follow',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            const endTime = Date.now();
            res.json({ success: true, latency: endTime - startTime, status: response.status });
        } catch (e) {
            // Fallback to GET
            const startTimeGet = Date.now();
            const controllerGet = new AbortController();
            const timeoutIdGet = setTimeout(() => controllerGet.abort(), 10000);
            const responseGet = await fetch(testUrl, {
                method: 'GET',
                headers: { 'User-Agent': 'Sub-One-Latency-Tester/1.0' },
                redirect: 'follow',
                signal: controllerGet.signal
            });
            clearTimeout(timeoutIdGet);
            const endTimeGet = Date.now();
            res.json({ success: true, latency: endTimeGet - startTimeGet, status: responseGet.status });
        }
    } catch (e: unknown) {
        res.json({ success: false, error: e instanceof Error && e.message === 'The user aborted a request.' ? 'Timeout' : (e instanceof Error ? e.message : String(e)) });
    }
});

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
router.post('/parse_subscription', async (req, res) => {
    const { url: subUrl, subscriptionName, exclude, prependSubName } = req.body;

    // 验证URL
    if (!subUrl || typeof subUrl !== 'string' || !/^https?:\/\//.test(subUrl)) {
        return res.status(400).json({
            success: false,
            error: 'Invalid or missing url parameter'
        });
    }

    try {
        console.log(`[Parse Subscription] 开始解析: ${subUrl}`);

        // 并行请求流量信息和节点内容
        const trafficRequest = fetch(subUrl, {
            headers: { 'User-Agent': 'Clash for Windows/0.20.39' },
            redirect: "follow"
        });

        const nodeRequest = fetch(subUrl, {
            headers: { 'User-Agent': 'Clash.Meta/v1.16.0' }, // 使用 Meta UA 获取完整配置
            redirect: "follow"
        });

        const [trafficResult, nodeResult] = await Promise.allSettled([
            Promise.race([trafficRequest, new Promise<Response>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 15000)
            )]),
            Promise.race([nodeRequest, new Promise<Response>((_, reject) =>
                setTimeout(() => reject(new Error('Timeout')), 15000)
            )])
        ]);

        let userInfo: UserInfo | null = null;
        let nodes: Node[] = [];

        // 1. 处理流量信息
        if (trafficResult.status === 'fulfilled' && trafficResult.value.ok) {
            const userInfoHeader = trafficResult.value.headers.get('subscription-userinfo');
            if (userInfoHeader) {
                const info: Partial<UserInfo> = {};
                userInfoHeader.split(';').forEach(part => {
                    const [key, value] = part.trim().split('=');
                    if (key && value) {
                        (info as Record<string, string | number>)[key] = /^\d+$/.test(value) ? Number(value) : value;
                    }
                });
                userInfo = info as UserInfo;
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
            } catch (parseError: unknown) {
                console.error(`[Parse Subscription] 解析失败:`, parseError);
                return res.json({
                    success: false,
                    error: `解析订阅内容失败: ${parseError instanceof Error ? parseError.message : String(parseError)}`,
                    userInfo: userInfo,
                    nodes: [],
                    count: 0
                });
            }
        } else if (nodeResult.status === 'rejected') {
            console.error(`[Parse Subscription] 节点内容请求失败:`, nodeResult.reason.message);
            return res.json({
                success: false,
                error: `获取订阅内容失败: ${nodeResult.reason.message}`,
                userInfo: userInfo,
                nodes: [],
                count: 0
            });
        }

        // 3. 返回结果
        res.json({
            success: true,
            nodes: nodes,
            userInfo: userInfo,
            count: nodes.length,
            message: `成功获取并解析 ${nodes.length} 个节点`
        });

    } catch (error: unknown) {
        console.error(`[Parse Subscription] 未预期的错误:`, error);
        res.status(500).json({
            success: false,
            error: `服务器错误: ${error instanceof Error ? error.message : String(error)}`,
            nodes: [],
            count: 0
        });
    }
});

export default router;

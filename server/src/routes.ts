import express from 'express';
import { storage } from './storage';
import { config } from './config';
import { subscriptionParser } from './parser';
import { sendTgNotification } from './utils';
import { Settings } from './types';
import { subscriptionService } from './services';

const router = express.Router();

const KV_KEY_SUBS = 'sub_one_subscriptions_v1';
const KV_KEY_PROFILES = 'sub_one_profiles_v1';
const KV_KEY_SETTINGS = 'worker_settings_v1';
const COOKIE_NAME = 'auth_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000;

const defaultSettings: Settings = {
    FileName: 'Sub-One',
    mytoken: 'auto',
    profileToken: '',
    subConverter: 'url.v1.mk',
    subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/refs/heads/main/Clash/config/ACL4SSR_Online_Full.ini',
    prependSubName: true,
    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90
};

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
            storage.get(KV_KEY_SETTINGS).then(res => res || {} as any)
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
    } catch (e: any) {
        console.error('Save failed:', e);
        res.status(500).json({ success: false, message: `保存失败: ${e.message}` });
    }
});

router.post('/node_count', async (req, res) => {
    const { url: subUrl } = req.body;
    if (!subUrl || typeof subUrl !== 'string' || !/^https?:\/\//.test(subUrl)) {
        return res.status(400).json({ error: 'Invalid or missing url' });
    }

    const result: { count: number; userInfo: any } = { count: 0, userInfo: null };

    try {
        const trafficRequest = fetch(subUrl, { headers: { 'User-Agent': 'Clash for Windows/0.20.39' }, redirect: "follow" } as any);
        const nodeCountRequest = fetch(subUrl, { headers: { 'User-Agent': 'Sub-One-Node-Counter/2.0' }, redirect: "follow" } as any);

        const responses = await Promise.allSettled([trafficRequest, nodeCountRequest]);

        if (responses[0].status === 'fulfilled' && responses[0].value.ok) {
            const userInfoHeader = responses[0].value.headers.get('subscription-userinfo');
            if (userInfoHeader) {
                const info: any = {};
                userInfoHeader.split(';').forEach(part => {
                    const [key, value] = part.trim().split('=');
                    if (key && value) info[key] = /^\d+$/.test(value) ? Number(value) : value;
                });
                result.userInfo = info;
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
            const originalSubs = await storage.get<any[]>(KV_KEY_SUBS) || [];
            const allSubs = JSON.parse(JSON.stringify(originalSubs));
            const subToUpdate = allSubs.find((s: any) => s.url === subUrl);

            if (subToUpdate) {
                subToUpdate.nodeCount = result.count;
                subToUpdate.userInfo = result.userInfo;
                await storage.put(KV_KEY_SUBS, allSubs);
            }
        }
    } catch (e) {
        console.error(`Unhandled exception for URL: ${subUrl}`, e);
    }

    res.json(result);
});

router.post('/fetch_external_url', async (req, res) => {
    const { url: externalUrl } = req.body;
    if (!externalUrl || typeof externalUrl !== 'string' || !/^https?:\/\//.test(externalUrl)) {
        return res.status(400).json({ error: 'Invalid or missing url' });
    }

    try {
        const response = await fetch(externalUrl, {
            headers: { 'User-Agent': 'Sub-One-Proxy/1.0' },
            redirect: "follow"
        } as any);

        if (!response.ok) {
            return res.status(response.status).json({ error: `Failed to fetch external URL: ${response.status} ${response.statusText}` });
        }

        const content = await response.text();
        const headers: Record<string, string> = {};
        response.headers.forEach((value, key) => {
            headers[key] = value;
        });
        res.json({ content, headers });
    } catch (e: any) {
        res.status(500).json({ error: `Failed to fetch external URL: ${e.message}` });
    }
});

router.post('/batch_update_nodes', async (req, res) => {
    try {
        const { subscriptionIds } = req.body;
        if (!Array.isArray(subscriptionIds)) {
            return res.status(400).json({ error: 'subscriptionIds must be an array' });
        }

        const allSubs = await storage.get<any[]>(KV_KEY_SUBS) || [];
        const subsToUpdate = allSubs.filter(sub => subscriptionIds.includes(sub.id) && sub.url.startsWith('http'));

        const updatePromises = subsToUpdate.map(async (sub) => {
            try {
                const response = await Promise.race([
                    fetch(sub.url, { headers: { 'User-Agent': 'Sub-One-Batch-Updater/1.0' }, redirect: "follow" } as any),
                    new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                ]);

                if (response.ok) {
                    const userInfoHeader = response.headers.get('subscription-userinfo');
                    if (userInfoHeader) {
                        const info: any = {};
                        userInfoHeader.split(';').forEach(part => {
                            const [key, value] = part.trim().split('=');
                            if (key && value) info[key] = /^\d+$/.test(value) ? Number(value) : value;
                        });
                        sub.userInfo = info;
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
            } catch (error: any) {
                return { id: sub.id, success: false, error: error.message };
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
    } catch (error: any) {
        res.status(500).json({ success: false, message: `批量更新失败: ${error.message}` });
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
            } as any);
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
            } as any);
            clearTimeout(timeoutIdGet);
            const endTimeGet = Date.now();
            res.json({ success: true, latency: endTimeGet - startTimeGet, status: responseGet.status });
        }
    } catch (e: any) {
        res.json({ success: false, error: e.message === 'The user aborted a request.' ? 'Timeout' : e.message });
    }
});

export default router;

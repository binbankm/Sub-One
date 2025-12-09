import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config';
import apiRoutes from './routes';
import { cronService, subscriptionService } from './services';
import { storage } from './storage';
import { Settings, Subscription, Profile } from './types';
import { sendTgNotification, formatBytes } from './utils';

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, '../../dist')));

// API Routes
app.use('/api', apiRoutes);

const KV_KEY_SUBS = 'sub_one_subscriptions_v1';
const KV_KEY_PROFILES = 'sub_one_profiles_v1';
const KV_KEY_SETTINGS = 'worker_settings_v1';
const DEFAULT_EXPIRED_NODE = `trojan://00000000-0000-0000-0000-000000000000@127.0.0.1:443#${encodeURIComponent('您的订阅已失效')}`;

const defaultSettings: Settings = {
    FileName: 'Sub-One',
    mytoken: 'auto',
    profileToken: '',
    subConverter: 'subconverter:25500',
    subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/refs/heads/main/Clash/config/ACL4SSR_Online_Full.ini',
    prependSubName: true,
    NotifyThresholdDays: 3,
    NotifyThresholdPercent: 90
};

// Subscription Handler
const handleSubRequest = async (req: express.Request, res: express.Response) => {
    const userAgentHeader = req.headers['user-agent'] || "Unknown";
    const { token, profile: profileIdentifier } = req.params;

    const [settingsData, subsData, profilesData] = await Promise.all([
        storage.get<Settings>(KV_KEY_SETTINGS),
        storage.get<Subscription[]>(KV_KEY_SUBS),
        storage.get<Profile[]>(KV_KEY_PROFILES)
    ]);

    const settings = settingsData || {};
    const allSubs = subsData || [];
    const allProfiles = profilesData || [];
    const appConfig = { ...defaultSettings, ...settings };

    let targetSubs: any[] = [];
    let subName = appConfig.FileName;
    let effectiveSubConverter = appConfig.subConverter;
    let effectiveSubConfig = appConfig.subConfig;
    let isProfileExpired = false;

    if (profileIdentifier) {
        if (!token || token !== appConfig.profileToken) {
            return res.status(403).send('Invalid Profile Token');
        }
        const profile = allProfiles.find(p => (p.customId && p.customId === profileIdentifier) || p.id === profileIdentifier);
        if (profile && profile.enabled) {
            if (profile.expiresAt) {
                const expiryDate = new Date(profile.expiresAt);
                if (new Date() > expiryDate) {
                    isProfileExpired = true;
                }
            }

            if (isProfileExpired) {
                subName = profile.name;
                targetSubs = [{ id: 'expired-node', url: DEFAULT_EXPIRED_NODE, name: '您的订阅已到期', isExpiredNode: true }];
            } else {
                subName = profile.name;
                const profileSubIds = new Set(profile.subscriptions);
                const profileNodeIds = new Set(profile.manualNodes);
                targetSubs = allSubs.filter(item => {
                    const isSubscription = item.url.startsWith('http');
                    const isManualNode = !isSubscription;
                    const belongsToProfile = (isSubscription && profileSubIds.has(item.id)) || (isManualNode && profileNodeIds.has(item.id));
                    return item.enabled && belongsToProfile;
                });
            }
            effectiveSubConverter = profile.subConverter && profile.subConverter.trim() !== '' ? profile.subConverter : appConfig.subConverter;
            effectiveSubConfig = profile.subConfig && profile.subConfig.trim() !== '' ? profile.subConfig : appConfig.subConfig;
        } else {
            return res.status(404).send('Profile not found or disabled');
        }
    } else {
        if (!token || token !== appConfig.mytoken) {
            return res.status(403).send('Invalid Token');
        }
        targetSubs = allSubs.filter(s => s.enabled);
    }

    if (!effectiveSubConverter || effectiveSubConverter.trim() === '') {
        effectiveSubConverter = defaultSettings.subConverter;
    }
    if (!effectiveSubConfig || effectiveSubConfig.trim() === '') {
        effectiveSubConfig = defaultSettings.subConfig;
    }

    let targetFormat = req.query.target as string;
    if (!targetFormat) {
        const supportedFormats = ['clash', 'singbox', 'surge', 'loon', 'base64', 'v2ray', 'trojan'];
        for (const format of supportedFormats) {
            if (req.query[format] !== undefined) {
                targetFormat = (format === 'v2ray' || format === 'trojan') ? 'base64' : format;
                break;
            }
        }
    }

    if (!targetFormat) {
        const ua = userAgentHeader.toLowerCase();
        const uaMapping = [
            ['flyclash', 'clash'], ['mihomo', 'clash'], ['clash.meta', 'clash'], ['clash-verge', 'clash'], ['meta', 'clash'],
            ['stash', 'clash'], ['nekoray', 'clash'], ['sing-box', 'singbox'], ['shadowrocket', 'base64'],
            ['v2rayn', 'base64'], ['v2rayng', 'base64'], ['surge', 'surge'], ['loon', 'loon'],
            ['quantumult%20x', 'quanx'], ['quantumult', 'quanx'], ['clash', 'clash']
        ];
        for (const [keyword, format] of uaMapping) {
            if (ua.includes(keyword)) {
                targetFormat = format;
                break;
            }
        }
    }
    if (!targetFormat) targetFormat = 'base64';

    // Notification (simplified)
    if (!req.query.callback_token) {
        const clientIp = req.ip || 'N/A';
        const message = `🛰️ *订阅被访问* 🛰️\n\n*域名:* \`${req.hostname}\`\n*客户端:* \`${userAgentHeader}\`\n*IP 地址:* \`${clientIp}\`\n*请求格式:* \`${targetFormat}\``;
        sendTgNotification(appConfig, message).catch(console.error);
    }

    let prependedContentForSubconverter = '';
    if (!isProfileExpired) {
        const totalRemainingBytes = targetSubs.reduce((acc, sub) => {
            if (sub.enabled && sub.userInfo && sub.userInfo.total > 0) {
                const used = (sub.userInfo.upload || 0) + (sub.userInfo.download || 0);
                return acc + Math.max(0, sub.userInfo.total - used);
            }
            return acc;
        }, 0);
        if (totalRemainingBytes > 0) {
            const formattedTraffic = formatBytes(totalRemainingBytes);
            const fakeNodeName = `流量剩余 ≫ ${formattedTraffic}`;
            prependedContentForSubconverter = `trojan://00000000-0000-0000-0000-000000000000@127.0.0.1:443#${encodeURIComponent(fakeNodeName)}`;
        }
    }

    const upstreamUserAgent = 'Clash.Meta/v1.16.0';
    const combinedNodeList = await subscriptionService.generateCombinedNodeList(appConfig, upstreamUserAgent, targetSubs, prependedContentForSubconverter);

    if (targetFormat === 'base64') {
        let contentToEncode = isProfileExpired ? DEFAULT_EXPIRED_NODE + '\n' : combinedNodeList;
        const base64Content = Buffer.from(contentToEncode).toString('base64');
        res.set({
            "Content-Type": "text/plain; charset=utf-8",
            'Cache-Control': 'no-store, no-cache'
        });
        return res.send(base64Content);
    }

    // Call Subconverter
    const base64Content = Buffer.from(combinedNodeList).toString('base64');

    // We can't easily use the callback URL method locally unless we have a public URL.
    // Instead, we can POST the content to subconverter if it supports it, or we have to expose this server.
    // The original code used a callback URL.
    // Since we are in Docker, we might not have a public URL easily.
    // However, most subconverters support `url` parameter which is a URL to the subscription.
    // If we can't provide a public URL, we might be stuck unless we proxy the request differently.

    // BUT, the original code constructs a callback URL:
    // const callbackUrl = `${url.protocol}//${url.host}${callbackPath}?target=base64&callback_token=${callbackToken}`;

    // If the user is running this locally, `url.host` will be `localhost:3055`.
    // If the subconverter is also local (or can access localhost), it works.
    // If the subconverter is remote (url.v1.mk), it CANNOT access localhost.

    // This is a critical point. If the user uses a remote subconverter, the server MUST be publicly accessible.
    // OR, we can try to find a subconverter API that accepts content directly (POST).
    // Standard subconverter (tindy2013/subconverter) supports `curl -d "content" ...`.

    // Let's assume the standard behavior for now. If it fails, the user needs to use a local subconverter or expose the port.
    // I will implement the callback URL logic, but warn about it.

    // Actually, if we are converting to Docker, maybe we should include a local subconverter container?
    // The user didn't explicitly ask for it, but it makes "complete conversion" sense.
    // But for now, let's stick to the code logic.

    const callbackToken = 'default-token'; // Simplified
    const callbackPath = profileIdentifier ? `/sub/${token}/${profileIdentifier}` : `/sub/${token}`;
    const protocol = req.protocol;
    const host = req.get('host');
    const callbackUrl = `${protocol}://${host}${callbackPath}?target=base64&callback_token=${callbackToken}`;

    if (req.query.callback_token === callbackToken) {
        res.set({
            "Content-Type": "text/plain; charset=utf-8",
            'Cache-Control': 'no-store, no-cache'
        });
        return res.send(base64Content);
    }

    let cleanSubConverter = effectiveSubConverter.replace(/\/$/, '');
    if (!cleanSubConverter.startsWith('http')) {
        cleanSubConverter = `http://${cleanSubConverter}`;
    }
    const subconverterUrl = new URL(`${cleanSubConverter}/sub`);
    subconverterUrl.searchParams.set('target', targetFormat);

    const uaLow = userAgentHeader.toLowerCase();
    if (targetFormat === 'clash' && (uaLow.includes('mihomo') || uaLow.includes('clash-verge') || uaLow.includes('meta') || uaLow.includes('flyclash'))) {
        subconverterUrl.searchParams.set('ver', 'meta');
    }

    subconverterUrl.searchParams.set('url', callbackUrl);
    if ((targetFormat === 'clash' || targetFormat === 'loon' || targetFormat === 'surge') && effectiveSubConfig && effectiveSubConfig.trim() !== '') {
        subconverterUrl.searchParams.set('config', effectiveSubConfig);
    }
    subconverterUrl.searchParams.set('new_name', 'true');

    try {
        const subResponse = await fetch(subconverterUrl.toString(), {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!subResponse.ok) {
            return res.status(502).send(`Error connecting to subconverter: ${subResponse.status}`);
        }

        const responseText = await subResponse.text();
        const contentType = subResponse.headers.get('content-type') || 'text/plain; charset=utf-8';

        res.set({
            'Content-Type': contentType,
            'Content-Disposition': `attachment; filename*=utf-8''${encodeURIComponent(subName)}`,
            'Cache-Control': 'no-store, no-cache'
        });
        res.send(responseText);
    } catch (error: any) {
        console.error(`Subconverter error: ${error.message}`);
        res.status(502).send(`Error connecting to subconverter: ${error.message}`);
    }
};

app.get('/sub/:token', handleSubRequest);
app.get('/sub/:token/:profile', handleSubRequest);

// Fallback for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
    cronService.start();
});

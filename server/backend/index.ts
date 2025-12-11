import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config';
import apiRoutes from './routes';
import { cronService } from './services';
import { storage } from './storage';
import { Settings, Subscription, Profile } from './types';
import { sendTgNotification, formatBytes } from './utils';
import {
    KV_KEY_SUBS,
    KV_KEY_PROFILES,
    KV_KEY_SETTINGS,
    DEFAULT_EXPIRED_NODE,
    defaultSettings
} from './constants';
// fetch is global in Node 20+

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// Serve static files
app.use(express.static(path.join(__dirname, '../../dist')));

// API Routes
app.use('/api', apiRoutes);


// Proxy Route to bypass WAF on upstream subscriptions
app.get('/proxy-content', async (req, res) => {
    const url = req.query.url as string;
    if (!url) return res.status(400).send('Missing url');
    try {
        // Use a browser-like or Clash UA to bypass WAF
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Clash.Meta/v1.16.0' }
        });
        if (!response.ok) {
            return res.status(response.status).send(await response.text());
        }
        // Forward headers
        const contentType = response.headers.get('content-type');
        if (contentType) res.set('Content-Type', contentType);

        const arrayBuffer = await response.arrayBuffer();
        res.send(Buffer.from(arrayBuffer));
    } catch (e: unknown) {
        res.status(502).send(e instanceof Error ? e.message : String(e));
    }
});

// Subscription Handler
const handleSubRequest = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
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

    let targetSubs: Subscription[] = [];
    let subName = appConfig.FileName;
    let effectiveSubConverter = appConfig.subConverter;
    let effectiveSubConfig = appConfig.subConfig;
    let isProfileExpired = false;

    if (profileIdentifier) {
        if (!token || token !== appConfig.profileToken) {
            return next();
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
                targetSubs = [{ id: 'expired-node', url: DEFAULT_EXPIRED_NODE, name: '您的订阅已到期', enabled: true }];
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
            return next();
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
            if (sub.enabled && sub.userInfo && sub.userInfo.total !== undefined && sub.userInfo.total > 0) {
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

    // --- Pass-through Mode Implementation ---

    // 1. Collect all subscription URLs
    const subscriptionUrls: string[] = [];
    const manualNodes: string[] = [];

    // Construct base URL for the proxy
    // We use the request's host to ensure the Subconverter (external or internal) can reach us back
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    targetSubs.forEach(sub => {
        if (sub.url.startsWith('http')) {
            // Use proxy to bypass WAF
            let proxyUrl = `${baseUrl}/proxy-content?url=${encodeURIComponent(sub.url)}`;
            if (sub.exclude && sub.exclude.trim() !== '') {
                // Subconverter supports 'exclude' param for each URL, but it's tricky with pipe separation.
                // Better approach: Subconverter's 'exclude' param applies globally or we need to handle it per sub.
                // However, standard Subconverter usage with pipes (|) merges all nodes then applies filters.
                // If we want per-subscription filtering, we might need to do it in the proxy or rely on Subconverter's regex.

                // Actually, Subconverter applies 'exclude' to the FINAL list.
                // If we want to filter BEFORE Subconverter (which we do if we want per-sub rules),
                // we should probably handle it in the /proxy-content endpoint or use the internal parser.

                // BUT, for now, let's pass it to the proxy endpoint so it can filter it?
                // The current /proxy-content just fetches and returns. It doesn't parse.

                // Wait, if we are using Subconverter, we usually pass 'exclude' to IT.
                // But Subconverter's 'exclude' is global for the whole result.
                // If user set exclude rules on a SPECIFIC subscription in the UI, they expect it to apply to THAT subscription.
                // If we have multiple subs, global exclude might be okay if the rules are specific enough.

                // Let's collect all exclude rules and pass them to Subconverter globally?
                // Or, better: Implement filtering in /proxy-content?
                // No, /proxy-content is just a stream proxy.

                // Let's look at how we handle it in Internal Base64.
                // In Internal Base64, we parse and filter per sub.

                // For Subconverter path:
                // We can't easily do per-sub filtering unless we download, filter, and re-host (which is what Internal Base64 does).
                // If we just pass URLs to Subconverter, we rely on its global 'exclude' param.

                // Let's try to append the exclude rule to the Subconverter URL parameters.
                // We need to collect ALL exclude rules from all targetSubs.
            }
            subscriptionUrls.push(proxyUrl);
        } else {
            manualNodes.push(sub.url);
        }
    });

    // 2. Handle manual nodes (convert to data URI)
    // Also prepend traffic info or expired info if needed
    if (prependedContentForSubconverter) {
        manualNodes.unshift(prependedContentForSubconverter);
    }

    // If profile is expired, we ignore everything else and just show the expired node
    if (isProfileExpired) {
        // Clear previous collections
        subscriptionUrls.length = 0;
        manualNodes.length = 0;
        manualNodes.push(DEFAULT_EXPIRED_NODE);
    }

    if (manualNodes.length > 0) {
        const manualContent = manualNodes.join('\n');
        const base64Manual = Buffer.from(manualContent).toString('base64');
        // Subconverter supports data URI for raw content
        subscriptionUrls.push(`data:text/plain;base64,${base64Manual}`);
    }

    // 3. Construct Subconverter URL
    // Use configured address, but fallback to internal if empty
    let cleanSubConverter = effectiveSubConverter.replace(/\/$/, '');
    if (!cleanSubConverter) {
        cleanSubConverter = 'api.v1.mk';
    }
    if (!cleanSubConverter.startsWith('http')) {
        cleanSubConverter = `http://${cleanSubConverter}`;
    }

    const subconverterUrl = new URL(`${cleanSubConverter}/sub`);
    subconverterUrl.searchParams.set('target', targetFormat === 'base64' ? 'mixed' : targetFormat);
    subconverterUrl.searchParams.set('url', subscriptionUrls.join('|'));

    if (targetFormat === 'clash') {
        subconverterUrl.searchParams.set('ver', 'meta');
    }

    if ((targetFormat === 'clash' || targetFormat === 'loon' || targetFormat === 'surge') && effectiveSubConfig && effectiveSubConfig.trim() !== '') {
        subconverterUrl.searchParams.set('config', effectiveSubConfig);
    }
    subconverterUrl.searchParams.set('new_name', 'true');
    subconverterUrl.searchParams.set('filename', subName); // Set filename for Content-Disposition

    // Collect and apply exclude rules
    const allExcludeRules = targetSubs
        .filter(sub => sub.exclude !== undefined && sub.exclude.trim() !== '')
        .map(sub => sub.exclude!.trim())
        .join('\n'); // Join with newline for regex OR logic if needed, but Subconverter uses regex directly.
    // Actually Subconverter 'exclude' param expects a regex string.
    // If we have multiple rules from multiple subs, we should probably join them with '|'.
    // But wait, the 'exclude' field in UI allows multiple lines (regexes).
    // So we should join all lines from all subs with '|'.

    if (allExcludeRules) {
        // Split by newline to get individual rules, then join with |
        const combinedRegex = allExcludeRules.split(/\r?\n/).map(r => r.trim()).filter(Boolean).join('|');
        if (combinedRegex) {
            subconverterUrl.searchParams.set('exclude', combinedRegex);
        }
    }

    // 4. Proxy the request
    try {
        // We use node-fetch to stream the response
        const subResponse = await fetch(subconverterUrl.toString(), {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!subResponse.ok) {
            const errorText = await subResponse.text();
            console.error(`Subconverter error ${subResponse.status}: ${errorText}`);
            return res.status(502).send(`Error connecting to subconverter: ${subResponse.status} ${errorText}`);
        }

        // Forward headers
        const contentType = subResponse.headers.get('content-type') || 'text/plain; charset=utf-8';
        const contentDisposition = subResponse.headers.get('content-disposition');

        res.set({
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache'
        });

        if (contentDisposition) {
            res.set({
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-store, no-cache',
                'Content-Disposition': `inline; filename*=utf-8''${encodeURIComponent(subName)}`
            });
        } else {
            res.set('Content-Disposition', `inline; filename*=utf-8''${encodeURIComponent(subName)}`);
        }

        // Read body as text and send (safer than piping Web Streams)
        const responseText = await subResponse.text();
        res.send(responseText);

    } catch (error: unknown) {
        console.error(`Subconverter proxy error: ${error instanceof Error ? error.message : String(error)}`);
        res.status(502).send(`Error connecting to subconverter: ${error instanceof Error ? error.message : String(error)}`);
    }
};

app.get('/:token', handleSubRequest);
app.get('/:token/:profile', handleSubRequest);

// Fallback for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

app.listen(config.PORT, () => {
    console.log(`Server running on port ${config.PORT}`);
    cronService.start();
});

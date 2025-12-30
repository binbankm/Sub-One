import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { config } from './config';
import apiRoutes from './routes';
import { cronService } from './services';
import { storage } from './storage';
import { subscriptionParser } from './parser';
import { Settings, Subscription, Profile } from './types';
import { Node } from '../../lib/shared/types';
import { sendTgNotification, formatBytes } from './utils';
import {
    KV_KEY_SUBS,
    KV_KEY_PROFILES,
    KV_KEY_SETTINGS,
    DEFAULT_EXPIRED_NODE,
    defaultSettings
} from './constants';
import {
    ClashGenerator,
    SingBoxGenerator,
    SurgeGenerator,
    LoonGenerator,
    QuantumultXGenerator
} from './generators';
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

// ==================== 辅助函数：生成合并后的节点列表 ====================
async function generateCombinedNodeList(
    config: any,
    userAgent: string,
    subs: any[],
    prependedTrafficNode = ''
): Promise<Node[]> {
    // 1. 处理手动节点
    const manualNodes = subs.filter((sub: any) => !sub.url.toLowerCase().startsWith('http'));
    const parsedManualNodes = subscriptionParser.parseNodeLines(
        manualNodes.map((n: any) => n.url),
        '手动节点'
    );

    const processedManualNodes = subscriptionParser.processNodes(
        parsedManualNodes,
        '手动节点',
        { prependSubName: config.prependSubName }
    );

    // 2. 处理 HTTP 订阅
    const httpSubs = subs.filter((sub: any) => sub.url.toLowerCase().startsWith('http'));
    const subPromises = httpSubs.map(async (sub: any) => {
        try {
            const response = await Promise.race([
                fetch(sub.url, {
                    headers: { 'User-Agent': userAgent },
                    redirect: "follow"
                }),
                new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 30000))
            ]);

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

    // 3. 添加流量提示节点 (如果有)
    let allNodes = [...processedManualNodes, ...processedSubResults.flat()];

    if (prependedTrafficNode) {
        // 解析流量提示节点并添加到开头
        const trafficNode = subscriptionParser.parseNodeLine(prependedTrafficNode, '系统');
        if (trafficNode) {
            allNodes.unshift(trafficNode);
        }
    }

    // 4. 去重 (基于 URL)
    const uniqueNodes: Node[] = [];
    const seenUrls = new Set();

    for (const node of allNodes) {
        if (!node || !node.url) continue;
        if (!seenUrls.has(node.url)) {
            seenUrls.add(node.url);
            uniqueNodes.push(node);
        }
    }

    return uniqueNodes;
}

// ==================== 订阅处理主函数 ====================
const handleSubRequest = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const userAgentHeader = req.headers['user-agent'] || "Unknown";
    const { token, profile: profileIdentifier } = req.params;

    // 1. 加载数据
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
    let isProfileExpired = false;

    // 2. 身份验证和筛选订阅
    if (profileIdentifier) {
        // 订阅组模式
        if (!token || token !== appConfig.profileToken) {
            return next();
        }
        const profile = allProfiles.find(p => (p.customId && p.customId === profileIdentifier) || p.id === profileIdentifier);
        if (profile && profile.enabled) {
            // 检查过期
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
        } else {
            return res.status(404).send('Profile not found or disabled');
        }
    } else {
        // 普通模式
        if (!token || token !== appConfig.mytoken) {
            return next();
        }
        targetSubs = allSubs.filter(s => s.enabled);
    }

    // 3. 确定输出格式
    let targetFormat = req.query.target as string;
    if (!targetFormat) {
        const supportedFormats = ['clash', 'singbox', 'surge', 'loon', 'quanx', 'base64', 'v2ray', 'trojan'];
        for (const format of supportedFormats) {
            if (req.query[format] !== undefined) {
                targetFormat = (format === 'v2ray' || format === 'trojan') ? 'base64' : format;
                break;
            }
        }
    }

    // User-Agent 自动识别
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

    // 4. Telegram 通知
    if (!req.query.callback_token) {
        const clientIp = req.ip || 'N/A';
        const message = `🛰️ *订阅被访问* 🛰️\n\n*域名:* \`${req.hostname}\`\n*客户端:* \`${userAgentHeader}\`\n*IP 地址:* \`${clientIp}\`\n*请求格式:* \`${targetFormat}\``;
        sendTgNotification(appConfig, message).catch(console.error);
    }

    // 5. 生成流量提示节点
    let prependedTrafficNode = '';
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
            prependedTrafficNode = `trojan://00000000-0000-0000-0000-000000000000@127.0.0.1:443#${encodeURIComponent(fakeNodeName)}`;
        }
    }

    try {
        // 6. 生成合并后的节点列表
        const nodes = await generateCombinedNodeList(
            appConfig,
            userAgentHeader,
            targetSubs,
            prependedTrafficNode
        );

        // 7. 根据格式生成配置
        let configContent: string;
        let contentType: string;
        let fileExtension: string;

        switch (targetFormat) {
            case 'clash':
                configContent = ClashGenerator.generate(nodes, subName);
                contentType = 'text/yaml; charset=utf-8';
                fileExtension = 'yaml';
                break;

            case 'singbox':
                configContent = SingBoxGenerator.generate(nodes, subName);
                contentType = 'application/json; charset=utf-8';
                fileExtension = 'json';
                break;

            case 'surge':
                configContent = SurgeGenerator.generate(nodes, subName);
                contentType = 'text/plain; charset=utf-8';
                fileExtension = 'conf';
                break;

            case 'loon':
                configContent = LoonGenerator.generate(nodes, subName);
                contentType = 'text/plain; charset=utf-8';
                fileExtension = 'conf';
                break;

            case 'quanx':
                configContent = QuantumultXGenerator.generate(nodes, subName);
                contentType = 'text/plain; charset=utf-8';
                fileExtension = 'conf';
                break;

            case 'base64':
            default:
                // Base64 编码的节点列表
                const nodeUrls = nodes.map(n => n.url).join('\n');
                configContent = Buffer.from(nodeUrls).toString('base64');
                contentType = 'text/plain; charset=utf-8';
                fileExtension = 'txt';
                break;
        }

        // 8. 返回配置
        res.set({
            'Content-Type': contentType,
            'Cache-Control': 'no-store, no-cache',
            'Content-Disposition': `inline; filename*=utf-8''${encodeURIComponent(subName)}.${fileExtension}`
        });

        res.send(configContent);

    } catch (error: unknown) {
        console.error(`Configuration generation error: ${error instanceof Error ? error.message : String(error)}`);
        res.status(500).send(`Error generating configuration: ${error instanceof Error ? error.message : String(error)}`);
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

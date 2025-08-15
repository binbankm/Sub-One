
import yaml from 'js-yaml';

const OLD_KV_KEY = 'sub_one_data_v1';
const KV_KEY_SUBS = 'sub_one_subscriptions_v1';
const KV_KEY_PROFILES = 'sub_one_profiles_v1';
const KV_KEY_SETTINGS = 'worker_settings_v1';
const COOKIE_NAME = 'auth_session';
const SESSION_DURATION = 8 * 60 * 60 * 1000;



/**
 * 计算数据的简单哈希值，用于检测变更
 * @param {any} data - 要计算哈希的数据
 * @returns {string} - 数据的哈希值
 */
function calculateDataHash(data) {
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
function hasDataChanged(oldData, newData) {
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
async function conditionalKVPut(env, key, newData, oldData = null) {
    // 如果没有提供旧数据，先从KV读取
    if (oldData === null) {
        try {
            oldData = await env.SUB_ONE_KV.get(key, 'json');
        } catch (error) {
            console.warn(`Failed to read old data for key ${key}:`, error);
            // 读取失败时，为安全起见执行写入
            await env.SUB_ONE_KV.put(key, JSON.stringify(newData));
            return true;
        }
    }

    // 检测数据是否变更
    if (hasDataChanged(oldData, newData)) {
        await env.SUB_ONE_KV.put(key, JSON.stringify(newData));
        console.log(`[KV Optimized] Data changed for key ${key}, write executed.`);
        return true;
    } else {
        console.log(`[KV Optimized] No changes detected for key ${key}, write skipped.`);
        return false;
    }
}

// {{ AURA-X: Add - 批量写入优化机制. Approval: 寸止(ID:1735459200). }}
/**
 * 批量写入队列管理器
 */
class BatchWriteManager {
    constructor() {
        this.writeQueue = new Map(); // key -> {data, timestamp, resolve, reject}
        this.debounceTimers = new Map(); // key -> timerId
        this.DEBOUNCE_DELAY = 1000; // 1秒防抖延迟
    }

    /**
     * 添加写入任务到队列，使用防抖机制
     * @param {Object} env - Cloudflare环境对象
     * @param {string} key - KV键名
     * @param {any} data - 要写入的数据
     * @param {any} oldData - 旧数据（用于变更检测）
     * @returns {Promise<boolean>} - 是否执行了写入
     */
    async queueWrite(env, key, data, oldData = null) {
        return new Promise((resolve, reject) => {
            // 清除之前的定时器
            if (this.debounceTimers.has(key)) {
                clearTimeout(this.debounceTimers.get(key));
            }

            // 更新队列中的数据
            this.writeQueue.set(key, {
                data,
                oldData,
                timestamp: Date.now(),
                resolve,
                reject
            });

            // 设置新的防抖定时器
            const timerId = setTimeout(async () => {
                await this.executeWrite(env, key);
            }, this.DEBOUNCE_DELAY);

            this.debounceTimers.set(key, timerId);
        });
    }

    /**
     * 执行实际的写入操作
     * @param {Object} env - Cloudflare环境对象
     * @param {string} key - KV键名
     */
    async executeWrite(env, key) {
        const writeTask = this.writeQueue.get(key);
        if (!writeTask) return;

        try {
            const wasWritten = await conditionalKVPut(env, key, writeTask.data, writeTask.oldData);
            writeTask.resolve(wasWritten);
            console.log(`[Batch Write] Executed write for key ${key}, written: ${wasWritten}`);
        } catch (error) {
            console.error(`[Batch Write] Failed to write key ${key}:`, error);
            writeTask.reject(error);
        } finally {
            // 清理
            this.writeQueue.delete(key);
            this.debounceTimers.delete(key);
        }
    }

    /**
     * 立即执行所有待写入的任务（用于紧急情况）
     * @param {Object} env - Cloudflare环境对象
     */
    async flushAll(env) {
        const keys = Array.from(this.writeQueue.keys());
        const promises = keys.map(key => this.executeWrite(env, key));
        await Promise.allSettled(promises);
        console.log(`[Batch Write] Flushed ${keys.length} pending writes`);
    }
}

// 全局批量写入管理器实例
const batchWriteManager = new BatchWriteManager();

// --- [新] 默认设置中增加通知阈值 ---
const defaultSettings = {
              FileName: 'Sub-One',
  mytoken: 'auto',
  profileToken: 'profiles',
  subConverter: 'url.v1.mk',
  subConfig: 'https://raw.githubusercontent.com/cmliu/ACL4SSR/refs/heads/main/Clash/config/ACL4SSR_Online_Full.ini',
  prependSubName: true,
  NotifyThresholdDays: 3, 
  NotifyThresholdPercent: 90 
};

const formatBytes = (bytes, decimals = 2) => {
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
async function sendTgNotification(settings, message) {
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

async function handleCronTrigger(env) {
    console.log("Cron trigger fired. Checking all subscriptions for traffic and node count...");
    const originalSubs = await env.SUB_ONE_KV.get(KV_KEY_SUBS, 'json') || [];
    const allSubs = JSON.parse(JSON.stringify(originalSubs)); // 深拷贝以便比较
    const settings = await env.SUB_ONE_KV.get(KV_KEY_SETTINGS, 'json') || defaultSettings;

    const nodeRegex = /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//gm;

    for (const sub of allSubs) {
        if (sub.url.startsWith('http') && sub.enabled) {
            try {
                // --- 並行請求流量和節點內容 ---
                const trafficRequest = fetch(new Request(sub.url, { 
                    headers: { 'User-Agent': 'Clash for Windows/0.20.39' }, 
                    redirect: "follow",
                    cf: { insecureSkipVerify: true } 
                }));
                const nodeCountRequest = fetch(new Request(sub.url, { 
                    headers: { 'User-Agent': 'Sub-One-Cron-Updater/1.0' }, 
                    redirect: "follow",
                    cf: { insecureSkipVerify: true } 
                }));
                const [trafficResult, nodeCountResult] = await Promise.allSettled([
                    Promise.race([trafficRequest, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))]),
                    Promise.race([nodeCountRequest, new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))])
                ]);   

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
                    let decoded = '';
                    try { 
                        // 嘗試 Base64 解碼
                        decoded = atob(text.replace(/\s/g, '')); 
                    } catch { 
                        decoded = text; 
                    }
                    const matches = decoded.match(nodeRegex);
                    if (matches) {
                        sub.nodeCount = matches.length; // 更新節點數量
                        changesMade = true;
                    }
                } else if (nodeCountResult.status === 'rejected') {
                    console.error(`Cron: Failed to fetch node list for ${sub.name}:`, nodeCountResult.reason.message);
                }

            } catch(e) {
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
async function authMiddleware(request, env) {
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
async function checkAndNotify(sub, settings, env) {
    if (!sub.userInfo) return; // 没有流量信息，无法检查

    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();

    // 1. 检查订阅到期
    if (sub.userInfo.expire) {
        const expiryDate = new Date(sub.userInfo.expire * 1000);
        const daysRemaining = Math.ceil((expiryDate - now) / ONE_DAY_MS);
        
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
                const formatBytes = (bytes) => {
                    if (!+bytes) return '0 B';
                    const k = 1024;
                    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
                };
                
                const message = `📈 *流量预警提醒* 📈\n\n*订阅名称:* \`${sub.name || '未命名'}\`\n*状态:* \`已使用 ${usagePercent}%\`\n*详情:* \`${formatBytes(used)} / ${formatBytes(total)}\``;
                const sent = await sendTgNotification(settings, message);
                if (sent) {
                    sub.lastNotifiedTraffic = now; // 更新通知时间戳
                }
            }
        }
    }
}


// --- 主要 API 請求處理 ---
async function handleApiRequest(request, env) {
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
        } catch (e) {
            console.error('[API Error /migrate]', e);
            return new Response(JSON.stringify({ success: false, message: `迁移失败: ${e.message}` }), { status: 500 });
        }
    }

    if (path === '/login') {
        if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
        try {
            const { password } = await request.json();
            if (password === env.ADMIN_PASSWORD) {
                const token = String(Date.now()); // 简单的基于时间戳的token
                const headers = new Headers({ 'Content-Type': 'application/json' });
                headers.append('Set-Cookie', `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION / 1000}`);
                return new Response(JSON.stringify({ success: true }), { headers });
            }
            return new Response(JSON.stringify({ error: '密码错误' }), { status: 401 });
        } catch (e) {
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
                    env.SUB_ONE_KV.get(KV_KEY_SETTINGS, 'json').then(res => res || {})
                ]);
                const config = { 
                    FileName: settings.FileName || 'SUB_ONE', 
                    mytoken: settings.mytoken || 'auto',
                    profileToken: settings.profileToken || 'profiles'
                };
                return new Response(JSON.stringify({ subs, profiles, config }), { headers: { 'Content-Type': 'application/json' } });
            } catch(e) {
                console.error('[API Error /data]', 'Failed to read from KV:', e);
                return new Response(JSON.stringify({ error: '读取初始数据失败' }), { status: 500 });
            }
        }

        case '/subs': {
            try {
                // 步骤1: 解析请求体
                let requestData;
                try {
                    requestData = await request.json();
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

                // {{ AURA-X: Modify - 使用条件写入优化数据保存. Approval: 寸止(ID:1735459200). }}
                // 步骤6: 保存数据到KV存储（使用条件写入）
                try {
                    await Promise.all([
                    env.SUB_ONE_KV.put(KV_KEY_SUBS, JSON.stringify(subs)),
                    env.SUB_ONE_KV.put(KV_KEY_PROFILES, JSON.stringify(profiles))
                ]);
                } catch (kvError) {
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

            } catch (e) {
                console.error('[API Error /subs] 未预期的错误:', e);
                return new Response(JSON.stringify({
                    success: false,
                    message: `保存失败: ${e.message || '服务器内部错误，请稍后重试'}`
                }), { status: 500 });
            }
        }

            case '/node_count': {
                if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
                const { url: subUrl } = await request.json();
                if (!subUrl || typeof subUrl !== 'string' || !/^https?:\/\//.test(subUrl)) {
                    return new Response(JSON.stringify({ error: 'Invalid or missing url' }), { status: 400 });
                }
                
                const result = { count: 0, userInfo: null };

                try {
                    const fetchOptions = {
                        headers: { 'User-Agent': 'Sub-One-Node-Counter/2.0' },
                        redirect: "follow",
                        cf: { insecureSkipVerify: true }
                    };
                    const trafficFetchOptions = {
                        headers: { 'User-Agent': 'Clash for Windows/0.20.39' },
                        redirect: "follow",
                        cf: { insecureSkipVerify: true }
                    };

                    const trafficRequest = fetch(new Request(subUrl, trafficFetchOptions));
                    const nodeCountRequest = fetch(new Request(subUrl, fetchOptions));

                    // --- [核心修正] 使用 Promise.allSettled 替换 Promise.all ---
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
                        
                        // 尝试多种解析方法
                        let nodeCount = 0;
                        
                        // 方法1: 尝试Base64解码后匹配节点链接
                        try {
                            const decoded = atob(text.replace(/\s/g, ''));
                            const lineMatches = decoded.match(/^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls):\/\//gm);
                            if (lineMatches) {
                                nodeCount = lineMatches.length;
                            }
                        } catch (e) {
                            // Base64解码失败，继续尝试其他方法
                        }
                        
                        // 方法2: 如果是YAML格式，解析Clash配置
                        if (nodeCount === 0) {
                            try {
                                const yamlContent = yaml.load(text);
                                if (yamlContent && yamlContent.proxies && Array.isArray(yamlContent.proxies)) {
                                    nodeCount = yamlContent.proxies.length;
                                }
                            } catch (e) {
                                // YAML解析失败，继续尝试其他方法
                            }
                        }
                        
                        // 方法3: 直接匹配原始文本中的节点链接
                        if (nodeCount === 0) {
                            const lineMatches = text.match(/^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls):\/\//gm);
                            if (lineMatches) {
                                nodeCount = lineMatches.length;
                            }
                        }
                        
                        result.count = nodeCount;
                    } else if (responses[1].status === 'rejected') {
                        console.error(`Node count request for ${subUrl} rejected:`, responses[1].reason);
                    }
                    
                    // {{ AURA-X: Modify - 使用条件写入优化节点计数更新. Approval: 寸止(ID:1735459200). }}
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

        case '/fetch_external_url': { // New case
            if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
            const { url: externalUrl } = await request.json();
            if (!externalUrl || typeof externalUrl !== 'string' || !/^https?:\/\//.test(externalUrl)) {
                return new Response(JSON.stringify({ error: 'Invalid or missing url' }), { status: 400 });
            }

            try {
                const response = await fetch(new Request(externalUrl, {
                    headers: { 'User-Agent': 'Sub-One-Proxy/1.0' }, // Identify as proxy
                    redirect: "follow",
                    cf: { insecureSkipVerify: true } // Allow insecure SSL for flexibility
                }));

                if (!response.ok) {
                    return new Response(JSON.stringify({ error: `Failed to fetch external URL: ${response.status} ${response.statusText}` }), { status: response.status });
                }

                const content = await response.text();
                return new Response(content, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

            } catch (e) {
                console.error(`[API Error /fetch_external_url] Failed to fetch ${externalUrl}:`, e);
                return new Response(JSON.stringify({ error: `Failed to fetch external URL: ${e.message}` }), { status: 500 });
            }
        }

        // {{ AURA-X: Add - 批量节点更新API端点. Approval: 寸止(ID:1735459200). }}
        case '/batch_update_nodes': {
            if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
            if (!await authMiddleware(request, env)) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
            }

            try {
                const { subscriptionIds } = await request.json();
                if (!Array.isArray(subscriptionIds)) {
                    return new Response(JSON.stringify({ error: 'subscriptionIds must be an array' }), { status: 400 });
                }

                const allSubs = await env.SUB_ONE_KV.get(KV_KEY_SUBS, 'json') || [];
                const subsToUpdate = allSubs.filter(sub => subscriptionIds.includes(sub.id) && sub.url.startsWith('http'));

                console.log(`[Batch Update] Starting batch update for ${subsToUpdate.length} subscriptions`);

                // 并行更新所有订阅的节点信息
                const updatePromises = subsToUpdate.map(async (sub) => {
                    try {
                        const fetchOptions = {
                            headers: { 'User-Agent': 'Sub-One-Batch-Updater/1.0' },
                            redirect: "follow",
                            cf: { insecureSkipVerify: true }
                        };

                        const response = await Promise.race([
                            fetch(sub.url, fetchOptions),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 10000))
                        ]);

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
                            
                            // 尝试多种解析方法
                            let nodeCount = 0;
                            
                            // 方法1: 尝试Base64解码后匹配节点链接
                            try {
                                const decoded = atob(text.replace(/\s/g, ''));
                                const lineMatches = decoded.match(/^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//gm);
                                if (lineMatches) {
                                    nodeCount = lineMatches.length;
                                }
                            } catch (e) {
                                // Base64解码失败，继续尝试其他方法
                            }
                            
                            // 方法2: 如果是YAML格式，解析Clash配置
                            if (nodeCount === 0) {
                                try {
                                    const yamlContent = yaml.load(text);
                                    if (yamlContent && yamlContent.proxies && Array.isArray(yamlContent.proxies)) {
                                        nodeCount = yamlContent.proxies.length;
                                    }
                                } catch (e) {
                                    // YAML解析失败，继续尝试其他方法
                                }
                            }
                            
                            // 方法3: 直接匹配原始文本中的节点链接
                            if (nodeCount === 0) {
                                const lineMatches = text.match(/^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//gm);
                                if (lineMatches) {
                                    nodeCount = lineMatches.length;
                                }
                            }
                            
                            sub.nodeCount = nodeCount;

                            return { id: sub.id, success: true, nodeCount: sub.nodeCount, userInfo: sub.userInfo };
                        } else {
                            return { id: sub.id, success: false, error: `HTTP ${response.status}` };
                        }
                    } catch (error) {
                        return { id: sub.id, success: false, error: error.message };
                    }
                });

                const results = await Promise.allSettled(updatePromises);
                const updateResults = results.map(result =>
                    result.status === 'fulfilled' ? result.value : { success: false, error: 'Promise rejected' }
                );

                // 使用批量写入管理器保存更新后的数据
                await batchWriteManager.queueWrite(env, KV_KEY_SUBS, allSubs);

                console.log(`[Batch Update] Completed batch update, ${updateResults.filter(r => r.success).length} successful`);

                return new Response(JSON.stringify({
                    success: true,
                    message: '批量更新完成',
                    results: updateResults
                }), { headers: { 'Content-Type': 'application/json' } });

            } catch (error) {
                console.error('[API Error /batch_update_nodes]', error);
                return new Response(JSON.stringify({
                    success: false,
                    message: `批量更新失败: ${error.message}`
                }), { status: 500 });
            }
        }



        case '/wallpaper': {
            if (request.method === 'GET') {
                try {
                    const wallpaperData = await env.SUB_ONE_KV.get('sub_one_wallpaper_v1', 'json') || null;
                    return new Response(JSON.stringify({ success: true, data: wallpaperData }), { headers: { 'Content-Type': 'application/json' } });
                } catch (e) {
                    console.error('[API Error /wallpaper GET]', 'Failed to read wallpaper from KV:', e);
                    return new Response(JSON.stringify({ error: '读取壁纸设置失败' }), { status: 500 });
                }
            }
            if (request.method === 'POST') {
                try {
                    const wallpaperData = await request.json();
                    
                    // 验证壁纸数据格式
                    if (!wallpaperData || typeof wallpaperData !== 'object') {
                        return new Response(JSON.stringify({ error: '壁纸数据格式错误' }), { status: 400 });
                    }
                    
                    // 保存壁纸数据到KV存储
                    await env.SUB_ONE_KV.put('sub_one_wallpaper_v1', JSON.stringify(wallpaperData));
                    
                    return new Response(JSON.stringify({ success: true, message: '壁纸设置已保存' }));
                } catch (e) {
                    console.error('[API Error /wallpaper POST]', 'Failed to save wallpaper to KV:', e);
                    return new Response(JSON.stringify({ error: '保存壁纸设置失败' }), { status: 500 });
                }
            }
            if (request.method === 'DELETE') {
                try {
                    // 删除壁纸数据
                    await env.SUB_ONE_KV.delete('sub_one_wallpaper_v1');
                    return new Response(JSON.stringify({ success: true, message: '壁纸设置已删除' }));
                } catch (e) {
                    console.error('[API Error /wallpaper DELETE]', 'Failed to delete wallpaper from KV:', e);
                    return new Response(JSON.stringify({ error: '删除壁纸设置失败' }), { status: 500 });
                }
            }
            return new Response('Method Not Allowed', { status: 405 });
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
                    const finalSettings = { ...oldSettings, ...newSettings };

                    // {{ AURA-X: Modify - 使用条件写入优化设置保存. Approval: 寸止(ID:1735459200). }}
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
    }
    
    return new Response('API route not found', { status: 404 });
}
// --- 名称前缀辅助函数 (无修改) ---
function prependNodeName(link, prefix) {
  if (!prefix) return link;
  const appendToFragment = (baseLink, namePrefix) => {
    const hashIndex = baseLink.lastIndexOf('#');
    const originalName = hashIndex !== -1 ? decodeURIComponent(baseLink.substring(hashIndex + 1)) : '';
    const base = hashIndex !== -1 ? baseLink.substring(0, hashIndex) : baseLink;
    if (originalName.startsWith(namePrefix)) {
        return baseLink;
    }
    const newName = originalName ? `${namePrefix} - ${originalName}` : namePrefix;
    return `${base}#${encodeURIComponent(newName)}`;
  }
  if (link.startsWith('vmess://')) {
    try {
      const base64Part = link.substring('vmess://'.length);
      const binaryString = atob(base64Part);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
      }
      const jsonString = new TextDecoder('utf-8').decode(bytes);
      const nodeConfig = JSON.parse(jsonString);
      const originalPs = nodeConfig.ps || '';
      if (!originalPs.startsWith(prefix)) {
        nodeConfig.ps = originalPs ? `${prefix} - ${originalPs}` : prefix;
      }
      const newJsonString = JSON.stringify(nodeConfig);
      const newBase64Part = btoa(unescape(encodeURIComponent(newJsonString)));
      return 'vmess://' + newBase64Part;
    } catch (e) {
      console.error("为 vmess 节点添加名称前缀失败，将回退到通用方法。", e);
      return appendToFragment(link, prefix);
    }
  }
  return appendToFragment(link, prefix);
}

// --- 节点列表生成函数 ---
async function generateCombinedNodeList(context, config, userAgent, subs, prependedContent = '') {
    const nodeRegex = /^(ss|ssr|vmess|vless|trojan|hysteria2?|hy|hy2|tuic|anytls|socks5):\/\//;
    const processedManualNodes = subs.filter(sub => !sub.url.toLowerCase().startsWith('http')).map(node => {
        if (node.isExpiredNode) {
            return node.url; // Directly use the URL for expired node
        } else {
            return (config.prependSubName) ? prependNodeName(node.url, '手动节点') : node.url;
        }
    }).join('\n');

    const httpSubs = subs.filter(sub => sub.url.toLowerCase().startsWith('http'));
    const subPromises = httpSubs.map(async (sub) => {
        try {
            const requestHeaders = { 'User-Agent': userAgent };
            const response = await Promise.race([
                fetch(new Request(sub.url, { headers: requestHeaders, redirect: "follow", cf: { insecureSkipVerify: true } })),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out')), 10000))
            ]);
            if (!response.ok) return '';
            let text = await response.text();
            try {
                const cleanedText = text.replace(/\s/g, '');
                if (cleanedText.length > 20 && /^[A-Za-z0-9+\/=]+$/.test(cleanedText)) {
                    const binaryString = atob(cleanedText);
                    const bytes = new Uint8Array(binaryString.length);
                    for (let i = 0; i < binaryString.length; i++) { bytes[i] = binaryString.charCodeAt(i); }
                    text = new TextDecoder('utf-8').decode(bytes);
                }
            } catch (e) {}
            let validNodes = text.replace(/\r\n/g, '\n').split('\n')
                .map(line => line.trim()).filter(line => nodeRegex.test(line));

            // [核心重構] 引入白名單 (keep:) 和黑名單 (exclude) 模式
            if (sub.exclude && sub.exclude.trim() !== '') {
                const rules = sub.exclude.trim().split('\n').map(r => r.trim()).filter(Boolean);
                
                const keepRules = rules.filter(r => r.toLowerCase().startsWith('keep:'));

                if (keepRules.length > 0) {
                    // --- 白名單模式 (Inclusion Mode) ---
                    const nameRegexParts = [];
                    const protocolsToKeep = new Set();

                    keepRules.forEach(rule => {
                        const content = rule.substring('keep:'.length).trim();
                        if (content.toLowerCase().startsWith('proto:')) {
                            const protocols = content.substring('proto:'.length).split(',').map(p => p.trim().toLowerCase());
                            protocols.forEach(p => protocolsToKeep.add(p));
                        } else {
                            nameRegexParts.push(content);
                        }
                    });

                    const nameRegex = nameRegexParts.length > 0 ? new RegExp(nameRegexParts.join('|'), 'i') : null;
                    
                    validNodes = validNodes.filter(nodeLink => {
                        // 檢查協議是否匹配
                        const protocolMatch = nodeLink.match(/^(.*?):\/\//);
                        const protocol = protocolMatch ? protocolMatch[1].toLowerCase() : '';
                        if (protocolsToKeep.has(protocol)) {
                            return true;
                        }

                        // 檢查名稱是否匹配
                        if (nameRegex) {
                            const hashIndex = nodeLink.lastIndexOf('#');
                            if (hashIndex !== -1) {
                                try {
                                    const nodeName = decodeURIComponent(nodeLink.substring(hashIndex + 1));
                                    if (nameRegex.test(nodeName)) {
                                        return true;
                                    }
                                } catch (e) { /* 忽略解碼錯誤 */ }
                            }
                        }
                        return false; // 白名單模式下，不匹配任何規則則排除
                    });

                } else {
                    // --- 黑名單模式 (Exclusion Mode) ---
                    const protocolsToExclude = new Set();
                    const nameRegexParts = [];

                    rules.forEach(rule => {
                        if (rule.toLowerCase().startsWith('proto:')) {
                            const protocols = rule.substring('proto:'.length).split(',').map(p => p.trim().toLowerCase());
                            protocols.forEach(p => protocolsToExclude.add(p));
                        } else {
                            nameRegexParts.push(rule);
                        }
                    });
                    
                    const nameRegex = nameRegexParts.length > 0 ? new RegExp(nameRegexParts.join('|'), 'i') : null;

                    validNodes = validNodes.filter(nodeLink => {
                        const protocolMatch = nodeLink.match(/^(.*?):\/\//);
                        const protocol = protocolMatch ? protocolMatch[1].toLowerCase() : '';
                        if (protocolsToExclude.has(protocol)) {
                            return false;
                        }

                        if (nameRegex) {
                            const hashIndex = nodeLink.lastIndexOf('#');
                            if (hashIndex !== -1) {
                                try {
                                    const nodeName = decodeURIComponent(nodeLink.substring(hashIndex + 1));
                                    if (nameRegex.test(nodeName)) {
                                        return false;
                                    }
                                } catch (e) { /* 忽略解碼錯誤 */ }
                            }
                        }
                        return true;
                    });
                }
            }
            return (config.prependSubName && sub.name)
                ? validNodes.map(node => prependNodeName(node, sub.name)).join('\n')
                : validNodes.join('\n');
        } catch (e) { return ''; }
    });
    const processedSubContents = await Promise.all(subPromises);
    const combinedContent = (processedManualNodes + '\n' + processedSubContents.join('\n'));
    const uniqueNodesString = [...new Set(combinedContent.split('\n').map(line => line.trim()).filter(line => line))].join('\n');

    // 确保最终的字符串在非空时以换行符结束，以兼容 subconverter
    let finalNodeList = uniqueNodesString;
    if (finalNodeList.length > 0 && !finalNodeList.endsWith('\n')) {
        finalNodeList += '\n';
    }

    // 将虚假节点（如果存在）插入到列表最前面
    if (prependedContent) {
        return `${prependedContent}\n${finalNodeList}`;
    }
    return finalNodeList;
}

// --- [核心修改] 订阅处理函数 ---
// --- [最終修正版 - 變量名校對] 訂閱處理函數 ---
async function handleSubRequest(context) {
    const { request, env } = context;
    const url = new URL(request.url);
    const userAgentHeader = request.headers.get('User-Agent') || "Unknown";

    const [settingsData, subsData, profilesData] = await Promise.all([
        env.SUB_ONE_KV.get(KV_KEY_SETTINGS, 'json'),
        env.SUB_ONE_KV.get(KV_KEY_SUBS, 'json'),
        env.SUB_ONE_KV.get(KV_KEY_PROFILES, 'json')
    ]);
    const settings = settingsData || {};
    const allSubs = subsData || [];
    const allProfiles = profilesData || [];
    // 關鍵：我們在這裡定義了 `config`，後續都應該使用它
    const config = { ...defaultSettings, ...settings }; 

    let token = '';
    let profileIdentifier = null;
    const pathSegments = url.pathname.replace(/^\/sub\//, '/').split('/').filter(Boolean);

    if (pathSegments.length > 0) {
        token = pathSegments[0];
        if (pathSegments.length > 1) {
            profileIdentifier = pathSegments[1];
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
        // [修正] 使用 config 變量
        if (!token || token !== config.mytoken) {
            return new Response('Invalid Token', { status: 403 });
        }
        targetSubs = allSubs.filter(s => s.enabled);
        // [修正] 使用 config 變量
        effectiveSubConverter = config.subConverter;
        effectiveSubConfig = config.subConfig;
    }

    if (!effectiveSubConverter || effectiveSubConverter.trim() === '') {
        return new Response('Subconverter backend is not configured.', { status: 500 });
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

    const combinedNodeList = await generateCombinedNodeList(context, config, userAgentHeader, targetSubs, prependedContentForSubconverter);

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
    if (url.searchParams.get('callback_token') === callbackToken) {
        const headers = { "Content-Type": "text/plain; charset=utf-8", 'Cache-Control': 'no-store, no-cache' };
        return new Response(base64Content, { headers });
    }
    
    const subconverterUrl = new URL(`https://${effectiveSubConverter}/sub`);
    subconverterUrl.searchParams.set('target', targetFormat);
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
        responseHeaders.set('Content-Type', 'text/plain; charset=utf-8');
        responseHeaders.set('Cache-Control', 'no-store, no-cache');
        return new Response(responseText, { status: subconverterResponse.status, statusText: subconverterResponse.statusText, headers: responseHeaders });
    } catch (error) {
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
export async function onRequest(context) {
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

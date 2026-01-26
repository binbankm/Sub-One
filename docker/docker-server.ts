import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

import { handleApiRequest } from '../lib/backend/api/handlers';
import { handleSubRequest } from '../lib/backend/subscription/handler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3055;
const DATA_DIR = path.resolve(process.cwd(), './data');
const KV_FILE = path.join(DATA_DIR, 'kv.json');
const DB_FILE = path.join(DATA_DIR, 'database.sqlite');

// 确保数据目录存在
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        // KV File
        try {
            await fs.access(KV_FILE);
        } catch {
            await fs.writeFile(KV_FILE, JSON.stringify({}));
        }
        // SQLite File
        if (!db) {
            db = new Database(DB_FILE);
            console.log(`SQLite database initialized at: ${DB_FILE}`);
        }
    } catch (err) {
        console.error('Failed to initialize data directory:', err);
    }
}

let db: Database.Database;

// 模拟 Cloudflare D1
class NodeD1PreparedStatement {
    constructor(
        private db: Database.Database,
        private query: string,
        private params: any[] = []
    ) { }

    bind(...params: any[]) {
        return new NodeD1PreparedStatement(this.db, this.query, params);
    }

    async first<T = any>(colName?: string): Promise<T | null> {
        try {
            const stmt = this.db.prepare(this.query);
            const result = stmt.get(...this.params);
            if (!result) return null;
            return colName ? (result as any)[colName] : (result as T);
        } catch (err) {
            console.error('D1 first error:', err);
            throw err;
        }
    }

    async run() {
        try {
            const stmt = this.db.prepare(this.query);
            const info = stmt.run(...this.params);
            return { success: true, meta: { changes: info.changes, last_row_id: info.lastInsertRowid } };
        } catch (err) {
            console.error('D1 run error:', err);
            throw err;
        }
    }

    async all<T = any>() {
        try {
            const stmt = this.db.prepare(this.query);
            const results = stmt.all(...this.params);
            return { success: true, results: results as T[] };
        } catch (err) {
            console.error('D1 all error:', err);
            throw err;
        }
    }

    async raw<T = any>() {
        try {
            const stmt = this.db.prepare(this.query);
            return stmt.raw().all(...this.params) as T[];
        } catch (err) {
            console.error('D1 raw error:', err);
            throw err;
        }
    }
}

class NodeD1 {
    constructor(private db: Database.Database) { }

    prepare(query: string) {
        return new NodeD1PreparedStatement(this.db, query);
    }

    async exec(query: string) {
        try {
            this.db.exec(query);
            return { success: true };
        } catch (err) {
            console.error('D1 exec error:', err);
            throw err;
        }
    }

    async batch(statements: NodeD1PreparedStatement[]) {
        const results = [];
        for (const stmt of statements) {
            results.push(await stmt.run());
        }
        return results;
    }
}

// 模拟 Cloudflare KV (加强版：带内存缓存和原子写入)
class NodeKV {
    private data: Record<string, any> = {};
    private initialized: boolean = false;

    async init() {
        if (this.initialized) return;
        try {
            const content = await fs.readFile(KV_FILE, 'utf-8');
            const rawData = JSON.parse(content || '{}');

            // 启动时遍历所有键，尝试将转义的字符串解开为真正的对象
            // 这样可以让整个 kv.json 文件立即变得“竖向”且易读
            for (const key in rawData) {
                if (typeof rawData[key] === 'string') {
                    try {
                        const parsed = JSON.parse(rawData[key]);
                        // 只有解析出来是对象或数组时才转换
                        if (typeof parsed === 'object' && parsed !== null) {
                            rawData[key] = parsed;
                        }
                    } catch {
                        // 保持原样（确实是普通字符串）
                    }
                }
            }

            this.data = rawData;
            this.initialized = true;
            // 立即保存一次，刷新文件格式
            await this.save();
        } catch (err) {
            console.error('KV init error:', err);
            this.data = {};
            this.initialized = true;
        }
    }

    private savePromise: Promise<void> = Promise.resolve();
    private debounceTimer: NodeJS.Timeout | null = null;
    private pendingResolves: Array<() => void> = [];
    private pendingRejects: Array<(err: any) => void> = [];

    private async save() {
        // 防抖：如果在 1000ms 内有新的写入请求，取消上一次的计划
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        return new Promise<void>((resolve, reject) => {
            // 将当前的 resolve/reject 加入队列
            this.pendingResolves.push(resolve);
            this.pendingRejects.push(reject);

            this.debounceTimer = setTimeout(() => {
                // 将实际写入逻辑放入队列，防止并发
                this.savePromise = this.savePromise
                    .then(async () => {
                        try {
                            const tempFile = `${KV_FILE}.tmp`;
                            await fs.writeFile(
                                tempFile,
                                JSON.stringify(this.data, null, 2),
                                'utf-8'
                            );
                            await fs.rename(tempFile, KV_FILE);

                            // 写入成功：解决所有等待的 Promise
                            const resolves = [...this.pendingResolves];
                            this.pendingResolves = [];
                            this.pendingRejects = [];
                            resolves.forEach((r) => r());
                        } catch (err) {
                            console.error('KV save error:', err);

                            // 写入失败：拒绝所有等待的 Promise
                            const rejects = [...this.pendingRejects];
                            this.pendingResolves = [];
                            this.pendingRejects = [];
                            rejects.forEach((r) => r(err));
                        }
                    })
                    .catch((err) => {
                        // 捕获 savePromise 链本身的异常
                        const rejects = [...this.pendingRejects];
                        this.pendingResolves = [];
                        this.pendingRejects = [];
                        rejects.forEach((r) => r(err));
                    });
            }, 1000); // 延迟 1秒 写入
        });
    }

    async get(key: string, type: string = 'text') {
        if (!this.initialized) await this.init();
        const val = this.data[key];
        if (val === undefined) return null;

        // 如果请求 JSON 格式
        if (type === 'json') {
            if (typeof val === 'string') {
                try {
                    return JSON.parse(val);
                } catch {
                    return val;
                }
            }
            return val;
        }

        // 如果请求文本格式且存储的是对象，则需序列化（模拟 Cloudflare KV 行为）
        if (typeof val === 'object' && val !== null) {
            return JSON.stringify(val);
        }
        return val;
    }

    async put(key: string, value: any) {
        if (!this.initialized) await this.init();

        // 尝试解析存入的字符串，如果它是 JSON，就以对象形式存储，使文件内容“竖起来”
        if (typeof value === 'string') {
            try {
                this.data[key] = JSON.parse(value);
            } catch {
                this.data[key] = value;
            }
        } else {
            this.data[key] = value;
        }
        await this.save();
    }

    async delete(key: string) {
        if (!this.initialized) await this.init();
        delete this.data[key];
        await this.save();
    }

    async list(options: any = {}) {
        if (!this.initialized) await this.init();
        let keys = Object.keys(this.data).map((k) => ({ name: k }));
        if (options.prefix) {
            keys = keys.filter((k) => k.name.startsWith(options.prefix));
        }
        return { keys, list_complete: true };
    }

    async getWithMetadata(key: string, options?: any): Promise<any> {
        const value = await this.get(key, options?.type || 'text');
        return { value, metadata: null };
    }
}

const kv = new NodeKV();
const env = {
    SUB_ONE_KV: kv as any, // Cast to any to bypass strict KVNamespace type check
    // 模拟 D1
    SUB_ONE_D1: new NodeD1(null as any) as any // Placeholder, will be replaced after db init
};

// 解析 Body
app.use(express.raw({ type: '*/*', limit: '50mb' }));

// 适配器：将 Express Request 转换为标准 Request，并将标准 Response 转换回 Express
async function cloudflareAdapter(req: express.Request, res: express.Response, handler: Function) {
    try {
        const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
        const standardRequest = new Request(url, {
            method: req.method,
            headers: req.headers as any,
            body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? req.body : undefined
        });

        // 模拟 Cloudflare Context
        const context = {
            request: standardRequest,
            env: env,
            waitUntil: (p: Promise<any>) => p.catch(console.error),
            next: () => {
                throw new Error('next() not supported in docker mode');
            }
        };

        const response = await handler(standardRequest, env, context);

        // 发送响应
        res.status(response.status);
        response.headers.forEach((value: string, key: string) => {
            res.setHeader(key, value);
        });
        const body = await response.arrayBuffer();
        res.send(Buffer.from(body));
    } catch (err: any) {
        console.error('Adapter Error:', err);
        res.status(500).send(err.message);
    }
}

// 路由
app.all('/api/*', (req: express.Request, res: express.Response) =>
    cloudflareAdapter(req, res, handleApiRequest)
);
app.all('/sub/*', (req: express.Request, res: express.Response) =>
    cloudflareAdapter(req, res, (req: Request, env: any, ctx: any) => handleSubRequest(ctx))
);

// 静态资源处理
const distPath = path.resolve(__dirname, '../dist');

// 适配逻辑：区分订阅请求和前端界面请求
app.get('*', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const url = new URL(req.originalUrl, `http://${req.get('host')}`);
    const pathname = url.pathname;
    const isStaticAsset = /^\/(assets|@vite|src)\//.test(pathname) || /\.\w+$/.test(pathname);
    const hasToken = url.searchParams.has('token');

    // 1. 如果是 API 请求，跳过（交给上面的中间件）
    if (pathname.startsWith('/api/')) return next();

    // 2. 如果是静态资源且路径不等于 /，交给 static 中间件
    if (isStaticAsset && pathname !== '/') return next();

    // 3. 特殊处理：如果是根路径 / 且没有 token，则是 UI 访问
    if (pathname === '/' && !hasToken) {
        return next();
    }

    // 4. 其他所有情况都尝试作为订阅请求处理 (/my/xxx, /sub/xxx, /auto?token=xxx 等)
    console.log(`[Proxy] Handling subscription request: ${pathname}${url.search}`);
    return cloudflareAdapter(req, res, (req: Request, env: any, ctx: any) => handleSubRequest(ctx));
});

// 静态资源目录
app.use(express.static(distPath));

// 所有未捕获路由退回到 index.html (SPA)
app.get('*', (req: express.Request, res: express.Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
});

ensureDataDir().then(() => {
    // 重新连接 D1 实例
    if (db) {
        env.SUB_ONE_D1 = new NodeD1(db) as any;
    }

    app.listen(port, () => {
        console.log(`Sub-One Docker Server running at http://localhost:${port}`);
        console.log(`Data directory: ${DATA_DIR}`);

        // --- Docker 内置定时任务 (Cron) ---
        // 每 6 小时执行一次 (6 * 60 * 60 * 1000)
        // 使用 handleCronTrigger 直接调用逻辑
        console.log('⏰ Starting internal cron scheduler (every 6 hours)...');
        setInterval(
            async () => {
                console.log('⏰ Internal cron scheduler triggered.');
                try {
                    // 构造模拟的 Env 对象
                    const cronEnv = { ...env };
                    // 调用 Cron 逻辑
                    await import('../lib/backend/cron/index').then((m) =>
                        m.handleCronTrigger(cronEnv)
                    );
                } catch (e) {
                    console.error('❌ Internal cron failed:', e);
                }
            },
            6 * 60 * 60 * 1000
        );
    });
});

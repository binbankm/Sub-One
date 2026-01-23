
import express from 'express';
import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { handleApiRequest } from '../lib/backend/api/handlers';
import { handleSubRequest } from '../lib/backend/subscription/handler';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 3055;
const DATA_DIR = path.resolve(process.cwd(), './data');
const KV_FILE = path.join(DATA_DIR, 'kv.json');

// 确保数据目录存在
async function ensureDataDir() {
    try {
        await fs.mkdir(DATA_DIR, { recursive: true });
        try {
            await fs.access(KV_FILE);
        } catch {
            await fs.writeFile(KV_FILE, JSON.stringify({}));
        }
    } catch (err) {
        console.error('Failed to initialize data directory:', err);
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

    private async save() {
        try {
            const tempFile = `${KV_FILE}.tmp`;
            await fs.writeFile(tempFile, JSON.stringify(this.data, null, 2), 'utf-8');
            await fs.rename(tempFile, KV_FILE);
        } catch (err) {
            console.error('KV save error:', err);
        }
    }

    async get(key: string, type: string = 'text') {
        if (!this.initialized) await this.init();
        const val = this.data[key];
        if (val === undefined) return null;

        // 如果请求 JSON 格式
        if (type === 'json') {
            if (typeof val === 'string') {
                try { return JSON.parse(val); } catch { return val; }
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
        let keys = Object.keys(this.data).map(k => ({ name: k }));
        if (options.prefix) {
            keys = keys.filter(k => k.name.startsWith(options.prefix));
        }
        return { keys, list_complete: true };
    }
}

const kv = new NodeKV();
const env = {
    SUB_ONE_KV: kv,
    // 模拟 D1 (暂时不实现完整 SQL 支持，重定向到 KV 以保持兼容)
    SUB_ONE_D1: null,
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
            next: () => { throw new Error('next() not supported in docker mode'); }
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
app.all('/api/*', (req: express.Request, res: express.Response) => cloudflareAdapter(req, res, handleApiRequest));
app.all('/sub/*', (req: express.Request, res: express.Response) => cloudflareAdapter(req, res, (req: Request, env: any, ctx: any) => handleSubRequest(ctx)));

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
    app.listen(port, () => {
        console.log(`Sub-One Docker Server running at http://localhost:${port}`);
        console.log(`Data directory: ${DATA_DIR}`);
    });
});

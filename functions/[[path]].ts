/// <reference types="@cloudflare/workers-types" />
import { handleApiRequest } from '../lib/backend/api/handlers';
import { handleSubRequest } from '../lib/backend/subscription/handler';
import { Env } from '../lib/backend/types';

// --- Cloudflare Pages Functions 主入口 ---
export async function onRequest(context: EventContext<Env, any, any>) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    if (url.pathname.startsWith('/api/')) {
        const response = await handleApiRequest(request, env);
        return response;
    }

    const isStaticAsset =
        /^\/(assets|@vite|src)\/./.test(url.pathname) || /\.\w+$/.test(url.pathname);

    // UI Vue Router 前端单页路由白名单，拦截后交由静态文件（index.html）处理
    const frontendRoutes = ['/dashboard', '/subscriptions', '/profiles', '/nodes', '/login'];
    const normalizedPath = url.pathname.replace(/\/+$/, '') || '/';
    if (normalizedPath === '/' || frontendRoutes.includes(normalizedPath)) {
        // 对前端路由返回首页，支持 SPA 刷新
        return env.ASSETS.fetch(new Request(new URL('/', request.url)));
    }

    if (!isStaticAsset && url.pathname !== '/') {
        try {
            return await handleSubRequest(context);
        } catch (err: any) {
            console.error('[Top Level Error]', err);
            return new Response(`Internal Server Error`, { status: 500 });
        }
    }

    return next();
}

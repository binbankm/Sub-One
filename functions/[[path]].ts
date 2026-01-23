
/// <reference types="@cloudflare/workers-types" />

import { Env } from '../lib/backend/types';
import { handleCronTrigger } from '../lib/backend/cron';
import { handleApiRequest } from '../lib/backend/api/handlers';
import { handleSubRequest } from '../lib/backend/subscription/handler';

// --- Cloudflare Pages Functions 主入口 ---
export async function onRequest(context: EventContext<Env, any, any>) {
    const { request, env, next } = context;
    const url = new URL(request.url);

    // 核心修改：判斷是否為定時觸發
    if (request.headers.get("cf-cron")) {
        return handleCronTrigger(env);
    }

    if (url.pathname.startsWith('/api/')) {
        const response = await handleApiRequest(request, env);
        return response;
    }

    const isStaticAsset = /^\/(assets|@vite|src)\/./.test(url.pathname) || /\.\w+$/.test(url.pathname);
    if (!isStaticAsset && url.pathname !== '/') {
        try {
            return await handleSubRequest(context);
        } catch (err: any) {
            console.error('[Top Level Error]', err);
            return new Response(`Internal Server Error: ${err.message}\nCall Stack: ${err.stack}`, { status: 500 });
        }
    }

    return next();
}

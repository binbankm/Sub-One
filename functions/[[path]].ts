
/// <reference types="@cloudflare/workers-types" />

import { Env } from '../lib/backend/types';

import { handleApiRequest } from '../lib/backend/api/handlers';
import { handleSubRequest } from '../lib/backend/subscription/handler';

// --- Cloudflare Pages Functions 主入口 ---
export async function onRequest(context: EventContext<Env, any, any>) {
    const { request, env, next } = context;
    const url = new URL(request.url);



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
            return new Response(`Internal Server Error`, { status: 500 });
        }
    }

    return next();
}

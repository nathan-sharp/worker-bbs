import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { D1Database, R2Bucket, Fetcher } from '@cloudflare/workers-types';
import boardsRouter from './api/boards';
import threadsRouter from './api/threads';
import postsRouter from './api/posts';
import mediaRouter from './api/media';
import adminRouter from './api/admin';
import setupRouter, { runAutoSetup } from './api/setup';
import { runRetentionPrune } from './utils/retention';

type Bindings = {
  BBS_DB: D1Database;
  BBS_BUCKET: R2Bucket;
  ADMIN_KEY: string;
  SITE_TITLE: string;
  RATE_LIMIT_SECONDS: string;
  ASSETS?: Fetcher;
};

const app = new Hono<{ Bindings: Bindings }>();

// Enable CORS for API routes
app.use('/api/*', cors({
  origin: '*',
  allowHeaders: ['Content-Type', 'Authorization', 'X-Admin-Key', 'cf-connecting-ip'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
}));

// Lazy auto-setup and retention pruning on first API access
let setupChecked = false;
app.use('/api/*', async (c, next) => {
  if (!setupChecked && c.env.BBS_DB) {
    setupChecked = true;
    await runAutoSetup(c.env.BBS_DB);
  }
  if (c.env.BBS_DB) {
    // Run throttled background pruning without delaying HTTP response
    try {
      c.executionCtx?.waitUntil(runRetentionPrune(c.env.BBS_DB));
    } catch {
      // Ignore if executionCtx is unavailable in certain testenvs
    }
  }
  await next();
});

// Mount API Routers
app.route('/api/boards', boardsRouter);
app.route('/api/boards', threadsRouter);
app.route('/api', postsRouter);
app.route('/api/media', mediaRouter);
app.route('/api/admin', adminRouter);
app.route('/api/setup', setupRouter);

app.get('/api/health', (c) => {
  return c.json({ status: 'ok', time: Date.now(), site_title: c.env.SITE_TITLE || 'WorkerBBS' });
});

// Static Asset & SPA Routing
app.get('*', async (c) => {
  if (c.env.ASSETS) {
    const assetRes = await c.env.ASSETS.fetch(c.req.raw as any);
    if (assetRes.status !== 404) {
      return new Response(assetRes.body as any, assetRes as any);
    }
    // SPA fallback to index.html for client-side routes like /tech/ or /meta/catalog
    const url = new URL(c.req.url);
    const indexReq = new Request(new URL('/', url.origin).toString(), c.req.raw as any);
    const fallbackRes = await c.env.ASSETS.fetch(indexReq as any);
    return new Response(fallbackRes.body as any, fallbackRes as any);
  }
  return c.text('WorkerBBS Edge Backend API - Please build the Vite SPA and deploy with static assets enabled.', 200);
});

export default {
  fetch: app.fetch,
  scheduled: async (event: any, env: Bindings, ctx: any) => {
    if (env.BBS_DB) {
      ctx.waitUntil(runRetentionPrune(env.BBS_DB, true));
    }
  },
};

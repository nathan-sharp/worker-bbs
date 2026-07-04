import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';
import { getBoards, getBoard } from '../db/queries';

type Bindings = {
  BBS_DB: D1Database;
  ADMIN_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/', async (c) => {
  try {
    const boards = await getBoards(c.env.BBS_DB);
    return c.json({ success: true, boards });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/:slug', async (c) => {
  try {
    const slug = c.req.param('slug');
    const board = await getBoard(c.env.BBS_DB, slug);
    if (!board) {
      return c.json({ success: false, error: 'Board not found' }, 404);
    }
    return c.json({ success: true, board });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/', async (c) => {
  try {
    const adminKey = c.req.header('X-Admin-Key') || c.req.header('Authorization')?.replace('Bearer ', '');
    if (!adminKey || adminKey !== (c.env.ADMIN_KEY || 'admin123')) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const { id, title, subtitle, description, nsfw } = body;

    if (!id || !title) {
      return c.json({ success: false, error: 'id and title are required' }, 400);
    }

    const cleanId = id.toLowerCase().replace(/[^a-z0-9]/g, '');
    const now = Date.now();

    await c.env.BBS_DB
      .prepare('INSERT INTO boards (id, title, subtitle, description, nsfw, max_threads, bump_limit, created_at) VALUES (?, ?, ?, ?, ?, 50, 300, ?)')
      .bind(cleanId, title, subtitle || null, description || null, nsfw ? 1 : 0, now)
      .run();

    const newBoard = await getBoard(c.env.BBS_DB, cleanId);
    return c.json({ success: true, board: newBoard }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;

import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';
import { deletePost, toggleSticky, toggleLock, getPost } from '../db/queries';
import { Ban } from '../db/schema';
import { getRetentionPolicy, setRetentionPolicy, runRetentionPrune } from '../utils/retention';

type Bindings = {
  BBS_DB: D1Database;
  ADMIN_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Middleware to check Admin Key
app.use('*', async (c, next) => {
  const adminKey = c.req.header('X-Admin-Key') || c.req.header('Authorization')?.replace('Bearer ', '');
  if (!adminKey || adminKey !== (c.env.ADMIN_KEY || 'admin123')) {
    return c.json({ success: false, error: 'Unauthorized Admin Access' }, 401);
  }
  await next();
});

app.get('/stats', async (c) => {
  try {
    const boardsCount = await c.env.BBS_DB.prepare('SELECT count(*) as count FROM boards').first<{ count: number }>();
    const threadsCount = await c.env.BBS_DB.prepare('SELECT count(*) as count FROM threads').first<{ count: number }>();
    const postsCount = await c.env.BBS_DB.prepare('SELECT count(*) as count FROM posts').first<{ count: number }>();
    const bansCount = await c.env.BBS_DB.prepare('SELECT count(*) as count FROM bans WHERE expires_at > ?').bind(Date.now()).first<{ count: number }>();

    return c.json({
      success: true,
      stats: {
        boards: boardsCount?.count || 0,
        threads: threadsCount?.count || 0,
        posts: postsCount?.count || 0,
        active_bans: bansCount?.count || 0,
      },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.delete('/posts/:id', async (c) => {
  try {
    const postId = parseInt(c.req.param('id'), 10);
    if (isNaN(postId)) {
      return c.json({ success: false, error: 'Invalid post ID' }, 400);
    }

    const res = await deletePost(c.env.BBS_DB, postId);
    if (!res.success) {
      return c.json({ success: false, error: 'Post not found' }, 404);
    }

    return c.json({ success: true, threadDeleted: res.threadDeleted });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/threads/:id/sticky', async (c) => {
  try {
    const threadId = parseInt(c.req.param('id'), 10);
    const success = await toggleSticky(c.env.BBS_DB, threadId);
    if (!success) {
      return c.json({ success: false, error: 'Thread not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/threads/:id/lock', async (c) => {
  try {
    const threadId = parseInt(c.req.param('id'), 10);
    const success = await toggleLock(c.env.BBS_DB, threadId);
    if (!success) {
      return c.json({ success: false, error: 'Thread not found' }, 404);
    }
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/ban', async (c) => {
  try {
    const body = await c.req.json();
    const { ip_hash, reason, duration_hours, board_id, post_id, append_notice } = body;

    if (!ip_hash) {
      return c.json({ success: false, error: 'ip_hash is required' }, 400);
    }

    const now = Date.now();
    const durationHours = parseInt(duration_hours || '24', 10);
    const expiresAt = now + durationHours * 60 * 60 * 1000;

    await c.env.BBS_DB
      .prepare('INSERT INTO bans (ip_hash, reason, board_id, expires_at, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(ip_hash, reason || 'Violation of rules', board_id || null, expiresAt, now)
      .run();

    if (post_id && append_notice) {
      const post = await getPost(c.env.BBS_DB, parseInt(post_id, 10));
      if (post && post.comment) {
        const banNotice = '\n\n(USER WAS BANNED FOR THIS POST)';
        if (!post.comment.includes(banNotice)) {
          await c.env.BBS_DB
            .prepare('UPDATE posts SET comment = ? WHERE id = ?')
            .bind(post.comment + banNotice, post.id)
            .run();
        }
      }
    }

    return c.json({ success: true }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/bans', async (c) => {
  try {
    const { results } = await c.env.BBS_DB
      .prepare('SELECT * FROM bans ORDER BY id DESC LIMIT 50')
      .all<Ban>();
    return c.json({ success: true, bans: results || [] });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.delete('/bans/:id', async (c) => {
  try {
    const banId = parseInt(c.req.param('id'), 10);
    await c.env.BBS_DB.prepare('DELETE FROM bans WHERE id = ?').bind(banId).run();
    return c.json({ success: true });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/retention', async (c) => {
  try {
    const policy = await getRetentionPolicy(c.env.BBS_DB);
    return c.json({ success: true, policy });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/retention', async (c) => {
  try {
    const body = (await c.req.json()) as any;
    const global_hours = parseInt(body.global_hours, 10) || 0;
    const board_overrides = body.board_overrides || {};
    const success = await setRetentionPolicy(c.env.BBS_DB, { global_hours, board_overrides });
    if (!success) {
      return c.json({ success: false, error: 'Failed to update retention policy' }, 500);
    }
    return c.json({ success: true, policy: { global_hours, board_overrides } });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/prune', async (c) => {
  try {
    const result = await runRetentionPrune(c.env.BBS_DB, true);
    return c.json({ success: true, result });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;

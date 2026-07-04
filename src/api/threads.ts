import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';
import { getThreadsWithRecentPosts, getCatalog, createThread, checkBan, getBoard } from '../db/queries';
import { generateTripcode } from '../utils/tripcode';
import { generatePosterHash, generateBanHash } from '../utils/ipHash';

type Bindings = {
  BBS_DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/:slug/threads', async (c) => {
  try {
    const slug = c.req.param('slug');
    const page = parseInt(c.req.query('page') || '1', 10);
    const limit = parseInt(c.req.query('limit') || '10', 10);

    const board = await getBoard(c.env.BBS_DB, slug);
    if (!board) {
      return c.json({ success: false, error: 'Board not found' }, 404);
    }

    const threads = await getThreadsWithRecentPosts(c.env.BBS_DB, slug, page, limit);
    return c.json({ success: true, board, threads, page });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/:slug/catalog', async (c) => {
  try {
    const slug = c.req.param('slug');
    const board = await getBoard(c.env.BBS_DB, slug);
    if (!board) {
      return c.json({ success: false, error: 'Board not found' }, 404);
    }

    const catalog = await getCatalog(c.env.BBS_DB, slug);
    return c.json({ success: true, board, catalog });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/:slug/threads', async (c) => {
  try {
    const slug = c.req.param('slug');
    const board = await getBoard(c.env.BBS_DB, slug);
    if (!board) {
      return c.json({ success: false, error: 'Board not found' }, 404);
    }

    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
    const ipHash = await generateBanHash(ip);
    const ban = await checkBan(c.env.BBS_DB, ipHash, slug);
    if (ban) {
      return c.json({ success: false, error: `You are banned: ${ban.reason || 'No reason provided'}` }, 403);
    }

    const body = await c.req.json();
    const { subject, comment, author_name, file_url, file_name, file_size, file_width, file_height, file_type } = body;

    if (!subject || !subject.trim()) {
      return c.json({ success: false, error: 'Subject is required' }, 400);
    }
    if (!comment && !file_url) {
      return c.json({ success: false, error: 'Either a comment or file attachment is required' }, 400);
    }

    const { name, tripcode } = await generateTripcode(author_name || 'Anonymous');
    const posterHash = await generatePosterHash(ip, slug);

    const { threadId, postId } = await createThread(c.env.BBS_DB, slug, subject.trim(), {
      author_name: name,
      tripcode,
      poster_hash: posterHash,
      comment: comment ? comment.trim() : null,
      file_url: file_url || null,
      file_name: file_name || null,
      file_size: file_size || null,
      file_width: file_width || null,
      file_height: file_height || null,
      file_type: file_type || null,
      ip_hash: ipHash,
    });

    return c.json({ success: true, thread_id: threadId, post_id: postId }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;

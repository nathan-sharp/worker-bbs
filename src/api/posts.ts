import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';
import { getThread, createReply, checkBan, getPost, getBoard } from '../db/queries';
import { generateTripcode } from '../utils/tripcode';
import { generatePosterHash, generateBanHash } from '../utils/ipHash';

type Bindings = {
  BBS_DB: D1Database;
};

const app = new Hono<{ Bindings: Bindings }>();

app.get('/threads/:id/posts', async (c) => {
  try {
    const threadId = parseInt(c.req.param('id'), 10);
    if (isNaN(threadId)) {
      return c.json({ success: false, error: 'Invalid thread ID' }, 400);
    }

    const data = await getThread(c.env.BBS_DB, threadId);
    if (!data) {
      return c.json({ success: false, error: 'Thread not found' }, 404);
    }

    return c.json({ success: true, thread: data.thread, posts: data.posts });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.post('/threads/:id/replies', async (c) => {
  try {
    const threadId = parseInt(c.req.param('id'), 10);
    if (isNaN(threadId)) {
      return c.json({ success: false, error: 'Invalid thread ID' }, 400);
    }

    const threadData = await getThread(c.env.BBS_DB, threadId);
    if (!threadData) {
      return c.json({ success: false, error: 'Thread not found' }, 404);
    }
    if (threadData.thread.locked === 1) {
      return c.json({ success: false, error: 'Thread is locked' }, 403);
    }

    const board = await getBoard(c.env.BBS_DB, threadData.thread.board_id);
    const bumpLimit = board ? board.bump_limit : 300;

    const ip = c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || '127.0.0.1';
    const ipHash = await generateBanHash(ip);
    const ban = await checkBan(c.env.BBS_DB, ipHash, threadData.thread.board_id);
    if (ban) {
      return c.json({ success: false, error: `You are banned: ${ban.reason || 'No reason provided'}` }, 403);
    }

    const body = await c.req.json();
    const { comment, author_name, sage, file_url, file_name, file_size, file_width, file_height, file_type } = body;

    if (!comment && !file_url) {
      return c.json({ success: false, error: 'Either a comment or file attachment is required' }, 400);
    }

    const { name, tripcode } = await generateTripcode(author_name || 'Anonymous');
    const posterHash = await generatePosterHash(ip, threadData.thread.board_id);

    const postId = await createReply(
      c.env.BBS_DB,
      threadId,
      threadData.thread.board_id,
      {
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
        sage: sage ? 1 : 0,
      },
      bumpLimit
    );

    return c.json({ success: true, post_id: postId }, 201);
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

app.get('/posts/:id', async (c) => {
  try {
    const postId = parseInt(c.req.param('id'), 10);
    if (isNaN(postId)) {
      return c.json({ success: false, error: 'Invalid post ID' }, 400);
    }

    const post = await getPost(c.env.BBS_DB, postId);
    if (!post) {
      return c.json({ success: false, error: 'Post not found' }, 404);
    }

    return c.json({ success: true, post });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;

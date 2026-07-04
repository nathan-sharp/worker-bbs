import { D1Database } from '@cloudflare/workers-types';
import { Board, Thread, Post, Ban, ThreadWithOP, CatalogItem } from './schema';

export async function getBoards(db: D1Database): Promise<Board[]> {
  const { results } = await db.prepare('SELECT * FROM boards ORDER BY id ASC').all<Board>();
  return results || [];
}

export async function getBoard(db: D1Database, slug: string): Promise<Board | null> {
  return await db.prepare('SELECT * FROM boards WHERE id = ?').bind(slug).first<Board>();
}

export async function getThreadsWithRecentPosts(
  db: D1Database,
  boardId: string,
  page: number = 1,
  limit: number = 10
): Promise<ThreadWithOP[]> {
  const offset = (page - 1) * limit;
  const { results: threads } = await db
    .prepare('SELECT * FROM threads WHERE board_id = ? ORDER BY sticky DESC, bumped_at DESC LIMIT ? OFFSET ?')
    .bind(boardId, limit, offset)
    .all<Thread>();

  if (!threads || threads.length === 0) return [];

  const threadsWithPosts: ThreadWithOP[] = [];
  for (const thread of threads) {
    const op = await db
      .prepare('SELECT * FROM posts WHERE thread_id = ? AND is_op = 1 ORDER BY id ASC LIMIT 1')
      .bind(thread.id)
      .first<Post>();

    const { results: recent } = await db
      .prepare('SELECT * FROM posts WHERE thread_id = ? AND is_op = 0 ORDER BY id DESC LIMIT 5')
      .bind(thread.id)
      .all<Post>();

    threadsWithPosts.push({
      ...thread,
      op_post: op || undefined,
      recent_posts: recent ? recent.reverse() : [],
    });
  }

  return threadsWithPosts;
}

export async function getCatalog(db: D1Database, boardId: string): Promise<CatalogItem[]> {
  const { results: threads } = await db
    .prepare('SELECT * FROM threads WHERE board_id = ? ORDER BY sticky DESC, bumped_at DESC')
    .bind(boardId)
    .all<Thread>();

  if (!threads || threads.length === 0) return [];

  const catalog: CatalogItem[] = [];
  for (const thread of threads) {
    const op = await db
      .prepare('SELECT * FROM posts WHERE thread_id = ? AND is_op = 1 ORDER BY id ASC LIMIT 1')
      .bind(thread.id)
      .first<Post>();

    catalog.push({
      ...thread,
      op_post: op || undefined,
    });
  }

  return catalog;
}

export async function getThread(db: D1Database, threadId: number): Promise<{ thread: Thread; posts: Post[] } | null> {
  const thread = await db.prepare('SELECT * FROM threads WHERE id = ?').bind(threadId).first<Thread>();
  if (!thread) return null;

  const { results: posts } = await db
    .prepare('SELECT * FROM posts WHERE thread_id = ? ORDER BY id ASC')
    .bind(threadId)
    .all<Post>();

  return { thread, posts: posts || [] };
}

export async function createThread(
  db: D1Database,
  boardId: string,
  subject: string,
  postData: Partial<Post>
): Promise<{ threadId: number; postId: number }> {
  const now = Date.now();
  const threadRes = await db
    .prepare(
      'INSERT INTO threads (board_id, subject, sticky, locked, post_count, image_count, created_at, bumped_at) VALUES (?, ?, 0, 0, 1, ?, ?, ?) RETURNING id'
    )
    .bind(boardId, subject, postData.file_url ? 1 : 0, now, now)
    .first<{ id: number }>();

  if (!threadRes) throw new Error('Failed to create thread');
  const threadId = threadRes.id;

  const postRes = await db
    .prepare(
      `INSERT INTO posts (thread_id, board_id, is_op, author_name, tripcode, poster_hash, comment, file_url, file_name, file_size, file_width, file_height, file_type, ip_hash, sage, created_at)
       VALUES (?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?) RETURNING id`
    )
    .bind(
      threadId,
      boardId,
      postData.author_name || 'Anonymous',
      postData.tripcode || null,
      postData.poster_hash || null,
      postData.comment || null,
      postData.file_url || null,
      postData.file_name || null,
      postData.file_size || null,
      postData.file_width || null,
      postData.file_height || null,
      postData.file_type || null,
      postData.ip_hash || null,
      now
    )
    .first<{ id: number }>();

  if (!postRes) throw new Error('Failed to create OP post');
  return { threadId, postId: postRes.id };
}

export async function createReply(
  db: D1Database,
  threadId: number,
  boardId: string,
  postData: Partial<Post>,
  bumpLimit: number = 300
): Promise<number> {
  const now = Date.now();
  const thread = await db.prepare('SELECT * FROM threads WHERE id = ?').bind(threadId).first<Thread>();
  if (!thread) throw new Error('Thread not found');
  if (thread.locked === 1) throw new Error('Thread is locked');

  const postRes = await db
    .prepare(
      `INSERT INTO posts (thread_id, board_id, is_op, author_name, tripcode, poster_hash, comment, file_url, file_name, file_size, file_width, file_height, file_type, ip_hash, sage, created_at)
       VALUES (?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) RETURNING id`
    )
    .bind(
      threadId,
      boardId,
      postData.author_name || 'Anonymous',
      postData.tripcode || null,
      postData.poster_hash || null,
      postData.comment || null,
      postData.file_url || null,
      postData.file_name || null,
      postData.file_size || null,
      postData.file_width || null,
      postData.file_height || null,
      postData.file_type || null,
      postData.ip_hash || null,
      postData.sage || 0,
      now
    )
    .first<{ id: number }>();

  if (!postRes) throw new Error('Failed to create reply');

  const newPostCount = thread.post_count + 1;
  const newImageCount = thread.image_count + (postData.file_url ? 1 : 0);
  const shouldBump = !postData.sage && newPostCount <= bumpLimit;

  if (shouldBump) {
    await db
      .prepare('UPDATE threads SET post_count = ?, image_count = ?, bumped_at = ? WHERE id = ?')
      .bind(newPostCount, newImageCount, now, threadId)
      .run();
  } else {
    await db
      .prepare('UPDATE threads SET post_count = ?, image_count = ? WHERE id = ?')
      .bind(newPostCount, newImageCount, threadId)
      .run();
  }

  return postRes.id;
}

export async function getPost(db: D1Database, postId: number): Promise<Post | null> {
  return await db.prepare('SELECT * FROM posts WHERE id = ?').bind(postId).first<Post>();
}

export async function checkBan(db: D1Database, ipHash: string, boardId?: string): Promise<Ban | null> {
  const now = Date.now();
  if (boardId) {
    return await db
      .prepare('SELECT * FROM bans WHERE ip_hash = ? AND (board_id IS NULL OR board_id = ?) AND expires_at > ?')
      .bind(ipHash, boardId, now)
      .first<Ban>();
  }
  return await db
    .prepare('SELECT * FROM bans WHERE ip_hash = ? AND expires_at > ?')
    .bind(ipHash, now)
    .first<Ban>();
}

export async function deletePost(db: D1Database, postId: number): Promise<{ success: boolean; threadDeleted: boolean }> {
  const post = await getPost(db, postId);
  if (!post) return { success: false, threadDeleted: false };

  if (post.is_op === 1) {
    await db.prepare('DELETE FROM threads WHERE id = ?').bind(post.thread_id).run();
    return { success: true, threadDeleted: true };
  } else {
    await db.prepare('DELETE FROM posts WHERE id = ?').bind(postId).run();
    const thread = await db.prepare('SELECT * FROM threads WHERE id = ?').bind(post.thread_id).first<Thread>();
    if (thread) {
      await db
        .prepare('UPDATE threads SET post_count = max(0, post_count - 1), image_count = max(0, image_count - ?) WHERE id = ?')
        .bind(post.file_url ? 1 : 0, post.thread_id)
        .run();
    }
    return { success: true, threadDeleted: false };
  }
}

export async function deleteThread(db: D1Database, threadId: number): Promise<boolean> {
  const res = await db.prepare('DELETE FROM threads WHERE id = ?').bind(threadId).run();
  return res.success;
}

export async function toggleSticky(db: D1Database, threadId: number): Promise<boolean> {
  const thread = await db.prepare('SELECT sticky FROM threads WHERE id = ?').bind(threadId).first<{ sticky: number }>();
  if (!thread) return false;
  const newSticky = thread.sticky === 1 ? 0 : 1;
  await db.prepare('UPDATE threads SET sticky = ? WHERE id = ?').bind(newSticky, threadId).run();
  return true;
}

export async function toggleLock(db: D1Database, threadId: number): Promise<boolean> {
  const thread = await db.prepare('SELECT locked FROM threads WHERE id = ?').bind(threadId).first<{ locked: number }>();
  if (!thread) return false;
  const newLock = thread.locked === 1 ? 0 : 1;
  await db.prepare('UPDATE threads SET locked = ? WHERE id = ?').bind(newLock, threadId).run();
  return true;
}

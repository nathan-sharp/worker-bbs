import { D1Database } from '@cloudflare/workers-types';

export interface RetentionPolicy {
  global_hours: number;
  board_overrides: Record<string, number>;
}

export interface PruneResult {
  threads_deleted: number;
  posts_deleted: number;
  pruned_at: number;
}

// Ensure site_settings table exists
export async function ensureSettingsTable(db: D1Database): Promise<void> {
  await db.prepare(`
    CREATE TABLE IF NOT EXISTS site_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )
  `).run();
}

export async function getRetentionPolicy(db: D1Database): Promise<RetentionPolicy> {
  await ensureSettingsTable(db);
  const rows = await db.prepare("SELECT key, value FROM site_settings WHERE key LIKE 'retention_%'").all<{ key: string; value: string }>();
  
  let global_hours = 720; // Default to 30 days (720 hours)
  const board_overrides: Record<string, number> = {};

  if (rows && rows.results) {
    for (const row of rows.results) {
      if (row.key === 'retention_global') {
        const parsed = parseInt(row.value, 10);
        if (!isNaN(parsed)) {
          global_hours = parsed;
        }
      } else if (row.key.startsWith('retention_board_')) {
        const boardId = row.key.replace('retention_board_', '');
        board_overrides[boardId] = parseInt(row.value, 10) || 0;
      }
    }
  }

  return { global_hours, board_overrides };
}

export async function setRetentionPolicy(db: D1Database, policy: RetentionPolicy): Promise<boolean> {
  await ensureSettingsTable(db);
  try {
    await db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES ('retention_global', ?)").bind(policy.global_hours.toString()).run();
    
    // Clear old board overrides
    await db.prepare("DELETE FROM site_settings WHERE key LIKE 'retention_board_%'").run();

    for (const [boardId, hours] of Object.entries(policy.board_overrides)) {
      if (hours > 0) {
        await db.prepare("INSERT OR REPLACE INTO site_settings (key, value) VALUES (?, ?)")
          .bind(`retention_board_${boardId}`, hours.toString())
          .run();
      }
    }
    return true;
  } catch (error) {
    console.error('Error setting retention policy:', error);
    return false;
  }
}

// In-memory throttle for lazy pruning
let lastPruneTime = 0;
const PRUNE_THROTTLE_MS = 60 * 1000; // run at most once per minute

export async function runRetentionPrune(db: D1Database, force = false): Promise<PruneResult> {
  const now = Date.now();
  if (!force && now - lastPruneTime < PRUNE_THROTTLE_MS) {
    return { threads_deleted: 0, posts_deleted: 0, pruned_at: lastPruneTime };
  }
  lastPruneTime = now;

  const policy = await getRetentionPolicy(db);
  const boardsRes = await db.prepare("SELECT id FROM boards").all<{ id: string }>();
  const boards = boardsRes.results || [];

  let totalThreadsDeleted = 0;
  let totalPostsDeleted = 0;

  for (const board of boards) {
    const hours = policy.board_overrides[board.id] !== undefined ? policy.board_overrides[board.id] : policy.global_hours;
    if (hours <= 0) continue; // 0 means keep forever

    const cutoffMs = now - (hours * 3600 * 1000);

    // 1. Delete non-sticky threads older than cutoff (ON DELETE CASCADE removes their posts)
    const delThreads = await db.prepare("DELETE FROM threads WHERE board_id = ? AND sticky = 0 AND created_at < ?")
      .bind(board.id, cutoffMs)
      .run();
    if (delThreads.meta && delThreads.meta.changes) {
      totalThreadsDeleted += delThreads.meta.changes;
    }

    // 2. Delete reply posts (is_op = 0) older than cutoff even in sticky threads
    const delPosts = await db.prepare("DELETE FROM posts WHERE board_id = ? AND is_op = 0 AND created_at < ?")
      .bind(board.id, cutoffMs)
      .run();
    if (delPosts.meta && delPosts.meta.changes) {
      totalPostsDeleted += delPosts.meta.changes;
    }
  }

  if (totalThreadsDeleted > 0 || totalPostsDeleted > 0) {
    console.log(`[Retention Policy] Pruned ${totalThreadsDeleted} threads and ${totalPostsDeleted} posts.`);
  }

  return {
    threads_deleted: totalThreadsDeleted,
    posts_deleted: totalPostsDeleted,
    pruned_at: now
  };
}

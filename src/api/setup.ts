import { Hono } from 'hono';
import { D1Database } from '@cloudflare/workers-types';

type Bindings = {
  BBS_DB: D1Database;
  ADMIN_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

export async function runAutoSetup(db: D1Database): Promise<boolean> {
  try {
    const tableStatements = [
      `CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        subtitle TEXT,
        description TEXT,
        nsfw INTEGER DEFAULT 0,
        max_threads INTEGER DEFAULT 50,
        bump_limit INTEGER DEFAULT 300,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS threads (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        board_id TEXT NOT NULL,
        subject TEXT NOT NULL,
        sticky INTEGER DEFAULT 0,
        locked INTEGER DEFAULT 0,
        post_count INTEGER DEFAULT 1,
        image_count INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        bumped_at INTEGER NOT NULL,
        FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        thread_id INTEGER NOT NULL,
        board_id TEXT NOT NULL,
        is_op INTEGER DEFAULT 0,
        author_name TEXT DEFAULT 'Anonymous',
        tripcode TEXT,
        poster_hash TEXT,
        comment TEXT,
        file_url TEXT,
        file_name TEXT,
        file_size INTEGER,
        file_width INTEGER,
        file_height INTEGER,
        file_type TEXT,
        ip_hash TEXT,
        sage INTEGER DEFAULT 0,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE
      )`,
      `CREATE TABLE IF NOT EXISTS bans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ip_hash TEXT NOT NULL,
        reason TEXT,
        board_id TEXT,
        post_id INTEGER,
        expires_at INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS mod_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        target_type TEXT,
        target_id TEXT,
        details TEXT,
        created_at INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_threads_board_bumped ON threads (board_id, sticky DESC, bumped_at DESC)`,
      `CREATE INDEX IF NOT EXISTS idx_posts_thread ON posts (thread_id, id ASC)`,
      `CREATE INDEX IF NOT EXISTS idx_bans_ip_hash ON bans (ip_hash)`
    ];

    for (const stmt of tableStatements) {
      await db.prepare(stmt).run();
    }

    const boardCheck = await db.prepare('SELECT count(*) as count FROM boards').first<{ count: number }>();
    if (!boardCheck || boardCheck.count === 0) {
      const now = Date.now();
      const seedStatements = [
        `INSERT INTO boards (id, title, subtitle, description, nsfw, max_threads, bump_limit, created_at) VALUES
        ('tech', 'Technology & Code', 'Programming, servers, and Cloudflare Workers', 'Discuss software development, hardware, edge computing, and self-hosted infrastructure.', 0, 50, 300, ${now}),
        ('meta', 'Site Discussion & Feedback', 'BBS administration, bug reports, and features', 'Feedback, feature requests, and meta discussions about this Worker-powered imageboard.', 0, 50, 300, ${now}),
        ('rnd', 'Random & Memes', 'Anything goes', 'General discussion, internet culture, and random thoughts. Keep it civilized!', 0, 50, 300, ${now}),
        ('art', 'Creative Arts & Media', 'Digital art, music, photography, and design', 'Share your creative projects, graphics, artwork, and aesthetic setups.', 0, 50, 300, ${now})`,
        `INSERT INTO threads (id, board_id, subject, sticky, locked, post_count, image_count, created_at, bumped_at) VALUES
        (1, 'tech', 'Welcome to WorkerBBS! 🚀', 1, 0, 3, 1, ${now}, ${now + 100000})`,
        `INSERT INTO posts (id, thread_id, board_id, is_op, author_name, tripcode, poster_hash, comment, file_url, file_name, file_size, file_width, file_height, file_type, ip_hash, sage, created_at) VALUES
        (1, 1, 'tech', 1, 'Anonymous', '!AdminBBS', 'ID:8f2aK1c', 'Welcome to the official WorkerBBS deployment! 🚀\n\nThis entire imageboard is running serverless on **Cloudflare Workers**, stored in **Cloudflare D1 (SQLite)**, and uses **R2 Object Storage** for media attachments.\n\n>Zero server cost on free tier\n>Global edge low-latency caching\n>Authentic classic Yotsuba aesthetics\n\nFeel free to reply, test out tripcodes (\`Name#secret\`), greentext (\`>quote\`), and image attachments!', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80', 'edge-cloud.jpg', 124000, 800, 600, 'image/jpeg', 'hash_admin', 0, ${now}),
        (2, 1, 'tech', 0, 'Anonymous', NULL, 'ID:3c9pL8z', '>>1\nThis is incredible! How fast are D1 queries on edge?', NULL, NULL, NULL, NULL, NULL, NULL, 'hash_user1', 0, ${now + 50000}),
        (3, 1, 'tech', 0, 'Anonymous', '!AdminBBS', 'ID:8f2aK1c', '>>2\nSuper fast! Sub-10ms query execution globally because SQLite runs right alongside the worker compute node.', NULL, NULL, NULL, NULL, NULL, NULL, 'hash_admin', 0, ${now + 100000})`,
        `INSERT INTO threads (id, board_id, subject, sticky, locked, post_count, image_count, created_at, bumped_at) VALUES
        (2, 'meta', 'How to Use Tripcodes & Formatting', 1, 0, 2, 0, ${now + 200000}, ${now + 250000})`,
        `INSERT INTO posts (id, thread_id, board_id, is_op, author_name, tripcode, poster_hash, comment, file_url, file_name, file_size, file_width, file_height, file_type, ip_hash, sage, created_at) VALUES
        (4, 2, 'meta', 1, 'Anonymous', '!AdminBBS', 'ID:8f2aK1c', 'Here is a quick guide on how to use WorkerBBS formatting:\n\n**Tripcodes:**\nType \`YourName#secretword\` in the Name field. It will display as \`YourName !tripcode\` so others can verify your identity!\n\n**Greentext:**\nStart any line with \`>\` like this:\n>be me\n>hosting an imageboard for $0/month on Cloudflare\n>life is good\n\n**Quotes:**\nType \`>>postnumber\` (e.g., \`>>1\` or \`>>4\`) to link to a post. Hovering over it will pop up a preview!', NULL, NULL, NULL, NULL, NULL, NULL, 'hash_admin', 0, ${now + 200000}),
        (5, 2, 'meta', 0, 'AnonTester', '!3x9aKz7Q', 'ID:1a2b3c4', '>>4\n>testing greentext and tripcodes\nIt works! Sweet!', NULL, NULL, NULL, NULL, NULL, NULL, 'hash_user2', 0, ${now + 250000})`
      ];

      for (const stmt of seedStatements) {
        await db.prepare(stmt).run();
      }
    }
    return true;
  } catch (error) {
    console.error('Auto setup error:', error);
    return false;
  }
}

app.post('/', async (c) => {
  try {
    const adminKey = c.req.header('X-Admin-Key') || c.req.header('Authorization')?.replace('Bearer ', '');
    if (!adminKey || adminKey !== (c.env.ADMIN_KEY || 'admin123')) {
      return c.json({ success: false, error: 'Unauthorized Admin Access' }, 401);
    }

    const success = await runAutoSetup(c.env.BBS_DB);
    if (!success) {
      return c.json({ success: false, error: 'Setup failed' }, 500);
    }
    return c.json({ success: true, message: 'Database initialized and seeded successfully' });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;

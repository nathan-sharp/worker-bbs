-- Cloudflare Worker BBS Database Schema (SQLite / D1)

DROP TABLE IF EXISTS mod_logs;
DROP TABLE IF EXISTS bans;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS threads;
DROP TABLE IF EXISTS boards;

CREATE TABLE boards (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  nsfw INTEGER DEFAULT 0,
  max_threads INTEGER DEFAULT 50,
  bump_limit INTEGER DEFAULT 300,
  created_at INTEGER NOT NULL
);

CREATE TABLE threads (
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
);

CREATE TABLE posts (
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
);

CREATE TABLE bans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ip_hash TEXT NOT NULL,
  reason TEXT,
  board_id TEXT,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE mod_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  details TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX idx_threads_board_bumped ON threads (board_id, sticky DESC, bumped_at DESC);
CREATE INDEX idx_posts_thread ON posts (thread_id, id ASC);
CREATE INDEX idx_bans_ip_hash ON bans (ip_hash);

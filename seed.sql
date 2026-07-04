-- Cloudflare Worker BBS Seed Data

INSERT INTO boards (id, title, subtitle, description, nsfw, max_threads, bump_limit, created_at) VALUES
('tech', 'Technology & Code', 'Programming, servers, and Cloudflare Workers', 'Discuss software development, hardware, edge computing, and self-hosted infrastructure.', 0, 50, 300, 1720000000000),
('meta', 'Site Discussion & Feedback', 'BBS administration, bug reports, and features', 'Feedback, feature requests, and meta discussions about this Worker-powered imageboard.', 0, 50, 300, 1720000000000),
('rnd', 'Random & Memes', 'Anything goes', 'General discussion, internet culture, and random thoughts. Keep it civilized!', 0, 50, 300, 1720000000000),
('art', 'Creative Arts & Media', 'Digital art, music, photography, and design', 'Share your creative projects, graphics, artwork, and aesthetic setups.', 0, 50, 300, 1720000000000);

-- Welcome Thread in /tech/
INSERT INTO threads (id, board_id, subject, sticky, locked, post_count, image_count, created_at, bumped_at) VALUES
(1, 'tech', 'Welcome to WorkerBBS! 🚀', 1, 0, 3, 1, 1720000000000, 1720000100000);

INSERT INTO posts (id, thread_id, board_id, is_op, author_name, tripcode, poster_hash, comment, file_url, file_name, file_size, file_width, file_height, file_type, ip_hash, sage, created_at) VALUES
(1, 1, 'tech', 1, 'Anonymous', '!AdminBBS', 'ID:8f2aK1c', 'Welcome to the official WorkerBBS deployment! 🚀

This entire imageboard is running serverless on **Cloudflare Workers**, stored in **Cloudflare D1 (SQLite)**, and uses **R2 Object Storage** for media attachments.

>Zero server cost on free tier
>Global edge low-latency caching
>Authentic classic Yotsuba aesthetics

Feel free to reply, test out tripcodes (`Name#secret`), greentext (`>quote`), and image attachments!', 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80', 'edge-cloud.jpg', 124000, 800, 600, 'image/jpeg', 'hash_admin', 0, 1720000000000),
(2, 1, 'tech', 0, 'Anonymous', NULL, 'ID:3c9pL8z', '>>1
This is incredible! How fast are D1 queries on edge?', NULL, NULL, NULL, NULL, NULL, NULL, 'hash_user1', 0, 1720000050000),
(3, 1, 'tech', 0, 'Anonymous', '!AdminBBS', 'ID:8f2aK1c', '>>2
Super fast! Sub-10ms query execution globally because SQLite runs right alongside the worker compute node.', NULL, NULL, NULL, NULL, NULL, NULL, 'hash_admin', 0, 1720000100000);

-- Welcome Thread in /meta/
INSERT INTO threads (id, board_id, subject, sticky, locked, post_count, image_count, created_at, bumped_at) VALUES
(2, 'meta', 'How to Use Tripcodes & Formatting', 1, 0, 2, 0, 1720000200000, 1720000250000);

INSERT INTO posts (id, thread_id, board_id, is_op, author_name, tripcode, poster_hash, comment, file_url, file_name, file_size, file_width, file_height, file_type, ip_hash, sage, created_at) VALUES
(4, 2, 'meta', 1, 'Anonymous', '!AdminBBS', 'ID:8f2aK1c', 'Here is a quick guide on how to use WorkerBBS formatting:

**Tripcodes:**
Type `YourName#secretword` in the Name field. It will display as `YourName !tripcode` so others can verify your identity!

**Greentext:**
Start any line with `>` like this:
>be me
>hosting an imageboard for $0/month on Cloudflare
>life is good

**Quotes:**
Type `>>postnumber` (e.g., `>>1` or `>>4`) to link to a post. Hovering over it will pop up a preview!', NULL, NULL, NULL, NULL, NULL, NULL, 'hash_admin', 0, 1720000200000),
(5, 2, 'meta', 0, 'AnonTester', '!3x9aKz7Q', 'ID:1a2b3c4', '>>4
>testing greentext and tripcodes
It works! Sweet!', NULL, NULL, NULL, NULL, NULL, NULL, 'hash_user2', 0, 1720000250000);

-- Thread in /rnd/
INSERT INTO threads (id, board_id, subject, sticky, locked, post_count, image_count, created_at, bumped_at) VALUES
(3, 'rnd', 'What are you working on this weekend?', 0, 0, 1, 1, 1720000300000, 1720000300000);

INSERT INTO posts (id, thread_id, board_id, is_op, author_name, tripcode, poster_hash, comment, file_url, file_name, file_size, file_width, file_height, file_type, ip_hash, sage, created_at) VALUES
(6, 3, 'rnd', 1, 'Anonymous', NULL, 'ID:7y8z9a0', 'Post your current side projects, hobby builds, or gaming setups!
>inb4 another todo app', 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=800&auto=format&fit=crop&q=80', 'retro-setup.jpg', 195000, 800, 533, 'image/jpeg', 'hash_user3', 0, 1720000300000);

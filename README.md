# WorkerBBS 🚀
**A Self-Hostable Cloudflare Worker Bulletin Board System (BBS) Template like 4chan**

WorkerBBS is a modern, lightweight, serverless imageboard and bulletin board system designed to be hosted for **$0/month on Cloudflare's Free Tier**. Powered by **Cloudflare Workers (Hono)**, **Cloudflare D1 (serverless SQLite)**, and **Cloudflare R2 (Object Storage)**, with a responsive React SPA frontend featuring authentic classic Yotsuba aesthetics.

---

## ✨ Features
- **Zero-Cost Edge Architecture**: Runs entirely on Cloudflare Workers compute nodes, D1 relational database, and R2 object storage.
- **Authentic Classic Themes**: Toggle between classic **Yotsuba (Light Cream/Amber)** and **Yotsuba B (Dark Slate)** styles.
- **Interactive Catalog View**: Real-time keyword search filtering, sorting by Bump Order / Creation Date / Reply Count / Image Count, and stats badges.
- **Tripcodes & Daily Poster IDs**: SHA-256 verifiable tripcodes (`Name#secret` ➔ `Name !3x9aKz7Q`) and daily anonymous poster hashes per board (`ID: 8f2aK1c`) without accounts.
- **Greentext & Quote Previews**: Classic `>greentext` rendering and clickable `>>post_id` references with **floating hover preview cards**.
- **Live Auto-Polling**: Toggleable auto-update feature in thread views to fetch new replies without reloading the page.
- **Floating Quick Reply**: Draggable modal box for instant replying from anywhere on the page.
- **File & URL Attachments**: Upload images/videos directly to R2 object storage or attach direct third-party URLs (e.g. Catbox, Imgur).
- **Admin Moderation Dashboard**: Admin authentication supporting Sticky/Lock threads, Post deletion, Board creation, and IP hash banning with public `(USER WAS BANNED FOR THIS POST)` notices.
- **Auto-Setup Out of the Box**: Automatically initializes D1 tables and seeds 4 default boards (`/tech/`, `/meta/`, `/rnd/`, `/art/`) with welcome threads on first launch!

---

## 🛠️ Quickstart & Local Development

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/yourusername/worker-bbs.git
cd worker-bbs
npm install
```

### 2. Run Locally in Dev Mode
Start both the Hono edge API server and the Vite React client concurrently:
```bash
npm run dev
```
- Client SPA: [http://localhost:5173](http://localhost:5173) (automatically proxies `/api` to the Worker)
- Worker API: [http://localhost:8787](http://localhost:8787)

> [!NOTE]
> On first access, the worker will automatically initialize your local D1 SQLite database and seed default boards!

---

## ☁️ Self-Hosting & Production Deployment

### 1. Create a Cloudflare D1 Database
Create your production serverless database using Wrangler:
```bash
npx wrangler d1 create worker_bbs_db
```
Copy the `database_id` output from the terminal and update `wrangler.jsonc`:
```jsonc
"d1_databases": [
  {
    "binding": "BBS_DB",
    "database_name": "worker_bbs_db",
    "database_id": "paste-your-database-id-here"
  }
]
```

### 2. Create a Cloudflare R2 Bucket (For Media Uploads)
Create your R2 bucket for hosting user-uploaded images and videos:
```bash
npx wrangler r2 bucket create worker-bbs-media
```
*(Ensure the bucket name matches `bucket_name` in `wrangler.jsonc`)*

### 3. Initialize Remote Production Database
Run the D1 migration and seed scripts against your remote Cloudflare database:
```bash
npm run db:init:remote
```

### 4. Configure Admin Secret Key
In `wrangler.jsonc`, change the default `ADMIN_KEY` under `vars` to a strong secret passphrase:
```jsonc
"vars": {
  "ADMIN_KEY": "your_secure_passphrase_here",
  "SITE_TITLE": "My Custom Imageboard"
}
```

### 5. Build & Deploy to Cloudflare Workers!
Compile the client SPA to `./dist` and deploy the full-stack worker with static assets:
```bash
npm run deploy
```
Your imageboard is now live globally on the Cloudflare Edge! 🎉

---

## 🔐 Administration & Moderation
1. Navigate to `/admin` or click **Admin** in the top navigation bar.
2. Enter your `ADMIN_KEY`.
3. From the dashboard, you can view site analytics, create new custom boards, lift active bans, or log out.
4. While logged as admin, viewing threads and posts will reveal moderation buttons (`[Delete]`, `[Ban IP]`, `[Sticky]`, `[Lock]`).

---

## 📄 License
MIT License - Free to modify, self-host, and distribute!

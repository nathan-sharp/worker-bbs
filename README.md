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
- **Automated Post Retention & Pruning Policy**: Configure global site-wide expiration thresholds (6 hours up to 30 days, or Never Delete). Expired posts and non-sticky threads are automatically swept and pruned via Cloudflare Worker Cron Triggers (`0 * * * *`) or via the manual dashboard prune button.
- **Admin Moderation Dashboard**: Admin authentication supporting Sticky/Lock threads, Post deletion, Board creation, Post retention configuration, and IP hash banning with public `(USER WAS BANNED FOR THIS POST)` notices.
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

You can deploy WorkerBBS using either the **Cloudflare Web Dashboard (Git Integration)** or the **Command-Line Wrangler CLI**.

### Option A: Cloudflare Web Dashboard Setup (Zero Git Commits / Secret Safe!)

If you have forked this repository on GitHub, you can deploy WorkerBBS directly through the Cloudflare web dashboard **without editing code or committing any secrets or database IDs to Git**:

1. **Create Your Database & Storage in Cloudflare Dashboard**:
   - Log into the [Cloudflare Dashboard](https://dash.cloudflare.com/) and navigate to **Workers & Pages**.
   - Go to **D1 SQL Database** ➔ Click **Create database** ➔ Name it `worker_bbs_db` ➔ Click **Create**.
   - Go to **R2 Object Storage** ➔ Click **Create bucket** ➔ Name it `worker-bbs-media` ➔ Click **Create bucket**.

2. **Connect to Workers Git Integration**:
   - Under **Workers & Pages**, click **Create application** ➔ select the **Workers** tab (or **Connect to Git**).
   - Select your GitHub account and choose your forked `worker-bbs` repository.
   - Set the **Build command** to `npm run build` and click **Save and Deploy**.

3. **Configure Bindings & Secrets in Dashboard (No Git Edits Needed!)**:
   - Once deployed, open your new Worker in the dashboard and go to **Settings ➔ Variables and Secrets**:
     - Click **Add variable** ➔ Set **Variable name** to `ADMIN_KEY`, set **Value** to your strong secret passphrase, and click **Encrypt** (Save as Secret).
     - *(Optional)* Add a variable `SITE_TITLE` with your desired imageboard name.
   - Next, go to **Settings ➔ Bindings**:
     - Click **Add Binding** ➔ Select **D1 Database** ➔ Set Variable name to `BBS_DB` and select `worker_bbs_db` from the dropdown menu.
     - Click **Add Binding** ➔ Select **R2 Bucket** ➔ Set Variable name to `BBS_BUCKET` and select `worker-bbs-media` from the dropdown menu.
   - *Note*: Dashboard variables, secrets, and bindings automatically override the placeholder values in `wrangler.jsonc`, keeping your GitHub repository completely clean and secret-free!

4. **Verify Cron Triggers**:
   - Go to **Settings ➔ Triggers** and ensure the Cron Trigger `0 * * * *` is active for automated hourly post retention sweeps.

5. **Visit Your Site!**
   - Open your Worker's live `.workers.dev` URL. On your very first visit, WorkerBBS will automatically construct all database tables and seed default boards out of the box! 🎉

---

### Option B: Terminal & Wrangler CLI Setup (For Local Command-Line Users)

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

### 3. Configure Admin Secret Key
In `wrangler.jsonc`, change the default `ADMIN_KEY` under `vars` to a strong secret passphrase:
```jsonc
"vars": {
  "ADMIN_KEY": "your_secure_passphrase_here",
  "SITE_TITLE": "My Custom Imageboard"
}
```

### 4. Build & Deploy to Cloudflare Workers!
Compile the client SPA to `./dist` and deploy the full-stack worker with static assets:
```bash
npm run deploy
```
Your imageboard is now live globally on the Cloudflare Edge! (Tables and default boards initialize automatically on first visit). 🎉

---

## 🔐 Administration & Moderation
1. Navigate to `/admin` or click **Admin** in the top navigation bar.
2. Enter your `ADMIN_KEY`.
3. From the dashboard, you can view site analytics, create new custom boards, lift active bans, or log out.
4. While logged as admin, viewing threads and posts will reveal moderation buttons (`[Delete]`, `[Ban IP]`, `[Sticky]`, `[Lock]`).

# WAR KELAS — Deployment Guide

This document explains how to deploy WAR KELAS to a real hosting environment. Pick the option that best matches your situation.

> **In a hurry?** The fastest path is **[Vercel + MongoDB Atlas](#option-1-vercel--mongodb-atlas-easiest)**. Follow it top-to-bottom and you'll be live in ~15 minutes with a free tier.

---

## Table of Contents

1. [What You Need Before Deploying](#what-you-need-before-deploying)
2. [Environment Variables](#environment-variables)
3. [Provisioning MongoDB (any option)](#provisioning-mongodb-any-option)
4. [Option 1: Vercel + MongoDB Atlas (easiest)](#option-1-vercel--mongodb-atlas-easiest)
5. [Option 2: Railway (single-vendor)](#option-2-railway-single-vendor)
6. [Option 3: Docker / Docker Compose (self-hosted)](#option-3-docker--docker-compose-self-hosted)
7. [Option 4: VPS (Ubuntu + PM2 + Nginx)](#option-4-vps-ubuntu--pm2--nginx)
8. [Post-Deploy Checklist](#post-deploy-checklist)
9. [Hardening for Production](#hardening-for-production)
10. [Monitoring & Backups](#monitoring--backups)
11. [Common Issues](#common-issues)
12. [Upgrading / Rolling Out New Versions](#upgrading--rolling-out-new-versions)

---

## What You Need Before Deploying

- The WAR KELAS source (this repo).
- A **MongoDB instance** (Atlas free tier, a Docker container, or a self-hosted server).
- A **Node.js 20+ runtime** on the target platform.
- A **domain name** (optional but recommended) — or use the platform's default subdomain.
- A **strong admin password** — pick something long. It is the only gate on the admin console.

---

## Environment Variables

WAR KELAS needs these at runtime. Configure them in your hosting provider's dashboard (Vercel/Railway/etc.) or your `.env` file (Docker/VPS).

| Variable | Required | Example | Notes |
|---|---|---|---|
| `MONGO_URL` | ✅ | `mongodb+srv://user:pass@cluster0.mongodb.net/warkelas?retryWrites=true&w=majority` | Include DB name in the path when using Atlas. |
| `DB_NAME` | ⚠️ | `warkelas` | Fallback is `warkelas` if unset or set to the literal string `your_database_name`. |
| `NEXT_PUBLIC_BASE_URL` | ✅ | `https://war-kelas.example.com` | Public URL of your app. Used by the share link. |
| `ADMIN_PASSWORD` | ✅ | `CHANGE-ME-super-long-and-random` | Rotating this invalidates all admin sessions. |
| `CORS_ORIGINS` | ➖ | `*` | Currently unused by the code but reserved. |
| `NODE_ENV` | ➖ | `production` | Set automatically by most platforms. |

> Never commit real values to git. Put them in the platform's secret store.

---

## Provisioning MongoDB (any option)

You can use any MongoDB 4.4+ instance. The app uses **single-document atomic operations only** — no transactions, no replica sets required (though Atlas gives you a 3-node replica set for free).

### Option A — MongoDB Atlas (free tier, recommended)

1. Go to <https://www.mongodb.com/cloud/atlas> and create a free account.
2. Create a **new cluster** → choose the **free M0** tier.
3. **Database Access** → add a database user with password. Save the credentials.
4. **Network Access** → add IP `0.0.0.0/0` (temporarily; you can lock down later to the hosting provider's egress IPs).
5. **Connect** → **Drivers** → copy the connection string. Replace `<password>` and append your database name:
   ```
   mongodb+srv://warkelas_user:YOUR_PASSWORD@cluster0.abcde.mongodb.net/warkelas?retryWrites=true&w=majority
   ```

### Option B — Self-hosted MongoDB

- Install MongoDB 6+ on a server or run `mongo:6` in Docker.
- Enable auth (`--auth`) and create a user for the `warkelas` database.
- Your `MONGO_URL` will be `mongodb://user:pass@host:27017/warkelas?authSource=admin`.

---

## Option 1: Vercel + MongoDB Atlas (easiest)

Vercel is built for Next.js. Deploy time: ~5 minutes after you have Atlas + a git repo.

### 1. Push the code to GitHub

```bash
cd /app
git init
git add .
git commit -m "Initial WAR KELAS"
gh repo create war-kelas --private --source=. --push
```

Or push to any git host — Vercel supports GitHub, GitLab, and Bitbucket.

### 2. Import into Vercel

1. Go to <https://vercel.com/new>.
2. **Import** your repo.
3. Framework preset: **Next.js** (auto-detected).
4. Root directory: leave default.
5. **Environment Variables** — add these four:
   - `MONGO_URL` = your Atlas connection string (with DB name path)
   - `DB_NAME` = `warkelas`
   - `NEXT_PUBLIC_BASE_URL` = `https://<your-vercel-subdomain>.vercel.app` (you'll get this after deploy — you can update it and redeploy)
   - `ADMIN_PASSWORD` = a strong password
6. Click **Deploy**.

### 3. Post-deploy

1. Open the assigned URL → confirm the home page loads.
2. Go to `/admin` → log in with your `ADMIN_PASSWORD`.
3. Update `NEXT_PUBLIC_BASE_URL` in Vercel to the final URL if it differs, then trigger a redeploy.
4. Optional: add a **custom domain** in Vercel → Settings → Domains, and update `NEXT_PUBLIC_BASE_URL` accordingly.

### Notes on Vercel + WAR KELAS

- The app is fully compatible with serverless. All routes are catch-all `/api/[[...path]]/route.js` handlers.
- Cold start on the first request after idle can add ~500 ms latency to the very first claim. Not a problem in practice — students always land in the lobby first, warming up the function.
- MongoDB client reuse is handled via `globalThis._mongoClientPromise` so each hot instance uses one pooled connection.

---

## Option 2: Railway (single-vendor)

Railway hosts both the Next.js app **and** MongoDB in the same project, so you don't need a separate DB provider.

1. Sign up at <https://railway.app>.
2. **New Project** → **Deploy from GitHub** → pick your repo.
3. Railway detects Next.js and configures the build (`yarn build`) and start (`yarn start`) commands.
4. **Add Service** → **Database** → **MongoDB**. Railway provisions a container and provides `MONGO_URL` as a shared variable.
5. In the Next.js service's **Variables** tab, add:
   - `MONGO_URL` = `${{MongoDB.MONGO_URL}}` (references the DB service)
   - `DB_NAME` = `warkelas`
   - `NEXT_PUBLIC_BASE_URL` = your Railway URL (visible under Settings → Networking → Generate Domain)
   - `ADMIN_PASSWORD` = a strong password
6. Deploy. Verify `/` and `/admin` load.

---

## Option 3: Docker / Docker Compose (self-hosted)

Best when you want one command to spin up the whole stack on any VPS or a home server.

### 3.1 Create a `Dockerfile` at the repo root

```dockerfile
# ---- deps ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile

# ---- build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN yarn build

# ---- runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
USER nextjs
EXPOSE 3000
CMD ["yarn", "start"]
```

### 3.2 Create `docker-compose.yml`

```yaml
services:
  mongo:
    image: mongo:6
    restart: unless-stopped
    volumes:
      - mongo_data:/data/db
    # For a locked-down setup, uncomment and set credentials:
    # environment:
    #   MONGO_INITDB_ROOT_USERNAME: warkelas
    #   MONGO_INITDB_ROOT_PASSWORD: change-me
    #   MONGO_INITDB_DATABASE: warkelas

  app:
    build: .
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      MONGO_URL: "mongodb://mongo:27017"
      DB_NAME: "warkelas"
      NEXT_PUBLIC_BASE_URL: "https://war-kelas.example.com"
      ADMIN_PASSWORD: "CHANGE-ME-super-long-and-random"
    depends_on:
      - mongo

volumes:
  mongo_data:
```

### 3.3 Deploy

```bash
docker compose up -d --build
docker compose logs -f app
```

The app is now reachable on `http://<server-ip>:3000`. Front it with Nginx + Let's Encrypt for HTTPS (see [Option 4, section 4.5](#45-configure-nginx--tls)).

### 3.4 Update to a new version

```bash
git pull
docker compose up -d --build
```

---

## Option 4: VPS (Ubuntu + PM2 + Nginx)

For a plain Ubuntu 22.04+ box with more control.

### 4.1 Install prerequisites

```bash
# Node 20 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Yarn
sudo corepack enable
corepack prepare yarn@1.22.22 --activate

# PM2 process manager
sudo npm i -g pm2

# MongoDB 6
sudo apt install -y gnupg curl
curl -fsSL https://pgp.mongodb.com/server-6.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-6.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-6.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update && sudo apt install -y mongodb-org
sudo systemctl enable --now mongod

# Nginx + Certbot
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 4.2 Deploy the code

```bash
sudo mkdir -p /var/www && sudo chown -R $USER /var/www
cd /var/www
git clone <your-repo-url> war-kelas
cd war-kelas
yarn install --frozen-lockfile
```

### 4.3 Create `/var/www/war-kelas/.env`

```bash
cat > .env <<'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=warkelas
NEXT_PUBLIC_BASE_URL=https://war-kelas.example.com
ADMIN_PASSWORD=CHANGE-ME-super-long-and-random
CORS_ORIGINS=*
EOF
chmod 600 .env
```

### 4.4 Build & start with PM2

```bash
yarn build

pm2 start "yarn start" --name war-kelas --cwd /var/www/war-kelas
pm2 save
pm2 startup systemd
# copy-paste the command PM2 prints and run it as root
```

Check that it runs on port 3000:
```bash
pm2 logs war-kelas --lines 50
curl -s http://localhost:3000/api/health
```

### 4.5 Configure Nginx + TLS

Create `/etc/nginx/sites-available/war-kelas`:

```nginx
server {
    listen 80;
    server_name war-kelas.example.com;

    # Increase for larger CSV uploads
    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
    }
}
```

Enable and issue a certificate:

```bash
sudo ln -s /etc/nginx/sites-available/war-kelas /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d war-kelas.example.com --redirect --agree-tos -m you@example.com --non-interactive
```

Certbot updates the Nginx config for HTTPS and installs a cron job for renewal.

### 4.6 Redeploy on updates

```bash
cd /var/www/war-kelas
git pull
yarn install --frozen-lockfile
yarn build
pm2 restart war-kelas
```

---

## Post-Deploy Checklist

After **any** deployment method, run through this list.

1. `curl https://<your-domain>/api/health` → returns `{ ok: true, now: ... }`.
2. Open `https://<your-domain>/` → see the "Rebut Ruanganmu" home page (no admin button).
3. Open `https://<your-domain>/admin` → password prompt.
4. Log in with the password → land on the empty WAR list.
5. Create a test WAR with two rooms (capacity 1 each). Note the WAR CODE.
6. Import a test student via the CSV textarea:
   ```
   NISN,Nama
   001,Alice
   ```
7. In an incognito tab, open `https://<your-domain>/#join/<CODE>` → enter NISN `001` → land in lobby.
8. Back in the admin dashboard, click **Mulai WAR Sekarang** → the student sees 3-2-1-GO → tap REBUT.
9. Verify "ROOM SECURED" appears with a millisecond timestamp.
10. Click **Export CSV** → verify the file downloads with the correct row.
11. **Delete the test WAR** → verify it disappears from the list.

If any step fails, see [Common Issues](#common-issues).

---

## Hardening for Production

The MVP defaults are safe for a school event, but for a longer-running deployment, tighten these:

- **Rotate the admin password** to something long and random. Change `ADMIN_PASSWORD` and redeploy/restart.
- **Restrict MongoDB network access.** On Atlas: replace `0.0.0.0/0` with your platform's egress IPs, or use Atlas Peering / Private Endpoint. On self-hosted: `bindIp: 127.0.0.1` in `/etc/mongod.conf`, or use a private network + firewall rules.
- **Force HTTPS.** Every production option above installs TLS. Do not run without it.
- **Set strict security headers.** Add to `next.config.js`:
  ```js
  async headers() {
    return [{
      source: '/(.*)',
      headers: [
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'no-referrer-when-downgrade' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }
      ],
    }];
  }
  ```
- **Rate-limit `/api/admin/login` and `/api/join`.** Use a WAF (Cloudflare) or a middleware. Prevents brute force on the admin password and NISN enumeration.
- **Add MongoDB authentication + TLS** if self-hosting.
- **Log admin actions** externally. `activity_logs` is stored in Mongo; consider mirroring to a log aggregator.
- **Backups** — see [Monitoring & Backups](#monitoring--backups).

---

## Monitoring & Backups

### Uptime

- **Uptime Robot** (free) or **Better Uptime** — ping `/api/health` every minute.
- Vercel/Railway have built-in status pages you can subscribe to.

### Logs

- **Vercel/Railway:** built-in log stream in the dashboard.
- **Docker:** `docker compose logs -f app`.
- **PM2:** `pm2 logs war-kelas`, or forward to `journalctl -u pm2-<user>`.

### Backups

For MongoDB Atlas, backups are automatic on paid tiers. On the free tier, back up manually:

```bash
# from any machine with mongodb-tools installed
mongodump --uri="$MONGO_URL" --out=./backup-$(date +%F)
tar czf backup-$(date +%F).tar.gz backup-$(date +%F)
# upload the tarball off-server (S3 / another VPS / rclone)
```

For self-hosted, add a nightly cron:

```cron
0 2 * * * mongodump --archive=/backups/warkelas-$(date +\%F).archive --gzip
0 3 * * * find /backups -name 'warkelas-*.archive' -mtime +14 -delete
```

Restore:
```bash
mongorestore --uri="$MONGO_URL" --archive=/path/to/file.archive --gzip
```

---

## Common Issues

**"MongoServerError: bad auth" during boot**
Your `MONGO_URL` password is wrong or the user doesn't have access to the target DB. Double-check the Atlas Database Access page and that the DB name in the URI path (`.../warkelas?...`) matches `DB_NAME`.

**Health check works, but home page shows "Loading…" forever**
Check the browser console for CORS or 404s. Confirm `NEXT_PUBLIC_BASE_URL` is set correctly. In serverless environments, the first request after a cold start can take ~2 s — reload once.

**Every admin call returns 401**
- The password stored in the browser doesn't match `ADMIN_PASSWORD` on the server. Log out (Admin console → **Logout**) and log in again.
- If you rotated the password, all existing sessions must re-login.

**Join returns 403 "NISN tidak terdaftar untuk WAR ini"**
The WAR has pre-imported students, so only imported NISNs can join. Either import the student first (Admin → Dashboard → Add / Upload CSV) or remove all imported students to re-enable open registration.

**Countdown drifts between two devices**
The client uses server-time offset — offsets are refreshed on every poll (700 ms during LIVE). Very large local clock skews normalize within 1-2 seconds. Ask both devices to enable "automatic date & time" if drift is severe.

**Cold start latency on the very first claim in serverless**
Not a problem in practice: students always land in the lobby first, which warms the function. If your traffic is bursty, add a lightweight cron pinging `/api/health` every 5 minutes.

**"Room A = 11 / 10" — over capacity**
Impossible by design (atomic conditional `$elemMatch: { slotsLeft: { $gt: 0 } }`). If you see it, please open an issue with the WAR ID and a Mongo dump of the `wars` doc — the invariant has been violated somehow (extremely unlikely).

**Port 3000 already in use on VPS**
Another service is holding the port. `sudo lsof -i:3000` to find and stop it, or change the app's port via `PORT=3001 pm2 restart war-kelas` and update the Nginx `proxy_pass`.

**"Cannot find module 'mongodb'" after deploy**
`node_modules` was not built into the artifact. Ensure the Dockerfile / build step actually runs `yarn install --frozen-lockfile` and copies `node_modules` into the runtime image (see the Dockerfile template above).

---

## Upgrading / Rolling Out New Versions

WAR KELAS is stateless per-request. Rolling out a new version is safe **outside of an active LIVE WAR** — participants may briefly lose polling during the restart. For zero-disruption releases:

1. Deploy off-peak (or between WAR sessions).
2. On Vercel/Railway/Docker Swarm, use their rolling-deploy defaults.
3. On PM2 (single instance), `pm2 restart --update-env war-kelas` briefly (~1-2 s downtime).
4. On PM2 (cluster mode with N workers), use `pm2 reload war-kelas` for zero-downtime restarts.

Data migrations aren't needed for typical updates — the schema is stable and additive.

---

**Need a hand?** Open an issue with:
- Deployment method (Vercel / Railway / Docker / VPS)
- The output of `curl https://<your-domain>/api/health`
- The last 50 lines of app logs
- What you did just before it broke.

Happy warring. 🥇

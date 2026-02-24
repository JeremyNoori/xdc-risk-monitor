# XDC Exchange Risk Monitor

A web dashboard that monitors XDC trading venue reserves and coverage ratios using CoinMarketCap Pro API data.

## Architecture

- **Frontend**: Next.js 14 (App Router) + TypeScript + Recharts
- **Backend**: Next.js API Routes
- **Database**: Supabase Postgres via Prisma ORM
- **Scheduling**: Render Cron Job (every 2 hours) or GitHub Actions
- **Data source**: CoinMarketCap Pro API (only)

## Local Development

### Prerequisites

- Node.js 18+
- A Supabase project (free tier works)
- A CoinMarketCap Pro API key

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

| Variable | Description |
|---|---|
| `CMC_API_KEY` | Your CoinMarketCap Pro API key |
| `ADMIN_TOKEN` | A strong random string (e.g. `openssl rand -hex 32`) |
| `DATABASE_URL` | Supabase pooled connection string (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct connection string (port 5432, for migrations) |

> **Note:** The dashboard works without a database — it shows demo data until you connect Supabase and run your first ingestion.

### 3. Run database migrations

```bash
npx prisma migrate dev
```

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 5. Trigger a manual ingestion run

```bash
curl -X POST http://localhost:3000/api/jobs/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

## Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database** to find connection strings
3. Use the **Session mode** pooler URL (port 6543) for `DATABASE_URL`
4. Use the **Direct connection** URL (port 5432) for `DIRECT_URL`
5. Both URLs need the password from project creation

## Deploy to Render

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit — XDC Exchange Risk Monitor"
git remote add origin https://github.com/YOUR_USER/xdc-risk-monitor.git
git push -u origin main
```

### Step 2: Create a Supabase project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note the project password you set during creation
3. Go to **Settings → Database**
4. Copy the **Session mode** connection string (port 6543) — this is your `DATABASE_URL`
5. Copy the **Direct connection** string (port 5432) — this is your `DIRECT_URL`

### Step 3: Run Prisma migrations against Supabase

From your local machine, run:

```bash
DATABASE_URL="your_direct_connection_url" npx prisma migrate deploy
```

This creates all the tables in your Supabase database.

### Step 4: Create the Web Service on Render

1. Go to [render.com](https://render.com) and sign in
2. Click **New → Web Service**
3. Connect your GitHub repo
4. Configure:
   - **Name**: `xdc-risk-monitor`
   - **Runtime**: Node
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start Command**: `npm start`
5. Add environment variables:

| Key | Value |
|---|---|
| `CMC_API_KEY` | Your CoinMarketCap Pro API key |
| `ADMIN_TOKEN` | A strong random string |
| `DATABASE_URL` | Supabase pooled URL (port 6543, with `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct URL (port 5432) |

6. Click **Create Web Service**

### Step 5: Create the Cron Job on Render

1. In Render dashboard, click **New → Cron Job**
2. Connect the same GitHub repo
3. Configure:
   - **Name**: `xdc-ingest-cron`
   - **Schedule**: `0 */2 * * *` (every 2 hours)
   - **Build Command**: `npm install`
   - **Command**: `node scripts/trigger-ingest.js`
4. Add environment variables:

| Key | Value |
|---|---|
| `APP_URL` | Your Render web service URL (e.g. `https://xdc-risk-monitor.onrender.com`) |
| `ADMIN_TOKEN` | Same token as the web service |

5. Click **Create Cron Job**

### Step 6: Verify

```bash
# Check the app is running
curl https://xdc-risk-monitor.onrender.com/api/health

# Trigger a manual ingestion
curl -X POST https://xdc-risk-monitor.onrender.com/api/jobs/run \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"

# Check the latest data
curl https://xdc-risk-monitor.onrender.com/api/latest
```

Visit your Render URL in a browser — you should see the dashboard with live data after the first ingestion completes.

## Deploy to Vercel (Alternative)

1. Push the repo to GitHub
2. Import into Vercel
3. Add environment variables (`CMC_API_KEY`, `ADMIN_TOKEN`, `DATABASE_URL`, `DIRECT_URL`)
4. Vercel runs `prisma generate && next build` automatically
5. Run migrations: `DATABASE_URL="your_direct_url" npx prisma migrate deploy`
6. Set up GitHub Actions for scheduling (see `.github/workflows/ingest.yml`)

### GitHub Actions Secrets (Vercel only)

| Secret | Value |
|---|---|
| `APP_URL` | Your Vercel deployment URL |
| `ADMIN_TOKEN` | Same token configured in Vercel env vars |

## API Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | — | DB connectivity check |
| POST | `/api/jobs/run` | Bearer token | Trigger ingestion run |
| GET | `/api/latest` | — | Latest run + venue data |
| GET | `/api/venue/[id]/history?days=7` | — | Time series for a venue |
| GET | `/api/venue/[id]/pairs` | — | Trading pairs for a venue |

## Risk Tier Logic

| Tier | Coverage Ratio |
|---|---|
| LOW | >= 1.00 (100%) |
| MODERATE | 0.50 – 0.99 |
| HIGH | < 0.50 |
| UNKNOWN | Missing PoR data / endpoint unavailable |

Coverage = `(XDC reserves in USD) / (24h trading volume in USD)`

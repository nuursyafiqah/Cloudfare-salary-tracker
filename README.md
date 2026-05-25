# Salary Cycle Tracker — Cloudflare Pages Functions version

This repo runs as a Cloudflare Pages app with Pages Functions and D1.

The app now uses:

- React + Vite for the mobile web UI
- Cloudflare Pages Functions for `/api/*`
- Cloudflare D1 for saved data
- Cloudflare Pages for the built React files in `dist`

## Important files

```txt
functions/api/[[path]].js   # API routes for /api/*
functions/api/index.js      # API route for /api
wrangler.toml               # Pages config + D1 binding
public/_redirects           # React Router SPA fallback
migrations/0001_initial.sql # D1 tables
```

## Cloudflare Pages build settings

Use these settings in your existing Pages project:

```txt
Framework preset: Vite
Build command: npm run build
Build output directory: dist
Root directory: leave blank
Deploy command: leave blank
```

Do not use `npx wrangler deploy` for this Pages version. That command is for Workers.

## D1 binding

This project expects a D1 binding named:

```txt
DB
```

It points to:

```txt
Database name: salary-cycle-tracker-db
Database ID: b926b62a-5cf2-4061-a577-415c1c859b3a
```

The same binding is already inside `wrangler.toml`:

```toml
[[d1_databases]]
binding = "DB"
database_name = "salary-cycle-tracker-db"
database_id = "b926b62a-5cf2-4061-a577-415c1c859b3a"
```

If Cloudflare dashboard still does not bind D1 automatically, add it manually:

```txt
Pages project → Settings → Bindings → Add → D1 database
Variable name: DB
D1 database: salary-cycle-tracker-db
```

Then redeploy.

## Test after deploy

Open:

```txt
https://cloudfare-salary-tracker.pages.dev/api/health
```

Expected:

```json
{"ok":true,"service":"salary-cycle-tracker","runtime":"pages-functions"}
```

Then test data saving:

```txt
1. Add salary cycle
2. Add fixed spending
3. Tick Paid
4. Refresh page
```

If it stays saved after refresh, Pages Functions + D1 is working.

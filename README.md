# Salary Cycle Tracker — Cloudflare version

This repo has been migrated away from Base44.

The app now uses:

- React + Vite for the mobile web UI
- Cloudflare Worker for the `/api/*` backend
- Cloudflare D1 for saved data
- Cloudflare Static Assets for the built React files

## Cloudflare deploy settings

When deploying from GitHub in Cloudflare, use:

```txt
Build command: npm run build
Deploy command: npx wrangler deploy
```

The Worker serves the React app from `dist` and handles API routes under `/api/*`.

## Create the D1 database

From the project folder, run:

```bash
npx wrangler@latest d1 create salary-cycle-tracker-db
```

Cloudflare will return a `database_id`. Copy it into `wrangler.toml` here:

```toml
database_id = "REPLACE_WITH_YOUR_D1_DATABASE_ID"
```

## Apply the database tables

After updating `wrangler.toml`, run:

```bash
npx wrangler d1 migrations apply salary-cycle-tracker-db --remote
```

This creates these D1 tables:

- `salary_cycles`
- `expenses`
- `fixed_spending`

## Deploy

```bash
npm install
npm run build
npx wrangler deploy
```

## Important

This version is public-link style, same as the current app. Anyone with the live link can open and edit the same data. Add Cloudflare Access or custom login later if you want it private.

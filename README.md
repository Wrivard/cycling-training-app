# Cycling Training Planner

Web app to plan cycling sessions on a calendar, draw routes on a map (or import GPX), and
compare planned sessions against what actually happened by pulling rides from Strava and
recovery from Whoop.

> **Status:** scaffold (step 1). Auth, OAuth, sync, calendar, routes and matching land in
> later steps — see the build plan at the bottom of this file.

## Stack

| Layer    | Choice                                                              |
|----------|---------------------------------------------------------------------|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4                      |
| Design   | Vercel / Geist tokens (see `vercel_DESIGN.md`)                      |
| Backend  | FastAPI + Python 3.12 (managed by `uv`)                             |
| Database | Supabase (Postgres) with Row-Level Security on every table          |
| Auth     | Supabase Auth (email/password + Google OAuth)                       |
| Map      | Mapbox GL JS + Mapbox Directions API (cycling profile)              |
| State    | TanStack React Query                                                |
| i18n     | i18next (FR + EN)                                                   |
| Calendar | `react-big-calendar`                                                |

## Project layout

```
.
├── backend/           FastAPI app, uv-managed
├── frontend/          Vite + React app
├── supabase/
│   └── migrations.sql Initial schema (tables + RLS policies)
├── .env.example       Copy to .env and fill in
├── README.md          You are here
└── vercel_DESIGN.md   Geist design tokens reference
```

## Prerequisites

- **Node 22+** with `pnpm` 8+
- **Python 3.12** (uv will install it on demand)
- **uv** ≥ 0.11 — `irm https://astral.sh/uv/install.ps1 | iex` on Windows
- A Supabase project (free tier is fine) — keep the URL, anon key, service-role key
  and JWT secret handy
- A Mapbox account (free) — get a public token
- Strava + Whoop developer apps once you reach step 3

## First-time setup

1. **Clone & enter the repo**, then `cp .env.example .env` and fill in the values you
   already have. You only need Supabase values to bring step 1 up.

2. **Apply the database schema** — paste `supabase/migrations.sql` into the SQL Editor
   in Supabase Studio and run it. This creates all tables and enables RLS.

3. **Install backend deps**
   ```bash
   cd backend
   uv sync
   ```

4. **Install frontend deps**
   ```bash
   cd frontend
   pnpm install
   ```

## Running locally

Open two terminals.

```bash
# terminal 1 — backend
cd backend
uv run uvicorn app.main:app --reload --reload-dir app
# → http://127.0.0.1:8000  (docs at /docs)
```

```bash
# terminal 2 — frontend
cd frontend
pnpm dev
# → http://localhost:5173 (Vite proxies /api → 127.0.0.1:8000)
```

## Strava — terms-of-service constraints (non-negotiable)

These are encoded in code and DB as well as documented here:

- **Single Player Mode.** A fresh Strava app starts capped at 1 athlete; the cap grows
  automatically as athletes authenticate. For 2 users it's fine — just don't forget.
- **Display restriction.** A user's Strava data can be shown **only to that user**.
  RLS (see `supabase/migrations.sql`) blocks cross-user reads at the database layer.
- **No AI / ML.** Strava-derived fields must never feed an AI or ML model. Any future
  smart-adjustment feature must use Whoop or manual input, not Strava.
- **Rate limits.** 200 req / 15 min, 2000 req / day. The sync client reads
  `X-Ratelimit-*` headers and surfaces 429s.

## Whoop — API v2 notes

- v1 is decommissioned — only v2 endpoints are used.
- The `offline` scope is **required** to receive a refresh token.
- Access tokens expire in ~1 hour and are refreshed before each call when expired.
- Recovery score, HRV, RHR and SpO2 are exposed through the Cycle endpoints in v2.

## Build plan (in order)

| Step | Status   | Scope                                                                   |
|------|----------|-------------------------------------------------------------------------|
| 1    | **done** | Scaffold: backend, frontend, Tailwind/Geist design system, migrations   |
| 2    | next     | Supabase Auth wiring end-to-end (login → JWT-protected backend routes)  |
| 3    |          | Settings page + Strava + Whoop OAuth (start / callback / disconnect)    |
| 4    |          | Manual sync endpoints + buttons (`/api/sync/{strava,whoop}`)            |
| 5    |          | Calendar CRUD for planned sessions                                      |
| 6    |          | Mapbox route planner (draw + snap) + GPX import                         |
| 7    |          | Planned-vs-actual matching and comparison view                          |
| 8    |          | Dashboard polish                                                        |

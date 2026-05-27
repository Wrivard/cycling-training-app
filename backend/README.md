# Backend — Cycling Training Planner

FastAPI service that brokers Supabase, Strava and Whoop for the planner UI.

## Setup

```bash
# from backend/
uv sync                                              # installs deps + creates .venv
cp ../.env.example ../.env                           # then fill in the values at the repo root
uv run uvicorn app.main:app --reload --reload-dir app   # http://127.0.0.1:8000
```

The OpenAPI docs are at http://127.0.0.1:8000/docs.

## Layout

```
app/
  main.py            FastAPI app + CORS + router wiring
  cli.py             `uv run dev` entry point
  core/
    config.py        Settings (pydantic-settings, reads ../.env)
    security.py      Supabase JWT verification → CurrentUser dependency
    supabase.py      Supabase clients (admin / anon)
    token_crypto.py  Fernet encrypt/decrypt for OAuth tokens at rest
  routers/
    users.py         /api/me
    oauth.py         /api/oauth/{strava,whoop}/{start,callback,disconnect}
    sync.py          /api/sync/{strava,whoop}
    routes.py        /api/routes (CRUD + GPX import)
    sessions.py      /api/sessions (CRUD + planned-vs-actual match)
  services/
    strava_client.py Strava API client (TOS constraints baked into the docstring)
    whoop_client.py  Whoop v2 API client
    gpx_parser.py    gpxpy wrapper → polyline + distance + elevation
  models/
    schemas.py       Pydantic response/request models
```

## Strava TOS — non-negotiable rules

- **Single Player Mode**: a fresh Strava app starts at 1-athlete capacity; it
  grows automatically as athletes authenticate. Two users is fine, just be aware.
- **Display restriction**: Strava data for user A may NEVER be displayed to
  user B. RLS in Supabase enforces this at the DB level.
- **No AI/ML**: Strava-sourced fields must never feed an AI/ML model. If a
  future smart-adjustment feature lands, it has to be based on Whoop or
  manual input, not on Strava.
- **Rate limits**: 200 req / 15 min, 2000 req / day. The sync client reads
  `X-Ratelimit-Limit` / `X-Ratelimit-Usage` on 429.

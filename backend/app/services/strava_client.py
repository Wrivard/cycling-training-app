"""Strava API client (OAuth + activities).

Strava terms-of-service constraints baked into this client:

1. **Single Player Mode** — new apps are capped at 1 athlete and the cap
   grows automatically as athletes authenticate. Document for end users.
2. **Privacy** — Strava data for user A may NEVER be displayed to user B.
   This module returns raw payloads; the caller MUST enforce ``user_id``
   isolation at the DB layer (Row Level Security).
3. **No AI/ML** — data fetched here must never feed an AI or ML model.
   If a future feature wants to adjust training intelligently, it must rely
   on Whoop or manual input, NOT on these activities.
4. **Rate limits** — 200 req / 15 min, 2000 req / day. On HTTP 429 we read
   ``X-Ratelimit-Limit`` / ``X-Ratelimit-Usage`` and surface them.
"""

from __future__ import annotations

# Implementation lands in step 4. The module exists so other code can
# import its (future) public surface without churn.

STRAVA_API_BASE = "https://www.strava.com/api/v3"
STRAVA_OAUTH_BASE = "https://www.strava.com/oauth"
STRAVA_SCOPES = "read,activity:read_all"

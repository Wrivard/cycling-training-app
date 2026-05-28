"""Strava OAuth + (later) activity client.

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

from urllib.parse import urlencode

import httpx

from app.core.config import get_settings

STRAVA_API_BASE = "https://www.strava.com/api/v3"
STRAVA_OAUTH_BASE = "https://www.strava.com/oauth"
STRAVA_SCOPES = "read,activity:read_all"
_REQUEST_TIMEOUT = httpx.Timeout(15.0)


def build_authorize_url(state: str) -> str:
    settings = get_settings()
    params = {
        "client_id": settings.strava_client_id,
        "redirect_uri": settings.strava_redirect_uri,
        "response_type": "code",
        "approval_prompt": "auto",
        "scope": STRAVA_SCOPES,
        "state": state,
    }
    return f"{STRAVA_OAUTH_BASE}/authorize?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    """Exchange an authorization code for tokens + athlete payload."""
    settings = get_settings()
    async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
        response = await client.post(
            f"{STRAVA_OAUTH_BASE}/token",
            data={
                "client_id": settings.strava_client_id,
                "client_secret": settings.strava_client_secret,
                "code": code,
                "grant_type": "authorization_code",
            },
        )
        response.raise_for_status()
        return response.json()


async def refresh_access_token(refresh_token: str) -> dict:
    """Trade a refresh token for a fresh access token (Strava rotates both)."""
    settings = get_settings()
    async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
        response = await client.post(
            f"{STRAVA_OAUTH_BASE}/token",
            data={
                "client_id": settings.strava_client_id,
                "client_secret": settings.strava_client_secret,
                "refresh_token": refresh_token,
                "grant_type": "refresh_token",
            },
        )
        response.raise_for_status()
        return response.json()


async def revoke_token(access_token: str) -> bool:
    """Best-effort deauthorize. Returns False on failure but never raises."""
    try:
        async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
            response = await client.post(
                f"{STRAVA_OAUTH_BASE}/deauthorize",
                data={"access_token": access_token},
            )
            response.raise_for_status()
            return True
    except httpx.HTTPError:
        return False

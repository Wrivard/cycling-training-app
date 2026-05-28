"""Strava OAuth + activity client.

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
   ``X-Ratelimit-Limit`` / ``X-Ratelimit-Usage`` and surface a
   :class:`StravaRateLimitError` so the caller can give the user a clean
   "try again in X minutes" message.
"""

from __future__ import annotations

from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from app.core.config import get_settings

STRAVA_API_BASE = "https://www.strava.com/api/v3"
STRAVA_OAUTH_BASE = "https://www.strava.com/oauth"
STRAVA_SCOPES = "read,activity:read_all"
_REQUEST_TIMEOUT = httpx.Timeout(15.0)


@dataclass(slots=True)
class StravaRateLimitError(Exception):
    """Raised when Strava returns HTTP 429.

    `usage_short` / `limit_short` are the 15-minute counters.
    `usage_daily` / `limit_daily` are the 24-hour counters.
    """

    usage_short: int | None
    limit_short: int | None
    usage_daily: int | None
    limit_daily: int | None

    def __str__(self) -> str:  # pragma: no cover — formatting
        return (
            f"Strava rate limit hit (short: {self.usage_short}/{self.limit_short},"
            f" daily: {self.usage_daily}/{self.limit_daily})"
        )


def _parse_pair(header_value: str | None) -> tuple[int | None, int | None]:
    if not header_value or "," not in header_value:
        return None, None
    short, daily = header_value.split(",", 1)
    try:
        return int(short), int(daily)
    except ValueError:
        return None, None


def _raise_if_rate_limited(response: httpx.Response) -> None:
    if response.status_code != 429:
        return
    usage_short, usage_daily = _parse_pair(response.headers.get("X-Ratelimit-Usage"))
    limit_short, limit_daily = _parse_pair(response.headers.get("X-Ratelimit-Limit"))
    raise StravaRateLimitError(
        usage_short=usage_short,
        limit_short=limit_short,
        usage_daily=usage_daily,
        limit_daily=limit_daily,
    )


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


async def fetch_athlete_activities(
    access_token: str,
    *,
    after_unix: int | None = None,
    per_page: int = 100,
    max_pages: int = 10,
) -> list[dict]:
    """Page through GET /athlete/activities and return every record.

    `after_unix`: epoch seconds — only return activities started after.
    `max_pages`: hard cap on the number of pages we'll pull (protects against
    runaway pagination if the user's history is huge).
    """
    headers = {"Authorization": f"Bearer {access_token}"}
    activities: list[dict] = []

    async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
        for page in range(1, max_pages + 1):
            params: dict[str, int] = {"page": page, "per_page": per_page}
            if after_unix is not None:
                params["after"] = after_unix

            response = await client.get(
                f"{STRAVA_API_BASE}/athlete/activities",
                headers=headers,
                params=params,
            )
            _raise_if_rate_limited(response)
            response.raise_for_status()
            batch = response.json() or []
            activities.extend(batch)
            if len(batch) < per_page:
                break

    return activities

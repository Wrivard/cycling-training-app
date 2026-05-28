"""Whoop v2 OAuth + recovery/sleep/cycle client.

Notes:
- v2 API only (v1 is decommissioned).
- The ``offline`` scope is REQUIRED to receive a refresh token.
- Access tokens expire in ~1h; refresh before each call if expired.
- Recovery score (0–100), RHR, HRV and SpO2 are exposed through the
  Recovery endpoint in v2.
- All collection endpoints are paginated via a ``nextToken`` cursor.
"""

from __future__ import annotations

from datetime import date
from typing import Any
from urllib.parse import urlencode

import httpx

from app.core.config import get_settings

WHOOP_API_BASE = "https://api.prod.whoop.com/developer"
WHOOP_OAUTH_AUTHORIZE = "https://api.prod.whoop.com/oauth/oauth2/auth"
WHOOP_OAUTH_TOKEN = "https://api.prod.whoop.com/oauth/oauth2/token"
WHOOP_OAUTH_REVOKE = "https://api.prod.whoop.com/oauth/oauth2/revoke"
WHOOP_SCOPES = "read:recovery read:sleep read:workout read:cycles read:profile offline"
_REQUEST_TIMEOUT = httpx.Timeout(30.0)


def build_authorize_url(state: str) -> str:
    settings = get_settings()
    params = {
        "client_id": settings.whoop_client_id,
        "redirect_uri": settings.whoop_redirect_uri,
        "response_type": "code",
        "scope": WHOOP_SCOPES,
        "state": state,
    }
    return f"{WHOOP_OAUTH_AUTHORIZE}?{urlencode(params)}"


async def exchange_code(code: str) -> dict:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
        response = await client.post(
            WHOOP_OAUTH_TOKEN,
            data={
                "grant_type": "authorization_code",
                "code": code,
                "client_id": settings.whoop_client_id,
                "client_secret": settings.whoop_client_secret,
                "redirect_uri": settings.whoop_redirect_uri,
            },
        )
        response.raise_for_status()
        return response.json()


async def refresh_access_token(refresh_token: str) -> dict:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
        response = await client.post(
            WHOOP_OAUTH_TOKEN,
            data={
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
                "client_id": settings.whoop_client_id,
                "client_secret": settings.whoop_client_secret,
                "scope": WHOOP_SCOPES,
            },
        )
        response.raise_for_status()
        return response.json()


async def revoke_token(access_token: str) -> bool:
    """Best-effort revoke; returns False on failure but never raises."""
    settings = get_settings()
    try:
        async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
            response = await client.post(
                WHOOP_OAUTH_REVOKE,
                data={
                    "token": access_token,
                    "client_id": settings.whoop_client_id,
                    "client_secret": settings.whoop_client_secret,
                },
            )
            response.raise_for_status()
            return True
    except httpx.HTTPError:
        return False


async def fetch_user_basic_profile(access_token: str) -> dict:
    """Fetch /v2/user/profile/basic — used at OAuth time to capture provider_user_id."""
    async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
        response = await client.get(
            f"{WHOOP_API_BASE}/v2/user/profile/basic",
            headers={"Authorization": f"Bearer {access_token}"},
        )
        response.raise_for_status()
        return response.json()


async def _paginated_get(
    access_token: str,
    path: str,
    *,
    start: date | None = None,
    end: date | None = None,
    max_pages: int = 20,
) -> list[dict[str, Any]]:
    """Walk a Whoop collection endpoint via the `nextToken` cursor."""
    headers = {"Authorization": f"Bearer {access_token}"}
    base_params: dict[str, str] = {"limit": "25"}
    if start is not None:
        base_params["start"] = start.isoformat() + "T00:00:00.000Z"
    if end is not None:
        base_params["end"] = end.isoformat() + "T23:59:59.999Z"

    records: list[dict[str, Any]] = []
    next_token: str | None = None

    async with httpx.AsyncClient(timeout=_REQUEST_TIMEOUT) as client:
        for _ in range(max_pages):
            params = dict(base_params)
            if next_token:
                params["nextToken"] = next_token
            response = await client.get(
                f"{WHOOP_API_BASE}{path}",
                headers=headers,
                params=params,
            )
            response.raise_for_status()
            payload = response.json() or {}
            batch = payload.get("records") or []
            records.extend(batch)
            next_token = payload.get("next_token") or payload.get("nextToken")
            if not next_token:
                break

    return records


async def fetch_recoveries(
    access_token: str,
    *,
    start: date | None = None,
    end: date | None = None,
) -> list[dict[str, Any]]:
    """GET /v2/recovery — paginated.

    Each record has score.{recovery_score, hrv_rmssd_milli, resting_heart_rate}.
    """
    return await _paginated_get(access_token, "/v2/recovery", start=start, end=end)


async def fetch_cycles(
    access_token: str,
    *,
    start: date | None = None,
    end: date | None = None,
) -> list[dict[str, Any]]:
    """GET /v2/cycle — paginated. Each record has score.strain."""
    return await _paginated_get(access_token, "/v2/cycle", start=start, end=end)


async def fetch_sleeps(
    access_token: str,
    *,
    start: date | None = None,
    end: date | None = None,
) -> list[dict[str, Any]]:
    """GET /v2/activity/sleep — paginated. Each record has score.sleep_performance_percentage."""
    return await _paginated_get(access_token, "/v2/activity/sleep", start=start, end=end)

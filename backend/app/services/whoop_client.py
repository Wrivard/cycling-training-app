"""Whoop v2 OAuth + (later) recovery/sleep/workout client.

Notes:
- v2 API only (v1 is decommissioned).
- The ``offline`` scope is REQUIRED to receive a refresh token.
- Access tokens expire in ~1h; refresh before each call if expired.
- Recovery score (0–100), RHR, HRV and SpO2 are exposed through the Cycle
  endpoints in v2.
- All collection endpoints are paginated via a ``nextToken`` cursor.
"""

from __future__ import annotations

from urllib.parse import urlencode

import httpx

from app.core.config import get_settings

WHOOP_API_BASE = "https://api.prod.whoop.com/developer"
WHOOP_OAUTH_AUTHORIZE = "https://api.prod.whoop.com/oauth/oauth2/auth"
WHOOP_OAUTH_TOKEN = "https://api.prod.whoop.com/oauth/oauth2/token"
WHOOP_OAUTH_REVOKE = "https://api.prod.whoop.com/oauth/oauth2/revoke"
WHOOP_SCOPES = "read:recovery read:sleep read:workout read:cycles read:profile offline"
_REQUEST_TIMEOUT = httpx.Timeout(15.0)


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

"""Token-refresh helpers — call before any provider API request.

Both providers rotate the refresh token on every refresh response, so we
persist the new pair every time. We refresh proactively when the token is
within 60 seconds of expiry to dodge clock-skew races.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime, timedelta

from app.services import oauth_connections, strava_client, whoop_client

REFRESH_LEEWAY = timedelta(seconds=60)


async def ensure_fresh_strava_token(user_id: str) -> str:
    """Return a Strava access token guaranteed valid for at least REFRESH_LEEWAY."""
    access, refresh, expires_at = await asyncio.to_thread(
        oauth_connections.get_decrypted_tokens, user_id, "strava"
    )
    if expires_at is not None and expires_at - REFRESH_LEEWAY > datetime.now(UTC):
        return access

    payload = await strava_client.refresh_access_token(refresh)
    new_access = payload["access_token"]
    new_refresh = payload["refresh_token"]
    new_expires = (
        datetime.fromtimestamp(payload["expires_at"], tz=UTC)
        if payload.get("expires_at") is not None
        else None
    )
    await asyncio.to_thread(
        oauth_connections.refresh_tokens,
        user_id=user_id,
        provider="strava",
        access_token=new_access,
        refresh_token=new_refresh,
        expires_at=new_expires,
    )
    return new_access


async def ensure_fresh_whoop_token(user_id: str) -> str:
    """Return a Whoop access token guaranteed valid for at least REFRESH_LEEWAY."""
    access, refresh, expires_at = await asyncio.to_thread(
        oauth_connections.get_decrypted_tokens, user_id, "whoop"
    )
    if expires_at is not None and expires_at - REFRESH_LEEWAY > datetime.now(UTC):
        return access

    payload = await whoop_client.refresh_access_token(refresh)
    new_access = payload["access_token"]
    new_refresh = payload["refresh_token"]
    expires_in = payload.get("expires_in")
    new_expires = (
        datetime.now(UTC).replace(microsecond=0) + timedelta(seconds=int(expires_in))
        if isinstance(expires_in, (int, float))
        else None
    )
    await asyncio.to_thread(
        oauth_connections.refresh_tokens,
        user_id=user_id,
        provider="whoop",
        access_token=new_access,
        refresh_token=new_refresh,
        expires_at=new_expires,
    )
    return new_access

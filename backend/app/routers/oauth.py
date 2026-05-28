"""OAuth endpoints — connection lifecycle for Strava and Whoop.

Flow:
  1. Frontend (authenticated)  GET  /api/oauth/{provider}/start?redirect_to=/settings
     → returns {authorize_url}; we mint a signed state token that carries
       user_id + provider + redirect_to + 10-min exp.
  2. Frontend  window.location = authorize_url
  3. Provider  → user authorizes → 302 to /api/oauth/{provider}/callback
  4. Backend (this module) verifies state, exchanges code, encrypts tokens,
     upserts oauth_connections, 302s the browser back to {FRONTEND_URL}{redirect_to}
     with `?oauth_connected={provider}` or `?oauth_error=...`.
  5. Frontend  invalidates the `connections` query.

`/api/oauth/connections` returns the safe public status for both providers.
`/api/oauth/{provider}/disconnect` revokes upstream (best-effort) and drops the row.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from typing import Literal

import httpx
from fastapi import APIRouter, Query, status
from fastapi.responses import RedirectResponse

from app.core.config import get_settings
from app.core.oauth_state import issue_state, sanitize_redirect, verify_state
from app.core.security import CurrentUser
from app.models.schemas import (
    OAuthAuthorizeUrl,
    OAuthConnectionsStatus,
    OAuthConnectionStatus,
)
from app.services import oauth_connections, strava_client, whoop_client

logger = logging.getLogger(__name__)
router = APIRouter()

Provider = Literal["strava", "whoop"]


# ---------- helpers ----------


def _status_from_row(provider: Provider, row: dict | None) -> OAuthConnectionStatus:
    if not row:
        return OAuthConnectionStatus(provider=provider, connected=False)
    exp_raw = row.get("expires_at")
    expires_at = (
        datetime.fromisoformat(exp_raw.replace("Z", "+00:00"))
        if isinstance(exp_raw, str)
        else None
    )
    return OAuthConnectionStatus(
        provider=provider,
        connected=True,
        expires_at=expires_at,
        scope=row.get("scope"),
        provider_user_id=row.get("provider_user_id"),
    )


def _frontend_redirect(path: str, params: dict[str, str]) -> RedirectResponse:
    base = get_settings().frontend_url.rstrip("/")
    query = "&".join(f"{k}={v}" for k, v in params.items())
    sep = "&" if "?" in path else "?"
    target = f"{base}{path}{sep}{query}" if query else f"{base}{path}"
    return RedirectResponse(target)


# ---------- status ----------


@router.get("/connections", response_model=OAuthConnectionsStatus)
async def get_connections(user: CurrentUser) -> OAuthConnectionsStatus:
    rows = await asyncio.to_thread(oauth_connections.list_connections_safe, user.id)
    return OAuthConnectionsStatus(
        strava=_status_from_row("strava", rows.get("strava")),
        whoop=_status_from_row("whoop", rows.get("whoop")),
    )


# ---------- Strava ----------


@router.get("/strava/start", response_model=OAuthAuthorizeUrl)
async def strava_start(
    user: CurrentUser, redirect_to: str = Query("/settings")
) -> OAuthAuthorizeUrl:
    state = issue_state(
        user_id=user.id,
        provider="strava",
        redirect_to=sanitize_redirect(redirect_to),
    )
    return OAuthAuthorizeUrl(authorize_url=strava_client.build_authorize_url(state))


@router.get("/strava/callback", include_in_schema=False)
async def strava_callback(
    code: str | None = None, state: str | None = None, error: str | None = None
) -> RedirectResponse:
    return await _handle_callback(
        provider="strava",
        code=code,
        state=state,
        error=error,
        exchange=strava_client.exchange_code,
        extract=_extract_strava_tokens,
    )


@router.post("/strava/disconnect", status_code=status.HTTP_204_NO_CONTENT)
async def strava_disconnect(user: CurrentUser) -> None:
    await _disconnect(user.id, "strava", strava_client.revoke_token)


# ---------- Whoop ----------


@router.get("/whoop/start", response_model=OAuthAuthorizeUrl)
async def whoop_start(
    user: CurrentUser, redirect_to: str = Query("/settings")
) -> OAuthAuthorizeUrl:
    state = issue_state(
        user_id=user.id,
        provider="whoop",
        redirect_to=sanitize_redirect(redirect_to),
    )
    return OAuthAuthorizeUrl(authorize_url=whoop_client.build_authorize_url(state))


@router.get("/whoop/callback", include_in_schema=False)
async def whoop_callback(
    code: str | None = None, state: str | None = None, error: str | None = None
) -> RedirectResponse:
    return await _handle_callback(
        provider="whoop",
        code=code,
        state=state,
        error=error,
        exchange=whoop_client.exchange_code,
        extract=_extract_whoop_tokens,
    )


@router.post("/whoop/disconnect", status_code=status.HTTP_204_NO_CONTENT)
async def whoop_disconnect(user: CurrentUser) -> None:
    await _disconnect(user.id, "whoop", whoop_client.revoke_token)


# ---------- shared callback machinery ----------


def _extract_strava_tokens(payload: dict) -> dict:
    """Map Strava /token response to a uniform record."""
    expires_at_unix = payload.get("expires_at")
    expires_at = (
        datetime.fromtimestamp(expires_at_unix, tz=UTC)
        if isinstance(expires_at_unix, (int, float))
        else None
    )
    athlete = payload.get("athlete") or {}
    athlete_id = athlete.get("id")
    return {
        "access_token": payload["access_token"],
        "refresh_token": payload["refresh_token"],
        "expires_at": expires_at,
        "scope": payload.get("scope") or strava_client.STRAVA_SCOPES,
        "provider_user_id": str(athlete_id) if athlete_id is not None else None,
    }


def _extract_whoop_tokens(payload: dict) -> dict:
    """Map Whoop /token response to a uniform record. expires_in is seconds."""
    expires_in = payload.get("expires_in")
    expires_at = (
        datetime.now(UTC).replace(microsecond=0) + timedelta(seconds=int(expires_in))
        if isinstance(expires_in, (int, float))
        else None
    )
    return {
        "access_token": payload["access_token"],
        "refresh_token": payload["refresh_token"],
        "expires_at": expires_at,
        "scope": payload.get("scope") or whoop_client.WHOOP_SCOPES,
        # We resolve provider_user_id with a follow-up /v2/user/profile/basic
        # call in _handle_callback for whoop.
        "provider_user_id": None,
    }


async def _handle_callback(
    *,
    provider: Provider,
    code: str | None,
    state: str | None,
    error: str | None,
    exchange,
    extract,
) -> RedirectResponse:
    # Default landing path if anything goes wrong before we can read state.
    default_path = "/settings"

    if error:
        return _frontend_redirect(default_path, {"oauth_error": error})
    if not code or not state:
        return _frontend_redirect(default_path, {"oauth_error": "missing_params"})

    try:
        payload = verify_state(state, provider)
    except ValueError:
        return _frontend_redirect(default_path, {"oauth_error": "invalid_state"})

    user_id: str = payload["sub"]
    redirect_to: str = sanitize_redirect(payload.get("redirect_to"))

    try:
        token_payload = await exchange(code)
    except httpx.HTTPError:
        logger.exception("%s code exchange failed", provider)
        return _frontend_redirect(redirect_to, {"oauth_error": "exchange_failed"})

    try:
        record = extract(token_payload)
    except KeyError:
        logger.exception("%s token payload missing required fields", provider)
        return _frontend_redirect(redirect_to, {"oauth_error": "bad_payload"})

    # Whoop doesn't ship the user id in the token response — fetch it once.
    if provider == "whoop" and record.get("provider_user_id") is None:
        try:
            basic = await whoop_client.fetch_user_basic_profile(record["access_token"])
            user_id_remote = basic.get("user_id")
            record["provider_user_id"] = (
                str(user_id_remote) if user_id_remote is not None else None
            )
        except httpx.HTTPError:
            logger.warning("whoop profile lookup failed; storing without provider_user_id")

    try:
        await asyncio.to_thread(
            oauth_connections.upsert_connection,
            user_id=user_id,
            provider=provider,
            **record,
        )
    except Exception:
        logger.exception("%s upsert_connection failed", provider)
        return _frontend_redirect(redirect_to, {"oauth_error": "persist_failed"})

    return _frontend_redirect(redirect_to, {"oauth_connected": provider})


async def _disconnect(user_id: str, provider: Provider, revoke) -> None:
    try:
        access, _refresh, _exp = await asyncio.to_thread(
            oauth_connections.get_decrypted_tokens, user_id, provider
        )
    except LookupError:
        return  # idempotent — nothing to disconnect

    await revoke(access)  # best effort, returns bool
    await asyncio.to_thread(oauth_connections.delete_connection, user_id, provider)

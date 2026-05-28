"""Signed `state` token for the OAuth redirect dance.

The token is a short-lived HS256 JWT that carries:
  - the user_id (so the callback knows whose tokens to store)
  - the provider it's good for ("strava" or "whoop")
  - the relative frontend path to land on after the callback
  - an expiry (10 minutes)

We sign it with the Supabase JWT secret because we already trust it and
it's not used for anything else here. CSRF is mitigated because forgery
requires the secret, and replay is bounded by the 10-minute exp.
"""

from __future__ import annotations

import time
from typing import Literal

import jwt

from app.core.config import get_settings

OAUTH_STATE_TTL_SECONDS = 600
Provider = Literal["strava", "whoop"]


def issue_state(*, user_id: str, provider: Provider, redirect_to: str) -> str:
    settings = get_settings()
    payload = {
        "purpose": "oauth_state",
        "sub": user_id,
        "provider": provider,
        "redirect_to": redirect_to,
        "exp": int(time.time()) + OAUTH_STATE_TTL_SECONDS,
    }
    return jwt.encode(payload, settings.supabase_jwt_secret, algorithm="HS256")


def verify_state(token: str, expected_provider: Provider) -> dict:
    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
        )
    except jwt.InvalidTokenError as exc:
        raise ValueError("Invalid or expired OAuth state") from exc

    if payload.get("purpose") != "oauth_state":
        raise ValueError("OAuth state token has wrong purpose")
    if payload.get("provider") != expected_provider:
        raise ValueError("OAuth state token provider mismatch")
    if not payload.get("sub"):
        raise ValueError("OAuth state token missing user id")
    return payload


def sanitize_redirect(path: str | None, default: str = "/settings") -> str:
    """Only allow same-origin relative paths to prevent open redirect."""
    if not path or not path.startswith("/") or path.startswith("//"):
        return default
    return path

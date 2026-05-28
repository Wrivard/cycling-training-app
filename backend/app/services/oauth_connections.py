"""DB layer for `public.oauth_connections`.

Tokens are encrypted at rest with Fernet (see core/token_crypto.py). The
service-role Supabase client bypasses RLS, but our routers always pass
through `CurrentUser` and filter by user_id explicitly — defense in depth.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Literal

from app.core.supabase import get_admin_client
from app.core.token_crypto import decrypt, encrypt

Provider = Literal["strava", "whoop"]
OAUTH_TABLE = "oauth_connections"

# Columns safe to expose to the frontend.
_SAFE_COLUMNS = "provider, expires_at, scope, provider_user_id, updated_at"


def get_connection(user_id: str, provider: Provider) -> dict[str, Any] | None:
    """Return the full row (including encrypted tokens) or None."""
    admin = get_admin_client()
    response = (
        admin.table(OAUTH_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .eq("provider", provider)
        .maybe_single()
        .execute()
    )
    return response.data if response and response.data else None


def list_connections_safe(user_id: str) -> dict[str, dict[str, Any]]:
    """Return public metadata for every provider the user has connected."""
    admin = get_admin_client()
    response = (
        admin.table(OAUTH_TABLE)
        .select(_SAFE_COLUMNS)
        .eq("user_id", user_id)
        .execute()
    )
    return {row["provider"]: row for row in (response.data or [])}


def upsert_connection(
    *,
    user_id: str,
    provider: Provider,
    access_token: str,
    refresh_token: str,
    expires_at: datetime | None,
    scope: str | None,
    provider_user_id: str | None,
) -> None:
    """Encrypt tokens and upsert by (user_id, provider)."""
    admin = get_admin_client()
    admin.table(OAUTH_TABLE).upsert(
        {
            "user_id": user_id,
            "provider": provider,
            "access_token": encrypt(access_token),
            "refresh_token": encrypt(refresh_token),
            "expires_at": expires_at.isoformat() if expires_at else None,
            "scope": scope,
            "provider_user_id": provider_user_id,
        },
        on_conflict="user_id,provider",
    ).execute()


def delete_connection(user_id: str, provider: Provider) -> None:
    admin = get_admin_client()
    admin.table(OAUTH_TABLE).delete().eq("user_id", user_id).eq("provider", provider).execute()


def get_decrypted_tokens(
    user_id: str, provider: Provider
) -> tuple[str, str, datetime | None]:
    """Return `(access_token, refresh_token, expires_at)` in plain text.

    Raises LookupError if no row exists.
    """
    row = get_connection(user_id, provider)
    if not row:
        raise LookupError(f"No {provider} connection for user {user_id}")
    access = decrypt(row["access_token"])
    refresh = decrypt(row["refresh_token"])
    exp_raw = row.get("expires_at")
    expires_at = (
        datetime.fromisoformat(exp_raw.replace("Z", "+00:00"))
        if isinstance(exp_raw, str)
        else None
    )
    return access, refresh, expires_at

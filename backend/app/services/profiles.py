"""Profile service — read/update `public.profiles` rows.

We use the Supabase admin client (service-role key, RLS-bypassing) and trust
the FastAPI dependency `CurrentUser` to scope every call to the authenticated
user. RLS still protects against any path that forgets to filter by user_id;
this layer is the "checked second" defense.

`supabase-py` is sync, so callers wrap us with `asyncio.to_thread` to keep the
event loop responsive.
"""

from __future__ import annotations

from typing import Any

from app.core.supabase import get_admin_client

PROFILES_TABLE = "profiles"


def get_profile(user_id: str) -> dict[str, Any] | None:
    """Return the profile row for `user_id` or None if it doesn't exist yet."""
    admin = get_admin_client()
    response = (
        admin.table(PROFILES_TABLE)
        .select("id, display_name, created_at")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    return response.data if response and response.data else None


def update_profile_display_name(user_id: str, display_name: str) -> dict[str, Any]:
    """Set `display_name` on the user's profile row. Returns the updated row."""
    admin = get_admin_client()
    response = (
        admin.table(PROFILES_TABLE)
        .update({"display_name": display_name})
        .eq("id", user_id)
        .execute()
    )
    rows = response.data or []
    if not rows:
        raise LookupError(f"profile not found for user {user_id}")
    return rows[0]

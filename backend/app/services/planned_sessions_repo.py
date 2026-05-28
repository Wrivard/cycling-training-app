"""DB layer for `public.planned_sessions`."""

from __future__ import annotations

from datetime import date
from typing import Any

from app.core.supabase import get_admin_client

PLANNED_SESSIONS_TABLE = "planned_sessions"


def list_in_range(user_id: str, start: date, end: date) -> list[dict[str, Any]]:
    admin = get_admin_client()
    response = (
        admin.table(PLANNED_SESSIONS_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .gte("date", start.isoformat())
        .lte("date", end.isoformat())
        .order("date", desc=False)
        .execute()
    )
    return response.data or []


def get_one(user_id: str, session_id: str) -> dict[str, Any] | None:
    admin = get_admin_client()
    response = (
        admin.table(PLANNED_SESSIONS_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .eq("id", session_id)
        .maybe_single()
        .execute()
    )
    return response.data if response and response.data else None


def create(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    admin = get_admin_client()
    body = {**payload, "user_id": user_id}
    response = admin.table(PLANNED_SESSIONS_TABLE).insert(body).execute()
    rows = response.data or []
    if not rows:
        raise RuntimeError("planned_sessions insert returned no rows")
    return rows[0]


def update(user_id: str, session_id: str, patch: dict[str, Any]) -> dict[str, Any]:
    if not patch:
        existing = get_one(user_id, session_id)
        if not existing:
            raise LookupError(f"planned_session {session_id} not found")
        return existing

    admin = get_admin_client()
    response = (
        admin.table(PLANNED_SESSIONS_TABLE)
        .update(patch)
        .eq("user_id", user_id)
        .eq("id", session_id)
        .execute()
    )
    rows = response.data or []
    if not rows:
        raise LookupError(f"planned_session {session_id} not found")
    return rows[0]


def delete(user_id: str, session_id: str) -> None:
    admin = get_admin_client()
    admin.table(PLANNED_SESSIONS_TABLE).delete().eq("user_id", user_id).eq(
        "id", session_id
    ).execute()

"""DB layer for `public.routes`."""

from __future__ import annotations

from typing import Any

from app.core.supabase import get_admin_client

ROUTES_TABLE = "routes"


def list_for_user(user_id: str) -> list[dict[str, Any]]:
    admin = get_admin_client()
    response = (
        admin.table(ROUTES_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return response.data or []


def get_one(user_id: str, route_id: str) -> dict[str, Any] | None:
    admin = get_admin_client()
    response = (
        admin.table(ROUTES_TABLE)
        .select("*")
        .eq("user_id", user_id)
        .eq("id", route_id)
        .maybe_single()
        .execute()
    )
    return response.data if response and response.data else None


def create(user_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    admin = get_admin_client()
    body = {**payload, "user_id": user_id}
    response = admin.table(ROUTES_TABLE).insert(body).execute()
    rows = response.data or []
    if not rows:
        raise RuntimeError("routes insert returned no rows")
    return rows[0]


def delete(user_id: str, route_id: str) -> None:
    admin = get_admin_client()
    admin.table(ROUTES_TABLE).delete().eq("user_id", user_id).eq("id", route_id).execute()

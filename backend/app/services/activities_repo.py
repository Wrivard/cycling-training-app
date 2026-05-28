"""DB layer for `public.activities`."""

from __future__ import annotations

from datetime import date, datetime, time
from typing import Any

from app.core.supabase import get_admin_client

ACTIVITIES_TABLE = "activities"

# Public-facing columns. Excludes raw payload (heavy, server-only).
_SAFE_COLUMNS = (
    "id, user_id, strava_id, name, type, start_date, distance_km,"
    " moving_time_s, elevation_gain_m, average_speed_kmh, average_hr,"
    " max_hr, polyline, synced_at"
)


def list_in_range(user_id: str, start: date, end: date) -> list[dict[str, Any]]:
    """List activities whose start_date falls within [start, end] (inclusive)."""
    admin = get_admin_client()
    start_dt = datetime.combine(start, time.min).isoformat()
    end_dt = datetime.combine(end, time.max).isoformat()
    response = (
        admin.table(ACTIVITIES_TABLE)
        .select(_SAFE_COLUMNS)
        .eq("user_id", user_id)
        .gte("start_date", start_dt)
        .lte("start_date", end_dt)
        .order("start_date", desc=True)
        .execute()
    )
    return response.data or []


def get_one(user_id: str, activity_id: str) -> dict[str, Any] | None:
    admin = get_admin_client()
    response = (
        admin.table(ACTIVITIES_TABLE)
        .select(_SAFE_COLUMNS)
        .eq("user_id", user_id)
        .eq("id", activity_id)
        .maybe_single()
        .execute()
    )
    return response.data if response and response.data else None

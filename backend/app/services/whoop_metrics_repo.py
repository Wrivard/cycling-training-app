"""DB layer for `public.whoop_metrics`."""

from __future__ import annotations

from datetime import date
from typing import Any

from app.core.supabase import get_admin_client

WHOOP_METRICS_TABLE = "whoop_metrics"

_SAFE_COLUMNS = (
    "id, user_id, date, recovery_score, hrv_ms, resting_hr, strain,"
    " sleep_performance, sleep_duration_min, synced_at"
)


def list_in_range(user_id: str, start: date, end: date) -> list[dict[str, Any]]:
    admin = get_admin_client()
    response = (
        admin.table(WHOOP_METRICS_TABLE)
        .select(_SAFE_COLUMNS)
        .eq("user_id", user_id)
        .gte("date", start.isoformat())
        .lte("date", end.isoformat())
        .order("date", desc=True)
        .execute()
    )
    return response.data or []

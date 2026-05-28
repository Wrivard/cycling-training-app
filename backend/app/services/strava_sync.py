"""Strava sync — pull recent rides, upsert into `public.activities` by strava_id.

Per Strava TOS, this data is owned by the user, isolated by RLS, and MUST
NEVER feed an AI/ML model. The Pydantic schema returned to the frontend
is intentionally small (counts + timestamps); raw payloads stay server-side.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.supabase import get_admin_client
from app.models.schemas import SyncResult
from app.services.oauth_refresh import ensure_fresh_strava_token
from app.services.strava_client import fetch_athlete_activities

logger = logging.getLogger(__name__)

ACTIVITIES_TABLE = "activities"
ALLOWED_TYPES = {"Ride", "VirtualRide"}
DEFAULT_WINDOW_DAYS = 30


def _to_row(user_id: str, activity: dict[str, Any]) -> dict[str, Any]:
    """Map a Strava activity summary to a `public.activities` row."""
    distance_m = float(activity.get("distance") or 0.0)
    moving_time_s = int(activity.get("moving_time") or 0)
    elevation_m = float(activity.get("total_elevation_gain") or 0.0)
    avg_speed_ms = activity.get("average_speed")
    polyline = (activity.get("map") or {}).get("summary_polyline")

    return {
        "user_id": user_id,
        "strava_id": int(activity["id"]),
        "name": activity.get("name") or "",
        "type": activity.get("type") or "Ride",
        "start_date": activity["start_date"],
        "distance_km": round(distance_m / 1000.0, 3),
        "moving_time_s": moving_time_s,
        "elevation_gain_m": round(elevation_m, 1),
        "average_speed_kmh": (
            round(float(avg_speed_ms) * 3.6, 2) if avg_speed_ms is not None else None
        ),
        "average_hr": activity.get("average_heartrate"),
        "max_hr": activity.get("max_heartrate"),
        "polyline": polyline,
        "raw": activity,
        "synced_at": datetime.now(UTC).isoformat(),
    }


def _upsert_rows(rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0
    admin = get_admin_client()
    response = admin.table(ACTIVITIES_TABLE).upsert(
        rows, on_conflict="user_id,strava_id"
    ).execute()
    return len(response.data or rows)


async def run_strava_sync(user_id: str, *, days: int = DEFAULT_WINDOW_DAYS) -> SyncResult:
    started_at = datetime.now(UTC)
    access_token = await ensure_fresh_strava_token(user_id)
    after_unix = int((started_at - timedelta(days=days)).timestamp())

    activities = await fetch_athlete_activities(access_token, after_unix=after_unix)
    bike_activities = [a for a in activities if a.get("type") in ALLOWED_TYPES]
    rows = [_to_row(user_id, a) for a in bike_activities]

    upserted = await asyncio.to_thread(_upsert_rows, rows)
    finished_at = datetime.now(UTC)

    logger.info(
        "strava sync user=%s fetched=%d kept=%d upserted=%d",
        user_id,
        len(activities),
        len(bike_activities),
        upserted,
    )

    return SyncResult(
        provider="strava",
        fetched=len(activities),
        upserted=upserted,
        started_at=started_at,
        finished_at=finished_at,
    )

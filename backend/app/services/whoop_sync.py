"""Whoop sync — pull recovery + strain + sleep, aggregate by date, upsert.

We key every row on (user_id, date). Whoop returns three independent
collections (recovery, cycle, sleep); we merge them in Python on the date
extracted from each record's `created_at` (recovery) or `end` (cycle/sleep).
"""

from __future__ import annotations

import asyncio
import logging
from datetime import UTC, date, datetime, timedelta
from typing import Any

from app.core.supabase import get_admin_client
from app.models.schemas import SyncResult
from app.services.oauth_refresh import ensure_fresh_whoop_token
from app.services.whoop_client import fetch_cycles, fetch_recoveries, fetch_sleeps

logger = logging.getLogger(__name__)

WHOOP_METRICS_TABLE = "whoop_metrics"
DEFAULT_WINDOW_DAYS = 30


def _date_of(value: Any) -> date | None:
    if not isinstance(value, str):
        return None
    try:
        # Whoop timestamps look like "2026-05-26T18:00:00.000Z"
        return datetime.fromisoformat(value.replace("Z", "+00:00")).date()
    except ValueError:
        return None


def _merge(
    into: dict[date, dict[str, Any]],
    the_date: date | None,
    payload: dict[str, Any],
) -> None:
    if the_date is None:
        return
    into.setdefault(the_date, {}).update({k: v for k, v in payload.items() if v is not None})


def _build_rows(
    user_id: str,
    *,
    recoveries: list[dict[str, Any]],
    cycles: list[dict[str, Any]],
    sleeps: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """Fold the three collections into one row per date."""
    by_date: dict[date, dict[str, Any]] = {}

    for record in recoveries:
        score = record.get("score") or {}
        _merge(
            by_date,
            _date_of(record.get("created_at")),
            {
                "recovery_score": score.get("recovery_score"),
                "hrv_ms": score.get("hrv_rmssd_milli"),
                "resting_hr": score.get("resting_heart_rate"),
            },
        )

    for record in cycles:
        score = record.get("score") or {}
        _merge(
            by_date,
            _date_of(record.get("end") or record.get("start")),
            {"strain": score.get("strain")},
        )

    for record in sleeps:
        score = record.get("score") or {}
        # Sleep duration: prefer total_in_bed_time_milli; fall back to (end - start).
        stage_summary = score.get("stage_summary") or {}
        duration_ms = stage_summary.get("total_in_bed_time_milli")
        duration_min: float | None = None
        if isinstance(duration_ms, (int, float)):
            duration_min = round(duration_ms / 60_000.0, 1)
        else:
            start = record.get("start")
            end = record.get("end")
            if isinstance(start, str) and isinstance(end, str):
                try:
                    s = datetime.fromisoformat(start.replace("Z", "+00:00"))
                    e = datetime.fromisoformat(end.replace("Z", "+00:00"))
                    duration_min = round((e - s).total_seconds() / 60.0, 1)
                except ValueError:
                    duration_min = None

        _merge(
            by_date,
            _date_of(record.get("end")),
            {
                "sleep_performance": score.get("sleep_performance_percentage"),
                "sleep_duration_min": duration_min,
            },
        )

    now_iso = datetime.now(UTC).isoformat()
    rows: list[dict[str, Any]] = []
    for the_date, metrics in by_date.items():
        rows.append(
            {
                "user_id": user_id,
                "date": the_date.isoformat(),
                "recovery_score": metrics.get("recovery_score"),
                "hrv_ms": metrics.get("hrv_ms"),
                "resting_hr": metrics.get("resting_hr"),
                "strain": metrics.get("strain"),
                "sleep_performance": metrics.get("sleep_performance"),
                "sleep_duration_min": metrics.get("sleep_duration_min"),
                "raw": {
                    "recoveries": [
                        r for r in recoveries if _date_of(r.get("created_at")) == the_date
                    ],
                    "cycles": [c for c in cycles if _date_of(c.get("end")) == the_date],
                    "sleeps": [s for s in sleeps if _date_of(s.get("end")) == the_date],
                },
                "synced_at": now_iso,
            }
        )
    return rows


def _upsert_rows(rows: list[dict[str, Any]]) -> int:
    if not rows:
        return 0
    admin = get_admin_client()
    response = admin.table(WHOOP_METRICS_TABLE).upsert(
        rows, on_conflict="user_id,date"
    ).execute()
    return len(response.data or rows)


async def run_whoop_sync(user_id: str, *, days: int = DEFAULT_WINDOW_DAYS) -> SyncResult:
    started_at = datetime.now(UTC)
    access_token = await ensure_fresh_whoop_token(user_id)
    end_date = started_at.date()
    start_date = end_date - timedelta(days=days)

    recoveries, cycles, sleeps = await asyncio.gather(
        fetch_recoveries(access_token, start=start_date, end=end_date),
        fetch_cycles(access_token, start=start_date, end=end_date),
        fetch_sleeps(access_token, start=start_date, end=end_date),
    )

    rows = _build_rows(user_id, recoveries=recoveries, cycles=cycles, sleeps=sleeps)
    upserted = await asyncio.to_thread(_upsert_rows, rows)
    finished_at = datetime.now(UTC)

    fetched_total = len(recoveries) + len(cycles) + len(sleeps)
    logger.info(
        "whoop sync user=%s recoveries=%d cycles=%d sleeps=%d rows=%d",
        user_id,
        len(recoveries),
        len(cycles),
        len(sleeps),
        upserted,
    )

    return SyncResult(
        provider="whoop",
        fetched=fetched_total,
        upserted=upserted,
        started_at=started_at,
        finished_at=finished_at,
    )

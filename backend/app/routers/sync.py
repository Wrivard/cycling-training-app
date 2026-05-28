"""Manual sync endpoints — Strava activities and Whoop daily metrics."""

from __future__ import annotations

import logging

import httpx
from fastapi import APIRouter, HTTPException, status

from app.core.security import CurrentUser
from app.models.schemas import SyncResult
from app.services.strava_client import StravaRateLimitError
from app.services.strava_sync import run_strava_sync
from app.services.whoop_sync import run_whoop_sync

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/strava", response_model=SyncResult)
async def sync_strava(user: CurrentUser) -> SyncResult:
    """Refresh the Strava token, pull recent Ride/VirtualRide activities, upsert by strava_id.

    Per Strava terms, the activity payload is shown only to the owner and is
    never fed into any AI/ML model.
    """
    try:
        return await run_strava_sync(user.id)
    except LookupError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="strava_not_connected") from exc
    except StravaRateLimitError as exc:
        # Surface usage info so the frontend can render a "try again in X min" tip.
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={
                "error": "strava_rate_limit",
                "usage_short": exc.usage_short,
                "limit_short": exc.limit_short,
                "usage_daily": exc.usage_daily,
                "limit_daily": exc.limit_daily,
            },
        ) from exc
    except httpx.HTTPStatusError as exc:
        logger.exception("strava sync upstream error")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="strava_upstream_error",
        ) from exc


@router.post("/whoop", response_model=SyncResult)
async def sync_whoop(user: CurrentUser) -> SyncResult:
    """Refresh the Whoop token, pull recovery/sleep/cycle, upsert by (user, date)."""
    try:
        return await run_whoop_sync(user.id)
    except LookupError as exc:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="whoop_not_connected") from exc
    except httpx.HTTPStatusError as exc:
        logger.exception("whoop sync upstream error")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="whoop_upstream_error",
        ) from exc

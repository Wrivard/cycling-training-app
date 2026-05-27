"""Manual sync endpoints — Strava activities and Whoop daily metrics."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.security import CurrentUser
from app.models.schemas import SyncResult

router = APIRouter()


@router.post("/strava", response_model=SyncResult)
async def sync_strava(user: CurrentUser) -> SyncResult:
    """Refresh the Strava token, pull recent Ride/VirtualRide activities, upsert by strava_id.

    Note: per Strava terms, the activity payload here is shown only to the owner
    and is never fed into any AI/ML model.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Strava sync — implemented in step 4",
    )


@router.post("/whoop", response_model=SyncResult)
async def sync_whoop(user: CurrentUser) -> SyncResult:
    """Refresh the Whoop token, pull recovery/sleep/cycle, upsert by (user, date)."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Whoop sync — implemented in step 4",
    )

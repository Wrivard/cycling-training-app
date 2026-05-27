"""OAuth endpoints for Strava and Whoop (start + callback)."""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from app.core.security import CurrentUser

router = APIRouter()


# ---------- Strava ----------


@router.get("/strava/start")
async def strava_start(user: CurrentUser):
    """Return the Strava authorization URL for the current user.

    Implementation lands in step 3 of the build plan.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Strava OAuth start — implemented in step 3",
    )


@router.get("/strava/callback")
async def strava_callback(code: str, state: str):
    """Exchange the Strava authorization code for tokens and persist them."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Strava OAuth callback — implemented in step 3",
    )


@router.post("/strava/disconnect")
async def strava_disconnect(user: CurrentUser):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Strava disconnect — implemented in step 3",
    )


# ---------- Whoop ----------


@router.get("/whoop/start")
async def whoop_start(user: CurrentUser):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Whoop OAuth start — implemented in step 3",
    )


@router.get("/whoop/callback")
async def whoop_callback(code: str, state: str):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Whoop OAuth callback — implemented in step 3",
    )


@router.post("/whoop/disconnect")
async def whoop_disconnect(user: CurrentUser):
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Whoop disconnect — implemented in step 3",
    )

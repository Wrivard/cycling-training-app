"""Read-only endpoints for Strava activities (sync writes; we read for the calendar)."""

from __future__ import annotations

import asyncio
from datetime import date as Date  # noqa: N812 — match schemas.py alias
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, status

from app.core.security import CurrentUser
from app.models.schemas import Activity
from app.services import activities_repo

router = APIRouter()

StartDate = Annotated[Date, Query(description="Inclusive start date (YYYY-MM-DD)")]
EndDate = Annotated[Date, Query(description="Inclusive end date (YYYY-MM-DD)")]


@router.get("", response_model=list[Activity])
async def list_activities(
    user: CurrentUser,
    start: StartDate,
    end: EndDate,
) -> list[Activity]:
    if end < start:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="end_before_start")
    rows = await asyncio.to_thread(activities_repo.list_in_range, user.id, start, end)
    return [Activity.model_validate(r) for r in rows]

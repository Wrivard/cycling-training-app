"""Planned training sessions — CRUD + Strava activity matching."""

from __future__ import annotations

import asyncio
from datetime import date as Date  # noqa: N812 — match schemas.py alias
from typing import Annotated

from fastapi import APIRouter, HTTPException, Query, Response, status

from app.core.security import CurrentUser
from app.models.schemas import (
    Activity,
    PlannedSession,
    PlannedSessionCreate,
    PlannedSessionUpdate,
    SessionComparison,
)
from app.services import activities_repo, planned_sessions_repo

router = APIRouter()

StartDate = Annotated[Date, Query(description="Inclusive start date (YYYY-MM-DD)")]
EndDate = Annotated[Date, Query(description="Inclusive end date (YYYY-MM-DD)")]


def _to_session(row: dict) -> PlannedSession:
    return PlannedSession.model_validate(row)


def _to_activity(row: dict) -> Activity:
    return Activity.model_validate(row)


@router.get("", response_model=list[PlannedSession])
async def list_sessions(
    user: CurrentUser,
    start: StartDate,
    end: EndDate,
) -> list[PlannedSession]:
    if end < start:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="end_before_start")
    rows = await asyncio.to_thread(
        planned_sessions_repo.list_in_range, user.id, start, end
    )
    return [_to_session(r) for r in rows]


@router.post("", response_model=PlannedSession, status_code=status.HTTP_201_CREATED)
async def create_session(payload: PlannedSessionCreate, user: CurrentUser) -> PlannedSession:
    body = payload.model_dump(mode="json")
    row = await asyncio.to_thread(planned_sessions_repo.create, user.id, body)
    return _to_session(row)


@router.patch("/{session_id}", response_model=PlannedSession)
async def update_session(
    session_id: str,
    payload: PlannedSessionUpdate,
    user: CurrentUser,
) -> PlannedSession:
    patch = payload.model_dump(mode="json", exclude_unset=True)
    try:
        row = await asyncio.to_thread(planned_sessions_repo.update, user.id, session_id, patch)
    except LookupError as exc:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="session_not_found") from exc
    return _to_session(row)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, user: CurrentUser) -> Response:
    await asyncio.to_thread(planned_sessions_repo.delete, user.id, session_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{session_id}/match/{activity_id}", response_model=SessionComparison)
async def match_session_to_activity(
    session_id: str,
    activity_id: str,
    user: CurrentUser,
) -> SessionComparison:
    session_row = await asyncio.to_thread(planned_sessions_repo.get_one, user.id, session_id)
    if not session_row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="session_not_found")

    activity_row = await asyncio.to_thread(activities_repo.get_one, user.id, activity_id)
    if not activity_row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="activity_not_found")

    # Persist the link.
    updated_row = await asyncio.to_thread(
        planned_sessions_repo.update,
        user.id,
        session_id,
        {"completed_activity_id": activity_id},
    )
    session = _to_session(updated_row)
    activity = _to_activity(activity_row)

    delta_distance = (
        activity.distance_km - session.target_distance_km
        if session.target_distance_km is not None
        else None
    )
    actual_minutes = activity.moving_time_s / 60.0
    delta_duration = (
        actual_minutes - session.target_duration_min
        if session.target_duration_min is not None
        else None
    )
    # No target_elevation in the schema — we surface the activity's elevation
    # gain as the delta against an implicit 0 baseline only when explicitly
    # asked. For now, leave None so the UI knows there's nothing to compare.

    return SessionComparison(
        session=session,
        activity=activity,
        delta_distance_km=round(delta_distance, 2) if delta_distance is not None else None,
        delta_duration_min=round(delta_duration, 1) if delta_duration is not None else None,
        delta_elevation_m=None,
    )

"""Planned training sessions — CRUD + Strava activity matching."""

from datetime import date as Date  # noqa: N812 — match schemas.py alias

from fastapi import APIRouter, HTTPException, status

from app.core.security import CurrentUser
from app.models.schemas import (
    PlannedSession,
    PlannedSessionCreate,
    PlannedSessionUpdate,
    SessionComparison,
)

router = APIRouter()


@router.get("", response_model=list[PlannedSession])
async def list_sessions(
    user: CurrentUser,
    start: Date | None = None,
    end: Date | None = None,
) -> list[PlannedSession]:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="List sessions — implemented in step 5",
    )


@router.post("", response_model=PlannedSession, status_code=status.HTTP_201_CREATED)
async def create_session(payload: PlannedSessionCreate, user: CurrentUser) -> PlannedSession:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Create session — implemented in step 5",
    )


@router.patch("/{session_id}", response_model=PlannedSession)
async def update_session(
    session_id: str,
    payload: PlannedSessionUpdate,
    user: CurrentUser,
) -> PlannedSession:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Update session — implemented in step 5",
    )


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(session_id: str, user: CurrentUser) -> None:
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Delete session — implemented in step 5",
    )


@router.post("/{session_id}/match/{activity_id}", response_model=SessionComparison)
async def match_session_to_activity(
    session_id: str,
    activity_id: str,
    user: CurrentUser,
) -> SessionComparison:
    """Link a planned session to a Strava activity and return a planned-vs-actual comparison."""
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Match session to activity — implemented in step 7",
    )

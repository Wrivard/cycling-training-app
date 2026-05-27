"""User-scoped endpoints (currently just the authenticated profile)."""

from __future__ import annotations

from fastapi import APIRouter

from app.core.security import CurrentUser
from app.models.schemas import UserProfile

router = APIRouter()


@router.get("/me", response_model=UserProfile)
async def get_me(user: CurrentUser) -> UserProfile:
    """Return the authenticated user (from the verified Supabase JWT)."""
    return UserProfile(id=user.id, email=user.email)

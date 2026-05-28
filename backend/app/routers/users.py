"""User-scoped endpoints — profile read + update."""

from __future__ import annotations

import asyncio

from fastapi import APIRouter

from app.core.security import CurrentUser
from app.models.schemas import ProfileUpdate, UserProfile
from app.services.profiles import get_profile, update_profile_display_name

router = APIRouter()


@router.get("/me", response_model=UserProfile)
async def get_me(user: CurrentUser) -> UserProfile:
    """Return the authenticated user joined with their `profiles` row."""
    profile = await asyncio.to_thread(get_profile, user.id)
    display_name = profile.get("display_name") if profile else None
    return UserProfile(id=user.id, email=user.email, display_name=display_name)


@router.patch("/me/profile", response_model=UserProfile)
async def update_my_profile(payload: ProfileUpdate, user: CurrentUser) -> UserProfile:
    """Update the authenticated user's profile (currently just `display_name`)."""
    updated = await asyncio.to_thread(
        update_profile_display_name, user.id, payload.display_name.strip()
    )
    return UserProfile(
        id=user.id,
        email=user.email,
        display_name=updated.get("display_name"),
    )

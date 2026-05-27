"""JWT verification — validates Supabase-issued access tokens."""

from __future__ import annotations

from typing import Annotated

import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.config import Settings, get_settings

bearer_scheme = HTTPBearer(auto_error=True)


class AuthenticatedUser(BaseModel):
    """The fields we trust from a verified Supabase JWT."""

    id: str
    email: str | None = None


def _decode_supabase_jwt(token: str, secret: str) -> dict:
    try:
        return jwt.decode(
            token,
            secret,
            algorithms=["HS256"],
            audience="authenticated",
            options={"require": ["exp", "sub"]},
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        ) from exc


async def get_current_user(
    _request: Request,
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> AuthenticatedUser:
    payload = _decode_supabase_jwt(credentials.credentials, settings.supabase_jwt_secret)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )
    return AuthenticatedUser(id=user_id, email=payload.get("email"))


CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]

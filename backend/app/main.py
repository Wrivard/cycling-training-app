"""FastAPI application entry point."""

from __future__ import annotations

from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.routers import oauth, routes, sessions, sync, users


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """App lifespan — placeholder for future startup/shutdown hooks."""
    yield


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title="Cycling Training Planner API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(users.router, prefix="/api", tags=["users"])
    app.include_router(oauth.router, prefix="/api/oauth", tags=["oauth"])
    app.include_router(sync.router, prefix="/api/sync", tags=["sync"])
    app.include_router(routes.router, prefix="/api/routes", tags=["routes"])
    app.include_router(sessions.router, prefix="/api/sessions", tags=["sessions"])

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()

"""Application settings loaded from environment variables."""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Supabase
    supabase_url: str = Field(..., description="Supabase project URL")
    supabase_anon_key: str = Field(..., description="Supabase anon (public) key")
    supabase_service_role_key: str = Field(
        ..., description="Supabase service-role key (server-only)"
    )
    supabase_jwt_secret: str = Field(
        ..., description="Supabase JWT secret for verifying user tokens"
    )

    # Strava
    strava_client_id: str = ""
    strava_client_secret: str = ""
    strava_redirect_uri: str = "http://localhost:8000/api/oauth/strava/callback"

    # Whoop
    whoop_client_id: str = ""
    whoop_client_secret: str = ""
    whoop_redirect_uri: str = "http://localhost:8000/api/oauth/whoop/callback"

    # Token-at-rest encryption (Fernet key, 32 url-safe base64 bytes)
    token_encryption_key: str = Field(
        ..., description="Fernet key for encrypting OAuth tokens at rest"
    )

    # Frontend origin(s) for CORS — comma-separated string for env compatibility
    cors_origins_raw: str = Field(
        default="http://localhost:5173",
        alias="CORS_ORIGINS",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins_raw.split(",") if origin.strip()]


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
